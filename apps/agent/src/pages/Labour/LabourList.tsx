import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Labour, type Paginated } from '@carry/shared'

export function LabourList() {
  const { getToken } = useAuth()
  const [labourList, setLabourList] = useState<Labour[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
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

  const hasMore = labourList.length < total

  return (
    <div className="page" style={{ paddingBottom: 'calc(var(--nav-height) + 80px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>My Labour</h1>
        <Link to="/labour/new" className="chip active" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
          + New
        </Link>
      </div>

      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="list-container">
        {labourList.map(lab => (
          <div key={lab.id} className="record-card">
            {lab.profilePhotoUrl ? (
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
              <div className="record-card-title">{lab.fullName}</div>
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
    </div>
  )
}
