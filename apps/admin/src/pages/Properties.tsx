import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Property, type Paginated } from '@carry/shared'
import {
  PROPERTY_TYPES, LISTING_TYPES, REVIEW_STATUSES,
  PROPERTY_STATUSES, FURNISHING_TYPES, PREFERRED_TENANT_TYPES, PLOT_ALLOWED_USE_TYPES
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

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false)
  const [editPropertyId, setEditPropertyId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editPropertyType, setEditPropertyType] = useState('')
  const [editListingType, setEditListingType] = useState('')
  const [editBhk, setEditBhk] = useState('')
  const [editPriceInr, setEditPriceInr] = useState('')
  const [editPriceLabel, setEditPriceLabel] = useState('')
  const [editAreaSqft, setEditAreaSqft] = useState('')
  const [editLocality, setEditLocality] = useState('')
  const [editCity, setEditCity] = useState('')
  const [editAddress, setEditAddress] = useState('')
  const [editReraNumber, setEditReraNumber] = useState('')
  const [editStatus, setEditStatus] = useState('')
  const [editFurnishing, setEditFurnishing] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editImages, setEditImages] = useState('')
  const [editFloorPlanUrl, setEditFloorPlanUrl] = useState('')
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [editSecurityDeposit, setEditSecurityDeposit] = useState('')
  const [editAvailableFrom, setEditAvailableFrom] = useState('')
  const [editPreferredTenant, setEditPreferredTenant] = useState('')
  const [editPetFriendly, setEditPetFriendly] = useState(false)
  const [editMaintenanceCharges, setEditMaintenanceCharges] = useState('')
  const [editLeaseDuration, setEditLeaseDuration] = useState('')
  const [editLockInPeriod, setEditLockInPeriod] = useState('')
  const [editCamCharges, setEditCamCharges] = useState('')
  const [editPlotAllowedUse, setEditPlotAllowedUse] = useState('')
  const [editPublished, setEditPublished] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  function startEdit(p: Property) {
    setEditPropertyId(p.id)
    setEditTitle(p.title)
    setEditPropertyType(p.propertyType)
    setEditListingType(p.listingType)
    setEditBhk(p.bhk !== undefined && p.bhk !== null ? String(p.bhk) : '')
    setEditPriceInr(String(p.priceInr))
    setEditPriceLabel(p.priceLabel)
    setEditAreaSqft(String(p.areaSqft))
    setEditLocality(p.locality)
    setEditCity(p.city)
    setEditAddress(p.address || '')
    setEditReraNumber(p.reraNumber || '')
    setEditStatus(p.status)
    setEditFurnishing(p.furnishing || '')
    setEditDescription(p.description || '')
    setEditImages(p.images ? p.images.join(', ') : '')
    setEditFloorPlanUrl(p.floorPlanUrl || '')
    setEditLat(p.lat !== undefined && p.lat !== null ? String(p.lat) : '')
    setEditLng(p.lng !== undefined && p.lng !== null ? String(p.lng) : '')
    setEditSecurityDeposit(p.securityDeposit !== undefined && p.securityDeposit !== null ? String(p.securityDeposit) : '')
    setEditAvailableFrom(p.availableFrom || '')
    setEditPreferredTenant(p.preferredTenant || '')
    setEditPetFriendly(p.petFriendly || false)
    setEditMaintenanceCharges(p.maintenanceCharges !== undefined && p.maintenanceCharges !== null ? String(p.maintenanceCharges) : '')
    setEditLeaseDuration(p.leaseDuration !== undefined && p.leaseDuration !== null ? String(p.leaseDuration) : '')
    setEditLockInPeriod(p.lockInPeriod !== undefined && p.lockInPeriod !== null ? String(p.lockInPeriod) : '')
    setEditCamCharges(p.camCharges !== undefined && p.camCharges !== null ? String(p.camCharges) : '')
    setEditPlotAllowedUse(p.plotAllowedUse || '')
    setEditPublished(p.published || false)
    setEditError(null)
    setShowEdit(true)
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editPropertyId) return
    setEditLoading(true)
    setEditError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      
      const payload: any = {
        title:              editTitle.trim() || undefined,
        propertyType:       editPropertyType || undefined,
        listingType:        editListingType || undefined,
        bhk:                editBhk ? parseInt(editBhk, 10) : null,
        priceInr:           editPriceInr ? parseInt(editPriceInr, 10) : undefined,
        priceLabel:         editPriceLabel.trim() || undefined,
        areaSqft:           editAreaSqft ? parseInt(editAreaSqft, 10) : undefined,
        locality:           editLocality.trim() || undefined,
        city:               editCity.trim() || undefined,
        address:            editAddress.trim() || null,
        reraNumber:         editReraNumber.trim() || null,
        status:             editStatus || undefined,
        furnishing:         editFurnishing || null,
        description:        editDescription.trim() || null,
        images:             editImages ? editImages.split(',').map(s => s.trim()).filter(Boolean) : [],
        floorPlanUrl:       editFloorPlanUrl.trim() || null,
        lat:                editLat ? parseFloat(editLat) : null,
        lng:                editLng ? parseFloat(editLng) : null,
        published:          editPublished,
      }

      if (editListingType === 'Rent') {
        payload.securityDeposit    = editSecurityDeposit ? parseInt(editSecurityDeposit, 10) : null
        payload.availableFrom      = editAvailableFrom.trim() || null
        payload.preferredTenant    = editPreferredTenant || null
        payload.petFriendly        = editPetFriendly
        payload.maintenanceCharges = editMaintenanceCharges ? parseInt(editMaintenanceCharges, 10) : null
        payload.leaseDuration      = editLeaseDuration ? parseInt(editLeaseDuration, 10) : null
        payload.lockInPeriod       = editLockInPeriod ? parseInt(editLockInPeriod, 10) : null
        payload.camCharges         = editCamCharges ? parseInt(editCamCharges, 10) : null
        payload.plotAllowedUse     = editPlotAllowedUse || null
      }

      const updated = await api.patch<Property>(`/properties/${editPropertyId}`, payload, token)
      setItems(prev => prev.map(p => p.id === editPropertyId ? updated : p))
      if (selected?.id === editPropertyId) setSelected(updated)
      setShowEdit(false)
    } catch (err: any) {
      setEditError(err.message || 'Failed to update property record')
    } finally {
      setEditLoading(false)
    }
  }

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

  async function togglePublished(id: string, currentPublished: boolean) {
    const token = await getToken()
    if (!token) return
    const newPublished = !currentPublished
    await api.patch(`/properties/${id}`, { published: newPublished }, token)
    setItems(prev => prev.map(p => p.id === id ? { ...p, published: newPublished } : p))
    if (selected?.id === id) setSelected(s => s ? { ...s, published: newPublished } : s)
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
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>
                      {p.priceLabel}{p.listingType === 'Rent' && ' / mo'}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)' }}>{p.agent?.name ?? '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)', whiteSpace: 'nowrap' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <span className={`status-pill ${p.reviewStatus}`}>{p.reviewStatus}</span>
                        {p.published && <span className="status-pill reviewed" style={{ fontSize: '0.7rem' }}>Published</span>}
                      </div>
                    </td>
                    <td>
                      <div className="action-group">
                        <button
                          id={`btn-view-prop-${p.id}`}
                          className="btn-action"
                          onClick={() => setSelected(p)}
                        >View</button>
                        <button
                          id={`btn-edit-prop-${p.id}`}
                          className="btn-action"
                          onClick={() => startEdit(p)}
                        >Edit</button>
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

            <div className="mobile-card-list">
              {items.length === 0 && (
                <div style={{ textAlign: 'center', color: 'var(--concrete)', padding: '2rem' }}>
                  No records
                </div>
              )}
              {items.map(p => (
                <div key={p.id} className="mobile-card">
                  <div className="mobile-card-header">
                    {p.images[0] ? (
                      <img className="mobile-card-thumb" src={img.thumb(p.images[0])} alt={p.title} />
                    ) : (
                      <div className="mobile-card-thumb-placeholder">🏠</div>
                    )}
                    <div className="mobile-card-title-group">
                      <div className="mobile-card-title">{p.title}</div>
                      <div className="mobile-card-subtitle">{p.propertyType} • {p.listingType}</div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-end' }}>
                      <span className={`status-pill ${p.reviewStatus}`}>{p.reviewStatus}</span>
                      {p.published && <span className="status-pill reviewed" style={{ fontSize: '0.7rem' }}>Published</span>}
                    </div>
                  </div>
                  <div className="mobile-card-body">
                    <div className="mobile-card-field">
                      <span className="field-label">Price:</span>
                      <span className="field-val" style={{ fontFamily: 'var(--font-mono)' }}>
                        {p.priceLabel}{p.listingType === 'Rent' && ' / mo'}
                      </span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="field-label">Location:</span>
                      <span className="field-val">{p.city} {p.locality ? `(${p.locality})` : ''}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="field-label">Agent:</span>
                      <span className="field-val">{p.agent?.name ?? '—'}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="field-label">Date:</span>
                      <span className="field-val">{new Date(p.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="mobile-card-actions">
                    <button id={`btn-view-prop-mob-${p.id}`} className="btn-action" onClick={() => setSelected(p)}>View</button>
                    <button id={`btn-edit-prop-mob-${p.id}`} className="btn-action" onClick={() => startEdit(p)}>Edit</button>
                    {p.reviewStatus !== 'reviewed' && (
                      <button id={`btn-review-prop-mob-${p.id}`} className="btn-action btn-review" onClick={() => markReviewed(p.id)}>Review</button>
                    )}
                    <button id={`btn-delete-prop-mob-${p.id}`} className="btn-action btn-delete" onClick={() => deleteRecord(p.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
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

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal" style={{ maxWidth: 680, maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2>Edit Property Profile</h2>
            {editError && <p style={{ color: 'var(--error)', margin: '0.5rem 0' }}>{editError}</p>}
            <form onSubmit={handleEdit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Property Title *</label>
                <input type="text" required value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Property Type *</label>
                  <select required value={editPropertyType} onChange={e => setEditPropertyType(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }}>
                    {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Listing Type *</label>
                  <select required value={editListingType} onChange={e => setEditListingType(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }}>
                    {LISTING_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>BHK (if residential)</label>
                  <input type="number" value={editBhk} onChange={e => setEditBhk(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Price (INR) *</label>
                  <input type="number" required value={editPriceInr} onChange={e => setEditPriceInr(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Price Label *</label>
                  <input type="text" required value={editPriceLabel} onChange={e => setEditPriceLabel(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Area (Sqft) *</label>
                  <input type="number" required value={editAreaSqft} onChange={e => setEditAreaSqft(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Locality *</label>
                  <input type="text" required value={editLocality} onChange={e => setEditLocality(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>City *</label>
                  <input type="text" required value={editCity} onChange={e => setEditCity(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Status *</label>
                  <select required value={editStatus} onChange={e => setEditStatus(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }}>
                    {PROPERTY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Furnishing Status</label>
                  <select value={editFurnishing} onChange={e => setEditFurnishing(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }}>
                    <option value="">None</option>
                    {FURNISHING_TYPES.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Full Address</label>
                <input type="text" value={editAddress} onChange={e => setEditAddress(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>RERA Number</label>
                  <input type="text" value={editReraNumber} onChange={e => setEditReraNumber(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                </div>
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
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Description</label>
                <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)', minHeight: 80 }} />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Cloudinary Image IDs (comma-separated)</label>
                <input type="text" value={editImages} onChange={e => setEditImages(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
              </div>
              <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Floor Plan URL/ID</label>
                <input type="text" value={editFloorPlanUrl} onChange={e => setEditFloorPlanUrl(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
              </div>

              {editListingType === 'Rent' && (
                <>
                  <h3 style={{ fontSize: '1rem', marginTop: '0.5rem', borderBottom: '1px solid var(--sand)', paddingBottom: '0.25rem' }}>Rent Specifics</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Security Deposit</label>
                      <input type="number" value={editSecurityDeposit} onChange={e => setEditSecurityDeposit(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Available From</label>
                      <input type="text" placeholder="YYYY-MM-DD" value={editAvailableFrom} onChange={e => setEditAvailableFrom(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Preferred Tenant</label>
                      <select value={editPreferredTenant} onChange={e => setEditPreferredTenant(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }}>
                        <option value="">None</option>
                        {PREFERRED_TENANT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Maintenance Charges</label>
                      <input type="number" value={editMaintenanceCharges} onChange={e => setEditMaintenanceCharges(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Lease Duration (Months)</label>
                      <input type="number" value={editLeaseDuration} onChange={e => setEditLeaseDuration(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Lock-In Period (Months)</label>
                      <input type="number" value={editLockInPeriod} onChange={e => setEditLockInPeriod(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>CAM Charges</label>
                      <input type="number" value={editCamCharges} onChange={e => setEditCamCharges(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }} />
                    </div>
                    <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Plot Allowed Use</label>
                      <select value={editPlotAllowedUse} onChange={e => setEditPlotAllowedUse(e.target.value)} style={{ padding: '0.5rem', borderRadius: 4, border: '1px solid var(--sand)' }}>
                        <option value="">None</option>
                        {PLOT_ALLOWED_USE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', height: '100%', paddingTop: '1.2rem' }}>
                      <input type="checkbox" id="edit-pet-friendly" checked={editPetFriendly} onChange={e => setEditPetFriendly(e.target.checked)} style={{ cursor: 'pointer', width: 20, height: 20 }} />
                      <label htmlFor="edit-pet-friendly" style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Pet Friendly</label>
                    </div>
                  </div>
                </>
              )}

              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1rem', borderTop: '1px solid var(--sand)', paddingTop: '1rem' }}>
                <input type="checkbox" id="edit-published" checked={editPublished} onChange={e => setEditPublished(e.target.checked)} style={{ cursor: 'pointer', width: 20, height: 20 }} />
                <label htmlFor="edit-published" style={{ fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer' }}>Publish to Website (Visible on Public Frontend)</label>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem', paddingBottom: '1rem' }}>
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
                <span className="detail-label">{selected.listingType === 'Rent' ? 'Rent' : 'Price'}</span>
                <span className="detail-value">{selected.priceLabel}{selected.listingType === 'Rent' && ' / month'}</span>
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
              <div className="detail-item">
                <span className="detail-label">Publish Status</span>
                <span className={`status-pill ${selected.published ? 'reviewed' : 'pending'}`}>
                  {selected.published ? 'Published' : 'Hidden / Draft'}
                </span>
              </div>

              {selected.listingType === 'Rent' && (
                <>
                  {selected.securityDeposit !== undefined && selected.securityDeposit !== null && (
                    <div className="detail-item">
                      <span className="detail-label">Security Deposit</span>
                      <span className="detail-value">₹{selected.securityDeposit.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selected.availableFrom && (
                    <div className="detail-item">
                      <span className="detail-label">Available From</span>
                      <span className="detail-value">{new Date(selected.availableFrom).toLocaleDateString()}</span>
                    </div>
                  )}
                  {selected.preferredTenant && (
                    <div className="detail-item">
                      <span className="detail-label">Preferred Tenant</span>
                      <span className="detail-value">{selected.preferredTenant}</span>
                    </div>
                  )}
                  {selected.petFriendly !== undefined && selected.petFriendly !== null && (
                    <div className="detail-item">
                      <span className="detail-label">Pet Friendly</span>
                      <span className="detail-value">{selected.petFriendly ? 'Yes' : 'No'}</span>
                    </div>
                  )}
                  {selected.maintenanceCharges !== undefined && selected.maintenanceCharges !== null && (
                    <div className="detail-item">
                      <span className="detail-label">Maintenance / mo</span>
                      <span className="detail-value">₹{selected.maintenanceCharges.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selected.leaseDuration !== undefined && selected.leaseDuration !== null && (
                    <div className="detail-item">
                      <span className="detail-label">Lease Duration</span>
                      <span className="detail-value">{selected.leaseDuration} Months</span>
                    </div>
                  )}
                  {selected.lockInPeriod !== undefined && selected.lockInPeriod !== null && (
                    <div className="detail-item">
                      <span className="detail-label">Lock-in Period</span>
                      <span className="detail-value">{selected.lockInPeriod} Months</span>
                    </div>
                  )}
                  {selected.camCharges !== undefined && selected.camCharges !== null && (
                    <div className="detail-item">
                      <span className="detail-label">CAM Charges / mo</span>
                      <span className="detail-value">₹{selected.camCharges.toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {selected.plotAllowedUse && (
                    <div className="detail-item">
                      <span className="detail-label">Plot Allowed Use</span>
                      <span className="detail-value">{selected.plotAllowedUse}</span>
                    </div>
                  )}
                </>
              )}

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
              <button
                className="btn-secondary"
                style={{
                  backgroundColor: selected.published ? 'var(--concrete)' : 'var(--ochre)',
                  color: 'white',
                  border: 'none',
                }}
                onClick={() => togglePublished(selected.id, selected.published || false)}
              >
                {selected.published ? 'Unpublish' : 'Publish to Web'}
              </button>
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
