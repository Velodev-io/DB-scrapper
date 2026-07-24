# Objective

The agent-native app does not sync to the DB even when online; auto-sync-on-reconnect
reliability under weak network is unverified; and the app shows "Saved Offline — will
sync later" even while genuinely online.

Slug: `2026-07-15-agent-native-sync-broken`

## Context (KNOWN going in)

- KNOWN (prior decompose `2026-07-14-offline-patch-queued-race`): a `temp-` string
  convention bug used to cause offline-created photo uploads to permanently fail to
  sync. **STALE** — `sync.ts`/`uploadQueue.ts` have since been rewritten to use
  `isRecordPending()` (a real DB lookup) instead of the fictional `temp-` prefix
  (`apps/agent-native/lib/uploadQueue.ts:118-120`). That specific bug is gone; do not
  re-propose its fix.
- KNOWN: repo is mid-refactor (uncommitted) ripping Clerk auth out of the agent-native
  app and the API's `requireAgent` middleware, replacing per-user auth with a single
  fixed `DEVICE_AGENT_ID` server-side identity (`apps/api/src/lib/auth.ts` diff).
- KNOWN: `NetworkBanner.tsx` and `backgroundSync.ts` both call `runFullSync('')` — a
  literal empty-string token — as part of that refactor (git diff confirmed).
- KNOWN: `requireAgent` (apps/api/src/lib/auth.ts, current/uncommitted version) no
  longer calls `extractRoleFromJWT` at all — it unconditionally sets
  `clerkUserId = DEVICE_AGENT_ID` regardless of the Authorization header. So an empty
  token is NOT rejected by the Fastify app-layer auth middleware. Initial 401-on-empty-
  token hypothesis for symptom 1/2 is **DISPROVEN** at the app-auth layer specifically.
- KNOWN: the three "new record" screens (`labour/new.tsx`, `properties/new.tsx`,
  `shops/new.tsx`) attempt `api.post(path, payload, '')` inside a bare `try { } catch
  { /* offline */ }` with **no NetInfo / connectivity check at all**. Any failure for
  ANY reason (network, timeout, 4xx validation, 5xx server error, DB-layer rejection)
  is caught and treated identically to "device is offline" — record silently falls
  back to the local queue and the user sees "Saved Offline" regardless of true cause.
  This is a confirmed structural bug regardless of what's actually throwing.

## Variables

### VAR-1: The "Saved Offline" message appears even when genuinely online because `api.post` throws for a non-connectivity reason
- type: composite
- depends_on: [VAR-2, VAR-3]
- status: proven-partial (structural cause confirmed; underlying throw cause pending VAR-2/3)
- evidence: `apps/agent-native/app/(tabs)/labour/new.tsx:60-72` (and properties/shops
  equivalents) — try/catch conflates all failure modes with "offline". No `NetInfo`
  check gates the attempt or informs the catch block.

### VAR-2: Server-side insert fails despite app-layer auth passing, because Postgres RLS (added in 17abb1e "insert-only RLS policies") requires a JWT claim that an empty/absent token can't satisfy
- type: leaf
- depends_on: []
- sandbox: Explore agent (read-only)
- expected: RLS policy SQL checks a JWT claim (e.g. `request.jwt.claims`) that only a
  real Clerk token would populate; Prisma connects as a role subject to that RLS
  (not a bypassing superuser) → INSERT would be denied for any request with no
  token, explaining "fails even when online" and "empty token" both as the same bug.
- fail_criteria: RLS policies are permissive to any role / Prisma bypasses RLS (e.g.
  connects via a service-role connection string) → this is not the cause, look
  elsewhere (server code bug, wrong route, missing field, etc.)
- status: **DISPROVEN** — RLS only exists on a separate Supabase archive schema,
  fully permissive anyway; primary Neon DB has zero RLS; Prisma connects as
  `neondb_owner` (bypasses RLS by definition). See runs.jsonl.

### VAR-2b: The real cause — deployed backend runs committed code, client refactor is uncommitted (found via manual git diff / git show HEAD, not part of the original tree)
- type: leaf
- status: **CONFIRMED** — see learnings.md "The unifying root cause". This is the
  actual answer to symptoms 1 and 3.

### VAR-3: Background/foreground sync (`runFullSync`) never actually runs on reconnect, independent of what token it's called with
- type: leaf
- depends_on: []
- sandbox: static read of `NetworkBanner.tsx` reconnect listener + `backgroundSync.ts`
  registration call sites
- expected: `NetInfo.addEventListener` correctly detects offline→online transition
  and calls `sync()`; `registerBackgroundSync()` is actually invoked somewhere in
  the app boot path (`_layout.tsx` or `index.tsx`)
- fail_criteria: listener never fires reconnect logic, or `registerBackgroundSync()`
  is never called anywhere post-refactor (e.g. was called from the deleted
  `sign-in.tsx`/auth flow and never rewired into the new boot path)
- status: done (see runs.jsonl) — NetworkBanner listener logic confirmed correct
  (VAR-3a); registration call-site check confirmed **BROKEN** (VAR-3b)

### VAR-3b: `registerBackgroundSync()` call site was removed/orphaned by the auth-deletion refactor
- type: leaf
- depends_on: []
- sandbox: grep for `registerBackgroundSync` call sites across app boot files
- expected: called once from `_layout.tsx` or `index.tsx` on app launch (comment in
  backgroundSync.ts now says "call once on app launch", changed from "call once
  after user signs in" — implying the call site was supposed to move)
- fail_criteria: no call site exists at all post-refactor
- status: pending

### VAR-4: Weak/flaky network behavior — does a slow/degraded connection (not a clean offline→online edge) get stuck, retried, or silently dropped?
- type: composite
- depends_on: [VAR-4a, VAR-4b]
- status: pending

### VAR-4a: `NetInfo` reachability check behavior under weak signal (`isInternetReachable` flapping)
- type: leaf
- sandbox: static read of NetInfo usage + docs semantics
- expected: `isOnline = isConnected && isInternetReachable` — need to check whether
  a flapping `isInternetReachable` (common on weak signal, since it's a periodic
  reachability probe, not instantaneous) would repeatedly toggle `wasOffline.current`
  and spam `sync()`, or has any debounce
- status: pending

### VAR-4b: `api.ts` timeout/retry behavior on slow (not fully dead) connections
- type: leaf
- sandbox: static read of `packages/shared/src/api.ts`
- evidence: `DEFAULT_TIMEOUT_MS = 15_000` (packages/shared/src/api.ts:1), single
  `AbortController` timeout, no retry logic at all in `request()`
- expected/finding: on a weak connection a request either completes within 15s or
  hard-aborts with `ApiError('Request timed out...', 408)` — no partial-progress
  handling, no automatic retry beyond whatever calls `flushPendingUploads` again
  next cycle. Need to confirm nothing double-submits or corrupts queue state on
  a timeout-after-partial-write (e.g. Cloudinary upload succeeds but the
  `patch-queued` call times out — does `attempts` increment correctly and does a
  retry re-upload the file wastefully, or correctly skip to the patch?)
- status: pending
