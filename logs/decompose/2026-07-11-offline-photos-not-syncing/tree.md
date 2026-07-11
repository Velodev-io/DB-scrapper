# Variable Tree: Photos not appearing after reconnecting online

## Claim
After offline form submission, photos are never uploaded to Cloudinary or linked to the property record, even after the device comes back online.

## Variable Tree

- [x] [Composite] Offline photo sync flow end-to-end
  - [x] [Leaf] UploadManager.processItem() saves blob to IDB with recordId '__pending__'
  - [x] [Leaf] PropertyForm.handleSubmit() calls updateRecordId() to remap __pending__ → temp-xxx
    - [x] [Leaf] updateRecordId() filter: only patches entries where recordId === '__pending__'
    - [x] [Leaf] But uploadManager.clear('images') called AFTER updateRecordId loop — OK timing
    - [x] [Leaf] images[] in payload stored as ['__queued__:uuid'] strings
  - [x] [Leaf] flushPendingRecordsForeground Step 1: upload blobs where recordId.startsWith('temp-')
    - [x] [Leaf] updateRecordId DOES remap: __pending__ → temp-xxx before flush runs
    - [x] [Leaf] But: flushPendingRecordsForeground is called at app LOAD (main.tsx) - before Clerk token available
    - [x] [Leaf] token = window.__clerkGetToken?.() returns null at early load → function returns early → upload SKIPPED
  - [x] [Leaf] flushPendingRecordsForeground Step 2: resolve localIds → Cloudinary publicIds
    - [x] [Leaf] getPublicIdForLocalId(cleanedId) — only has publicId if Step 1 ran
    - [x] [Leaf] allPhotosReady = false when ANY image has no publicId → record not submitted
  - [x] [Leaf] 'online' event fires → flushPendingRecordsForeground runs again → same token issue

## Root Causes Found

1. Token timing: flushPendingRecordsForeground called immediately on 'load' before Clerk initializes
   → window.__clerkGetToken is undefined → returns early → photos never upload

2. Even if token exists: payload.images contains ['__queued__:uuid'] strings — IDB pending items
   still have recordId='temp-xxx' ONLY if updateRecordId ran successfully.
   But on the 'online' event, the pendingUploads list is fetched fresh — if recordId was correctly
   set to temp-xxx, Step 1 will upload them. This part is correct IF token exists.

3. After the property POST returns 201 (success), cleanup uses record.payload.images (the original
   __queued__ strings), strips the prefix, finds the upload by localId, and removes it.
   This is correct but only runs AFTER upload succeeds.

## Test Plan

| Variable | PASS | FAIL |
|---|---|---|
| Token available at flush time | window.__clerkGetToken returns token | returns null → early return |
| Step 1 uploads blobs | publicId written to IDB | silently skipped |
| Step 2 resolves IDs | all images resolve to publicIds | allPhotosReady=false, record skipped |
| POST /properties | 201 with images array | 201 with images:[] |
