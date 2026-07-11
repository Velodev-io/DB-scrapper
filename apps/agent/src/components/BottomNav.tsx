import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/properties/new', icon: '🏠', label: 'Properties' },
  // { to: '/projects/new',   icon: '🏗',  label: 'Projects' },
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
