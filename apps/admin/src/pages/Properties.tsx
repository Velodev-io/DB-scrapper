import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Property, type Paginated } from '@carry/shared'
import {
  PROPERTY_TYPES, LISTING_TYPES, REVIEW_STATUSES
} from '@carry/shared'
import { downloadZip } from '../lib/downloadZip'

type FilterState = {
  agentId: string
  reviewStatus: string
  listingType: string
  propertyType: string
  city: string
}

export function Properties() {
  const { getToken } = useAuth()

  const [items, setItems] = useState<Property[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Property | null>(null)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    agentId: '', reviewStatus: '', listingType: '', propertyType: '', city: '',
  })
  const limit = 20

  const buildQuery = useCallback((f: FilterState, p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (f.agentId)      params.set('agentId', f.agentId)
    if (f.reviewStatus) params.set('reviewStatus', f.reviewStatus)
    if (f.listingType)  params.set('listingType', f.listingType)
    if (f.propertyType) params.set('propertyType', f.propertyType)
    if (f.city)         params.set('city', f.city)
    return `/properties?${params}`
  }, [])

  const fetchData = useCallback(async (f: FilterState, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const res = await api.get<Paginated<Property>>(buildQuery(f, p), token)
      setItems(res.data)
      setTotal(res.total)
      setPage(p)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch properties')
    } finally {
      setLoading(false)
    }
  }, [getToken, buildQuery])

  useEffect(() => { fetchData(filters, 1) }, [fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters(newFilters: FilterState) {
    setFilters(newFilters)
    fetchData(newFilters, 1)
  }

  async function markReviewed(id: string) {
    const token = await getToken()
    if (!token) return
    await api.patch(`/properties/${id}`, { reviewStatus: 'reviewed' }, token)
    setItems(prev => prev.map(p => p.id === id ? { ...p, reviewStatus: 'reviewed' } : p))
    if (selected?.id === id) setSelected(s => s ? { ...s, reviewStatus: 'reviewed' } : s)
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this property record permanently?')) return
    const token = await getToken()
    if (!token) return
    await api.delete(`/properties/${id}`, token)
    setItems(prev => prev.filter(p => p.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function handleDownloadAllZip(prop: Property) {
    setDownloadingZip(true)
    try {
      await downloadZip(prop.title, [
        { folder: 'gallery', publicIds: prop.images },
        { folder: '',        publicIds: prop.floorPlanUrl ? [prop.floorPlanUrl] : [] }
      ])
    } catch (err) {
      alert('Failed to generate ZIP download')
    } finally {
      setDownloadingZip(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Properties</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
          {total} records
        </span>
      </div>

      {/* Filter Bar */}
      <div className="filter-bar">
        <select
          id="filter-review-status"
          className="filter-select"
          value={filters.reviewStatus}
          onChange={e => applyFilters({ ...filters, reviewStatus: e.target.value })}
        >
          <option value="">All Statuses</option>
          {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          id="filter-property-type"
          className="filter-select"
          value={filters.propertyType}
          onChange={e => applyFilters({ ...filters, propertyType: e.target.value })}
        >
          <option value="">All Types</option>
          {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select
          id="filter-listing-type"
          className="filter-select"
          value={filters.listingType}
          onChange={e => applyFilters({ ...filters, listingType: e.target.value })}
        >
          <option value="">All Listings</option>
          {LISTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <input
          id="filter-city"
          className="search-input"
          type="text"
          placeholder="Filter by city…"
          value={filters.city}
          onChange={e => applyFilters({ ...filters, city: e.target.value })}
        />
      </div>

      {error && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>}

      <div className="data-table-wrap">
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--concrete)' }}>Loading…</p>
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 60 }}>Photo</th>
                  <th>Title</th>
                  <th>Type</th>
                  <th>Listing</th>
                  <th>City</th>
                  <th>Price</th>
                  <th>Agent</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={10} style={{ textAlign: 'center', color: 'var(--concrete)', padding: '2rem' }}>No records</td></tr>
                )}
                {items.map(p => (
                  <tr key={p.id}>
                    <td>
                      {p.images[0]
                        ? <img className="table-thumb" src={img.thumb(p.images[0])} alt={p.title} />
                        : <div className="table-thumb" />}
                    </td>
                    <td style={{ fontWeight: 500, maxWidth: 180 }}>{p.title}</td>
                    <td>{p.propertyType}</td>
                    <td>{p.listingType}</td>
                    <td>{p.city}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{p.priceLabel}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)' }}>{p.agent?.name ?? '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)', whiteSpace: 'nowrap' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td><span className={`status-pill ${p.reviewStatus}`}>{p.reviewStatus}</span></td>
                    <td>
                      <div className="action-group">
                        <button
                          id={`btn-view-prop-${p.id}`}
                          className="btn-action"
                          onClick={() => setSelected(p)}
                        >View</button>
                        {p.reviewStatus !== 'reviewed' && (
                          <button
                            id={`btn-review-prop-${p.id}`}
                            className="btn-action btn-review"
                            onClick={() => markReviewed(p.id)}
                          >Review</button>
                        )}
                        <button
                          id={`btn-delete-prop-${p.id}`}
                          className="btn-action btn-delete"
                          onClick={() => deleteRecord(p.id)}
                        >Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {/* Pagination */}
            <div className="pagination">
              <span className="pagination-info">
                Page {page} of {Math.ceil(total / limit) || 1} ({total} total)
              </span>
              <div className="pagination-btn-group">
                <button
                  id="btn-prev-page"
                  className="btn-pagination"
                  disabled={page <= 1}
                  onClick={() => fetchData(filters, page - 1)}
                >← Prev</button>
                <button
                  id="btn-next-page"
                  className="btn-pagination"
                  disabled={page * limit >= total}
                  onClick={() => fetchData(filters, page + 1)}
                >Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div
            className="modal"
            style={{ maxWidth: 680 }}
            onClick={e => e.stopPropagation()}
          >
            <h2>{selected.title}</h2>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Type</span>
                <span className="detail-value">{selected.propertyType}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Listing</span>
                <span className="detail-value">{selected.listingType}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Price</span>
                <span className="detail-value">{selected.priceLabel}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Area</span>
                <span className="detail-value">{selected.areaSqft} sq ft</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">City</span>
                <span className="detail-value">{selected.city}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Locality</span>
                <span className="detail-value">{selected.locality}</span>
              </div>
              {selected.bhk && (
                <div className="detail-item">
                  <span className="detail-label">BHK</span>
                  <span className="detail-value">{selected.bhk}</span>
                </div>
              )}
              {selected.furnishing && (
                <div className="detail-item">
                  <span className="detail-label">Furnishing</span>
                  <span className="detail-value">{selected.furnishing}</span>
                </div>
              )}
              {selected.reraNumber && (
                <div className="detail-item">
                  <span className="detail-label">RERA</span>
                  <span className="detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                    {selected.reraNumber}
                  </span>
                </div>
              )}
              {selected.status && (
                <div className="detail-item">
                  <span className="detail-label">Construction Status</span>
                  <span className="detail-value">{selected.status}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Submitted by</span>
                <span className="detail-value">{selected.agent?.name ?? '—'} ({selected.agent?.email})</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Review Status</span>
                <span className={`status-pill ${selected.reviewStatus}`}>{selected.reviewStatus}</span>
              </div>
              {selected.description && (
                <div className="detail-item detail-value-full">
                  <span className="detail-label">Description</span>
                  <span className="detail-value" style={{ fontSize: '0.9rem', lineHeight: 1.6, marginTop: '0.25rem' }}>
                    {selected.description}
                  </span>
                </div>
              )}
              {selected.lat && selected.lng && (
                <>
                  <div className="detail-item detail-value-full">
                    <a
                      href={`https://maps.google.com/?q=${selected.lat},${selected.lng}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: 'var(--ochre)', fontWeight: 500 }}
                    >
                      📍 View on Google Maps
                    </a>
                  </div>
                  <div className="detail-item detail-value-full" style={{ marginTop: '0.25rem' }}>
                    <div style={{ width: '100%', height: '220px', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--sand)' }}>
                      <iframe
                        src={`https://maps.google.com/maps?q=${selected.lat},${selected.lng}&z=15&output=embed`}
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        allowFullScreen={false}
                        loading="lazy"
                        title="Location Map"
                      ></iframe>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Photo Gallery */}
            {selected.images.length > 0 && (
              <div className="gallery-section">
                <div className="gallery-title">Photos ({selected.images.length})</div>
                <div className="gallery-grid">
                  {selected.images.map((publicId, i) => (
                    <div key={publicId} className="gallery-card">
                      <img className="gallery-img" src={img.card(publicId)} alt={`Photo ${i + 1}`} />
                      <a
                        className="gallery-download-btn"
                        href={img.download(publicId, `${selected.title}-photo-${i + 1}`)}
                        download
                      >
                        ↓ Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Floor Plan */}
            {selected.floorPlanUrl && (
              <div className="gallery-section">
                <div className="gallery-title">Floor Plan</div>
                <div className="gallery-grid">
                  <div className="gallery-card">
                    <img className="gallery-img" src={img.card(selected.floorPlanUrl)} alt="Floor plan" />
                    <a
                      className="gallery-download-btn"
                      href={img.download(selected.floorPlanUrl, `${selected.title}-floor-plan`)}
                      download
                    >
                      ↓ Download Original
                    </a>
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button
                className="btn-secondary"
                style={{ marginRight: 'auto' }}
                disabled={downloadingZip}
                onClick={() => handleDownloadAllZip(selected)}
              >
                {downloadingZip ? 'Downloading ZIP…' : '⬇ Download All (ZIP)'}
              </button>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {selected.reviewStatus !== 'reviewed' && (
                <button
                  className="btn-primary"
                  onClick={() => { markReviewed(selected.id) }}
                >
                  Mark Reviewed
                </button>
              )}
              <button
                style={{ background: 'var(--error)', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => { deleteRecord(selected.id) }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
