# Handoff: Fix for Offline Photos Not Syncing

## Bugs to Fix

### Fix 1 — Filter `__queued__:` IDs out of the API payload (PropertyForm + LabourForm)

When calling `uploadManager.getUploadedIds(scope)`, photos that are still processing
(status='queued') return `__queued__:uuid`. These must NEVER be sent to the API.
Only items with status='done' (and a real Cloudinary `cloudinaryId`) should be included
in the images array.

**In PropertyForm.tsx and LabourForm.tsx**, filter the images before building the payload:

```ts
// Instead of:
const images = uploadManager.getUploadedIds('images')

// Use:
const images = uploadManager.getUploadedIds('images').filter(id => !id.startsWith('__queued__:'))
```

After the POST succeeds, start a background process that monitors any still-queued photos
and patches the record using `PATCH /uploads/patch-queued` once they upload.

### Fix 2 — Pass the real DB recordId to queued uploads so patch-queued can link them

After `api.post('/properties')` returns the created property with its real DB id, update
all pending uploads for that scope to use the real recordId:

```ts
const newProp = await api.post<Property>('/properties', payload, token)
// For each queued photo upload, update its recordId to the real DB id
const allScopedPhotos = uploadManager.getPhotos('images')
for (const photo of allScopedPhotos) {
  if (photo.status === 'queued') {
    await updateRecordId(photo.id, newProp.id)
  }
}
```

The existing `flushUploadQueueForeground` will then pick up these items (they now have
a real recordId, not starting with 'temp-') and call `PATCH /uploads/patch-queued` once
they upload to Cloudinary. This automatically links them to the property.

### Fix 3 — Trigger flushPendingRecordsForeground from App.tsx after Clerk is ready

In `App.tsx`, after `window.__clerkGetToken` is set, also trigger the sync:

```ts
useEffect(() => {
  window.__clerkGetToken = () => getToken()
  // Trigger sync now that token is available
  flushPendingRecordsForeground().catch(console.error)
}, [getToken])
```

## Summary of Changes

| File | Change |
|---|---|
| `PropertyForm.tsx` | Filter `__queued__:` IDs from payload; after POST success, update pending upload recordIds to the real DB id |
| `LabourForm.tsx` | Same filter for profilePhotoUrl |
| `App.tsx` | Call `flushPendingRecordsForeground()` after Clerk token is available |
