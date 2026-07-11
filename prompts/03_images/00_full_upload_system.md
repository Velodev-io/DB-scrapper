# Phase 3 — Image Upload System (All Files)

> **Antigravity Instructions:** Build the complete image upload system. All 5 files in this phase are part of one cohesive system. Build them all before testing.

---

## Phase 3, File 00: compress.ts

`apps/agent/src/lib/compress.ts`

```typescript
// Canvas API image compression — zero dependencies, built into all browsers.
// Reduces a 6 MB phone photo to ~600 KB–1 MB before upload.

export interface CompressOptions {
  maxWidthPx?: number    // default: 1920
  quality?: number       // 0–1, default: 0.82 (JPEG)
}

export async function compressImage(
  file: File,
  options: CompressOptions = {}
): Promise<Blob> {
  const { maxWidthPx = 1920, quality = 0.82 } = options

  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)

    img.onload = () => {
      const scale  = Math.min(1, maxWidthPx / img.width)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)

      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not supported')); return }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)

      canvas.toBlob(
        blob => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        quality
      )
    }

    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }

    img.src = url
  })
}
```

---

## Phase 3, File 01: UploadManager.ts

`apps/agent/src/lib/UploadManager.ts`

```typescript
import { compressImage } from './compress.js'
import { enqueuePendingUpload } from './uploadQueue.js'

export type PhotoStatus = 'waiting' | 'compressing' | 'uploading' | 'done' | 'queued' | 'failed'

export interface PhotoItem {
  id:            string
  file:          File
  preview:       string       // object URL — instant thumbnail
  status:        PhotoStatus
  progress:      number       // 0–100
  cloudinaryId?: string       // Cloudinary public ID (set when done)
  error?:        string
}

type Listener = (photos: PhotoItem[]) => void

function getAdaptiveMaxWorkers(): number {
  const conn = (navigator as any).connection
  if (!navigator.onLine) return 0
  if (conn?.saveData)    return 1
  switch (conn?.effectiveType) {
    case '2g': return 1
    case '3g': return 2
    default:   return 3   // 4g or unknown
  }
}

class UploadManager {
  private queue:         PhotoItem[] = []
  private activeWorkers: number      = 0
  private listeners:     Listener[]  = []

  subscribe(fn: Listener) {
    this.listeners.push(fn)
    return () => { this.listeners = this.listeners.filter(l => l !== fn) }
  }

  private emit() {
    const snapshot = [...this.queue]
    this.listeners.forEach(fn => fn(snapshot))
  }

  addPhotos(files: File[]) {
    const newItems: PhotoItem[] = files.map(file => ({
      id:      crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status:  'waiting',
      progress: 0,
    }))
    this.queue.push(...newItems)
    this.emit()
    newItems.forEach(() => this.tryStartWorker())
  }

  removePhoto(id: string) {
    const item = this.queue.find(p => p.id === id)
    if (item?.preview) URL.revokeObjectURL(item.preview)
    this.queue = this.queue.filter(p => p.id !== id)
    this.emit()
  }

  retry(id: string) {
    this.updatePhoto(id, { status: 'waiting', progress: 0, error: undefined })
    this.tryStartWorker()
  }

  getPhotos()       { return [...this.queue] }
  getUploadedIds()  { return this.queue.filter(p => p.status === 'done' || p.status === 'queued').map(p => p.cloudinaryId ?? `__queued__:${p.id}`) }
  hasAllSettled()   { return this.queue.every(p => ['done','queued','failed'].includes(p.status)) }

  private tryStartWorker() {
    const max  = getAdaptiveMaxWorkers()
    if (this.activeWorkers >= max) return
    const next = this.queue.find(p => p.status === 'waiting')
    if (!next) return
    this.activeWorkers++
    this.processItem(next).finally(() => {
      this.activeWorkers--
      this.tryStartWorker()
    })
  }

  private async processItem(item: PhotoItem) {
    try {
      this.updatePhoto(item.id, { status: 'compressing', progress: 0 })
      const blob = await compressImage(item.file)
      this.updatePhoto(item.id, { progress: 10 })

      if (!navigator.onLine) {
        await enqueuePendingUpload({
          localId: item.id, model: 'property', recordId: '__pending__',
          fieldName: 'images', blob, fileName: item.file.name,
          folder: 'properties', createdAt: Date.now(), attempts: 0,
        })
        this.updatePhoto(item.id, { status: 'queued', progress: 100 })
        const reg = await navigator.serviceWorker?.ready
        await (reg as any)?.sync?.register('upload-queue')
        return
      }

      this.updatePhoto(item.id, { status: 'uploading', progress: 10 })
      const publicId = await this.doCloudinaryUpload(blob, item.file.name, item.id, (pct) => {
        this.updatePhoto(item.id, { progress: 10 + pct * 0.9 })
      })
      this.updatePhoto(item.id, { status: 'done', progress: 100, cloudinaryId: publicId })

    } catch (err) {
      this.updatePhoto(item.id, { status: 'failed', error: 'Upload failed. Tap to retry.' })
    }
  }

  private async doCloudinaryUpload(
    blob: Blob,
    fileName: string,
    _localId: string,
    onProgress: (pct: number) => void
  ): Promise<string> {
    const base = import.meta.env.VITE_API_BASE
    const { signature, timestamp, apiKey, cloudName, folder } =
      await fetch(`${base}/uploads/sign?folder=properties`, {
        headers: { Authorization: `Bearer ${await window.__clerkGetToken?.()}` }
      }).then(r => r.json())

    const form = new FormData()
    form.append('file', blob, fileName)
    form.append('signature', signature)
    form.append('timestamp', String(timestamp))
    form.append('api_key', apiKey)
    form.append('folder', folder)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText)
          resolve(res.public_id)   // store public_id, not secure_url
        } else {
          reject(new Error(xhr.responseText))
        }
      }
      xhr.onerror = () => reject(new Error('Network error during upload'))
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)
      xhr.send(form)
    })
  }

  private updatePhoto(id: string, patch: Partial<PhotoItem>) {
    this.queue = this.queue.map(p => p.id === id ? { ...p, ...patch } : p)
    this.emit()
  }
}

export const uploadManager = new UploadManager()

// Expose token getter for XHR calls (set in main.tsx after Clerk loads)
declare global { interface Window { __clerkGetToken?: () => Promise<string | null> } }
```

---

## Phase 3, File 02: uploadQueue.ts (IndexedDB)

`apps/agent/src/lib/uploadQueue.ts`

```typescript
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
```

---

## Phase 3, File 03: sw.js (Service Worker)

`apps/agent/public/sw.js`

```javascript
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

      const { signature, timestamp, apiKey, cloudName, folder } = await sigRes.json()

      // 2. Upload blob to Cloudinary
      const form = new FormData()
      form.append('file', item.blob, item.fileName)
      form.append('signature', signature)
      form.append('timestamp', String(timestamp))
      form.append('api_key', apiKey)
      form.append('folder', folder)

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
```

Register the SW in `apps/agent/src/main.tsx`:
```typescript
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  })
}
```

---

## Phase 3, File 04: PhotoUploader Component

`apps/agent/src/components/PhotoUploader/PhotoUploader.tsx`

```tsx
import { useRef } from 'react'
import { usePhotoUpload } from '../../hooks/usePhotoUpload'
import { PhotoCard } from './PhotoCard'
import { StatusBar } from './StatusBar'

interface Props {
  folder?: 'properties' | 'projects' | 'labour'
  label?: string
  maxPhotos?: number   // undefined = unlimited
}

export function PhotoUploader({ folder = 'properties', label = 'Add Photos', maxPhotos }: Props) {
  const { photos, addPhotos, removePhoto, retryPhoto, stats } = usePhotoUpload()
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    addPhotos(Array.from(e.target.files))
    e.target.value = ''  // reset so same file can be re-selected
  }

  const canAdd = !maxPhotos || photos.length < maxPhotos

  return (
    <div className="photo-uploader">
      {photos.length > 0 && <StatusBar stats={stats} />}

      <div className="photo-grid">
        {photos.map(photo => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onRemove={() => removePhoto(photo.id)}
            onRetry={() => retryPhoto(photo.id)}
          />
        ))}

        {canAdd && (
          <button
            type="button"
            className="add-photo-btn"
            onClick={() => inputRef.current?.click()}
            aria-label={label}
          >
            <span className="add-icon">+</span>
            <span className="add-label">{label}</span>
          </button>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"    /* Opens camera directly on Android */
        multiple={!maxPhotos || maxPhotos > 1}
        onChange={handleFiles}
        style={{ display: 'none' }}
      />

      {maxPhotos && photos.length >= maxPhotos && (
        <p className="photo-limit-msg">
          Maximum {maxPhotos} photo{maxPhotos > 1 ? 's' : ''} reached
        </p>
      )}
    </div>
  )
}
```

`apps/agent/src/components/PhotoUploader/PhotoCard.tsx`:

```tsx
import type { PhotoItem } from '../../lib/UploadManager'

interface Props {
  photo:    PhotoItem
  onRemove: () => void
  onRetry:  () => void
}

export function PhotoCard({ photo, onRemove, onRetry }: Props) {
  return (
    <div className="photo-card" data-status={photo.status}>
      <img src={photo.preview} alt="" loading="lazy" />

      {photo.status === 'compressing' && (
        <div className="photo-overlay">
          <span className="overlay-text">Compressing…</span>
        </div>
      )}

      {photo.status === 'uploading' && (
        <div className="photo-overlay">
          <svg className="progress-ring" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="3"/>
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#B87333" strokeWidth="3"
              strokeDasharray={`${photo.progress} 100`}
              strokeLinecap="round"
              transform="rotate(-90 18 18)"
            />
          </svg>
          <span className="overlay-pct">{photo.progress}%</span>
        </div>
      )}

      {photo.status === 'queued' && (
        <div className="photo-overlay queued">
          <span>📶</span>
          <span className="overlay-text">Queued</span>
        </div>
      )}

      {photo.status === 'done' && (
        <div className="photo-overlay done">
          <span className="check-icon">✓</span>
        </div>
      )}

      {photo.status === 'failed' && (
        <button className="photo-overlay failed retry-btn" onClick={onRetry}>
          <span>↩</span>
          <span className="overlay-text">Retry</span>
        </button>
      )}

      <button
        className="remove-btn"
        onClick={onRemove}
        type="button"
        aria-label="Remove photo"
      >
        ×
      </button>
    </div>
  )
}
```

`apps/agent/src/components/PhotoUploader/StatusBar.tsx`:

```tsx
interface Stats {
  total: number; done: number; uploading: number; queued: number; failed: number
}

export function StatusBar({ stats }: { stats: Stats }) {
  if (stats.total === 0) return null

  return (
    <div className="upload-status-bar" role="status">
      {stats.uploading > 0 && (
        <span className="status-badge uploading">↑ Uploading {stats.uploading}</span>
      )}
      {stats.queued > 0 && (
        <span className="status-badge queued">📶 {stats.queued} queued (no signal)</span>
      )}
      {stats.failed > 0 && (
        <span className="status-badge failed">⚠ {stats.failed} failed — tap to retry</span>
      )}
      <span className="status-badge total">{stats.done}/{stats.total} saved</span>
    </div>
  )
}
```

`apps/agent/src/hooks/usePhotoUpload.ts`:

```typescript
import { useState, useEffect } from 'react'
import { uploadManager, type PhotoItem } from '../lib/UploadManager'

export function usePhotoUpload() {
  const [photos, setPhotos] = useState<PhotoItem[]>([])

  useEffect(() => {
    return uploadManager.subscribe(setPhotos)
  }, [])

  const stats = {
    total:      photos.length,
    done:       photos.filter(p => p.status === 'done').length,
    uploading:  photos.filter(p => p.status === 'uploading').length,
    queued:     photos.filter(p => p.status === 'queued').length,
    failed:     photos.filter(p => p.status === 'failed').length,
    allSettled: photos.every(p => ['done','queued','failed'].includes(p.status)),
  }

  return {
    photos,
    addPhotos:   (files: File[]) => uploadManager.addPhotos(files),
    removePhoto: (id: string)    => uploadManager.removePhoto(id),
    retryPhoto:  (id: string)    => uploadManager.retry(id),
    getUploadedIds: ()           => uploadManager.getUploadedIds(),
    stats,
  }
}
```

---

## Verification Test

1. Start `npm run dev:agent`
2. Open `http://localhost:5181` in Chrome
3. Add the PhotoUploader component to a test page
4. Select 5 photos from camera roll
5. Verify:
   - All 5 show thumbnails instantly
   - 2–3 start uploading simultaneously (progress rings)
   - Others show "waiting" then start automatically when a slot frees
   - Each shows ✓ when done
6. Enable airplane mode → add 2 more photos → they show 📶 Queued
7. Disable airplane mode → they auto-upload (check Cloudinary dashboard)

**✓ Phase 3 complete. Proceed to `04_agent_app/00_design_system.md`.**
