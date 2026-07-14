# Objective
`flushPendingUploads()` in `apps/agent-native/lib/sync.ts` fails to durably complete photo uploads belonging to offline-created records, when the parent record has not yet been POSTed to the API.

# Variable Tree

## VAR-1 (leaf) — No code path ever generates a `temp-`-prefixed recordId
- depends_on: []
- sandbox: grep across apps/agent-native
- expected: the only occurrences of the literal `'temp-'` are the two `startsWith('temp-')` checks inside sync.ts itself; every screen assigns `recordId = useRef(generateUUID()).current` with no prefix.
- status: **CONFIRMED** (disproves the assumption that a temp-/real distinction exists at runtime)
- evidence: grep output — matches only `lib/sync.ts:19` and `lib/sync.ts:51`; `properties/new.tsx:31`, `labour/new.tsx:30`, `shops/new.tsx:28` all use bare `generateUUID()`.

## VAR-2 (leaf) — PATCH /uploads/patch-queued 404s when recordId doesn't exist, for all 4 models
- depends_on: []
- sandbox: read apps/api/src/routes/uploads.ts
- expected: each model branch does `findFirst({ where: { id: recordId, agent: {...} } })` and returns `404` if not found, before any update.
- status: **CONFIRMED**
- evidence: uploads.ts:138 (property), :158 (project), :173 (labour), :184 (shop) — all `if (!x) return reply.code(404)...`.

## VAR-3 (composite, depends_on: [VAR-1, VAR-2]) — flushPendingUploads consequently burns an attempt without ever calling markUploadComplete, for offline-record photos
- expected: since `upload.recordId.startsWith('temp-')` is always false (VAR-1), execution always reaches `uploadFileToCloudinary` (succeeds) then `api.patch(...)` (404s per VAR-2, throws) — the throw happens before `markUploadComplete()` in the same try block, so `catch { incrementUploadAttempts(upload.id) }` fires instead.
- status: **CONFIRMED**
- evidence: sync.ts:13-41 (flushPendingUploads body, single try/catch wrapping both the upload and the patch call, `markUploadComplete` is the last statement of the try block).

## VAR-4 (leaf) — getPendingUploads() only returns rows where public_id IS NULL, and markUploadComplete is the only writer of public_id
- depends_on: []
- sandbox: read apps/agent-native/lib/uploadQueue.ts
- expected: confirmed SQL.
- status: **CONFIRMED**
- evidence: uploadQueue.ts:37-46 (`SELECT ... WHERE public_id IS NULL`), :48-53 (`UPDATE pending_uploads SET public_id = ?`).

## VAR-5 (composite, depends_on: [VAR-3, VAR-4]) — flushPendingRecords's resolveId() permanently returns null for these images, blocking the parent record's submission on every subsequent sync cycle, not just once
- expected: `resolveId` looks up the upload row by localId within `getPendingUploads()` results and returns `u?.publicId ?? null`; since VAR-3 means `publicId` never gets set, this is `null` forever. No other code path retries the Cloudinary upload for a non-`temp-` upload except `flushPendingUploads` itself, which keeps re-issuing the same failing patch call each cycle until `attempts >= MAX_ATTEMPTS` (5), then explicitly skips it forever (`continue` at top of loop).
- status: **CONFIRMED**
- evidence: sync.ts:73-77 (resolveId reads from `freshUploads = getPendingUploads()`), sync.ts:86 (`if (!allReady) continue` — record submission skipped), sync.ts:17 (`if (upload.attempts >= MAX_ATTEMPTS) continue`).

## VAR-6 (leaf) — The "Retry Failed Records" UI action does not recover records once MAX_ATTEMPTS is reached
- depends_on: []
- sandbox: read profile.tsx handleRetryFailed + uploadQueue.ts for any attempts-reset function
- expected: `handleRetryFailed` → `handleManualSync` → `runFullSync` → `flushPendingUploads`, whose very first loop-body line skips any upload with `attempts >= MAX_ATTEMPTS`. No function in uploadQueue.ts resets `attempts`.
- status: **CONFIRMED** — Retry is inert for this failure mode.
- evidence: profile.tsx:65-74, sync.ts:17, uploadQueue.ts (full file — no reset/attempts=0 statement exists).

# Root conclusion
**CONFIRMED, and more severe than the original hypothesis.** This is not a probabilistic race — it is a **deterministic, 100%-reproducible permanent failure** for any record created while offline that has at least one photo attached. The `temp-` prefix branch in `flushPendingUploads`/`flushPendingRecords` was clearly designed to distinguish "photo belongs to an already-created record" (needs patch-queued) from "photo belongs to a still-offline record" (should just upload + mark complete, letting the record's own POST payload carry the resolved image) — but no producer of `recordId` ever sets that prefix, so the distinction never fires. The record and its photo(s) become permanently stuck in the local SQLite queue after 5 failed sync cycles, with the user-facing "Retry" control fully inert.
