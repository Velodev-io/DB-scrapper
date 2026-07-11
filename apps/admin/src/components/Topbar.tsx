import { UserButton } from '@clerk/clerk-react'

export function Topbar() {
  return (
    <header className="topbar">
      <span className="topbar-logo">Carry Construction — Admin</span>
      <div className="topbar-right">
        <UserButton />
      </div>
    </header>
  )
}
