import { UserButton } from '@clerk/clerk-react'

interface TopbarProps {
  onToggleSidebar: () => void
}

export function Topbar({ onToggleSidebar }: TopbarProps) {
  return (
    <header className="topbar">
      <button className="mobile-menu-toggle" onClick={onToggleSidebar} aria-label="Toggle Navigation">
        ☰
      </button>
      <span className="topbar-logo">Carry Construction — Admin</span>
      <div className="topbar-right">
        <UserButton />
      </div>
    </header>
  )
}
