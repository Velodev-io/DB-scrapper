# Fix Brief — offline-created records with photos never sync

**Investigation**: `experiments/decompose/2026-07-14-offline-patch-queued-race/` (tree.md / runs.jsonl / learnings.md)
**Severity**: High — deterministic permanent data loss for the app's core offline-first use case.
**Target**: `apps/agent-native/lib/sync.ts`, `apps/agent-native/lib/uploadQueue.ts`

## Confirmed root cause
`flushPendingUploads()` and `flushPendingRecords()` both branch on `upload.recordId.startsWith('temp-')` to distinguish "photo belongs to a record not yet created server-side" (should skip the patch call) from "photo belongs to an already-created record" (safe to PATCH). **No code produces a `temp-`-prefixed recordId** — every screen uses a bare `generateUUID()`. So `flushPendingUploads` always takes the "already exists" path, always PATCHes, and for offline-queued records that PATCH 404s (the record genuinely doesn't exist yet) — burning a retry attempt without ever calling `markUploadComplete`. This permanently blocks `flushPendingRecords`'s own resolution logic (`resolveId`) from ever seeing a resolved `publicId`, so the parent record can never become `allReady` and is never submitted. After `MAX_ATTEMPTS` (5), `flushPendingUploads` skips the upload forever, and the "Retry Failed Records" button is a no-op for this state (nothing resets `attempts`). Full trace with file:line citations in `learnings.md`.

## Proposed fix
Replace the fictional `temp-` string convention with a real, dynamic check against the `pending_records` table — the source of truth for "does this record exist server-side yet" already exists, no new state needed.

1. **`apps/agent-native/lib/uploadQueue.ts`** — add a small helper:
   ```ts
   export function isRecordPending(recordId: string): boolean {
     return db.getFirstSync(`SELECT 1 FROM pending_records WHERE id = ?`, [recordId]) != null
   }
   ```

2. **`apps/agent-native/lib/sync.ts`** — swap both checks to use it:
   - `flushPendingUploads` (line 19): change `if (upload.recordId.startsWith('temp-')) continue` to `if (isRecordPending(upload.recordId)) continue` — defer these uploads to `flushPendingRecords` instead of attempting a doomed PATCH.
   - `flushPendingRecords` Step 1 (line 51): change `if (!upload.recordId.startsWith('temp-')) continue` to `if (!isRecordPending(upload.recordId)) continue` — this branch already does the correct thing (upload + `markUploadComplete`, no PATCH); it just needs the real condition to actually run for these uploads.

No changes needed to `PhotoPicker.tsx`, `SinglePhotoPicker.tsx`, or any of the three `new.tsx` screens — `recordId` generation stays exactly as-is. The distinction is now made dynamically by queue membership instead of being encoded (incorrectly) into the ID string.

## Why this works
- **Offline path**: record submission fails → `enqueuePendingRecord` writes to `pending_records` *before* any sync cycle runs. Next cycle: `flushPendingUploads` sees `isRecordPending() === true` → skips the PATCH → `flushPendingRecords` Step 1 now correctly picks it up → uploads + `markUploadComplete` (no PATCH attempted) → Step 2's `resolveId` now finds a real `publicId` → record submits with images inline in the POST body, exactly as designed. `patch-queued` is never called for a record that doesn't exist yet.
- **Online path with a still-uploading photo**: record already exists (POST succeeded before the photo finished). `isRecordPending()` is `false` (nothing was ever written to `pending_records`) → `flushPendingUploads` proceeds to PATCH, which now succeeds because the record is real. Same behavior as today — unaffected.

## Recovery for already-stuck data (do this too, if the app has any field usage yet)
Any device that already hit this bug has uploads sitting at `attempts = 5, public_id = NULL` and orphaned rows in `pending_records` that can never resolve. After deploying the fix, ship a one-time migration/startup check that resets `attempts` back to `0` for rows where `public_id IS NULL` — the next sync cycle will then process them correctly under the fixed logic. If this app hasn't shipped to real agents yet (per the earlier audit: `apps/agent-native` is untracked in git, no evidence of field deployment), this step is likely unnecessary — confirm with the user before adding it.

## Suggested verification (manual, since this is timing-dependent business logic in a native app)
1. Put the device in airplane mode, create a labour/shop/property record with one photo, submit → confirm "Saved Offline" alert.
2. Re-enable connectivity, either wait for `NetworkBanner`'s reconnect listener or use the manual "Sync Now" button.
3. Confirm: the record appears in the admin panel with the photo attached, `pending_records` and `pending_uploads` are both empty for that record (query via `expo-sqlite` debug or a temporary log), and no `FailedRecordBanner` count increments.
4. Regression-check the still-working case: submit a record online while a photo is deliberately kept slow/mid-upload (e.g. very large photo), confirm it still lands via the `patch-queued` path as before.
