import { useRef, useState, useEffect } from 'react'
import { usePhotoUpload } from '../../hooks/usePhotoUpload'
import { PhotoCard } from './PhotoCard'
import { StatusBar } from './StatusBar'
import './PhotoUploader.css'

interface Props {
  folder?: 'properties' | 'projects' | 'labour' | 'shops'
  label?: string
  maxPhotos?: number   // undefined = unlimited
  scope?: string
}

export function PhotoUploader({ label = 'Add Photos', maxPhotos, scope = 'default' }: Props) {
  const { photos, addPhotos, removePhoto, retryPhoto, stats } = usePhotoUpload(scope)
  const [showPicker, setShowPicker] = useState(false)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const filesInputRef = useRef<HTMLInputElement>(null)

  // Listen to Escape key to close picker
  useEffect(() => {
    if (!showPicker) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowPicker(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [showPicker])

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return
    const fileList = Array.from(e.target.files)
    
    // Filter to only allow images (by MIME type or standard image file extension)
    const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.heic', '.heif', '.gif', '.tiff']
    const imageFiles = fileList.filter(file => {
      const isImageType = file.type.startsWith('image/')
      const hasImageExt = imageExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
      return isImageType || hasImageExt
    })
    
    if (imageFiles.length < fileList.length) {
      alert('Only image files are allowed.')
    }
    
    if (imageFiles.length > 0) {
      addPhotos(imageFiles)
    }
    
    e.target.value = ''  // reset so same file can be re-selected
    setShowPicker(false) // close picker on selection
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
            onClick={() => setShowPicker(true)}
            aria-label={label}
          >
            <span className="add-icon">+</span>
            <span className="add-label">{label}</span>
          </button>
        )}
      </div>

      {/* Hidden file inputs for specific options */}
      {/* 1. Camera Input */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFiles}
        style={{ display: 'none' }}
      />

      {/* 2. Photo Library Input */}
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        multiple={!maxPhotos || maxPhotos > 1}
        onChange={handleFiles}
        style={{ display: 'none' }}
      />

      {/* 3. Files Input */}
      <input
        ref={filesInputRef}
        type="file"
        accept="image/*,application/octet-stream"
        multiple={!maxPhotos || maxPhotos > 1}
        onChange={handleFiles}
        style={{ display: 'none' }}
      />

      {/* Source Selection Bottom Sheet */}
      {showPicker && (
        <>
          <div className="photo-picker-backdrop" onClick={() => setShowPicker(false)} />
          <div className="photo-picker-sheet" role="dialog" aria-modal="true">
            <div className="photo-picker-header">
              <h4 className="photo-picker-title">Add photo from</h4>
              <button 
                type="button" 
                className="photo-picker-close-btn" 
                onClick={() => setShowPicker(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <div className="photo-picker-options">
              <button
                type="button"
                className="photo-picker-option"
                onClick={(e) => {
                  e.stopPropagation()
                  cameraInputRef.current?.click()
                  setShowPicker(false)
                }}
              >
                <span className="photo-picker-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="13" r="4"/>
                  </svg>
                </span>
                Take Photo
              </button>

              <button
                type="button"
                className="photo-picker-option"
                onClick={(e) => {
                  e.stopPropagation()
                  libraryInputRef.current?.click()
                  setShowPicker(false)
                }}
              >
                <span className="photo-picker-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </span>
                Photo Library
              </button>

              <button
                type="button"
                className="photo-picker-option"
                onClick={(e) => {
                  e.stopPropagation()
                  filesInputRef.current?.click()
                  setShowPicker(false)
                }}
              >
                <span className="photo-picker-option-icon">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                </span>
                Browse Files
              </button>
            </div>
            
            <button
              type="button"
              className="photo-picker-cancel-btn"
              onClick={() => setShowPicker(false)}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {maxPhotos && photos.length >= maxPhotos && (
        <p className="photo-limit-msg">
          Maximum {maxPhotos} photo{maxPhotos > 1 ? 's' : ''} reached
        </p>
      )}
    </div>
  )
}
export default PhotoUploader;
