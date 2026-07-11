// Service Worker — handles offline upload queue via Background Sync API

const API_BASE = self.__VITE_API_BASE ?? 'http://localhost:4001/api/v1'

self.addEventListener('sync', (event) => {
  if (event.tag === 'upload-queue') {
    event.waitUntil(flushUploadQueue())
  }
})

async function flushUploadQueue() {
  const { getPendingUploads, removePendingUpload, incrementAttempts } = await import('/src/lib/uploadQueue.js').catch(() => null) ?? {}
  if (!getPendingUploads) return

  const pending = await getPendingUploads()

  for (const item of pending) {
    if (item.attempts >= 5) continue  // give up after 5 failures

    try {
      // 1. Get a fresh Cloudinary signature from API
      const sigRes = await fetch(`${API_BASE}/uploads/sign?folder=${item.folder}`, {
        headers: { Authorization: `Bearer ${await getStoredToken()}` }
      })
      if (!sigRes.ok) { await incrementAttempts(item.id); continue }

      const { signature, timestamp, apiKey, cloudName, folder, maxBytes } = await sigRes.json()

      // 2. Upload blob to Cloudinary
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
        const patchRes = await fetch(`${API_BASE}/uploads/patch-queued`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await getStoredToken()}` },
          body: JSON.stringify({ model: item.model, recordId: item.recordId, fieldName: item.fieldName, publicId }),
        })
        if (!patchRes.ok) { await incrementAttempts(item.id); continue }
      }

      await removePendingUpload(item.id)

    } catch {
      await incrementAttempts(item.id)
    }
  }
}

async function getStoredToken() {
  // Read Clerk token from IndexedDB where it was stored by the app
  // This is set in main.tsx via window.__clerkGetToken
  try {
    const db = await indexedDB.open('carry-clerk-token', 1)
    // Simplified — in production use idb and store token on refresh
    return null  // The app handles re-auth when SW-patched items are viewed
  } catch {
    return null
  }
}
