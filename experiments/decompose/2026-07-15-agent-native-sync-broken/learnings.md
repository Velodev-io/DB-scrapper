# Learnings — agent-native sync broken while online

## The unifying root cause

This repo is mid-way through an **uncommitted** refactor that rips Clerk auth out of
the agent-native field app in favor of a single fixed server-side identity
(`DEVICE_AGENT_ID`). The refactor is internally consistent — but only on the client.

- Client side (uncommitted): every `api.post/patch/get(...)` call across
  `NetworkBanner.tsx`, `backgroundSync.ts`, `sync.ts` (via the three `new.tsx`
  screens), and `cloudinaryUpload.ts` now passes a literal `''` instead of a Clerk
  token. `useAuth`/`useUser` imports were stripped from all three record-entry
  screens.
- Server side (uncommitted): `apps/api/src/lib/auth.ts`'s `requireAgent` was
  rewritten to skip `extractRoleFromJWT` entirely and just assign
  `clerkUserId = DEVICE_AGENT_ID` regardless of what's in the Authorization header.
- **But** `apps/agent-native/.env` and all three `eas.json` build profiles
  (development, preview, production) hardcode `EXPO_PUBLIC_API_BASE` to the *live
  deployed* API: `https://carry-api-pink.vercel.app/api/v1`. There is no "point at
  local backend" path in this app's config — every build, including dev, always
  talks to the real deployed service.
- Vercel only runs **committed** code. `git show HEAD:apps/api/src/lib/auth.ts`
  confirms the deployed `requireAgent` is still the old, strict version: it calls
  `extractRoleFromJWT`, and returns `401 Unauthorized — valid Clerk session token
  required` whenever the Authorization header is missing or invalid.

Net effect: **every single API call the refactored client makes — record
submission, Cloudinary signed-upload requests, sync flush — hits a deterministic
401 wall on the real backend**, regardless of how good the device's connectivity
is. This isn't a network problem at all right now; it's a deploy-order problem.

## Why this reads as "offline" to the user

Independent of the 401 issue above, there's a second, structural bug that would
keep causing this exact symptom for *any* future non-connectivity failure too:

`labour/new.tsx`, `properties/new.tsx`, `shops/new.tsx` all do:
```ts
try {
  await api.post('/labour', onlinePayload, '')
  submitted = true
} catch { /* offline */ }
```
There is no `NetInfo` check anywhere in this flow, and the catch block doesn't
inspect the error at all — a `401`, a `500`, a `408` timeout, and a genuine
`TypeError: Network request failed` are all treated identically as "the device
must be offline," which triggers `enqueuePendingRecord` and the "Saved Offline —
will sync when you're back online" alert. `sync.ts`'s `flushPendingUploads` /
`flushPendingRecords` do the same thing per-item (bare `catch` →
`incrementUploadAttempts` or "will retry next cycle").

So even once the auth mismatch above is fixed, any *other* server error (a bad
field, a transient 500, a slow connection that trips the 15s timeout in
`packages/shared/src/api.ts`) will keep showing the same misleading "offline"
message. The message is really saying "the last attempt threw," not "the device
has no internet." This is the direct answer to "why does it say saved offline
when I'm online" — the app doesn't actually know whether it's online; it only
knows whether the last request round-tripped successfully.

## Why nothing auto-syncs "whenever the agent becomes online"

`NetworkBanner.tsx`'s `NetInfo.addEventListener` only calls `sync()` on a detected
**offline→online transition** (`wasOffline.current` flips from `true` back to
`false`). `wasOffline.current` starts `false`. There is no `AppState` listener and
no mount-time "if online, sync now" check anywhere in the app (`grep -rn AppState`
across `apps/agent-native` returns zero hits). So:

- Cold-launching the app while the device is *already* online (the common case —
  most agents don't open the app mid-reconnect) never triggers an automatic sync.
- The only other automatic path is `registerBackgroundSync()`
  (`apps/agent-native/app/_layout.tsx:34`, correctly wired) — Android WorkManager,
  `minimumInterval: 15 min`, `stopOnTerminate: false`. This is OS-throttled and can
  be deferred arbitrarily long for battery reasons, and (per Expo docs) iOS
  background fetch is materially less reliable than Android's WorkManager.
- The only reliable trigger today is the manual "Sync Now" button in
  `profile.tsx` (`handleManualSync`, calls `runFullSync('')` directly) or creating
  a *new* record (each `new.tsx` screen also does a bonus foreground flush after
  its own submit, but only opportunistically, not as a dedicated "sync on
  becoming online" feature).

So "auto sync whenever the agent becomes online" as a literal feature does not
exist today — what exists is "auto sync on a *detected transition into* online
during the current app session," plus an unreliable background task.

## Weak / flaky network behavior

- `packages/shared/src/api.ts` has a flat 15s `AbortController` timeout and **no
  retry logic** inside `request()` itself. A slow request either completes in time
  or hard-fails with a `408`. There is no partial-progress handling.
- `NetworkBanner`'s reconnect listener has no de-dup/lock around `sync()`. On a
  weak signal, `NetInfo`'s `isInternetReachable` is a periodic reachability probe
  and commonly flaps (`true`/`false`/`null`) rather than being a clean one-time
  edge — each flap that reads as offline→online re-invokes `sync()` with no guard
  against overlapping runs, risking concurrent `flushPendingUploads`/
  `flushPendingRecords` passes over the same SQLite rows.
- **Highest-severity finding, ties directly to the July 13 data-loss incident**
  ([[carry-data-loss-incident]]): `MAX_ATTEMPTS = 5` in `sync.ts`, and nothing in
  the codebase ever resets a `pending_uploads.attempts` counter back to 0 (grepped,
  zero hits). Once an upload's `attempts` reaches 5 — which happens automatically
  and silently under the current 401-wall bug, or would happen to any upload that
  keeps hitting a real transient failure — `flushPendingUploads` skips it forever,
  which permanently blocks `flushPendingRecords` Step 1 from ever completing that
  upload, which permanently blocks Step 2's `allReady` check for the parent
  record. The record is now stuck in the local queue forever. `NetworkBanner`'s
  "Retry" button just re-calls `sync()`, which re-hits the same `attempts >= 5`
  guard and does nothing. **There is currently no UI path to unstick a
  maxed-out record.** Any labour/property/shop record with a photo, created while
  the auth mismatch above is live, will silently and permanently fail to sync
  after as few as 5 sync cycles (5 app opens with connectivity is enough, since
  each foreground flush + each reconnect + each background-task run all count).

## What was checked and ruled out

- **RLS on the primary DB** — does not exist. The RLS added in commit `17abb1e`
  is on a completely separate Supabase "archive" schema (an insert-only backup
  mirror, unrelated to the primary write path, and its own policies are fully
  permissive `WITH CHECK (true)` anyway). Primary Neon DB has zero RLS, and Prisma
  connects as `neondb_owner`, which Postgres never subjects to RLS regardless.
- **EXPO_PUBLIC_API_BASE misconfiguration** (classic "forgot to set the env var,
  falls back to localhost on-device" mobile bug) — checked and ruled out. It's
  correctly set to the real deployed URL in `.env` and in all three `eas.json`
  build profiles.
- **`registerBackgroundSync()` never being called** — checked and ruled out, it's
  correctly wired into `_layout.tsx`'s launch effect independent of auth state.
- **The `temp-` string-convention bug from `2026-07-14-offline-patch-queued-race`**
  — that code has since been rewritten to use a real `isRecordPending()` DB lookup
  (`uploadQueue.ts:118-120`). That specific bug is gone; don't re-propose its fix.
