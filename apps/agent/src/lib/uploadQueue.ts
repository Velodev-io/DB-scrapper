import { openDB } from 'idb'

export interface PendingUpload {
  id?:       number
  localId:   string
  model:     'property' | 'project' | 'labour'
  recordId:  string
  fieldName: string
  blob:      Blob
  fileName:  string
  folder:    string
  createdAt: number
  attempts:  number
  publicId?: string
}

export interface PendingRecord {
  id:        string
  type:      'property' | 'labour'
  payload:   any
  createdAt: number
}

const dbPromise = openDB('carry-upload-queue', 2, {
  upgrade(db, oldVersion) {
    if (oldVersion < 1) {
      db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
    }
    if (oldVersion < 2) {
      db.createObjectStore('pending-records', { keyPath: 'id' })
    }
  },
})

export async function enqueuePendingUpload(item: Omit<PendingUpload, 'id'>) {
  return (await dbPromise).add('pending', item)
}

export async function getPendingUploads(): Promise<PendingUpload[]> {
  return (await dbPromise).getAll('pending')
}

export async function removePendingUpload(id: number) {
  return (await dbPromise).delete('pending', id)
}

export async function incrementAttempts(id: number) {
  const db   = await dbPromise
  const item = await db.get('pending', id) as PendingUpload
  if (item) await db.put('pending', { ...item, attempts: item.attempts + 1 })
}

export async function updateRecordId(localId: string, recordId: string) {
  const db    = await dbPromise
  const all   = await db.getAll('pending') as PendingUpload[]
  const items = all.filter(i => i.localId === localId && i.recordId === '__pending__')
  for (const item of items) {
    await db.put('pending', { ...item, recordId })
  }
}

export async function enqueuePendingRecord(record: PendingRecord) {
  return (await dbPromise).put('pending-records', record)
}

export async function getPendingRecords(): Promise<PendingRecord[]> {
  return (await dbPromise).getAll('pending-records')
}

export async function removePendingRecord(id: string) {
  return (await dbPromise).delete('pending-records', id)
}

export async function updatePendingUploadPublicId(localId: string, publicId: string) {
  const db = await dbPromise
  const all = await db.getAll('pending') as PendingUpload[]
  const item = all.find(i => i.localId === localId)
  if (item) {
    await db.put('pending', { ...item, publicId })
  }
}

export async function getPublicIdForLocalId(localId: string): Promise<string | undefined> {
  const db = await dbPromise
  const all = await db.getAll('pending') as PendingUpload[]
  const item = all.find(i => i.localId === localId)
  return item?.publicId
}

// Foreground queue flusher (essential fallback for iOS PWAs and Capacitor WebViews)
let isFlushing = false
export async function flushUploadQueueForeground() {
  if (isFlushing || !navigator.onLine) return
  isFlushing = true

  try {
    const pending = await getPendingUploads()
    if (pending.length === 0) return

    const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:4001/api/v1'
    const token = await window.__clerkGetToken?.()
    if (!token) return  // Wait for authentication token

    for (const item of pending) {
      if (item.attempts >= 5 || !item.id) continue
      // Skip offline-queued items that are managed by flushPendingRecordsForeground
      if (item.recordId.startsWith('temp-')) continue

      try {
        // 1. Get signed Cloudinary credentials
        const sigRes = await fetch(`${base}/uploads/sign?folder=${item.folder}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!sigRes.ok) { await incrementAttempts(item.id); continue }
        const { signature, timestamp, apiKey, cloudName, folder, maxBytes } = await sigRes.json()

        // 2. Upload to Cloudinary
        const form = new FormData()
        form.append('file', item.blob, item.fileName)
        form.append('signature', signature)
        form.append('timestamp', String(timestamp))
        form.append('api_key', apiKey)
        form.append('folder', folder)
        if (maxBytes) {
          form.append('max_bytes', String(maxBytes))
        }

        const uploadRes = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST', body: form
        })
        if (!uploadRes.ok) { await incrementAttempts(item.id); continue }
        const { public_id: publicId } = await uploadRes.json()

        // 3. Patch the DB record
        if (item.recordId !== '__pending__') {
          const patchRes = await fetch(`${base}/uploads/patch-queued`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ model: item.model, recordId: item.recordId, fieldName: item.fieldName, publicId }),
          })
          if (!patchRes.ok) { await incrementAttempts(item.id); continue }
        }

        await removePendingUpload(item.id)
      } catch (err) {
        await incrementAttempts(item.id)
      }
    }
  } finally {
    isFlushing = false
  }
}

let isFlushingRecords = false
export async function flushPendingRecordsForeground() {
  if (isFlushingRecords || !navigator.onLine) return
  isFlushingRecords = true

  try {
    const token = await window.__clerkGetToken?.()
    if (!token) return

    const pendingUploads = await getPendingUploads()
    const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:4001/api/v1'

    // 1. Process files that belong to temp offline records
    for (const upload of pendingUploads) {
      if (!upload.recordId.startsWith('temp-')) continue
      if (upload.publicId || upload.attempts >= 5 || !upload.id) continue

      try {
        const sigRes = await fetch(`${base}/uploads/sign?folder=${upload.folder}`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!sigRes.ok) { await incrementAttempts(upload.id); continue }
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
        if (!uploadRes.ok) { await incrementAttempts(upload.id); continue }
        const { public_id: publicId } = await uploadRes.json()

        await updatePendingUploadPublicId(upload.localId, publicId)
      } catch {
        await incrementAttempts(upload.id)
      }
    }

    // 2. Fetch fresh pending records list and try to submit finalized records
    const pendingRecords = await getPendingRecords()
    for (const record of pendingRecords) {
      try {
        const payload = { ...record.payload }
        let allPhotosReady = true

        if (record.type === 'property') {
          const imageLocalIds = payload.images || []
          const resolvedImages: string[] = []
          for (const localId of imageLocalIds) {
            const cleanedId = localId.startsWith('__queued__:') ? localId.replace('__queued__:', '') : localId
            const pubId = await getPublicIdForLocalId(cleanedId)
            if (pubId) {
              resolvedImages.push(pubId)
            } else {
              allPhotosReady = false
              break
            }
          }
          payload.images = resolvedImages

          if (payload.floorPlanUrl) {
            const cleanedId = payload.floorPlanUrl.startsWith('__queued__:') ? payload.floorPlanUrl.replace('__queued__:', '') : payload.floorPlanUrl
            const pubId = await getPublicIdForLocalId(cleanedId)
            if (pubId) {
              payload.floorPlanUrl = pubId
            } else {
              allPhotosReady = false
            }
          }
        } else if (record.type === 'labour') {
          if (payload.profilePhotoUrl) {
            const cleanedId = payload.profilePhotoUrl.startsWith('__queued__:') ? payload.profilePhotoUrl.replace('__queued__:', '') : payload.profilePhotoUrl
            const pubId = await getPublicIdForLocalId(cleanedId)
            if (pubId) {
              payload.profilePhotoUrl = pubId
            } else {
              allPhotosReady = false
            }
          }
        }

        if (!allPhotosReady) continue

        // Submit finalized form payload to backend
        const endpoint = record.type === 'property' ? '/properties' : '/labour'
        const res = await fetch(`${base}${endpoint}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        })

        if (res.ok) {
          // Clean up the synced pending uploads
          if (record.type === 'property') {
            const imageLocalIds = record.payload.images || []
            for (const localId of imageLocalIds) {
              const cleanedId = localId.startsWith('__queued__:') ? localId.replace('__queued__:', '') : localId
              const upload = pendingUploads.find(u => u.localId === cleanedId)
              if (upload?.id) await removePendingUpload(upload.id)
            }
            if (record.payload.floorPlanUrl) {
              const cleanedId = record.payload.floorPlanUrl.startsWith('__queued__:') ? record.payload.floorPlanUrl.replace('__queued__:', '') : record.payload.floorPlanUrl
              const upload = pendingUploads.find(u => u.localId === cleanedId)
              if (upload?.id) await removePendingUpload(upload.id)
            }
          } else if (record.type === 'labour') {
            if (record.payload.profilePhotoUrl) {
              const cleanedId = record.payload.profilePhotoUrl.startsWith('__queued__:') ? record.payload.profilePhotoUrl.replace('__queued__:', '') : record.payload.profilePhotoUrl
              const upload = pendingUploads.find(u => u.localId === cleanedId)
              if (upload?.id) await removePendingUpload(upload.id)
            }
          }

          // Clean up the synced record
          await removePendingRecord(record.id)
        }
      } catch (err) {
        // Retry on next loop
      }
    }
  } finally {
    isFlushingRecords = false
  }
}
