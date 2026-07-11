import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn, useUser, useAuth } from '@clerk/clerk-react'
import { useEffect } from 'react'
import { BottomNav } from './components/BottomNav'
import { NetworkBanner } from './components/NetworkBanner'
import { PropertyForm } from './pages/Properties/PropertyForm'
import { PropertyList } from './pages/Properties/PropertyList'
// import { ProjectForm } from './pages/Projects/ProjectForm'
// import { ProjectList } from './pages/Projects/ProjectList'
import { LabourForm } from './pages/Labour/LabourForm'
import { LabourList } from './pages/Labour/LabourList'
import { Profile } from './pages/Profile'
import { flushUploadQueueForeground, flushPendingRecordsForeground } from './lib/uploadQueue'

function AgentGuard({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const { getToken } = useAuth()
  const role = user?.publicMetadata?.role as string | undefined

  // Auto-reload the Clerk session when no role is present.
  // This picks up publicMetadata changes made by the admin without
  // requiring the user to manually hard-refresh the page.
  useEffect(() => {
    if (!user || role === 'agent' || role === 'admin') return

    // Automatically check with backend if the email has a pending invitation
    const syncRole = async () => {
      try {
        const token = await getToken()
        if (!token) return
        const base = import.meta.env.VITE_API_BASE ?? 'http://localhost:4001/api/v1'
        const res = await fetch(`${base}/agents/sync-role`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        if (res.ok) {
          const data = await res.json()
          if (data.synced) {
            // Force user session to reload immediately to reflect role update
            await user.reload()
          }
        }
      } catch (err) {
        console.error('Failed to auto-sync agent role:', err)
      }
    }

    syncRole()

    const id = setInterval(() => { user.reload() }, 2000)
    return () => clearInterval(id)
  }, [user, role, getToken])

  if (!user) return null

  // Show a gentle "waiting for access" state instead of hard "Access Denied"
  // while we poll for the role to be assigned.
  if (role !== 'agent' && role !== 'admin') {
    return (
      <div className="page" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <h2>Access Pending</h2>
        <p style={{ color: 'var(--concrete)', marginTop: '0.5rem' }}>
          Waiting for admin to grant access…<br />
          This will update automatically.
        </p>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  const { getToken } = useAuth()

  useEffect(() => {
    window.__clerkGetToken = () => getToken()
    // Trigger offline synchronization now that the Clerk authentication token is set
    flushUploadQueueForeground().catch(console.error)
    flushPendingRecordsForeground().catch(console.error)
  }, [getToken])

  return (
    <>
      <SignedOut>
        <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', paddingBottom: 0 }}>
          <SignIn routing="hash" />
        </div>
      </SignedOut>
      <SignedIn>
        <AgentGuard>
          <NetworkBanner />
          <Routes>
            <Route path="/"               element={<Navigate to="/properties/new" replace />} />
            <Route path="/properties/new" element={<PropertyForm />} />
            <Route path="/properties"     element={<PropertyList />} />
            {/* <Route path="/projects/new"   element={<ProjectForm />} /> */}
            {/* <Route path="/projects"       element={<ProjectList />} /> */}
            <Route path="/labour/new"     element={<LabourForm />} />
            <Route path="/labour"         element={<LabourList />} />
            <Route path="/profile"        element={<Profile />} />
          </Routes>
          <BottomNav />
        </AgentGuard>
      </SignedIn>
    </>
  )
}
