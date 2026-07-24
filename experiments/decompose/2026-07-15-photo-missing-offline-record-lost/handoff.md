# Hand-off — labour photo attach + offline record visibility

**Status**: Root causes confirmed and code fixes applied in the working tree
(user asked for fixes, so this session went past the usual investigate-only
scope). `tsc --noEmit` clean in `apps/api` and `apps/agent-native`.
**Blocked on**: commit + deploy of `apps/api` (Vercel serves committed code only),
and two on-device checks below.

## What was fixed

1. [labour.ts](../../../apps/api/src/routes/labour.ts) — POST /labour now persists
   the client-generated `id` (was silently dropped; properties/shops already did
   this). Root cause of "photo never attaches even online": the follow-up
   `PATCH /uploads/patch-queued` looks the record up by the client UUID and 404ed
   forever. Also un-deadens the P2002 duplicate-submit guard.
2. `apps/agent-native/app/(tabs)/{labour,properties,shops}/index.tsx` — pending
   rows now reload on every tab focus (`useFocusEffect`), not just first mount.

## Remaining steps (in order)

1. **Deploy the API fix** — until `labour.ts` is committed and live on
   `carry-api-pink.vercel.app`, online labour photos keep failing exactly as before.
2. On the phone, after the deploy: Profile → "Retry Failed Records" (resets the
   maxed-out `attempts` counters from the 401 era, then full-syncs). "Test name" /
   "Test user" should drain. If their photos error, the cached source files may
   have been purged (see risk 1 below) — records will then sync without photos
   only if the payload's `__queued__` placeholder is cleared; otherwise they stay
   stuck and need a small recovery patch.
3. Check Profile screen's pending list for the "offline test …" record. If absent
   there AND absent in admin, it was almost certainly created in a different
   install (Expo Go vs dev build = separate SQLite DBs) or is one of the two
   "Test …" rows under a misremembered name. No code path deletes a pending
   record without a successful POST.
4. Old photo-less labour records on the server (e.g. "Test online mode") are
   unrecoverable via sync — their ids don't match the app's queue. Delete in
   admin, re-create after deploy.

## Known latent risks (not fixed, decide separately)

1. Queued photo files live in the OS-purgeable cache dir (`compress.ts` /
   expo-image-manipulator output). Copy to `FileSystem.documentDirectory` at
   enqueue, delete on `markUploadComplete`. Ties into [[carry-data-loss-incident]].
2. Cloudinary re-upload orphans: each failed PATCH retry re-uploads the image
   (publicId can't be persisted mid-flow because `getPendingUploads` filters
   `public_id IS NULL`). Cosmetic/storage-cost only.

## Verification after deploy

1. Online: create labour with photo → no "Saved Offline" alert, photo visible in
   admin within one sync (the post-submit `flushPendingUploads` patch).
2. Offline: airplane mode, create labour with photo → appears in list with
   "Pending Sync" immediately (focus fix); re-enable data → reconnect sync drains
   it, photo present in admin (offline path carries the publicId in the POST).
3. Retry the two stuck records per step 2 above.
