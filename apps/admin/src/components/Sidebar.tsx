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
