import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Labour, type Paginated } from '@carry/shared'
import { getPendingRecords } from '../../lib/uploadQueue'
import { LabourDetailModal } from './LabourDetailModal'

export function LabourList() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [labourList, setLabourList] = useState<Labour[]>([])
  const [pendingLabour, setPendingLabour] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedLabour, setSelectedLabour] = useState<Labour | null>(null)
  const limit = 10

  const fetchLabour = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const res = await api.get<Paginated<Labour>>(
        `/labour/mine?page=${pageNum}&limit=${limit}`,
        token
      )

      if (append) {
        setLabourList(prev => [...prev, ...res.data])
      } else {
        setLabourList(res.data)
      }
      setTotal(res.total)
      setPage(pageNum)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch labour list')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchLabour(1, false)
  }, [fetchLabour])

  useEffect(() => {
    async function loadPending() {
      try {
        const records = await getPendingRecords()
        const labs = records
          .filter(r => r.type === 'labour')
          .map(r => ({
            id: r.id,
            fullName: r.payload.fullName,
            age: r.payload.age,
            gender: r.payload.gender,
            skillLevel: r.payload.skillLevel,
            skillType: r.payload.skillType,
            phone: r.payload.phone,
            locality: r.payload.locality,
            city: r.payload.city,
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
  const hasMore = labourList.length < total

  const handleSaved = (updated: Labour) => {
    setLabourList(prev => prev.map(l => l.id === updated.id ? updated : l))
    setSelectedLabour(null)
  }

  return (
    <div className="page" style={{ paddingBottom: 'calc(var(--nav-height) + 80px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
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

      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="list-container">
        {allLabour.map(lab => (
          <div
            key={lab.id}
            className="record-card"
            style={{ cursor: lab.isPendingSync ? 'default' : 'pointer' }}
            onClick={() => {
              if (!lab.isPendingSync) {
                setSelectedLabour(lab as Labour)
              }
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

        {labourList.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--concrete)' }}>
            No records yet — tap the button to submit your first one
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            Loading labour list…
          </div>
        )}

        {hasMore && !loading && (
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '1rem', minHeight: '44px' }}
            onClick={() => fetchLabour(page + 1, true)}
          >
            Load More
          </button>
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
