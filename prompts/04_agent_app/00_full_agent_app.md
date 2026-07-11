# Phase 4 — Agent App (All Files)

> **Antigravity Instructions:** Build the complete Agent app UI. This is the most complex phase. Build files in the order listed — the design system must be first since all components depend on it.

---

## Phase 4, File 00: Design System

`apps/agent/src/index.css`

```css
/* ── Google Fonts Import ─────────────────────────────────────────── */
@import '@fontsource-variable/fraunces';
@import '@fontsource-variable/inter';
@import '@fontsource/ibm-plex-mono/400.css';
@import '@fontsource/ibm-plex-mono/500.css';

/* ── Brand Tokens ────────────────────────────────────────────────── */
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
  --warning:   #E67E22;

  --font-heading: 'Fraunces Variable', Georgia, serif;
  --font-body:    'Inter Variable', system-ui, sans-serif;
  --font-mono:    'IBM Plex Mono', 'Courier New', monospace;

  --nav-height: 64px;
  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
}

/* ── Reset ───────────────────────────────────────────────────────── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html { font-size: 16px; -webkit-text-size-adjust: 100%; }

body {
  background: var(--bone);
  color:      var(--ink);
  font-family: var(--font-body);
  line-height: 1.6;
  min-height: 100dvh;
  /* Prevent content from being hidden under bottom nav */
  padding-bottom: calc(var(--nav-height) + env(safe-area-inset-bottom));
}

/* ── Font Face display swap (prevents invisible text on slow networks) */
@font-face { font-display: swap; }

/* ── Typography ──────────────────────────────────────────────────── */
h1, h2, h3 { font-family: var(--font-heading); line-height: 1.2; color: var(--ink); }
h1 { font-size: 1.75rem; font-weight: 700; }
h2 { font-size: 1.375rem; font-weight: 600; }
h3 { font-size: 1.125rem; font-weight: 500; }

label, .label {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--concrete);
}

/* ── Page Layout ─────────────────────────────────────────────────── */
.page {
  max-width: 480px;
  margin: 0 auto;
  padding: 1.25rem 1rem 1.5rem;
}

.page-title {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  margin-bottom: 1.5rem;
  color: var(--ink);
}

/* ── Forms ───────────────────────────────────────────────────────── */
.form-field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-bottom: 1.25rem;
}

.form-input, .form-textarea, .form-select {
  width: 100%;
  background: var(--sand);
  border: 1.5px solid transparent;
  border-radius: var(--radius-sm);
  padding: 0.75rem 0.875rem;
  font-family: var(--font-body);
  font-size: 1rem;
  color: var(--ink);
  min-height: 48px;  /* Minimum touch target */
  transition: border-color 0.15s;
  -webkit-appearance: none;
  appearance: none;
}

.form-input:focus, .form-textarea:focus, .form-select:focus {
  outline: none;
  border-color: var(--ochre);
  background: var(--white);
}

.form-input.error, .form-textarea.error { border-color: var(--error); }
.form-error-msg { font-size: 0.8rem; color: var(--error); margin-top: 0.25rem; }

.form-textarea { min-height: 100px; resize: vertical; }

/* ── Chip Selectors ──────────────────────────────────────────────── */
.chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.chip {
  padding: 0.5rem 1rem;
  border-radius: 999px;
  border: 1.5px solid var(--concrete);
  background: transparent;
  color: var(--concrete);
  font-family: var(--font-body);
  font-size: 0.875rem;
  cursor: pointer;
  min-height: 40px;
  transition: all 0.15s;
  white-space: nowrap;
}

.chip:hover { border-color: var(--ochre); color: var(--ochre); }
.chip.active { background: var(--ochre); border-color: var(--ochre); color: var(--white); }

/* ── Buttons ─────────────────────────────────────────────────────── */
.btn-primary {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 52px;
  background: var(--ink);
  color: var(--bone);
  border: none;
  border-radius: var(--radius-md);
  font-family: var(--font-body);
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}

.btn-primary:hover  { background: var(--steel); }
.btn-primary:active { transform: scale(0.98); }
.btn-primary:disabled { background: var(--sand); color: var(--concrete); cursor: not-allowed; }

.btn-primary.loading { background: var(--concrete); }

.btn-ochre {
  background: var(--ochre);
  color: var(--white);
}
.btn-ochre:hover { background: #9a6128; }

/* ── Bottom Navigation ───────────────────────────────────────────── */
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0; right: 0;
  height: calc(var(--nav-height) + env(safe-area-inset-bottom));
  padding-bottom: env(safe-area-inset-bottom);
  background: var(--ink);
  display: flex;
  align-items: center;
  justify-content: space-around;
  border-top: 1px solid rgba(255,255,255,0.08);
  z-index: 100;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  color: var(--concrete);
  text-decoration: none;
  padding: 0.5rem;
  min-width: 60px;
  min-height: 48px;
  justify-content: center;
  transition: color 0.15s;
  border: none;
  background: none;
  cursor: pointer;
}

.nav-item.active, .nav-item:hover { color: var(--ochre); }
.nav-item-label { font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.05em; }
.nav-item-icon  { font-size: 1.25rem; }

/* ── Network Banner ─────────────────────────────────────────────── */
.network-banner {
  position: fixed;
  top: 0; left: 0; right: 0;
  padding: 0.5rem 1rem;
  font-family: var(--font-mono);
  font-size: 0.75rem;
  text-align: center;
  z-index: 200;
  transition: transform 0.3s;
}

.network-banner.offline  { background: var(--error);   color: var(--white); }
.network-banner.syncing  { background: var(--warning);  color: var(--white); }
.network-banner.hidden   { transform: translateY(-100%); }

/* ── Photo Uploader ─────────────────────────────────────────────── */
.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
}

.photo-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--sand);
}

.photo-card img {
  width: 100%; height: 100%;
  object-fit: cover;
}

.photo-overlay {
  position: absolute; inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0,0,0,0.5);
  color: white;
  font-size: 0.75rem;
  gap: 0.25rem;
}

.photo-overlay.done      { background: rgba(39, 174, 96, 0.6); }
.photo-overlay.queued    { background: rgba(230, 126, 34, 0.7); }
.photo-overlay.failed    { background: rgba(192, 57, 43, 0.7); cursor: pointer; }

.progress-ring { width: 40px; height: 40px; }
.overlay-text  { font-family: var(--font-mono); font-size: 0.65rem; }

.remove-btn {
  position: absolute;
  top: 4px; right: 4px;
  width: 24px; height: 24px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.6);
  color: white;
  font-size: 0.875rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.add-photo-btn {
  aspect-ratio: 1;
  border-radius: var(--radius-sm);
  border: 2px dashed var(--concrete);
  background: transparent;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  cursor: pointer;
  color: var(--concrete);
  transition: border-color 0.15s, color 0.15s;
}

.add-photo-btn:hover { border-color: var(--ochre); color: var(--ochre); }
.add-icon  { font-size: 1.5rem; }
.add-label { font-family: var(--font-mono); font-size: 0.65rem; text-transform: uppercase; }

.upload-status-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.status-badge {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  padding: 0.25rem 0.6rem;
  border-radius: 999px;
  white-space: nowrap;
}

.status-badge.uploading { background: var(--steel); color: var(--bone); }
.status-badge.queued    { background: var(--warning); color: var(--white); }
.status-badge.failed    { background: var(--error); color: var(--white); }
.status-badge.total     { background: var(--sand); color: var(--concrete); }

/* ── Cards (for list views) ─────────────────────────────────────── */
.record-card {
  background: var(--white);
  border-radius: var(--radius-md);
  padding: 1rem;
  margin-bottom: 0.75rem;
  border: 1px solid var(--sand);
  display: flex;
  gap: 0.875rem;
  text-decoration: none;
  color: inherit;
}

.record-card-thumb {
  width: 72px; height: 72px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
  background: var(--sand);
}

.record-card-body { flex: 1; min-width: 0; }
.record-card-title { font-weight: 600; margin-bottom: 0.25rem; }
.record-card-meta  { font-family: var(--font-mono); font-size: 0.7rem; color: var(--concrete); }

/* ── Submit Bar (fixed above bottom nav) ────────────────────────── */
.submit-bar {
  position: fixed;
  bottom: calc(var(--nav-height) + env(safe-area-inset-bottom));
  left: 0; right: 0;
  padding: 0.75rem 1rem;
  background: var(--bone);
  border-top: 1px solid var(--sand);
  z-index: 90;
}
```

---

## Phase 4, File 01: App Shell

`apps/agent/src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { clerkAppearance } from '@carry/shared'

import './index.css'
import App from './App.tsx'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!publishableKey) throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY')

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(console.error)
  })
}

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

`apps/agent/src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { SignedIn, SignedOut, SignIn, useUser } from '@clerk/clerk-react'
import { BottomNav } from './components/BottomNav'
import { NetworkBanner } from './components/NetworkBanner'
import { PropertyForm } from './pages/Properties/PropertyForm'
import { PropertyList } from './pages/Properties/PropertyList'
import { ProjectForm } from './pages/Projects/ProjectForm'
import { ProjectList } from './pages/Projects/ProjectList'
import { LabourForm } from './pages/Labour/LabourForm'
import { LabourList } from './pages/Labour/LabourList'
import { Profile } from './pages/Profile'

function AgentGuard({ children }: { children: React.ReactNode }) {
  const { user } = useUser()
  const role = user?.publicMetadata?.role as string | undefined
  if (!user) return null
  if (role !== 'agent') {
    return (
      <div className="page" style={{ paddingTop: '3rem', textAlign: 'center' }}>
        <h2>Access Denied</h2>
        <p style={{ color: 'var(--concrete)', marginTop: '0.5rem' }}>
          Your account is not authorised to access this app.<br />
          Contact your admin to request access.
        </p>
      </div>
    )
  }
  return <>{children}</>
}

export default function App() {
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
            <Route path="/projects/new"   element={<ProjectForm />} />
            <Route path="/projects"       element={<ProjectList />} />
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
```

`apps/agent/src/components/BottomNav.tsx`:

```tsx
import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/properties/new', icon: '🏠', label: 'Properties' },
  { to: '/projects/new',   icon: '🏗',  label: 'Projects' },
  { to: '/labour/new',     icon: '👷', label: 'Labour' },
  { to: '/profile',        icon: '👤', label: 'Profile' },
]

export function BottomNav() {
  return (
    <nav className="bottom-nav" role="navigation" aria-label="Main navigation">
      {tabs.map(tab => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
        >
          <span className="nav-item-icon" aria-hidden>{tab.icon}</span>
          <span className="nav-item-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
```

`apps/agent/src/components/NetworkBanner.tsx`:

```tsx
import { useState, useEffect } from 'react'

export function NetworkBanner() {
  const [status, setStatus] = useState<'online' | 'offline'>('online')

  useEffect(() => {
    const onOnline  = () => setStatus('online')
    const onOffline = () => setStatus('offline')
    window.addEventListener('online',  onOnline)
    window.addEventListener('offline', onOffline)
    if (!navigator.onLine) setStatus('offline')
    return () => {
      window.removeEventListener('online',  onOnline)
      window.removeEventListener('offline', onOffline)
    }
  }, [])

  if (status === 'online') return null

  return (
    <div className="network-banner offline" role="alert">
      📵 No signal — changes saved locally and will sync when you reconnect
    </div>
  )
}
```

---

## Phase 4, Files 02–04: Forms

> **Antigravity:** Build all three forms. Each follows the same pattern. Use the field lists from the Architecture doc.

### Property Form (`pages/Properties/PropertyForm.tsx`)
- All fields from the spec (propertyType chips, listingType chips, BHK stepper, price with auto-label, etc.)
- PhotoUploader component for `images` field (unlimited)
- Single image upload (or PhotoUploader maxPhotos=1) for `floorPlanUrl`
- LocationPicker component for lat/lng
- localStorage auto-save key: `carry:form:property:<userId>`
- On submit: `api.post('/properties', data, token)`
- On success: clear localStorage, navigate to `/properties`

### Project Form (`pages/Projects/ProjectForm.tsx`)
- Fields: title, category chips, location, areaSqft, durationMonths, packageTier chips, description
- PhotoUploader for `beforeImages`, `afterImages`, `stageImages` (three separate instances, each unlimited)
- localStorage key: `carry:form:project:<userId>`

### Labour Form (`pages/Labour/LabourForm.tsx`)
- Fields: fullName, age, gender chips, skillLevel chips, skillType dropdown (conditional — only shown if skillLevel === 'Skilled'), phone, profilePhotoUrl (maxPhotos=1)
- Address section: houseNo, street, locality, city, pincode
- localStorage key: `carry:form:labour:<userId>`

**Common pattern for all forms:**

```tsx
// Simplified form pattern
function useFormPersist<T>(key: string, initial: T) {
  const [form, setForm] = useState<T>(() => {
    const saved = localStorage.getItem(key)
    return saved ? { ...initial, ...JSON.parse(saved) } : initial
  })

  const update = (patch: Partial<T>) => {
    const next = { ...form, ...patch }
    setForm(next)
    localStorage.setItem(key, JSON.stringify(next))
  }

  const clear = () => {
    setForm(initial)
    localStorage.removeItem(key)
  }

  return { form, update, clear }
}
```

---

## Phase 4, File 05: List Views + File 06: Profile

### List Views (`PropertyList.tsx`, `ProjectList.tsx`, `LabourList.tsx`)
- Fetch from `GET /properties/mine` (with agent token)
- Paginated (load more button — not infinite scroll, safer on 3G)
- Each record shown as a `.record-card`
- Empty state: "No records yet — tap the form to submit your first one"

### Profile Page (`Profile.tsx`)
```tsx
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
```

---

## Verification

```bash
npm run dev:agent
```

On mobile (or Chrome DevTools mobile emulation):
- [ ] Sign in screen shows (Clerk UI with brand colours)
- [ ] Bottom nav visible, all 4 tabs navigate correctly
- [ ] Property form shows all fields
- [ ] Chip selectors work (tap to select/deselect)
- [ ] Photos add instantly with previews
- [ ] Form data persists in localStorage (fill fields → refresh → still there)
- [ ] Form submits and shows success

**✓ Phase 4 complete. Proceed to `05_admin_app/00_app_shell.md`.**
