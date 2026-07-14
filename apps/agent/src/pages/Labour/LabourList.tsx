import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Labour, type Paginated } from '@carry/shared'
import { getPendingRecords } from '../../lib/uploadQueue'
import { useOfflineList, formatCachedAt } from '../../hooks/useOfflineList'
import { LabourDetailModal } from './LabourDetailModal'

export function LabourList() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [pendingLabour,  setPendingLabour]  = useState<any[]>([])
  const [selectedLabour, setSelectedLabour] = useState<Labour | null>(null)

  useEffect(() => { getTokenRef.current = getToken }, [getToken])

  // ── Offline-aware fetch ───────────────────────────────────────────────────
  const {
    data: labourList,
    loading,
    error,
    fromCache,
    cachedAt,
    refetch,
  } = useOfflineList<Labour>('labour_mine', async () => {
    const token = await getTokenRef.current()
    if (!token) throw new Error('Not authenticated')
    return api.get<Paginated<Labour>>('/labour/mine?page=1&limit=50', token)
  })

  // ── Pending offline records ───────────────────────────────────────────────
  useEffect(() => {
    async function loadPending() {
      try {
        const records = await getPendingRecords()
        const labs = records
          .filter(r => r.type === 'labour')
          .map(r => ({
            id:           r.id,
            fullName:     r.payload.fullName,
            age:          r.payload.age,
            gender:       r.payload.gender,
            skillLevel:   r.payload.skillLevel,
            skillType:    r.payload.skillType,
            phone:        r.payload.phone,
            minimumWage:  r.payload.minimumWage,
            locality:     r.payload.locality,
            city:         r.payload.city,
            isPendingSync: true,
          }))
        setPendingLabour(labs)
      } catch {
        // Ignore
      }
    }
    loadPending()
  }, [])

  const allLabour = [...pendingLabour, ...labourList]

  const handleSaved = (_updated: Labour) => {
    refetch()
    setSelectedLabour(null)
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(var(--nav-height) + 80px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              background: 'none', border: 'none', padding: '0.25rem',
              fontSize: '1.5rem', cursor: 'pointer', color: 'var(--ink)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
            aria-label="Back"
          >
            ←
          </button>
          <h1 className="page-title" style={{ marginBottom: 0 }}>My Labour</h1>
        </div>
        <Link to="/labour/new" className="chip active" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
          + New
        </Link>
      </div>

      {/* Stale data notice — shown when displaying cached offline data */}
      {fromCache && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(200, 134, 26, 0.1)',
          border: '1px solid rgba(200, 134, 26, 0.3)',
          borderRadius: '0.5rem',
          padding: '0.6rem 0.85rem',
          marginBottom: '1rem',
          fontSize: '0.8rem',
          color: 'var(--ochre)',
          gap: '0.5rem',
        }}>
          <span>
            🔴 Offline — cached data
            {cachedAt && <span style={{ color: 'var(--concrete)', marginLeft: '0.3rem' }}>
              · Last synced {formatCachedAt(cachedAt)}
            </span>}
          </span>
          <button
            type="button"
            onClick={refetch}
            style={{ background: 'none', border: 'none', color: 'var(--ochre)', fontSize: '0.8rem', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            Retry
          </button>
        </div>
      )}

      {error && !fromCache && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="list-container">
        {allLabour.map(lab => (
          <div
            key={lab.id}
            className="record-card"
            style={{ cursor: lab.isPendingSync ? 'default' : 'pointer' }}
            onClick={() => {
              if (!lab.isPendingSync) setSelectedLabour(lab as Labour)
            }}
          >
            {lab.profilePhotoUrl && !lab.isPendingSync ? (
              <img
                src={img.thumb(lab.profilePhotoUrl)}
                alt={lab.fullName}
                className="record-card-thumb"
                loading="lazy"
              />
            ) : (
              <div className="record-card-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                👷
              </div>
            )}
            <div className="record-card-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div className="record-card-title">{lab.fullName}</div>
                {lab.isPendingSync && (
                  <span className="status-badge queued" style={{ margin: 0, padding: '0.15rem 0.4rem', fontSize: '0.6rem' }}>
                    Syncing...
                  </span>
                )}
              </div>
              <div className="record-card-meta">
                <div>{lab.age} years old • {lab.gender}</div>
                <div style={{ color: 'var(--ochre)', fontWeight: 600 }}>
                  {lab.skillLevel}{lab.skillType ? ` (${lab.skillType})` : ''}
                </div>
                <div>{lab.phone}</div>
                {lab.city && <div>{lab.locality ? `${lab.locality}, ` : ''}{lab.city}</div>}
              </div>
            </div>
          </div>
        ))}

        {allLabour.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--concrete)' }}>
            No records yet — tap the button to submit your first one
          </div>
        )}

        {loading && labourList.length === 0 && (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            Loading labour list…
          </div>
        )}
      </div>

      {selectedLabour && (
        <LabourDetailModal
          labour={selectedLabour}
          onClose={() => setSelectedLabour(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
