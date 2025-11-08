import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Brain, LayoutDashboard, MessageCircle, History, LogOut } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import './Layout.css'

function Layout({ children }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/reflection', icon: MessageCircle, label: 'Reflection' },
    { path: '/history', icon: History, label: 'History' }
  ]

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  }

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

          <div className="nav-user">
            {user && (
              <span className="user-email">{user.email}</span>
            )}
            <button onClick={handleLogout} className="logout-btn" title="Sign out">
              <LogOut size={20} />
            </button>
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
