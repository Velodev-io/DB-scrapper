import { NavLink } from 'react-router-dom'

const navItems = [
  { to: '/properties', icon: '🏠', label: 'Properties' },
  // { to: '/projects',   icon: '🏗',  label: 'Projects' },
  { to: '/labour',     icon: '👷', label: 'Labour' },
  { to: '/shops',      icon: '🏪', label: 'Shops' },
  { to: '/agents',     icon: '👥', label: 'Agents' },
]

interface SidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <>
      {isOpen && <div className="sidebar-backdrop" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header-mobile">
          <span className="sidebar-title-mobile">Carry Admin</span>
          <button className="sidebar-close-btn" onClick={onClose} aria-label="Close menu">
            &times;
          </button>
        </div>
        <div className="sidebar-section-label">Inbox</div>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            onClick={onClose}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </aside>
    </>
  )
}
