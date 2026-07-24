# Objective

Labour photos never reach the server even when the record is created online, AND an
offline-created labour record ("offline test …") neither syncs nor appears in the app's
list, when the agent-native app syncs against the deployed API.

Prior context (KNOWN, from `2026-07-15-agent-native-sync-broken`): the 401 auth wall from
the half-deployed DEVICE_AGENT_ID refactor has since been resolved by reverting to Clerk
auth client-side (auth.ts is back to HEAD; sign-in.tsx rewritten for Google SSO). Fixes
2–4 from that hand-off (honest messaging, mount-time sync, resetStuckUploads) are present
in the working tree.

## Variables

- VAR-1: POST /labour ignores the client-generated `id`, so the server record gets a
  fresh cuid and the follow-up PATCH /uploads/patch-queued (which looks up by the client
  UUID) 404s — the photo is uploaded to Cloudinary but never attached, retried 5×, then
  permanently skipped.
  - type: leaf
  - depends_on: []
  - sandbox: code inspection (route + Prisma schema + client sync path), curl
  - expected: labour.ts builds Prisma `data` without `id` while properties.ts/shops.ts
    do persist clientId; Labour model has `@default(cuid())`; patch-queued looks up
    `where: { id: recordId }` with the client UUID
  - status: confirmed

- VAR-2: The deployed API requires a valid Clerk Bearer token, and the current client
  sends one — auth is NOT the failing layer anymore.
  - type: leaf
  - depends_on: []
  - sandbox: curl (read-only) + code inspection + admin screenshot evidence
  - expected: unauthenticated /labour/mine → 401; record "Test online mode" visible in
    admin with real submitter identity → authed POST succeeded
  - status: confirmed

- VAR-3: "Test name" / "Test user" records stuck at "Pending Sync" are blocked by their
  queued photo uploads having `attempts >= 5` (accumulated during the 401-wall era);
  automatic syncs respect the cap by design, and only the manual Retry affordances
  (NetworkBanner "Retry" / Profile "Retry Failed Records") reset it.
  - type: leaf
  - depends_on: [VAR-2]
  - sandbox: code inspection (sync.ts Step 1 cap → resolveId null → `continue`)
  - expected: capped upload short-circuits record POST forever until reset
  - status: confirmed (code path); on-device counter values unverifiable from here

- VAR-4: The missing "offline test" record is invisible because every list screen loads
  pending records only on mount (`useEffect(() => { loadPending() }, [loadPending])`),
  never on focus — a record enqueued after the tab first mounted never renders that
  session.
  - type: composite (UI staleness confirmed; whether the row still exists in SQLite is
    device state)
  - depends_on: []
  - sandbox: code inspection (labour/properties/shops index.tsx)
  - expected: no useFocusEffect / focus listener around loadPending in any list screen
  - status: confirmed (code); residual unknowns: record may also have been created in a
    different install (Expo Go vs dev build have separate SQLite DBs) or be one of the
    two visible "Test …" pending rows under a misremembered name. Device check required
    (Profile screen renders getPendingRecords()).

- VAR-5: Labour's offline-retry idempotency (P2002 → return existing) is dead code
  because without `id` in `data` no unique conflict on id can ever fire — flaky
  submits can duplicate labour records.
  - type: leaf
  - depends_on: [VAR-1]
  - sandbox: code inspection
  - expected: P2002 catch references clientId that was never written
  - status: confirmed (consequence of VAR-1; same fix)

- VAR-6: Queued photo files live in the OS-purgeable cache directory
  (expo-image-manipulator output), so a long-stuck upload can lose its source file
  entirely.
  - type: leaf
  - depends_on: []
  - sandbox: code inspection (compress.ts)
  - expected: manipulateAsync returns cache-dir URI; no copy to documentDirectory
  - status: confirmed (latent risk, not necessarily today's trigger)

## Pass/fail criteria

Defined per-variable above before execution; all experiments were read-only
(code inspection, git history, unauthenticated curl probes).
