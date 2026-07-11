import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn, useUser } from '@clerk/clerk-react'
import { Sidebar } from './components/Sidebar'
import { Topbar } from './components/Topbar'
import { Agents } from './pages/Agents'
import { Properties } from './pages/Properties'
import { Projects } from './pages/Projects'
import { Labour } from './pages/Labour'

function AdminGuard({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const role = user?.publicMetadata?.role as string | undefined
  if (!user) return null
  if (role !== 'admin') {
    return (
      <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'var(--font-body)' }}>
        <h2 style={{ fontFamily: 'var(--font-heading)', marginBottom: '1rem' }}>Access Denied</h2>
        <p style={{ color: 'var(--concrete)' }}>This dashboard is for Carry Construction admins only.</p>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
  return (
    <>
      <SignedOut>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
          <SignIn routing="hash" />
        </div>
      </SignedOut>
      <SignedIn>
        <AdminGuard>
          <div className="shell">
            <Topbar />
            <Sidebar />
            <main className="main-content">
              <Routes>
                <Route path="/"           element={<Navigate to="/properties" replace />} />
                <Route path="/agents"     element={<Agents />} />
                <Route path="/properties" element={<Properties />} />
                <Route path="/projects"   element={<Projects />} />
                <Route path="/labour"     element={<Labour />} />
              </Routes>
            </main>
          </div>
        </AdminGuard>
      </SignedIn>
    </>
  )
}
