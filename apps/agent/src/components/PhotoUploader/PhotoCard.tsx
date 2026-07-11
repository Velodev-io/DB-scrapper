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
        <button className="photo-overlay failed retry-btn" onClick={onRetry} type="button">
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
