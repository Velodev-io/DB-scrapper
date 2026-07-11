import { useState, useEffect } from 'react'
import { useAuth } from '@clerk/clerk-react'
import { api } from '@carry/shared'

interface AgentEntry {
  id: string
  name?: string
  email: string
  status: 'active' | 'pending'
  createdAt: string
  clerkUserId?: string
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

  // Revoke confirm state
  const [revoking, setRevoking] = useState<string | null>(null) // clerkUserId

  async function fetchAgents() {
    setLoading(true)
    setError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      const [active, pending] = await Promise.all([
        api.get<{ id: string; name: string; email: string; status: string; createdAt: string }[]>('/agents', token),
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

  useEffect(() => { fetchAgents() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    try {
      const token = await getToken()
      if (!token) throw new Error('Not authenticated')
      await api.post('/agents/invite', { email: inviteEmail }, token)
      setShowInvite(false)
      setInviteEmail('')
      fetchAgents()
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
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Status</th>
                <th>Joined</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agents.length === 0 && (
                <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--concrete)', padding: '2rem' }}>No agents found</td></tr>
              )}
              {agents.map(agent => (
                <tr key={agent.id}>
                  <td style={{ fontWeight: 500 }}>{agent.name || '—'}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{agent.email}</td>
                  <td>
                    <span className={`status-pill ${agent.status}`}>{agent.status}</span>
                  </td>
                  <td style={{ color: 'var(--concrete)', fontSize: '0.85rem' }}>
                    {new Date(agent.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <div className="action-group">
                      {agent.status === 'active' && agent.clerkUserId && (
                        <button
                          id={`btn-revoke-${agent.id}`}
                          className="btn-action btn-delete"
                          disabled={revoking === agent.clerkUserId}
                          onClick={() => handleRevoke(agent.clerkUserId!)}
                        >
                          {revoking === agent.clerkUserId ? 'Revoking…' : 'Revoke'}
                        </button>
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
    </div>
  )
}
