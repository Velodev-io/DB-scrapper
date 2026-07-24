# Learnings — labour photo never attaches (online) + offline record invisible

## Bug 1 root cause (CONFIRMED): POST /labour drops the client-generated id

The whole offline-first design hinges on the client generating the record UUID
(`recordId = generateUUID()` in each `new.tsx`) and the server persisting it:

- `properties.ts:46` — `const id = clientId || crypto.randomBytes(...)` ✓
- `shops.ts:43` — `if (clientId) data.id = clientId` ✓
- `labour.ts` — destructures `id: clientId` **but never puts it in `data`** ✗
  → Prisma mints a fresh `cuid()` (`schema.prisma:124`), so the server-side labour
  record has a different id than the one the app knows.

Failure chain for an **online** submission with a photo:

1. `SinglePhotoPicker` enqueues the photo into `pending_uploads` and puts
   `__queued__:<localId>` in the form.
2. `labour/new.tsx` POSTs the record with the placeholder stripped → 201, record
   appears in admin (this is why "Test online mode" IS in the dashboard).
3. `flushPendingUploads` uploads the photo to Cloudinary (succeeds), then
   `PATCH /uploads/patch-queued { model: 'labour', recordId: <client UUID> }`.
4. Server: `prisma.labour.findFirst({ where: { id: recordId, agent: { clerkUserId } } })`
   → no row (the record's real id is the server cuid) → **404 "Labour record not
   found or not yours"** → silent `catch` → `incrementUploadAttempts`.
5. Each retry re-uploads the photo to Cloudinary again (orphaning copies) and
   404s again; after `MAX_ATTEMPTS = 5` the upload is skipped forever.

Result: record without photo, exactly as observed. Deterministic; affects **only
labour** (properties/shops persist the client id).

Side effect (same root cause): labour's P2002 idempotency catch is dead code —
without `id` in `data` no unique-id conflict can fire, so a request that succeeds
server-side but fails to round-trip (timeout) gets re-POSTed by the queue and
**duplicates** the labour record instead of returning the existing one.

## Bug 2 (offline record):

Two independent confirmed defects, plus one device-state unknown:

1. **Stuck "Pending Sync" rows ("Test name", "Test user")** — their queued photo
   uploads accumulated `attempts >= 5` during yesterday's 401-wall era. Automatic
   syncs (mount check, reconnect listener, background task) respect the cap by
   design; `flushPendingRecords` Step 1 skips the capped upload → `resolveId`
   returns null → `continue` → the record never POSTs. Recovery already exists in
   the working tree: NetworkBanner "Retry" and Profile → "Retry Failed Records"
   both call `resetStuckUploads()` first. Auth now works (deployed API 401s
   anonymous probes; authed POST proven by the admin record), so a manual retry
   should drain these — **provided the cached photo files still exist** (see
   risk below).
2. **List staleness (fixed this session)** — all three list screens loaded
   pending records only on mount; a record enqueued after the tab first mounted
   stayed invisible for the entire session. Now reloads on focus via
   `useFocusEffect`.
3. **Unknown (device state)**: whether the "offline test …" row is still in
   `pending_records`. Code shows no path that deletes a pending record without a
   successful POST, and an offline submit always enqueues before showing the
   alert. Most likely explanations: (a) it's actually one of the two visible
   "Test …" pending rows under a misremembered name, or (b) it was created in a
   different install (Expo Go vs dev build keep separate SQLite files). The
   Profile screen renders `getPendingRecords()` — check it on-device.

## Latent risk noted (not fixed)

`compress.ts` stores queue photos at the expo-image-manipulator output URI, which
lives in the OS-purgeable **cache** directory. A photo stuck in the queue for days
(like the 401-era ones) may have lost its source file; the upload will then throw
on every retry. Durable fix: copy to `FileSystem.documentDirectory` at enqueue
time and delete after `markUploadComplete`. Related: [[carry-data-loss-incident]].

Also noted: when Cloudinary upload succeeds but the PATCH fails, the retry
re-uploads the file from scratch (can't persist publicId without the row dropping
out of `getPendingUploads`, whose WHERE is `public_id IS NULL`). Acceptable for
now; a `patched` column would separate the two states if it ever matters.

## Fixes applied this session (user explicitly requested fixes)

- `apps/api/src/routes/labour.ts` — `if (clientId) data.id = clientId` (matches
  shops). Makes patch-queued resolve and revives the P2002 dedupe path.
- `apps/agent-native/app/(tabs)/{labour,properties,shops}/index.tsx` —
  `useFocusEffect` reloads pending rows on tab focus.
- `tsc --noEmit` clean in both `apps/api` and `apps/agent-native`.

## Deploy dependency (critical)

The labour.ts fix is server-side: **it does nothing until committed and deployed
to Vercel** (`carry-api-pink.vercel.app`). The app always talks to the deployed
API. Photos for labour records created *before* the deploy are unrecoverable via
sync (their client ids match nothing server-side) — delete those test records in
admin and re-create.
