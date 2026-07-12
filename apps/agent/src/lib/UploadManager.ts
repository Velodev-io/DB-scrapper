import { compressImage } from './compress'
import { enqueuePendingUpload } from './uploadQueue'
import { generateUUID } from './uuid'

export type PhotoStatus = 'waiting' | 'compressing' | 'uploading' | 'done' | 'queued' | 'failed'

export interface PhotoItem {
  id:            string
  scope:         string
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
  if (!navigator.onLine) return 1
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
  private listeners:     Record<string, Listener[]> = {}

  subscribe(scope: string, fn: Listener) {
    if (!this.listeners[scope]) {
      this.listeners[scope] = []
    }
    this.listeners[scope].push(fn)
    // Emit initial state
    fn(this.queue.filter(p => p.scope === scope))
    return () => {
      this.listeners[scope] = (this.listeners[scope] || []).filter(l => l !== fn)
    }
  }

  private emit(scope: string) {
    const snapshot = this.queue.filter(p => p.scope === scope)
    const list = this.listeners[scope] || []
    list.forEach(fn => fn(snapshot))
  }

  addPhotos(files: File[], scope: string) {
    const newItems: PhotoItem[] = files.map(file => ({
      id:      generateUUID(),
      scope,
      file,
      preview: URL.createObjectURL(file),
      status:  'waiting',
      progress: 0,
    }))
    this.queue.push(...newItems)
    this.emit(scope)
    newItems.forEach(() => this.tryStartWorker(scope))
  }

  removePhoto(id: string, scope: string) {
    const item = this.queue.find(p => p.id === id)
    if (item?.preview) URL.revokeObjectURL(item.preview)
    this.queue = this.queue.filter(p => p.id !== id)
    this.emit(scope)
  }

  retry(id: string, scope: string) {
    this.updatePhoto(id, { status: 'waiting', progress: 0, error: undefined }, scope)
    this.tryStartWorker(scope)
  }

  getPhotos(scope: string)       { return this.queue.filter(p => p.scope === scope) }
  
  getUploadedIds(scope: string)  { 
    return this.queue
      .filter(p => p.scope === scope && (p.status === 'done' || p.status === 'queued'))
      .map(p => p.cloudinaryId ?? `__queued__:${p.id}`) 
  }
  
  hasAllSettled(scope: string)   { 
    return this.queue
      .filter(p => p.scope === scope)
      .every(p => ['done','queued','failed'].includes(p.status)) 
  }

  clear(scope: string) {
    const items = this.queue.filter(p => p.scope === scope)
    items.forEach(p => {
      if (p.preview) URL.revokeObjectURL(p.preview)
    })
    this.queue = this.queue.filter(p => p.scope !== scope)
    this.emit(scope)
  }

  private tryStartWorker(scope: string) {
    const max  = getAdaptiveMaxWorkers()
    if (this.activeWorkers >= max) return
    const next = this.queue.find(p => p.scope === scope && p.status === 'waiting')
    if (!next) return
    this.activeWorkers++
    this.processItem(next).finally(() => {
      this.activeWorkers--
      this.tryStartWorker(scope)
    })
  }

  private async processItem(item: PhotoItem) {
    try {
      this.updatePhoto(item.id, { status: 'compressing', progress: 0 }, item.scope)
      const blob = await compressImage(item.file)
      this.updatePhoto(item.id, { progress: 10 }, item.scope)

      let model: 'property' | 'project' | 'labour' | 'shop' = 'property'
      let fieldName = 'images'
      let folder = 'properties'

      if (item.scope === 'floorPlanUrl' || item.scope.includes('floor')) {
        model = 'property'
        fieldName = 'floorPlanUrl'
        folder = 'properties'
      } else if (item.scope === 'beforeImages' || item.scope.includes('before')) {
        model = 'project'
        fieldName = 'beforeImages'
        folder = 'projects'
      } else if (item.scope === 'afterImages' || item.scope.includes('after')) {
        model = 'project'
        fieldName = 'afterImages'
        folder = 'projects'
      } else if (item.scope === 'stageImages' || item.scope.includes('stage')) {
        model = 'project'
        fieldName = 'stageImages'
        folder = 'projects'
      } else if (item.scope === 'profilePhotoUrl' || item.scope.includes('profile')) {
        model = 'labour'
        fieldName = 'profilePhotoUrl'
        folder = 'labour'
      } else if (item.scope === 'shopImages' || item.scope.includes('shop')) {
        model = 'shop'
        fieldName = 'images'
        folder = 'shops'
      }

      if (!navigator.onLine) {
        await enqueuePendingUpload({
          localId: item.id, model, recordId: '__pending__',
          fieldName, blob, fileName: item.file.name,
          folder, createdAt: Date.now(), attempts: 0,
        })
        this.updatePhoto(item.id, { status: 'queued', progress: 100 }, item.scope)
        const reg = await navigator.serviceWorker?.ready
        await (reg as any)?.sync?.register('upload-queue')
        return
      }

      this.updatePhoto(item.id, { status: 'uploading', progress: 10 }, item.scope)
      const publicId = await this.doCloudinaryUpload(blob, item.file.name, item.id, folder, (pct) => {
        this.updatePhoto(item.id, { progress: 10 + pct * 0.9 }, item.scope)
      })
      this.updatePhoto(item.id, { status: 'done', progress: 100, cloudinaryId: publicId }, item.scope)

    } catch (err) {
      this.updatePhoto(item.id, { status: 'failed', error: 'Upload failed. Tap to retry.' }, item.scope)
    }
  }

  private async doCloudinaryUpload(
    blob: Blob,
    fileName: string,
    _localId: string,
    folder: string,
    onProgress: (pct: number) => void
  ): Promise<string> {
    const base = import.meta.env.VITE_API_BASE
    const { signature, timestamp, apiKey, cloudName, folder: returnedFolder } =
      await fetch(`${base}/uploads/sign?folder=${folder}`, {
        headers: { Authorization: `Bearer ${await window.__clerkGetToken?.()}` }
      }).then(r => r.json())

    const form = new FormData()
    form.append('file', blob, fileName)
    form.append('signature', signature)
    form.append('timestamp', String(timestamp))
    form.append('api_key', apiKey)
    form.append('folder', returnedFolder)

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = e => {
        if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => {
        if (xhr.status === 200) {
          const res = JSON.parse(xhr.responseText)
          resolve(res.public_id)
        } else {
          reject(new Error(xhr.responseText))
        }
      }
      xhr.onerror = () => reject(new Error('Network error during upload'))
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`)
      xhr.send(form)
    })
  }

  private updatePhoto(id: string, patch: Partial<PhotoItem>, scope: string) {
    this.queue = this.queue.map(p => p.id === id ? { ...p, ...patch } : p)
    this.emit(scope)
  }
}

export const uploadManager = new UploadManager()

declare global { interface Window { __clerkGetToken?: () => Promise<string | null> } }
