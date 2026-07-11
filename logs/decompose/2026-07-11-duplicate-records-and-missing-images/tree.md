# Variable Tree: Synced records doubled and missing images

## Claim
1. Properties submitted offline get doubled in the admin panel after syncing.
2. Synced properties are missing their images.

## Variable Tree

- [x] [Composite] Image compression/queueing offline
  - [x] [Leaf] UploadManager worker start
    - [x] [Leaf] getAdaptiveMaxWorkers() checks connection status
    - [x] [Leaf] !navigator.onLine returns 0 workers → **BUG #1 (Primary)**
    - [x] [Leaf] Result: Photos remain in 'waiting' status, never processed or compressed, and never written to IndexedDB.
  - [x] [Leaf] handleSubmit gets uploaded IDs
    - [x] [Leaf] uploadManager.getUploadedIds('images') returns [] (due to status='waiting')
    - [x] [Leaf] payload stored in IndexedDB has empty images: [] → **BUG #2 (Primary)**

- [x] [Composite] Record duplication after sync
  - [x] [Leaf] Double form submission
    - [x] [Leaf] React setSubmitting(true) is asynchronous/batched
    - [x] [Leaf] Double click before render tick registers two separate temp records → **BUG #3 (Secondary)**
  - [x] [Leaf] Weak connection retries (Distributed Race)
    - [x] [Leaf] If client POSTs record but connection drops before receiving response, client retries sync
    - [x] [Leaf] POST /properties and POST /labour are not idempotent → **BUG #4 (Primary)**

## Fixes Applied

1. **Worker offline activation**:
   - Updated `getAdaptiveMaxWorkers()` in `UploadManager.ts` to return `1` instead of `0` when offline. This starts local photo compression and enqueuing to IndexedDB immediately, so images are ready for background sync.

2. **Idempotent endpoints**:
   - Added `id` schema validation to POST `/properties` and `/labour`.
   - Wrapped Prisma writes in a unique constraint catch block on `id` conflict (P2002). If database record with same ID already exists, it resolves with the existing one (status 200) instead of creating a duplicate.

3. **Client-side ID generation**:
   - Generated clean `crypto.randomUUID()` IDs on the client for all submissions. This ensures that every sync request carries a matching identifier, avoiding duplicate rows in retries.

4. **Double submission lock**:
   - Added `useRef` lock (`submittingRef`) to both form submit handlers to block duplicate event triggers in the same render tick.
