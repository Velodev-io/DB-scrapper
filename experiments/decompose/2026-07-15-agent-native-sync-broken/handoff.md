# Fix Brief — agent-native sync broken while online + misleading "Saved Offline" messaging

**Status update (2026-07-15)**: Fixes 2, 3, and 4 below are implemented (see diff
in `apps/agent-native/lib/connectivity.ts` [new], `uploadQueue.ts`,
`NetworkBanner.tsx`, `profile.tsx`, and the three `(tabs)/*/new.tsx` screens).
`tsc --noEmit` passes. **Fix 1 (the auth deploy-ordering decision) is deliberately
NOT done** — user chose "not sure yet, hold off" when asked which direction
(commit+deploy the device-identity change vs. revert to per-user Clerk auth).
Until that's resolved, every online submission will still hit the deployed
backend's 401 wall — fixes 2-4 make that failure mode honest and recoverable
(correct messaging, retries, no permanent stuck state) but do not make sync
actually succeed. Don't close this out or mark symptoms resolved until fix 1
lands.

**Investigation**: `experiments/decompose/2026-07-15-agent-native-sync-broken/`
(tree.md / runs.jsonl / learnings.md — verified facts, no code written)
**Severity**: Critical right now (deterministic, 100%-reproducible failure of every
online write), plus a High-severity latent data-loss risk once "fixed" at the
surface level. Directly relevant to [[carry-data-loss-incident]] — this is the
same offline-queue machinery that's supposed to protect field data.

## Root cause (confirmed, not a guess)

An uncommitted, in-progress refactor removes Clerk auth from the agent-native app.
It is **only half-deployed**:

1. Client (uncommitted): every `api.post/patch/get()` call from
   `NetworkBanner.tsx`, `backgroundSync.ts`, the three `(tabs)/*/new.tsx` screens,
   and `cloudinaryUpload.ts` now sends `''` instead of a real Clerk token.
2. Server (uncommitted, apps/api/src/lib/auth.ts): `requireAgent` was rewritten to
   accept any request (empty token included) and assign a fixed
   `DEVICE_AGENT_ID`.
3. **But** the app always talks to the live deployed backend
   (`EXPO_PUBLIC_API_BASE=https://carry-api-pink.vercel.app/api/v1`, hardcoded in
   `apps/agent-native/.env` and all 3 `eas.json` build profiles — there is no
   "point at local API" path). Vercel only serves committed code, and the last
   commit touching `auth.ts` (`b07f2d5`) predates this refactor. The deployed
   `requireAgent` still requires a valid Clerk Bearer token and returns `401` for
   anything else.

Result: every request from a build of the current working tree — record
submission, `/uploads/sign`, `/uploads/patch-queued`, every sync flush — gets a
deterministic 401 from the real backend, online or not.

## Fix 1 (unblocks everything) — deploy client and server changes together

This is a **deploy-ordering fix, not a code fix** — the server-side and
client-side halves of the auth refactor must ship atomically:

- Commit and deploy `apps/api/src/lib/auth.ts` + `apps/api/src/routes/agents.ts`
  to the same backend the app talks to, **before or in the same release as** the
  client changes in `apps/agent-native`. Until then, do not ship a build with the
  stripped-token client changes — it will 401 on every request.
- If the intent is actually to keep per-user Clerk auth (the July-15
  `2026-07-15-agent-signup-offline-auth` investigation earlier today suggests
  admin-provisioned agent accounts and Clerk sign-in *are* the intended design —
  worth reconciling with whoever is driving this DEVICE_AGENT_ID change, since the
  two efforts look like they're pulling in opposite directions), consider whether
  ripping out Clerk from the field app is even the right call before deploying it.
  That's a product decision, not something to infer from code.

## Fix 2 (root-causes the misleading messaging, independent of Fix 1)

`labour/new.tsx`, `properties/new.tsx`, `shops/new.tsx` (the `try { await
api.post(...) } catch { /* offline */ }` blocks) and `sync.ts`'s
`flushPendingUploads`/`flushPendingRecords` treat every thrown error identically
as "device is offline." None of them check `NetInfo` or inspect the error.

Proposed fix: import `NetInfo.fetch()` (or read connectivity state some other way
already available, e.g. lift `NetworkBanner`'s status into context) before
deciding the user-facing message. On failure:
- If actually offline → keep current "Saved Offline" messaging (correct as-is).
- If online but the request failed (any `ApiError` with a status code, or a
  timeout) → show a distinct "Couldn't reach server — will retry" message instead,
  and ideally surface the status/reason so a stuck 401/500 doesn't look identical
  to a stuck weak-signal timeout. This also makes the *next* unrelated server bug
  debuggable instead of silently masquerading as a connectivity issue.

## Fix 3 (the "auto sync whenever online" gap)

There is currently no "sync because the app is open and online" trigger — only
"sync on a detected offline→online transition mid-session" (`NetworkBanner.tsx`)
and a throttled 15-min-minimum background task. Add an `AppState`-based check (or
simply attempt a sync unconditionally on app mount if `NetInfo.fetch()` reports
online) in `_layout.tsx` or `NetworkBanner.tsx`'s mount effect, so a cold launch
with existing pending records and good connectivity doesn't require either a
live network transition or a wait for the background task to eventually fire.

## Fix 4 (data-loss risk — highest priority to guard once 1–3 ship)

`MAX_ATTEMPTS = 5` in `apps/agent-native/lib/sync.ts`, and nothing anywhere resets
`pending_uploads.attempts`. Once an upload hits 5 failed attempts (trivially
reached under the current bug — as few as 5 sync cycles), it is skipped forever by
both `flushPendingUploads` and `flushPendingRecords`, which permanently blocks the
parent record's `allReady` check — the record can never submit, and the
`NetworkBanner` "Retry" button cannot unstick it (it just re-triggers the same
permanently-skipped path).

Before this ships to any field device again:
1. Add a way to reset `attempts` (e.g. `resetStuckUploads()` in `uploadQueue.ts`,
   surfaced via the existing "Retry Failed Records" affordance so a manual retry
   actually retries instead of being a no-op for maxed-out items).
2. **Check whether any real field device already has records stuck from this bug
   right now** — any device that's been open since this refactor landed locally
   and has attempted a sync 5+ times has permanently-stuck local data. Given the
   prior incident, treat this as a live data-recovery question, not just a
   code-review note — ask the user whether any device has been used against this
   working tree before concluding no data is at risk.

## Suggested verification (manual — this is device/network-timing-dependent)

1. After Fix 1 ships (server + client auth changes deployed together): create a
   record online, confirm it does NOT show "Saved Offline" and appears
   server-side immediately.
2. Airplane-mode a device, create a record with a photo, submit → confirm "Saved
   Offline". Re-enable connectivity → confirm it syncs via the reconnect listener
   without needing the manual "Sync Now" button.
3. Cold-kill and relaunch the app while online with a record still deliberately
   left pending (e.g. via airplane mode toggling mid-test) → confirm Fix 3 makes
   it sync on launch, not just on a live transition.
4. Simulate 5+ failed sync attempts (e.g. point at an unreachable host
   temporarily) then restore connectivity → confirm the record recovers once Fix 4
   ships, instead of being permanently stuck.
