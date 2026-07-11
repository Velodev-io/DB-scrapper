import { useRef } from 'react'
import { usePhotoUpload } from '../../hooks/usePhotoUpload'
import { PhotoCard } from './PhotoCard'
import { StatusBar } from './StatusBar'
import './PhotoUploader.css'

interface Props {
  folder?: 'properties' | 'projects' | 'labour'
  label?: string
  maxPhotos?: number   // undefined = unlimited
  scope?: string
}

export function PhotoUploader({ label = 'Add Photos', maxPhotos, scope = 'default' }: Props) {
  const { photos, addPhotos, removePhoto, retryPhoto, stats } = usePhotoUpload(scope)
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
export default PhotoUploader;
