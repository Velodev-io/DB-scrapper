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
}

const dbPromise = openDB('carry-upload-queue', 1, {
  upgrade(db) {
    db.createObjectStore('pending', { keyPath: 'id', autoIncrement: true })
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
