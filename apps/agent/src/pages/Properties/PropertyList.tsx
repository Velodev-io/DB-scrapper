import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Property, type Paginated } from '@carry/shared'

export function PropertyList() {
  const { getToken } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 10

  const fetchProperties = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')

      const res = await api.get<Paginated<Property>>(
        `/properties/mine?page=${pageNum}&limit=${limit}`,
        token
      )

      if (append) {
        setProperties(prev => [...prev, ...res.data])
      } else {
        setProperties(res.data)
      }
      setTotal(res.total)
      setPage(pageNum)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch properties')
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchProperties(1, false)
  }, [fetchProperties])

  const hasMore = properties.length < total

  return (
    <div className="page" style={{ paddingBottom: 'calc(var(--nav-height) + 80px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>My Properties</h1>
        <Link to="/properties/new" className="chip active" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
          + New
        </Link>
      </div>

      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="list-container">
        {properties.map(prop => (
          <div key={prop.id} className="record-card">
            {prop.images && prop.images[0] ? (
              <img
                src={img.thumb(prop.images[0])}
                alt={prop.title}
                className="record-card-thumb"
                loading="lazy"
              />
            ) : (
              <div className="record-card-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                🏠
              </div>
            )}
            <div className="record-card-body">
              <div className="record-card-title">{prop.title}</div>
              <div className="record-card-meta">
                <div>{prop.propertyType} • {prop.listingType}</div>
                <div style={{ color: 'var(--ochre)', fontWeight: 600 }}>{prop.priceLabel}</div>
                <div>{prop.locality}, {prop.city}</div>
              </div>
            </div>
          </div>
        ))}

        {properties.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--concrete)' }}>
            No records yet — tap the button to submit your first one
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            Loading properties…
          </div>
        )}

        {hasMore && !loading && (
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '1rem', minHeight: '44px' }}
            onClick={() => fetchProperties(page + 1, true)}
          >
            Load More
          </button>
        )}
      </div>
    </div>
  )
}
