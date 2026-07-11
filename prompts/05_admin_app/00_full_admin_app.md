# Phase 5 — Admin App (All Files)

> **Antigravity Instructions:** Build the complete Admin dashboard. Desktop-first, sidebar layout, data tables with filters. Build the app shell first, then each inbox page.

---

## Phase 5, File 00: App Shell

`apps/admin/src/index.css` — same brand tokens as agent app, plus desktop layout utilities:

```css
@import '@fontsource-variable/fraunces';
@import '@fontsource-variable/inter';
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/500.css';

@font-face { font-display: swap; }

:root {
  --ink:       #1C1B18;
  --bone:      #F5F1E9;
  --ochre:     #B87333;
  --concrete:  #8B857A;
  --sand:      #E7E0D3;
  --steel:     #2E3A40;
  --white:     #FFFFFF;
  --error:     #C0392B;
  --success:   #27AE60;

  --sidebar-width: 240px;
  --topbar-height: 60px;

  --font-heading: 'Fraunces Variable', Georgia, serif;
  --font-body:    'Inter Variable', system-ui, sans-serif;
  --font-mono:    'IBM Plex Mono', monospace;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

body {
  background: var(--bone);
  color: var(--ink);
  font-family: var(--font-body);
  line-height: 1.6;
}

/* ── Shell Layout ────────────────────────────────────────────────── */
.shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--topbar-height) 1fr;
  min-height: 100vh;
}

.topbar {
  grid-column: 1 / -1;
  background: var(--ink);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 1.5rem;
  border-bottom: 1px solid rgba(255,255,255,0.08);
}

.topbar-logo {
  font-family: var(--font-heading);
  font-size: 1.125rem;
  color: var(--bone);
  letter-spacing: -0.01em;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.sidebar {
  background: var(--white);
  border-right: 1px solid var(--sand);
  padding: 1.5rem 0;
  position: sticky;
  top: 0;
  height: calc(100vh - var(--topbar-height));
  overflow-y: auto;
}

.sidebar-section-label {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: var(--concrete);
  padding: 0 1.25rem;
  margin-bottom: 0.5rem;
  margin-top: 1.25rem;
}

.sidebar-link {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.625rem 1.25rem;
  color: var(--concrete);
  text-decoration: none;
  font-size: 0.9rem;
  transition: all 0.12s;
  border-left: 3px solid transparent;
}

.sidebar-link:hover { background: var(--bone); color: var(--ink); }
.sidebar-link.active { background: var(--bone); color: var(--ochre); border-left-color: var(--ochre); font-weight: 600; }

.main-content {
  padding: 2rem;
  overflow-y: auto;
  height: calc(100vh - var(--topbar-height));
}

/* ── Page Header ─────────────────────────────────────────────────── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.page-header h1 { font-family: var(--font-heading); font-size: 1.5rem; }

/* ── Filter Bar ──────────────────────────────────────────────────── */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  align-items: center;
}

.filter-select {
  padding: 0.5rem 0.875rem;
  border: 1.5px solid var(--sand);
  border-radius: 6px;
  background: var(--white);
  font-family: var(--font-body);
  font-size: 0.875rem;
  color: var(--ink);
  min-width: 140px;
  cursor: pointer;
}

.filter-select:focus { outline: none; border-color: var(--ochre); }

.search-input {
  flex: 1;
  min-width: 200px;
  padding: 0.5rem 0.875rem;
  border: 1.5px solid var(--sand);
  border-radius: 6px;
  font-family: var(--font-body);
  font-size: 0.875rem;
}

/* ── Data Table ──────────────────────────────────────────────────── */
.data-table-wrap {
  background: var(--white);
  border-radius: 10px;
  border: 1px solid var(--sand);
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

th {
  background: var(--bone);
  font-family: var(--font-mono);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--concrete);
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--sand);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
}

th:hover { color: var(--ink); }
th.sorted { color: var(--ochre); }

td {
  padding: 0.875rem 1rem;
  border-bottom: 1px solid var(--bone);
  font-size: 0.9rem;
  vertical-align: middle;
}

tr:last-child td { border-bottom: none; }
tr:hover td { background: var(--bone); }

.table-thumb {
  width: 48px; height: 48px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--sand);
}

.status-pill {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 999px;
  font-family: var(--font-mono);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  white-space: nowrap;
}

.status-pill.pending  { background: #FEF3C7; color: #92400E; }
.status-pill.reviewed { background: #D1FAE5; color: #065F46; }
.status-pill.deleted  { background: #FEE2E2; color: #991B1B; }
.status-pill.active   { background: #D1FAE5; color: #065F46; }
.status-pill.revoked  { background: #FEE2E2; color: #991B1B; }

/* ── Action Buttons ──────────────────────────────────────────────── */
.action-group {
  display: flex;
  gap: 0.375rem;
}

.btn-action {
  padding: 0.3rem 0.7rem;
  border-radius: 6px;
  border: 1.5px solid var(--sand);
  background: var(--white);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.12s;
  white-space: nowrap;
}

.btn-action:hover                { border-color: var(--ochre); color: var(--ochre); }
.btn-action.btn-review:hover     { background: var(--success); color: white; border-color: var(--success); }
.btn-action.btn-delete:hover     { background: var(--error); color: white; border-color: var(--error); }

/* ── Modal ───────────────────────────────────────────────────────── */
.modal-backdrop {
  position: fixed; inset: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 500;
}

.modal {
  background: var(--white);
  border-radius: 12px;
  padding: 2rem;
  width: 100%;
  max-width: 480px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal h2 { font-family: var(--font-heading); margin-bottom: 1.25rem; }
```

`apps/admin/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider } from '@clerk/clerk-react'
import { clerkAppearance } from '@carry/shared'

import './index.css'
import App from './App.tsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!publishableKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClerkProvider publishableKey={publishableKey} appearance={clerkAppearance}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </ClerkProvider>
  </StrictMode>,
)
```

`apps/admin/src/App.tsx`:

```tsx
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
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p>This dashboard is for Carry Construction admins only.</p>
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
```

`apps/admin/src/components/Sidebar.tsx`:

```tsx
import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/properties', icon: '🏠', label: 'Properties' },
  { to: '/projects',   icon: '🏗',  label: 'Projects' },
  { to: '/labour',     icon: '👷', label: 'Labour' },
  { to: '/agents',     icon: '👥', label: 'Agents' },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-section-label">Inbox</div>
      {navItems.map(item => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
        >
          <span>{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </aside>
  )
}
```

---

## Phase 5, Files 01–04: Inbox Pages

### Agents Page (`pages/Agents.tsx`)

Functionality:
- Fetch `GET /agents` and `GET /agents/invitations` — merge into one list
- Show: name, email, status pill (Active/Pending), action (Revoke for active, — for pending)
- "Invite Agent" button → modal with email input → `POST /agents/invite`
- "Revoke" button → confirm dialog → `DELETE /agents/:clerkUserId`

### Properties Page (`pages/Properties.tsx`)

```tsx
// State: list, filters (agentId, reviewStatus, listingType, propertyType, city), selectedRecord
// Fetch: GET /properties?page=1&limit=20&...filters
// Table columns: thumbnail | title | type | listing | location | price | submitted by | date | status | actions
// Actions: View (opens detail modal/panel), Mark Reviewed, Delete
// Detail panel: all fields, photo gallery with download button, map link
// Filter bar: dropdowns for each filter

// Image download button:
<a href={img.download(publicId, title)} download>
  ↓ Download Original
</a>
```

### Projects Page (`pages/Projects.tsx`)
Same pattern as Properties. Filters: agentId, reviewStatus, category, packageTier.
Three photo galleries: Before / After / Stage.

### Labour Page (`pages/Labour.tsx`)
Filters: agentId, reviewStatus, gender, skillLevel, skillType, city.
Profile photo displayed in table row (or placeholder avatar).

---

## Verification

```bash
npm run dev:admin
```

Open `http://localhost:5182` in desktop browser:
- [ ] Sign-in screen shows
- [ ] After admin sign-in → sidebar visible with all 4 sections
- [ ] Properties inbox loads with data from API
- [ ] Filters work (select "pending" → shows only pending records)
- [ ] "Mark Reviewed" changes status pill immediately
- [ ] Agents page → "Invite Agent" sends an invitation email
- [ ] Revoke → agent can no longer access agent app (test within 60 seconds of revoking)

**✓ Phase 5 complete. Proceed to `06_deployment/00_clerk_setup.md`.**
