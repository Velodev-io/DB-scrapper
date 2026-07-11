import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type ConstructionProject, type Paginated } from '@carry/shared'
import { PROJECT_CATEGORIES, PACKAGE_TIERS, REVIEW_STATUSES } from '@carry/shared'
import { downloadZip } from '../lib/downloadZip'

type FilterState = {
  agentId: string
  reviewStatus: string
  category: string
  packageTier: string
}

function Gallery({ title, images, prefix }: { title: string; images: string[]; prefix: string }) {
  if (images.length === 0) return null
  return (
    <div className="gallery-section">
      <div className="gallery-title">{title} ({images.length})</div>
      <div className="gallery-grid">
        {images.map((publicId, i) => (
          <div key={publicId} className="gallery-card">
            <img className="gallery-img" src={img.card(publicId)} alt={`${prefix} ${i + 1}`} />
            <a
              className="gallery-download-btn"
              href={img.download(publicId, `${prefix}-${i + 1}`)}
              download
            >↓ Download</a>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Projects() {
  const { getToken } = useAuth()

  const [items, setItems] = useState<ConstructionProject[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ConstructionProject | null>(null)
  const [downloadingZip, setDownloadingZip] = useState(false)
  const [filters, setFilters] = useState<FilterState>({
    agentId: '', reviewStatus: '', category: '', packageTier: '',
  })
  const limit = 20

  const buildQuery = useCallback((f: FilterState, p: number) => {
    const params = new URLSearchParams({ page: String(p), limit: String(limit) })
    if (f.agentId)      params.set('agentId', f.agentId)
    if (f.reviewStatus) params.set('reviewStatus', f.reviewStatus)
    if (f.category)     params.set('category', f.category)
    if (f.packageTier)  params.set('packageTier', f.packageTier)
    return `/projects?${params}`
  }, [])

  const fetchData = useCallback(async (f: FilterState, p: number) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const res = await api.get<Paginated<ConstructionProject>>(buildQuery(f, p), token)
      setItems(res.data)
      setTotal(res.total)
      setPage(p)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects')
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
    await api.patch(`/projects/${id}`, { reviewStatus: 'reviewed' }, token)
    setItems(prev => prev.map(p => p.id === id ? { ...p, reviewStatus: 'reviewed' } : p))
    if (selected?.id === id) setSelected(s => s ? { ...s, reviewStatus: 'reviewed' } : s)
  }

  async function deleteRecord(id: string) {
    if (!confirm('Delete this project record permanently?')) return
    const token = await getToken()
    if (!token) return
    await api.delete(`/projects/${id}`, token)
    setItems(prev => prev.filter(p => p.id !== id))
    if (selected?.id === id) setSelected(null)
  }

  async function handleDownloadAllZip(proj: ConstructionProject) {
    setDownloadingZip(true)
    try {
      await downloadZip(proj.title, [
        { folder: 'before', publicIds: proj.beforeImages },
        { folder: 'after',  publicIds: proj.afterImages },
        { folder: 'stage',  publicIds: proj.stageImages }
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
        <h1>Projects</h1>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)' }}>
          {total} records
        </span>
      </div>

      <div className="filter-bar">
        <select
          id="filter-proj-review-status"
          className="filter-select"
          value={filters.reviewStatus}
          onChange={e => applyFilters({ ...filters, reviewStatus: e.target.value })}
        >
          <option value="">All Statuses</option>
          {REVIEW_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          id="filter-proj-category"
          className="filter-select"
          value={filters.category}
          onChange={e => applyFilters({ ...filters, category: e.target.value })}
        >
          <option value="">All Categories</option>
          {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          id="filter-proj-tier"
          className="filter-select"
          value={filters.packageTier}
          onChange={e => applyFilters({ ...filters, packageTier: e.target.value })}
        >
          <option value="">All Tiers</option>
          {PACKAGE_TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
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
                  <th style={{ width: 60 }}>Before</th>
                  <th>Title</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Tier</th>
                  <th>Agent</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--concrete)', padding: '2rem' }}>No records</td></tr>
                )}
                {items.map(p => (
                  <tr key={p.id}>
                    <td>
                      {p.beforeImages[0]
                        ? <img className="table-thumb" src={img.thumb(p.beforeImages[0])} alt="before" />
                        : <div className="table-thumb" />}
                    </td>
                    <td style={{ fontWeight: 500 }}>{p.title}</td>
                    <td>{p.category}</td>
                    <td>{p.location}</td>
                    <td>{p.packageTier ?? '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)' }}>{p.agent?.name ?? '—'}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--concrete)', whiteSpace: 'nowrap' }}>
                      {new Date(p.createdAt).toLocaleDateString()}
                    </td>
                    <td><span className={`status-pill ${p.reviewStatus}`}>{p.reviewStatus}</span></td>
                    <td>
                      <div className="action-group">
                        <button id={`btn-view-proj-${p.id}`} className="btn-action" onClick={() => setSelected(p)}>View</button>
                        {p.reviewStatus !== 'reviewed' && (
                          <button id={`btn-review-proj-${p.id}`} className="btn-action btn-review" onClick={() => markReviewed(p.id)}>Review</button>
                        )}
                        <button id={`btn-delete-proj-${p.id}`} className="btn-action btn-delete" onClick={() => deleteRecord(p.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="pagination">
              <span className="pagination-info">
                Page {page} of {Math.ceil(total / limit) || 1} ({total} total)
              </span>
              <div className="pagination-btn-group">
                <button id="btn-proj-prev" className="btn-pagination" disabled={page <= 1} onClick={() => fetchData(filters, page - 1)}>← Prev</button>
                <button id="btn-proj-next" className="btn-pagination" disabled={page * limit >= total} onClick={() => fetchData(filters, page + 1)}>Next →</button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selected && (
        <div className="modal-backdrop" onClick={() => setSelected(null)}>
          <div className="modal" style={{ maxWidth: 720 }} onClick={e => e.stopPropagation()}>
            <h2>{selected.title}</h2>

            <div className="detail-grid">
              <div className="detail-item">
                <span className="detail-label">Category</span>
                <span className="detail-value">{selected.category}</span>
              </div>
              <div className="detail-item">
                <span className="detail-label">Location</span>
                <span className="detail-value">{selected.location}</span>
              </div>
              {selected.areaSqft && (
                <div className="detail-item">
                  <span className="detail-label">Area</span>
                  <span className="detail-value">{selected.areaSqft} sq ft</span>
                </div>
              )}
              {selected.durationMonths && (
                <div className="detail-item">
                  <span className="detail-label">Duration</span>
                  <span className="detail-value">{selected.durationMonths} months</span>
                </div>
              )}
              {selected.packageTier && (
                <div className="detail-item">
                  <span className="detail-label">Package Tier</span>
                  <span className="detail-value">{selected.packageTier}</span>
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
            </div>

            <Gallery title="Before Photos" images={selected.beforeImages} prefix={`${selected.title}-before`} />
            <Gallery title="After Photos" images={selected.afterImages} prefix={`${selected.title}-after`} />
            <Gallery title="Stage Photos" images={selected.stageImages} prefix={`${selected.title}-stage`} />

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
