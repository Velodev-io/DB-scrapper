import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@clerk/clerk-react'
import { api, img, type ConstructionProject, type Paginated } from '@carry/shared'

export function ProjectList() {
  const { getToken } = useAuth()
  const getTokenRef = useRef(getToken)
  const [projects, setProjects] = useState<ConstructionProject[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const limit = 10

  useEffect(() => {
    getTokenRef.current = getToken
  }, [getToken])

  const fetchProjects = useCallback(async (pageNum: number, append: boolean) => {
    setLoading(true)
    setError(null)
    try {
      const token = await getTokenRef.current()
      if (!token) throw new Error('Not authenticated')

      const res = await api.get<Paginated<ConstructionProject>>(
        `/projects/mine?page=${pageNum}&limit=${limit}`,
        token
      )

      if (append) {
        setProjects(prev => [...prev, ...res.data])
      } else {
        setProjects(res.data)
      }
      setTotal(res.total)
      setPage(pageNum)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProjects(1, false)
  }, [fetchProjects])

  const hasMore = projects.length < total

  return (
    <div className="page" style={{ paddingBottom: 'calc(var(--nav-height) + 80px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>My Projects</h1>
        <Link to="/projects/new" className="chip active" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', minHeight: '36px' }}>
          + New
        </Link>
      </div>

      {error && <div className="form-error-msg" style={{ marginBottom: '1rem' }}>{error}</div>}

      <div className="list-container">
        {projects.map(proj => {
          // Find first available image (before, stage, or after)
          const firstImage = proj.beforeImages?.[0] || proj.stageImages?.[0] || proj.afterImages?.[0]

          return (
            <div key={proj.id} className="record-card">
              {firstImage ? (
                <img
                  src={img.thumb(firstImage)}
                  alt={proj.title}
                  className="record-card-thumb"
                  loading="lazy"
                />
              ) : (
                <div className="record-card-thumb" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>
                  🏗
                </div>
              )}
              <div className="record-card-body">
                <div className="record-card-title">{proj.title}</div>
                <div className="record-card-meta">
                  <div>{proj.category}</div>
                  {proj.packageTier && <div style={{ color: 'var(--ochre)' }}>{proj.packageTier} Package</div>}
                  <div>{proj.location}</div>
                </div>
              </div>
            </div>
          )
        })}

        {projects.length === 0 && !loading && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--concrete)' }}>
            No records yet — tap the button to submit your first one
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '1.5rem' }}>
            Loading projects…
          </div>
        )}

        {hasMore && !loading && (
          <button
            type="button"
            className="btn-primary"
            style={{ marginTop: '1rem', minHeight: '44px' }}
            onClick={() => fetchProjects(page + 1, true)}
          >
            Load More
          </button>
        )}
      </div>
    </div>
  )
}
