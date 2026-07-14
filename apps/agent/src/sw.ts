/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { openDB } from 'idb'

declare let self: ServiceWorkerGlobalScope

// ── Precache app shell ────────────────────────────────────────────────────────
// vite-plugin-pwa injects the manifest into self.__WB_MANIFEST at build time.
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Runtime caching strategy ─────────────────────────────────────────────────
// API calls: NetworkFirst (try network, fall back to cache)
registerRoute(
  ({ url }) => url.pathname.startsWith('/api/'),
  new NetworkFirst({ cacheName: 'api-cache', networkTimeoutSeconds: 5 })
)

// Static assets: CacheFirst (fonts, images already in Cloudinary)
registerRoute(
  ({ request }) => request.destination === 'font',
  new CacheFirst({ cacheName: 'fonts-cache' })
)

// ── Background Sync: Full sync (photos + records) ────────────────────────────
// SyncEvent is not in the standard lib.webworker.d.ts — cast to any.
self.addEventListener('sync', ((event: any) => {
  if (event.tag === 'carry-full-sync' || event.tag === 'upload-queue') {
    event.waitUntil(runFullSync())
  }
}) as EventListener)

// ── Skip waiting immediately on update ───────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

// ── Full sync logic ───────────────────────────────────────────────────────────
async function runFullSync(): Promise<void> {
  const token = await loadAuthToken()
  if (!token) return  // App will sync on next open with foreground flush

  const base = 'https://carry-api.vercel.app/api/v1'  // injected at build; fallback here

  try {
    await flushPendingUploadsSW(token, base)
    await flushPendingRecordsSW(token, base)
    await updateBadgeSW()
  } catch {
    // Re-register sync to retry later
    await (self.registration as any).sync?.register('carry-full-sync').catch(() => {})
  }
}

// ── Auth token (mirrors uploadQueue.ts) ──────────────────────────────────────
async function loadAuthToken(): Promise<string | null> {
  try {
    const db = await openDB('carry-auth', 1)
    const entry = await db.get('auth', 'jwt') as { token: string, storedAt: number } | undefined
    if (!entry) return null
    if (Date.now() - entry.storedAt > 55 * 60 * 1000) return null
    return entry.token
  } catch {
    return null
  }
}

// ── Upload queue helpers (mirrors uploadQueue.ts for SW context) ──────────────
async function getUploadDb() {
  return openDB('carry-upload-queue', 2, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
      if (oldVersion < 2) db.createObjectStore('pending-records', { keyPath: 'id' })
    },
  })
}

async function flushPendingUploadsSW(token: string, base: string): Promise<void> {
  const db = await getUploadDb()
  const pending = await db.getAll('pending') as any[]

  for (const item of pending) {
    if (!item.id || item.attempts >= 5) continue
    // Skip items that belong to temp records (those are handled in flushPendingRecordsSW)
    if (item.recordId === '__pending__' || item.recordId?.startsWith('temp-')) continue

    try {
      const sigRes = await fetch(`${base}/uploads/sign?folder=${item.folder}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!sigRes.ok) { await incrementAttemptsSW(db, item.id); continue }
      const { signature, timestamp, apiKey, cloudName, folder, maxBytes } = await sigRes.json()

      const form = new FormData()
      form.append('file', item.blob, item.fileName)
      form.append('signature', signature)
      form.append('timestamp', String(timestamp))
      form.append('api_key', apiKey)
      form.append('folder', folder)
      if (maxBytes) form.append('max_bytes', String(maxBytes))

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST', body: form
      })
      if (!uploadRes.ok) { await incrementAttemptsSW(db, item.id); continue }
      const { public_id: publicId } = await uploadRes.json()

      const patchRes = await fetch(`${base}/uploads/patch-queued`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ model: item.model, recordId: item.recordId, fieldName: item.fieldName, publicId }),
      })
      if (!patchRes.ok) { await incrementAttemptsSW(db, item.id); continue }

      await db.delete('pending', item.id)
    } catch {
      await incrementAttemptsSW(db, item.id)
    }
  }
}

async function flushPendingRecordsSW(token: string, base: string): Promise<void> {
  const db = await getUploadDb()
  const pendingUploads = await db.getAll('pending') as any[]
  const pendingRecords = await db.getAll('pending-records') as any[]

  // Step 1: Upload photo blobs belonging to temp offline records
  for (const upload of pendingUploads) {
    if (!upload.recordId?.startsWith('temp-')) continue
    if (upload.publicId || upload.attempts >= 5 || !upload.id) continue
    try {
      const sigRes = await fetch(`${base}/uploads/sign?folder=${upload.folder}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!sigRes.ok) { await incrementAttemptsSW(db, upload.id); continue }
      const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json()

      const form = new FormData()
      form.append('file', upload.blob, upload.fileName)
      form.append('signature', signature)
      form.append('timestamp', String(timestamp))
      form.append('api_key', apiKey)
      form.append('folder', folder)

      const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST', body: form
      })
      if (!uploadRes.ok) { await incrementAttemptsSW(db, upload.id); continue }
      const { public_id: publicId } = await uploadRes.json()

      await db.put('pending', { ...upload, publicId })
    } catch {
      await incrementAttemptsSW(db, upload.id)
    }
  }

  // Step 2: Submit records whose photos are all uploaded
  const freshUploads = await db.getAll('pending') as any[]
  for (const record of pendingRecords) {
    try {
      const payload = { ...record.payload }
      let allPhotosReady = true

      if (record.type === 'property') {
        const resolvedImages: string[] = []
        for (const localId of (payload.images || [])) {
          const cleanId = localId.replace('__queued__:', '')
          const u = freshUploads.find((u: any) => u.localId === cleanId)
          if (u?.publicId) resolvedImages.push(u.publicId)
          else { allPhotosReady = false; break }
        }
        payload.images = resolvedImages
        if (payload.floorPlanUrl) {
          const cleanId = payload.floorPlanUrl.replace('__queued__:', '')
          const u = freshUploads.find((u: any) => u.localId === cleanId)
          if (u?.publicId) payload.floorPlanUrl = u.publicId
          else allPhotosReady = false
        }
      } else if (record.type === 'labour') {
        if (payload.profilePhotoUrl) {
          const cleanId = payload.profilePhotoUrl.replace('__queued__:', '')
          const u = freshUploads.find((u: any) => u.localId === cleanId)
          if (u?.publicId) payload.profilePhotoUrl = u.publicId
          else allPhotosReady = false
        }
      } else if (record.type === 'shop') {
        const resolvedImages: string[] = []
        for (const localId of (payload.images || [])) {
          const cleanId = localId.replace('__queued__:', '')
          const u = freshUploads.find((u: any) => u.localId === cleanId)
          if (u?.publicId) resolvedImages.push(u.publicId)
          else { allPhotosReady = false; break }
        }
        payload.images = resolvedImages
      }

      if (!allPhotosReady) continue

      const endpoint = record.type === 'property' ? '/properties'
        : record.type === 'shop' ? '/shops'
        : '/labour'

      const res = await fetch(`${base}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      })

      if (res.ok) {
        // Clean up associated uploads
        const imageLocalIds = record.payload.images || []
        const photoUrls = [
          ...imageLocalIds,
          record.payload.floorPlanUrl,
          record.payload.profilePhotoUrl,
        ].filter(Boolean)

        for (const localId of photoUrls) {
          const cleanId = localId.replace('__queued__:', '')
          const upload = freshUploads.find((u: any) => u.localId === cleanId)
          if (upload?.id) await db.delete('pending', upload.id)
        }

        await db.delete('pending-records', record.id)
      }
    } catch {
      // Will retry on next sync event
    }
  }
}

async function incrementAttemptsSW(db: any, id: number): Promise<void> {
  const item = await db.get('pending', id)
  if (item) await db.put('pending', { ...item, attempts: item.attempts + 1 })
}

// ── Badge update ──────────────────────────────────────────────────────────────
async function updateBadgeSW(): Promise<void> {
  try {
    const db = await getUploadDb()
    const [uploads, records] = await Promise.all([
      db.getAll('pending'),
      db.getAll('pending-records'),
    ])
    const total = uploads.length + records.length
    if ('setAppBadge' in self) {
      if (total > 0) await (self as any).setAppBadge(total)
      else await (self as any).clearAppBadge()
    }
  } catch {
    // Ignore
  }
}
