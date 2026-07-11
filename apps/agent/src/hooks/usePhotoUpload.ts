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
