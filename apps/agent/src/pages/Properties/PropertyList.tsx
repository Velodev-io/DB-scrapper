import { useState, useEffect, useCallback } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Property, type Paginated } from '@carry/shared'
import { getPendingRecords } from '../../lib/uploadQueue'
import { PropertyDetailModal } from './PropertyDetailModal'

export function PropertyList() {
  const navigate = useNavigate()
  const { getToken } = useAuth()
  const [properties, setProperties] = useState<Property[]>([])
  const [pendingProps, setPendingProps] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null)
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

  useEffect(() => {
    async function loadPending() {
      try {
        const records = await getPendingRecords()
        const props = records
          .filter(r => r.type === 'property')
          .map(r => ({
            id: r.id,
            title: r.payload.title,
            propertyType: r.payload.propertyType,
            listingType: r.payload.listingType,
            priceLabel: r.payload.priceLabel,
            locality: r.payload.locality,
            city: r.payload.city,
            isPendingSync: true,
          }))
        setPendingProps(props)
      } catch {
        // Ignore
      }
    }
    loadPending()
  }, [])

  const allProperties = [...pendingProps, ...properties]
  const hasMore = properties.length < total

  const handleSaved = (updated: Property) => {
    setProperties(prev => prev.map(p => p.id === updated.id ? updated : p))
    setSelectedProperty(null)
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
          <h1 className="page-title" style={{ marginBottom: 0 }}>My Properties</h1>
        </div>
        <Link to="/properties/new" className="chip active" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
          + New
        </Link>
      </div>

      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="list-container">
        {allProperties.map(prop => (
          <div
            key={prop.id}
            className="record-card"
            style={{ cursor: prop.isPendingSync ? 'default' : 'pointer' }}
            onClick={() => {
              if (!prop.isPendingSync) {
                setSelectedProperty(prop as Property)
              }
            }}
          >
            {prop.images && prop.images[0] && !prop.isPendingSync ? (
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div className="record-card-title">{prop.title}</div>
                {prop.isPendingSync && (
                  <span className="status-badge queued" style={{ margin: 0, padding: '0.15rem 0.4rem', fontSize: '0.6rem' }}>
                    Syncing...
                  </span>
                )}
              </div>
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

      {selectedProperty && (
        <PropertyDetailModal
          property={selectedProperty}
          onClose={() => setSelectedProperty(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  )
}
