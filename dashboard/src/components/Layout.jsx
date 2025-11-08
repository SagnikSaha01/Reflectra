import { Link, useLocation } from 'react-router-dom'
import { Brain, LayoutDashboard, MessageCircle, History } from 'lucide-react'
import './Layout.css'

function Layout({ children }) {
  const location = useLocation()

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/reflection', icon: MessageCircle, label: 'Reflection' },
    { path: '/history', icon: History, label: 'History' }
  ]

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-content">
          <div className="nav-brand">
            <Brain size={28} />
            <span>Reflectra</span>
          </div>

          <div className="nav-links">
            {navItems.map(item => (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-link ${location.pathname === item.path ? 'active' : ''}`}
              >
                <item.icon size={20} />
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

export default Layout
