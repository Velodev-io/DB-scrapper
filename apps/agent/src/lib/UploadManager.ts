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
    const { signature, timestamp, apiKey, cloudName, folder, maxBytes } =
      await fetch(`${base}/uploads/sign?folder=properties`, {
        headers: { Authorization: `Bearer ${await window.__clerkGetToken?.()}` }
      }).then(r => r.json())

    const form = new FormData()
    form.append('file', blob, fileName)
    form.append('signature', signature)
    form.append('timestamp', String(timestamp))
    form.append('api_key', apiKey)
    form.append('folder', folder)
    if (maxBytes) {
      form.append('max_bytes', String(maxBytes))
    }

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
