import { UserButton, useUser } from '@clerk/clerk-react'

export function Profile() {
  const { user } = useUser()
  return (
    <div className="page">
      <h1 className="page-title">Profile</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <UserButton />
        <div>
          <div style={{ fontWeight: 600 }}>{user?.fullName}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--concrete)' }}>
            {user?.primaryEmailAddress?.emailAddress}
          </div>
        </div>
      </div>
      <div className="form-field">
        <label className="label">Role</label>
        <div style={{ fontFamily: 'var(--font-mono)', padding: '0.75rem', background: 'var(--sand)', borderRadius: 'var(--radius-sm)' }}>
          Field Agent
        </div>
      </div>
    </div>
  )
}
