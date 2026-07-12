import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { api, img } from '@carry/shared'

interface AgentEntry {
  id: string
  name?: string
  email: string
  phone?: string
  age?: number
  status: 'active' | 'pending'
  createdAt: string
  clerkUserId?: string
  imageUrl?: string
}

export function Agents() {
  const { getToken } = useAuth()

  const [agents, setAgents] = useState<AgentEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite modal state
  const [showInvite, setShowInvite] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Edit modal state
  const [showEdit, setShowEdit] = useState(false)
  const [editAgentId, setEditAgentId] = useState<string | null>(null) // clerkUserId
  const [editName, setEditName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editAge, setEditAge] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editProfilePhotoUrl, setEditProfilePhotoUrl] = useState('')
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Revoke confirm state
  const [revoking, setRevoking] = useState<string | null>(null) // clerkUserId

  async function fetchAgents() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const [active, pending] = await Promise.all([
        api.get<{ id: string; name: string; email: string; phone?: string; age?: number; status: string; imageUrl?: string; createdAt: string }[]>('/agents', token),
        api.get<{ id: string; email: string; status: string; createdAt: string }[]>('/agents/invitations', token),
      ])
      const merged: AgentEntry[] = [
        ...active.map(u => ({ ...u, clerkUserId: u.id, status: 'active' as const })),
        ...pending.map(u => ({ ...u, status: 'pending' as const })),
      ]
      setAgents(merged)
    } catch (err: any) {
      setError(err.message || 'Failed to fetch agents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAgents()
    const timer = setInterval(fetchAgents, 5000) // ponytail: simple polling, websocket if scalability matters
    return () => clearInterval(timer)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const res = await api.post<{ invited: boolean; alreadyRegistered: boolean; email: string }>(
        '/agents/invite', { email: inviteEmail }, token
      )
      setShowInvite(false)
      setInviteEmail('')
      fetchAgents()
      if (res.alreadyRegistered) {
        alert(`✅ ${res.email} already had an account — agent access granted directly. They can now log in.`)
      }
    } catch (err: any) {
      setInviteError(err.message || 'Failed to send invitation')
    } finally {
      setInviteLoading(false)
    }
  }

  async function handleRevoke(clerkUserId: string) {
    if (!confirm('Revoke this agent\'s access? They will no longer be able to use the agent app.')) return
    setRevoking(clerkUserId)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await api.delete(`/agents/${clerkUserId}`, token)
      fetchAgents()
    } catch (err: any) {
      alert(err.message || 'Failed to revoke agent')
    } finally {
      setRevoking(null)
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editAgentId) return
    setEditLoading(true)
    setEditError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await api.patch(`/agents/${editAgentId}`, {
        name:            editName.trim() || undefined,
        phone:           editPhone.trim() || undefined,
        age:             editAge ? parseInt(editAge, 10) : null,
        email:           editEmail.trim() || undefined,
        profilePhotoUrl: editProfilePhotoUrl.trim() || null
      }, token)
      setShowEdit(false)
      fetchAgents()
    } catch (err: any) {
      setEditError(err.message || 'Failed to update agent details')
    } finally {
      setEditLoading(false)
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Agents</h1>
        <button id="btn-invite-agent" className="btn-primary" onClick={() => setShowInvite(true)}>
          + Invite Agent
        </button>
      </div>

      {error && <p style={{ color: 'var(--error)', marginBottom: '1rem' }}>{error}</p>}

      <div className="data-table-wrap">
        {loading ? (
          <p style={{ padding: '2rem', color: 'var(--concrete)', textAlign: 'center' }}>Loading…</p>
        ) : (
          <>
            <table>
            <thead>
              <tr>
                <th style={{ width: 60 }}>Photo</th>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Age</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--concrete)', padding: '2rem' }}>No agents found</td></tr>
              )}
              {agents.map(agent => (
                <tr key={agent.id}>
                  <td>
                    {agent.imageUrl
                      ? <img className="table-thumb" src={agent.imageUrl.startsWith('http') ? agent.imageUrl : img.thumb(agent.imageUrl)} alt={agent.name || 'Agent'} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
                      : (
                        <div className="table-thumb" style={{
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          background: 'var(--sand)', borderRadius: '50%',
                          width: 36, height: 36, fontSize: '1.2rem'
                        }}>
                          👤
                        </div>
                      )}
                  </td>
                  <td style={{ fontWeight: 500 }}>{agent.name || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{agent.email}</td>
                  <td style={{ fontSize: '0.85rem' }}>{agent.phone || '—'}</td>
                  <td style={{ fontSize: '0.85rem' }}>{agent.age !== undefined && agent.age !== null ? agent.age : '—'}</td>
                  <td>
                    <span className={`status-pill ${agent.status}`}>{agent.status}</span>
                  </td>
                  <td style={{ color: 'var(--concrete)', fontSize: '0.85rem' }}>
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="action-group" style={{ display: 'flex', gap: '0.5rem' }}>
                      {agent.status === 'active' && agent.clerkUserId && (
                        <>
                          <button
                            id={`btn-edit-${agent.id}`}
                            className="btn-action btn-edit"
                            onClick={() => {
                              setEditAgentId(agent.clerkUserId!)
                              setEditName(agent.name || '')
                              setEditPhone(agent.phone || '')
                              setEditAge(agent.age !== undefined && agent.age !== null ? String(agent.age) : '')
                              setEditEmail(agent.email || '')
                              setEditProfilePhotoUrl(agent.imageUrl || '')
                              setEditError(null)
                              setShowEdit(true)
                            }}
                            style={{
                              backgroundColor: 'var(--sand)',
                              color: 'var(--coal)',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '0.375rem 0.75rem',
                              cursor: 'pointer',
                              fontSize: '0.8rem',
                              fontWeight: 500
                            }}
                          >
                            Edit
                          </button>
                          <button
                            id={`btn-revoke-${agent.id}`}
                            className="btn-action btn-delete"
                            disabled={revoking === agent.clerkUserId}
                            onClick={() => handleRevoke(agent.clerkUserId!)}
                          >
                            {revoking === agent.clerkUserId ? 'Revoking…' : 'Revoke'}
                          </button>
                        </>
                      )}
                      {agent.status === 'pending' && (
                        <span style={{ color: 'var(--concrete)', fontSize: '0.8rem' }}>Invited — awaiting sign-up</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mobile-card-list">
            {agents.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--concrete)', padding: '2rem' }}>
                No agents found
              </div>
            )}
            {agents.map(agent => (
              <div key={agent.id} className="mobile-card">
                <div className="mobile-card-header">
                  {agent.imageUrl ? (
                    <img className="mobile-card-thumb" src={agent.imageUrl.startsWith('http') ? agent.imageUrl : img.thumb(agent.imageUrl)} alt={agent.name || 'Agent'} style={{ borderRadius: '50%' }} />
                  ) : (
                    <div className="mobile-card-thumb-placeholder">👤</div>
                  )}
                  <div className="mobile-card-title-group">
                    <div className="mobile-card-title">{agent.name || 'Invited Agent'}</div>
                    <div className="mobile-card-subtitle">{agent.email}</div>
                  </div>
                  <span className={`status-pill ${agent.status}`}>{agent.status}</span>
                </div>
                <div className="mobile-card-body">
                  <div className="mobile-card-field">
                    <span className="field-label">Phone:</span>
                    <span className="field-val">{agent.phone || '—'}</span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="field-label">Age:</span>
                    <span className="field-val">{agent.age !== undefined && agent.age !== null ? agent.age : '—'}</span>
                  </div>
                  <div className="mobile-card-field">
                    <span className="field-label">Joined:</span>
                    <span className="field-val">{new Date(agent.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="mobile-card-actions">
                  {agent.status === 'active' && agent.clerkUserId && (
                    <>
                      <button
                        id={`btn-edit-mob-${agent.id}`}
                        className="btn-action btn-edit"
                        onClick={() => {
                          setEditAgentId(agent.clerkUserId!)
                          setEditName(agent.name || '')
                          setEditPhone(agent.phone || '')
                          setEditAge(agent.age !== undefined && agent.age !== null ? String(agent.age) : '')
                          setEditEmail(agent.email || '')
                          setEditProfilePhotoUrl(agent.imageUrl || '')
                          setEditError(null)
                          setShowEdit(true)
                        }}
                        style={{
                          backgroundColor: 'var(--sand)',
                          color: 'var(--coal)',
                          border: 'none',
                          borderRadius: '4px',
                          padding: '0.375rem 0.75rem',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 500
                        }}
                      >
                        Edit
                      </button>
                      <button
                        id={`btn-revoke-mob-${agent.id}`}
                        className="btn-action btn-delete"
                        disabled={revoking === agent.clerkUserId}
                        onClick={() => handleRevoke(agent.clerkUserId!)}
                      >
                        {revoking === agent.clerkUserId ? 'Revoking…' : 'Revoke'}
                      </button>
                    </>
                  )}
                  {agent.status === 'pending' && (
                    <span style={{ color: 'var(--concrete)', fontSize: '0.8rem', padding: '0.5rem 0' }}>Invited — awaiting sign-up</span>
                  )}
                </div>
              </div>
            ))}
          </div>
          </>
        )}
      </div>

      {/* Invite Modal */}
      {showInvite && (
        <div className="modal-backdrop" onClick={() => setShowInvite(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Invite Agent</h2>
            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--concrete)', marginBottom: '0.5rem' }}>
                  Email address
                </label>
                <input
                  id="invite-email-input"
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  placeholder="agent@example.com"
                  style={{
                    width: '100%',
                    padding: '0.625rem 0.875rem',
                    border: '1.5px solid var(--sand)',
                    borderRadius: '6px',
                    fontFamily: 'var(--font-body)',
                    fontSize: '0.9rem',
                  }}
                />
              </div>
              {inviteError && <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '1rem' }}>{inviteError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowInvite(false)}>
                  Cancel
                </button>
                <button id="btn-send-invite" type="submit" className="btn-primary" disabled={inviteLoading}>
                  {inviteLoading ? 'Sending…' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEdit && (
        <div className="modal-backdrop" onClick={() => setShowEdit(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Edit Agent Profile</h2>
            <form onSubmit={handleEdit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--concrete)', marginBottom: '0.25rem' }}>
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={e => setEditEmail(e.target.value)}
                  placeholder="agent@example.com"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1.5px solid var(--sand)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--concrete)', marginBottom: '0.25rem' }}>
                  Profile Photo URL / Cloudinary Public ID
                </label>
                <input
                  type="text"
                  value={editProfilePhotoUrl}
                  onChange={e => setEditProfilePhotoUrl(e.target.value)}
                  placeholder="e.g. agent_avatar_123 or https://..."
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1.5px solid var(--sand)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--concrete)', marginBottom: '0.25rem' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  placeholder="e.g. Suryansh Singh"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1.5px solid var(--sand)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--concrete)', marginBottom: '0.25rem' }}>
                  Phone Number
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={e => setEditPhone(e.target.value)}
                  placeholder="e.g. +91 9999999999"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1.5px solid var(--sand)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--concrete)', marginBottom: '0.25rem' }}>
                  Age
                </label>
                <input
                  type="number"
                  value={editAge}
                  onChange={e => setEditAge(e.target.value)}
                  placeholder="e.g. 25"
                  min="0"
                  max="120"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1.5px solid var(--sand)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                  }}
                />
              </div>

              {editError && <p style={{ color: 'var(--error)', fontSize: '0.85rem', marginBottom: '1rem' }}>{editError}</p>}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={editLoading}>
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
