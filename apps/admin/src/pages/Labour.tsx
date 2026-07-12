import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type Labour, type Paginated } from '@carry/shared'
import { GENDERS, REVIEW_STATUSES, SKILL_TYPES } from '@carry/shared'

type FilterState = {
  agentId: string
  reviewStatus: string
  gender: string
  skillLevel: string
  skillType: string
  city: string
}

export function Labour() {
  const { getToken } = useAuth()

  const [items, setItems] = useState<Labour[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Labour | null>(null)
  const [filters, setFilters] = useState<FilterState>({
    agentId: '', reviewStatus: '', gender: '', skillLevel: '', skillType: '', city: '',
  })
  const limit = 20

  const buildQuery = useCallback((f: FilterState, p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (f.agentId)      params.set('agentId', f.agentId)
    if (f.reviewStatus) params.set('reviewStatus', f.reviewStatus)
    if (f.gender)       params.set('gender', f.gender)
    if (f.skillLevel)   params.set('skillLevel', f.skillLevel)
    if (f.skillType)    params.set('skillType', f.skillType)
    if (f.city)         params.set('city', f.city)
    return `/labour?${params}`
  }, [])

  const fetchData = useCallback(async (f: FilterState, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const res = await api.get<Paginated<Labour>>(buildQuery(f, p), token)
      setItems(res.data)
      setTotal(res.total)
      setPage(p)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch labour records')
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
    await api.patch(`/labour/${id}`, { reviewStatus: 'reviewed' }, token)
    setItems(prev => prev.map(l => l.id === id ? { ...l, reviewStatus: 'reviewed' } : l))
    if (selected?.id === id) setSelected(s => s ? { ...s, reviewStatus: 'reviewed' } : s)
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this labour record permanently?')) return
    const token = await getToken()
    if (!token) return
    await api.delete(`/labour/${id}`, token)
    setItems(prev => prev.filter(l => l.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  return (
    <div>
      <div className="page-header">
        <h1>Labour</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
          {total} records
        </span>
      </div>

      <div className="filter-bar">
        <select
          id="filter-labour-review-status"
          className="filter-select"
          value={filters.reviewStatus}
          onChange={e => applyFilters({ ...filters, reviewStatus: e.target.value })}
        >
          <option value="">All Statuses</option>
          {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          id="filter-labour-gender"
          className="filter-select"
          value={filters.gender}
          onChange={e => applyFilters({ ...filters, gender: e.target.value })}
        >
          <option value="">All Genders</option>
          {GENDERS.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select
          id="filter-labour-skill-level"
          className="filter-select"
          value={filters.skillLevel}
          onChange={e => applyFilters({ ...filters, skillLevel: e.target.value })}
        >
          <option value="">All Skill Levels</option>
          <option value="Skilled">Skilled</option>
          <option value="Non-Skilled">Non-Skilled</option>
        </select>
        <select
          id="filter-labour-skill-type"
          className="filter-select"
          value={filters.skillType}
          onChange={e => applyFilters({ ...filters, skillType: e.target.value })}
        >
          <option value="">All Skills</option>
          {SKILL_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <input
          id="filter-labour-city"
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
                  <th>Name</th>
                  <th>Age</th>
                  <th>Gender</th>
                  <th>Skill</th>
                  <th>Skill Type</th>
                  <th>City</th>
                  <th>Phone</th>
                  <th>Agent</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={12} style={{ textAlign: 'center', color: 'var(--concrete)', padding: '2rem' }}>No records</td></tr>
                )}
                {items.map(l => (
                  <tr key={l.id}>
                    <td>
                      {l.profilePhotoUrl
                        ? <img className="table-thumb" src={img.thumb(l.profilePhotoUrl)} alt={l.fullName} />
                        : (
                          <div className="table-thumb" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: 'var(--sand)', borderRadius: 6,
                            fontSize: '1.5rem'
                          }}>
                            👤
                          </div>
                        )}
                    </td>
                    <td style={{ fontWeight: 500 }}>{l.fullName}</td>
                    <td>{l.age}</td>
                    <td>{l.gender}</td>
                    <td>{l.skillLevel}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)' }}>{l.skillType ?? '—'}</td>
                    <td>{l.city ?? '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{l.phone}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)' }}>{l.agent?.name ?? '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)', whiteSpace: 'nowrap' }}>
                      {new Date(l.createdAt).toLocaleDateString()}
                    </td>
                    <td><span className={`status-pill ${l.reviewStatus}`}>{l.reviewStatus}</span></td>
                    <td>
                      <div className="action-group">
                        <button id={`btn-view-labour-${l.id}`} className="btn-action" onClick={() => setSelected(l)}>View</button>
                        {l.reviewStatus !== 'reviewed' && (
                          <button id={`btn-review-labour-${l.id}`} className="btn-action btn-review" onClick={() => markReviewed(l.id)}>Review</button>
                        )}
                        <button id={`btn-delete-labour-${l.id}`} className="btn-action btn-delete" onClick={() => deleteRecord(l.id)}>Delete</button>
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
              {items.map(l => (
                <div key={l.id} className="mobile-card">
                  <div className="mobile-card-header">
                    {l.profilePhotoUrl ? (
                      <img className="mobile-card-thumb" src={img.thumb(l.profilePhotoUrl)} alt={l.fullName} />
                    ) : (
                      <div className="mobile-card-thumb-placeholder">👤</div>
                    )}
                    <div className="mobile-card-title-group">
                      <div className="mobile-card-title">{l.fullName}</div>
                      <div className="mobile-card-subtitle">{l.skillLevel} • {l.skillType || 'General'}</div>
                    </div>
                    <span className={`status-pill ${l.reviewStatus}`}>{l.reviewStatus}</span>
                  </div>
                  <div className="mobile-card-body">
                    <div className="mobile-card-field">
                      <span className="field-label">Demographics:</span>
                      <span className="field-val">{l.age} yrs • {l.gender}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="field-label">Phone:</span>
                      <span className="field-val">{l.phone}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="field-label">City:</span>
                      <span className="field-val">{l.city || '—'}</span>
                    </div>
                    <div className="mobile-card-field">
                      <span className="field-label">Agent:</span>
                      <span className="field-val">{l.agent?.name ?? '—'}</span>
                    </div>
                  </div>
                  <div className="mobile-card-actions">
                    <button id={`btn-view-labour-mob-${l.id}`} className="btn-action" onClick={() => setSelected(l)}>View</button>
                    {l.reviewStatus !== 'reviewed' && (
                      <button id={`btn-review-labour-mob-${l.id}`} className="btn-action btn-review" onClick={() => markReviewed(l.id)}>Review</button>
                    )}
                    <button id={`btn-delete-labour-mob-${l.id}`} className="btn-action btn-delete" onClick={() => deleteRecord(l.id)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
            <div className="pagination">
              <span className="pagination-info">
                Page {page} of {Math.ceil(total / limit) || 1} ({total} total)
              </span>
              <div className="pagination-btn-group">
                <button id="btn-labour-prev" className="btn-pagination" disabled={page <= 1} onClick={() => fetchData(filters, page - 1)}>← Prev</button>
                <button id="btn-labour-next" className="btn-pagination" disabled={page * limit >= total} onClick={() => fetchData(filters, page + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
              {selected.profilePhotoUrl ? (
                <img
                  src={img.card(selected.profilePhotoUrl)}
                  alt={selected.fullName}
                  style={{ width: 80, height: 80, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                />
              ) : (
                <div style={{
                  width: 80, height: 80, borderRadius: 8, background: 'var(--sand)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', flexShrink: 0
                }}>👤</div>
              )}
              <div>
                <h2 style={{ marginBottom: '0.25rem' }}>{selected.fullName}</h2>
                <span className={`status-pill ${selected.reviewStatus}`}>{selected.reviewStatus}</span>
              </div>
            </div>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Age</span>
                <span className="detail-value">{selected.age}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Gender</span>
                <span className="detail-value">{selected.gender}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Skill Level</span>
                <span className="detail-value">{selected.skillLevel}</span>
              </div>
              {selected.skillType && (
                <div className="detail-item">
                  <span className="detail-label">Skill Type</span>
                  <span className="detail-value">{selected.skillType}</span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Phone</span>
                <span className="detail-value" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem' }}>
                  <a href={`tel:${selected.phone}`} style={{ color: 'var(--ochre)' }}>{selected.phone}</a>
                </span>
              </div>
              {selected.city && (
                <div className="detail-item">
                  <span className="detail-label">City</span>
                  <span className="detail-value">{selected.city}</span>
                </div>
              )}
              {(selected.houseNo || selected.street || selected.locality) && (
                <div className="detail-item detail-value-full">
                  <span className="detail-label">Address</span>
                  <span className="detail-value">
                    {[selected.houseNo, selected.street, selected.locality, selected.city, selected.pincode]
                      .filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
              <div className="detail-item">
                <span className="detail-label">Submitted by</span>
                <span className="detail-value">{selected.agent?.name ?? '—'} ({selected.agent?.email})</span>
              </div>
            </div>

            {/* Profile photo download */}
            {selected.profilePhotoUrl && (
              <div style={{ marginTop: '1rem' }}>
                <a
                  href={img.download(selected.profilePhotoUrl, `${selected.fullName}-photo`)}
                  download
                  className="gallery-download-btn"
                  style={{ textAlign: 'left' }}
                >
                  ↓ Download Profile Photo
                </a>
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
