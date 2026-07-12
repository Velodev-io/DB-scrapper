import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Shop, type Paginated } from '@carry/shared'
import { REVIEW_STATUSES } from '@carry/shared'

type FilterState = {
  agentId: string
  reviewStatus: string
  shopType: string
}

export function Shops() {
  const { getToken } = useAuth()

  const [items, setItems] = useState<Shop[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Shop | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    agentId: '',
    reviewStatus: '',
    shopType: '',
  })
  const limit = 20

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false)
  const [editShopId, setEditShopId] = useState<string | null>(null)
  const [editShopName, setEditShopName] = useState('')
  const [editShopType, setEditShopType] = useState('')
  const [editKeeperName, setEditKeeperName] = useState('')
  const [editKeeperPhone, setEditKeeperPhone] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [editImages, setEditImages] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function startEdit(s: Shop) {
    setEditShopId(s.id)
    setEditShopName(s.shopName)
    setEditShopType(s.shopType)
    setEditKeeperName(s.keeperName)
    setEditKeeperPhone(s.keeperPhone)
    setEditAddress(s.address || '')
    setEditLat(s.lat !== undefined && s.lat !== null ? String(s.lat) : '')
    setEditLng(s.lng !== undefined && s.lng !== null ? String(s.lng) : '')
    setEditImages(s.images ? s.images.join(', ') : '')
    setEditError(null)
    setShowEdit(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editShopId) return
    setEditLoading(true)
    setEditError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const updated = await api.patch<Shop>(`/shops/${editShopId}`, {
        shopName:    editShopName.trim() || undefined,
        shopType:    editShopType.trim() || undefined,
        keeperName:  editKeeperName.trim() || undefined,
        keeperPhone: editKeeperPhone.trim() || undefined,
        address:     editAddress.trim() || null,
        lat:         editLat ? parseFloat(editLat) : null,
        lng:         editLng ? parseFloat(editLng) : null,
        images:      editImages ? editImages.split(',').map(img => img.trim()).filter(Boolean) : [],
      }, token)
      setItems(prev => prev.map(s => s.id === editShopId ? updated : s))
      if (selected?.id === editShopId) setSelected(updated)
      setShowEdit(false)
    } catch (err: any) {
      setEditError(err.message || 'Failed to update shop record')
    } finally {
      setEditLoading(false)
    }
  }

  const buildQuery = useCallback((f: FilterState, p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (f.agentId)      params.set('agentId', f.agentId)
    if (f.reviewStatus) params.set('reviewStatus', f.reviewStatus)
    if (f.shopType)     params.set('shopType', f.shopType)
    return `/shops?${params}`
  }, [])

  const fetchData = useCallback(async (f: FilterState, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const res = await api.get<Paginated<Shop>>(buildQuery(f, p), token)
      setItems(res.data)
      setTotal(res.total)
      setPage(p)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch shop records')
    } finally {
      setLoading(false)
    }
  }, [getToken, buildQuery])

  useEffect(() => {
    fetchData(filters, 1)
  }, [fetchData]) // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters(newFilters: FilterState) {
    setFilters(newFilters)
    fetchData(newFilters, 1)
  }

  async function markReviewed(id: string) {
    const token = await getToken()
    if (!token) return
    await api.patch(`/shops/${id}`, { reviewStatus: 'reviewed' }, token)
    setItems(prev => prev.map(s => s.id === id ? { ...s, reviewStatus: 'reviewed' } : s))
    if (selected?.id === id) setSelected(s => s ? { ...s, reviewStatus: 'reviewed' } : s)
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this shop record permanently?')) return
    const token = await getToken()
    if (!token) return
    await api.delete(`/shops/${id}`, token)
    setItems(prev => prev.filter(s => s.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Shops</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
          {total} records
        </span>
      </div>

      <div className="filter-bar">
        <select
          id="filter-shop-review-status"
          className="filter-select"
          value={filters.reviewStatus}
          onChange={e => applyFilters({ ...filters, reviewStatus: e.target.value })}
        >
          <option value="">All Statuses</option>
          {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          id="filter-shop-type"
          className="search-input"
          type="text"
          placeholder="Filter by shop type…"
          value={filters.shopType}
          onChange={e => applyFilters({ ...filters, shopType: e.target.value })}
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
                  <th>Shop Name</th>
                  <th>Shop Type</th>
                  <th>Shopkeeper</th>
                  <th>Phone</th>
                  <th>City / Address</th>
                  <th>Agent</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', color: 'var(--concrete)', padding: '2rem' }}>
                      No records
                    </td>
                  </tr>
                )}
                {items.map(s => (
                  <tr key={s.id}>
                    <td>
                      {s.images && s.images[0]
                        ? <img className="table-thumb" src={img.thumb(s.images[0])} alt={s.shopName} />
                        : <div className="table-thumb" />}
                    </td>
                    <td style={{ fontWeight: 500 }}>{s.shopName}</td>
                    <td><span className="chip" style={{ margin: 0, background: 'var(--sand)' }}>{s.shopType}</span></td>
                    <td>{s.keeperName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{s.keeperPhone}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {s.address ?? '—'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)' }}>{s.agent?.name ?? '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)', whiteSpace: 'nowrap' }}>
                      {new Date(s.createdAt).toLocaleDateString()}
                    </td>
                    <td><span className={`status-pill ${s.reviewStatus}`}>{s.reviewStatus}</span></td>
                    <td>
                      <div className="action-group">
                        <button id={`btn-view-shop-${s.id}`} className="btn-action" onClick={() => setSelected(s)}>View</button>
                        <button id={`btn-edit-shop-${s.id}`} className="btn-action" onClick={() => startEdit(s)}>Edit</button>
                        {s.reviewStatus !== 'reviewed' && (
                          <button id={`btn-review-shop-${s.id}`} className="btn-action btn-review" onClick={() => markReviewed(s.id)}>Review</button>
                        )}
                        <button id={`btn-delete-shop-${s.id}`} className="btn-action btn-delete" onClick={() => deleteRecord(s.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="mobile-card-list">
              {items.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--concrete)', padding: '2rem' }}>
                  No records
                </div>
              )}
              {items.map(s => (
                <div key={s.id} className="mobile-card">
                  <div className="mobile-card-header">
                    {s.images && s.images[0] ? (
                      <img className="mobile-card-thumb" src={img.thumb(s.images[0])} alt={s.shopName} />
                    ) : (
                      <div className="mobile-card-thumb-placeholder">🏪</div>
                    )}
                    <div className="mobile-card-title-group">
                      <div className="mobile-card-title">{s.shopName}</div>
                      <div className="mobile-card-subtitle">{s.shopType}</div>
                    </div>
                    <span className={`status-pill ${s.reviewStatus}`}>{s.reviewStatus}</span>
                  </div>
                  <div className="mobile-card-body">
                    <div className="mobile-card-field">
                      <span className="field-label">Keeper:</span>
                      <span className="field-val">{s.keeperName} ({s.keeperPhone})</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="field-label">Address:</span>
                      <span className="field-val">{s.address || '—'}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="field-label">Agent:</span>
                      <span className="field-val">{s.agent?.name || '—'}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="field-label">Date:</span>
                      <span className="field-val">{new Date(s.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="mobile-card-actions">
                    <button id={`btn-view-shop-mob-${s.id}`} className="btn-action" onClick={() => setSelected(s)}>View</button>
                    <button id={`btn-edit-shop-mob-${s.id}`} className="btn-action" onClick={() => startEdit(s)}>Edit</button>
                    {s.reviewStatus !== 'reviewed' && (
                      <button id={`btn-review-shop-mob-${s.id}`} className="btn-action btn-review" onClick={() => markReviewed(s.id)}>Review</button>
                    )}
                    <button id={`btn-delete-shop-mob-${s.id}`} className="btn-action btn-delete" onClick={() => deleteRecord(s.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pagination">
              <span className="pagination-info">
                Page {page} of {Math.ceil(total / limit) || 1} ({total} total)
              </span>
              <div className="pagination-btn-group">
                <button id="btn-shop-prev" className="btn-pagination" disabled={page <= 1} onClick={() => fetchData(filters, page - 1)}>← Prev</button>
                <button id="btn-shop-next" className="btn-pagination" disabled={page * limit >= total} onClick={() => fetchData(filters, page + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <h2>Edit Shop Profile</h2>
            {editError && <p style={{ color: 'var(--error)', margin: '0.5rem 0' }}>{editError}</p>}
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Shop Name *</label>
                <input type="text" required value={editShopName} onChange={e => setEditShopName(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Shop Type *</label>
                <input type="text" required value={editShopType} onChange={e => setEditShopType(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Shopkeeper Name *</label>
                  <input type="text" required value={editKeeperName} onChange={e => setEditKeeperName(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Shopkeeper Phone *</label>
                  <input type="text" required value={editKeeperPhone} onChange={e => setEditKeeperPhone(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Full Address</label>
                <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Latitude</label>
                  <input type="number" step="any" value={editLat} onChange={e => setEditLat(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Longitude</label>
                  <input type="number" step="any" value={editLng} onChange={e => setEditLng(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Cloudinary Image IDs (comma-separated)</label>
                <input type="text" value={editImages} onChange={e => setEditImages(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)} disabled={editLoading}>Cancel</button>
                <button type="submit" className="btn-primary" disabled={editLoading}>{editLoading ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              <div style={{
                width: 60, height: 60, borderRadius: 8, background: 'var(--sand)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', flexShrink: 0
              }}>🏪</div>
              <div>
                <h2 style={{ marginBottom: '0.25rem' }}>{selected.shopName}</h2>
                <span className={`status-pill ${selected.reviewStatus}`}>{selected.reviewStatus}</span>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Shop Type</span>
                <span className="detail-value">{selected.shopType}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Shopkeeper</span>
                <span className="detail-value">{selected.keeperName}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                  <a href={`tel:${selected.keeperPhone}`} style={{ color: 'var(--ochre)' }}>{selected.keeperPhone}</a>
                </span>
              </div>
              {selected.address && (
                <div className="detail-item detail-value-full">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">{selected.address}</span>
                </div>
              )}
              {(selected.lat !== undefined && selected.lng !== undefined) && (
                <>
                  <div className="detail-item detail-value-full">
                    <span className="detail-label">GPS Coordinates</span>
                    <span className="detail-value">
                      {selected.lat.toFixed(6)}, {selected.lng.toFixed(6)}
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${selected.lat},${selected.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chip active"
                        style={{ marginLeft: '1rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', fontSize: '0.75rem', minHeight: '24px', padding: '0 0.5rem' }}
                      >
                        🗺 Google Maps
                      </a>
                    </span>
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
              <div className="detail-item">
                <span className="detail-label">Submitted by</span>
                <span className="detail-value">{selected.agent?.name ?? '—'} ({selected.agent?.email})</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Created At</span>
                <span className="detail-value">{new Date(selected.createdAt).toLocaleString()}</span>
              </div>
            </div>

            {/* Photo Gallery */}
            {selected.images && selected.images.length > 0 && (
              <div className="gallery-section" style={{ marginTop: '1.5rem' }}>
                <div className="gallery-title" style={{ fontWeight: 600, fontSize: '0.8rem', color: 'var(--concrete)', marginBottom: '0.5rem', fontFamily: 'var(--font-mono)' }}>
                  Photos ({selected.images.length})
                </div>
                <div className="gallery-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '0.75rem' }}>
                  {selected.images.map((publicId, i) => (
                    <div key={publicId} className="gallery-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <img className="gallery-img" src={img.card(publicId)} alt={`Photo ${i + 1}`} style={{ width: '100%', height: '80px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--sand)' }} />
                      <a
                        className="gallery-download-btn"
                        href={img.download(publicId, `${selected.shopName}-photo-${i + 1}`)}
                        download
                        style={{ fontSize: '0.75rem', color: 'var(--ochre)', textDecoration: 'none', fontWeight: 600 }}
                      >
                        ↓ Download
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn-secondary" onClick={() => setSelected(null)}>Close</button>
              {selected.reviewStatus !== 'reviewed' && (
                <button className="btn-primary" onClick={() => markReviewed(selected.id)}>Mark Reviewed</button>
              )}
              <button
                style={{ background: 'var(--error)', border: 'none', borderRadius: 6, padding: '0.5rem 1rem', color: 'white', fontWeight: 600, cursor: 'pointer' }}
                onClick={() => deleteRecord(selected.id)}
              >Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
