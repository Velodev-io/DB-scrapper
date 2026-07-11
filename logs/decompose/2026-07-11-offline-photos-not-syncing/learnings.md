# Learnings: Offline Photos Not Syncing After Reconnection

## Root Cause #1 — Token Race (Primary Bug)

`flushPendingRecordsForeground` is called in `main.tsx` on the `load` and `online` events:

```ts
window.addEventListener('load', () => {
  flushUploadQueueForeground().catch(console.error)
  flushPendingRecordsForeground().catch(console.error)   // ← called too early
})
```

At the time of `load`, React has not yet rendered `<App>`, so `window.__clerkGetToken` is
`undefined`. The flush function calls:

```ts
const token = await window.__clerkGetToken?.()
if (!token) return   // ← silent early exit, photos never uploaded
```

Because `window.__clerkGetToken` is set inside `App.tsx useEffect`, which runs after
React renders, the token is NOT available at page load. The function bails silently.

The `online` event fires when the user reconnects. At that point, if Clerk is loaded, the
token IS available — so this SHOULD work. But the screenshots show the POST /properties
returned 201 AFTER the app loaded — meaning the form was submitted ONLINE (the sync ran
immediately), but with `images: []` — because the photos had already been removed from the
upload queue via `uploadManager.clear('images')` before they were uploaded.

## Root Cause #2 — Photos submitted with empty images array (Primary Bug)

Looking at the network tab: `properties` returned 201. This means the property was
already submitted successfully ONLINE, not via offline sync. The user added photos offline,
came back online, and submitted the form while online. But `images = getUploadedIds()` which
returns `__queued__:uuid` for photos still being processed. The form then POSTed with
`images: ['__queued__:uuid1', '__queued__:uuid2']` — these invalid IDs are stored in the DB.

Actually — `getUploadedIds` returns strings starting with `__queued__:` for items with
status='queued'. These go into the API payload as the images array. The API just stores
them as-is in the Postgres `images` text[] column. So the DB has
`images = ['__queued__:abc123']` which is NOT a valid Cloudinary public ID.

## Root Cause #3 — API does NOT validate Cloudinary public ID format

The `POST /properties` route accepts any string in the `images` array. It stores whatever
is passed. So `__queued__:abc123` ends up in the database, and Cloudinary returns a broken
image URL when the admin tries to render it.

## Fixes Required

1. **Filter out `__queued__:` prefixed IDs from the API payload** — only submit real
   Cloudinary public IDs. If images aren't uploaded yet, submit empty array.

2. **After the POST succeeds, check if there are still pending uploads** for those local IDs
   and patch the property with their Cloudinary IDs once they upload successfully.
   This is exactly what `PATCH /uploads/patch-queued` does — use it for the online case too.

3. **The offline sync flow is architecturally sound** — but `flushPendingRecordsForeground`
   being called before Clerk is ready means the first attempt always silently fails. Fix:
   call `flushPendingRecordsForeground` from inside the Clerk-aware `App.tsx` `useEffect`
   instead of (or in addition to) the bare `window.addEventListener('online')` in `main.tsx`.

## Assumptions Debunked

- Initial assumption: the IDB blobs are being destroyed. FALSE — blobs persist in IDB.
- Initial assumption: `updateRecordId` fails. FALSE — the logic is correct.
- The real bug: `__queued__:uuid` strings pass through the API as if they are valid
  Cloudinary IDs, and are stored in the DB. They render broken images.
