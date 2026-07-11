import { useState } from 'react'

interface Props {
  lat?: number
  lng?: number
  onChange: (lat: number | undefined, lng: number | undefined) => void
}

export function LocationPicker({ lat, lng, onChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocation not supported by your browser')
      return
    }

    setLoading(true)
    setError(null)

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLoading(false)
        onChange(position.coords.latitude, position.coords.longitude)
      },
      (err) => {
        setLoading(false)
        setError(`Failed to get location: ${err.message}`)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  return (
    <div className="location-picker" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          className="btn-primary"
          style={{ minHeight: '40px', flex: 1 }}
          onClick={handleGetLocation}
          disabled={loading}
        >
          {loading ? 'Fetching Location…' : '📍 Auto-detect GPS'}
        </button>
        {(lat !== undefined || lng !== undefined) && (
          <button
            type="button"
            className="chip"
            style={{ minHeight: '40px' }}
            onClick={() => onChange(undefined, undefined)}
          >
            Clear
          </button>
        )}
      </div>

      {error && <p className="form-error-msg">{error}</p>}

      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <div style={{ flex: 1 }}>
          <label className="label">Latitude</label>
          <input
            type="number"
            step="any"
            className="form-input"
            value={lat ?? ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              onChange(isNaN(val) ? undefined : val, lng)
            }}
            placeholder="e.g. 12.9716"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label">Longitude</label>
          <input
            type="number"
            step="any"
            className="form-input"
            value={lng ?? ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value)
              onChange(lat, isNaN(val) ? undefined : val)
            }}
            placeholder="e.g. 77.5946"
          />
        </div>
      </div>
    </div>
  )
}
