import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserButton, useUser, useAuth } from '@clerk/clerk-react'
import { api, type Property, type Labour, type Shop, type Paginated } from '@carry/shared'

export function Profile() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const navigate = useNavigate()
  const [propertyCount, setPropertyCount] = useState<number | null>(null)
  const [labourCount, setLabourCount] = useState<number | null>(null)
  const [shopCount, setShopCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchStats() {
      try {
        const token = await getToken()
        if (!token) return
        const [propsRes, labourRes, shopsRes] = await Promise.all([
          api.get<Paginated<Property>>('/properties/mine?page=1&limit=1', token),
          api.get<Paginated<Labour>>('/labour/mine?page=1&limit=1', token),
          api.get<Paginated<Shop>>('/shops/mine?page=1&limit=1', token),
        ])
        setPropertyCount(propsRes.total)
        setLabourCount(labourRes.total)
        setShopCount(shopsRes.total)
      } catch (err: any) {
        setError(err.message || 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }
    fetchStats()
  }, [getToken])

  const statCards = [
    { count: propertyCount, label: 'Properties', route: '/properties', emoji: '🏠' },
    { count: labourCount,   label: 'Labour',     route: '/labour',     emoji: '👷' },
    { count: shopCount,     label: 'Shops',       route: '/shops',      emoji: '🏪' },
  ]

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
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
          {statCards.map(({ count, label, route }) => (
            <button
              key={label}
              type="button"
              onClick={() => navigate(route)}
              className="stat-card"
              style={{
                cursor: 'pointer',
                background: 'none',
                border: 'none',
                padding: 0,
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
              }}
            >
              <div className="stat-value">{count ?? 0}</div>
              <div className="stat-label">{label}</div>
            </button>
          ))}
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
