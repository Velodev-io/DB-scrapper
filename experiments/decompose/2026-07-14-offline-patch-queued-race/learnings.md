# Learnings — offline patch-queued permanent-failure bug

## Summary
Confirmed and *more severe* than the original hypothesis. Any labour/shop/property record created in `apps/agent-native` while offline, with at least one photo attached, will **never sync**, and the local copy (record + photo file reference) becomes permanently orphaned in SQLite after 5 failed sync attempts. This is deterministic, not probabilistic — it will happen on every such record, every time, on every device.

## Root cause
`flushPendingUploads()` (`apps/agent-native/lib/sync.ts:13-41`) and `flushPendingRecords()` (`sync.ts:43-139`) were designed around a convention where a `recordId` prefixed `temp-` means "this record doesn't exist in Postgres yet — don't try to patch it, just upload the photo and mark it complete; the record's own POST payload will carry the resolved image." Uploads whose `recordId` does *not* start with `temp-` were assumed to belong to an already-created record, safe to PATCH via `/uploads/patch-queued`.

**No code anywhere produces a `temp-`-prefixed recordId.** All three "new record" screens (`properties/new.tsx:31`, `labour/new.tsx:30`, `shops/new.tsx:28`) generate `recordId = useRef(generateUUID()).current` — a bare UUID, used identically whether the record ends up submitted online or queued offline. The `temp-` branch in both sync functions is dead code that never executes.

Consequence, traced step by step:
1. Agent creates a record offline with a photo. `PhotoPicker` calls `enqueueUpload({ recordId, ... })` (plain UUID) and the form calls `enqueuePendingRecord({ id: recordId, ... })` when the online POST attempt fails.
2. Next sync cycle: `runFullSync` calls `flushPendingUploads` first. Since `recordId` doesn't start with `temp-`, it proceeds: uploads the file to Cloudinary (succeeds), then `PATCH /uploads/patch-queued` — which 404s (`apps/api/src/routes/uploads.ts:138` etc.) because the record hasn't been created in Postgres yet. The throw happens *before* `markUploadComplete()` runs, so the catch block only calls `incrementUploadAttempts()`. The upload row's `public_id` stays `NULL` in SQLite, even though the file is sitting safely in Cloudinary with a real public ID that's now been discarded (never captured, since the code never got past the failed PATCH to read the Cloudinary response into `markUploadComplete`).

   Actually — the `publicId` variable *is* held in memory at that point in the function (`const publicId = await uploadFileToCloudinary(...)`), but the function throws before persisting it anywhere, so on the next run the same file gets re-uploaded to Cloudinary from scratch (wasteful but not itself corrupting) and fails the same way.
3. `flushPendingRecords` runs next. Its Step 1 (which specifically targets `temp-`-prefixed uploads) never touches this upload, since it's not temp-. Step 2 calls `resolveId()`, which looks the upload up in `getPendingUploads()` (rows with `public_id IS NULL`) — finds it, but `publicId` is still `null` → `allReady = false` → `continue` — the whole record submission is skipped this cycle.
4. This repeats every sync cycle. `flushPendingUploads` keeps retrying the same doomed upload+patch sequence until `attempts >= MAX_ATTEMPTS` (5), at which point it's skipped forever (`sync.ts:17`). The pending record can now *never* become `allReady`, and sits in `pending_records` indefinitely.
5. The "Retry Failed Records" button (`profile.tsx:65-74`) just re-calls `runFullSync`, which re-enters `flushPendingUploads` — whose very first check skips any upload with `attempts >= MAX_ATTEMPTS`. There is no function anywhere in `uploadQueue.ts` that resets `attempts`. Retry is fully inert for this failure mode, despite its own UI copy ("This solves the silent permanent failure problem from the web app") suggesting otherwise.

## Severity
High. This directly undermines the app's core value proposition (offline-first field data collection) for the exact scenario it exists to handle — an agent submitting a record with a photo while offline. Given this project has already suffered one incident of real field data loss, this is a second, independent mechanism by which real data would silently vanish, this time client-side and per-device rather than in the shared database.

## What does NOT need fixing
- Records created **online** with no photos still queued (i.e., all images already have real Cloudinary IDs by submit time): unaffected, POST succeeds immediately.
- Records created **online** where a photo is still mid-upload at submit time: these *do* rely on `patch-queued`, and correctly so — the record already exists by the time `flushPendingUploads` runs, so the PATCH succeeds. This is the scenario the `patch-queued` endpoint is actually built for, and it works.
- `flushPendingRecords`'s Step 2 resolution logic itself is correct — the bug is entirely in what happens *before* it (the `publicId` never getting persisted).

## Fix applied (2026-07-14)
Implemented exactly as proposed in handoff.md:
- `apps/agent-native/lib/uploadQueue.ts` — added `isRecordPending(recordId)`, a real `SELECT 1 FROM pending_records WHERE id = ?` check.
- `apps/agent-native/lib/sync.ts` — both `startsWith('temp-')` checks (flushPendingUploads line 19, flushPendingRecords Step 1 line 52) replaced with `isRecordPending(upload.recordId)` / `!isRecordPending(upload.recordId)` respectively.

Verified: `npx tsc --noEmit` clean; repo-wide grep confirms zero remaining `temp-` string checks in apps/agent-native.

Not done (flagged to user, no confirmation yet that field devices exist): the stuck-data recovery migration (reset `attempts` to 0 for `public_id IS NULL` rows) — audit found no evidence of real field deployment yet, so likely moot, but worth a reminder before any device that ran the buggy build is trusted again.

Manual on-device verification (airplane-mode create → reconnect → confirm sync) still needs to be run by the user; not something this session can do without a physical/simulator device.
