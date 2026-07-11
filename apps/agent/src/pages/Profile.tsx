import { useState, useEffect } from 'react'
import { UserButton, useUser, useAuth } from '@clerk/clerk-react'
import { api, type Property, type Labour, type Paginated } from '@carry/shared'

export function Profile() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const [propertyCount, setPropertyCount] = useState<number | null>(null)
  const [labourCount, setLabourCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = await getToken()
        if (!token) return
        const [propsRes, labourRes] = await Promise.all([
          api.get<Paginated<Property>>('/properties/mine?page=1&limit=1', token),
          api.get<Paginated<Labour>>('/labour/mine?page=1&limit=1', token),
        ])
        setPropertyCount(propsRes.total)
        setLabourCount(labourRes.total)
      } catch (err: any) {
        setError(err.message || 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [getToken])

  return (
    <div className="page" style={{ paddingBottom: 'calc(var(--nav-height) + 40px)' }}>
      <h1 className="page-title">Profile</h1>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <UserButton />
        <div>
          <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>{user?.fullName}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--concrete)', marginTop: '0.1rem' }}>
            {user?.primaryEmailAddress?.emailAddress}
          </div>
        </div>
      </div>

      <h3 style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--concrete)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
        My Submissions
      </h3>

      {loading ? (
        <div style={{ padding: '1rem 0', color: 'var(--concrete)', fontStyle: 'italic' }}>
          Loading statistics…
        </div>
      ) : error ? (
        <div className="form-error-msg" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      ) : (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{propertyCount ?? 0}</div>
            <div className="stat-label">Properties</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{labourCount ?? 0}</div>
            <div className="stat-label">Labour</div>
          </div>
        </div>
      )}

      <div className="form-field" style={{ marginTop: '2rem' }}>
        <label className="label">Access Role</label>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', padding: '0.75rem', background: 'var(--sand)', borderRadius: 'var(--radius-sm)' }}>
          Field Agent
        </div>
      </div>
    </div>
  )
}

