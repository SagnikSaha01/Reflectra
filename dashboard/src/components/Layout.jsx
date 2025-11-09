import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Brain, LayoutDashboard, MessageCircle, History, Sun, Moon } from 'lucide-react'
import './Layout.css'
import logo from '../../../chrome-extension/icons/icon128.png'

function Layout({ children }) {
  const location = useLocation()
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('reflectra-theme') || 'light'
    }
    return 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('reflectra-theme', theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'))
  }

  const navItems = [
    { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/reflection', icon: MessageCircle, label: 'Reflection' },
    { path: '/history', icon: History, label: 'History' }
  ]

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-content">
          <Link to="/" className="nav-brand nav-home-link">
            <img src={logo} className='logo-style'/>
            <span>Reflectra</span>
          </Link>

          <div className="nav-actions">
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

            <button
              className={`theme-toggle ${theme}`}
              onClick={toggleTheme}
              aria-label={`Toggle ${theme === 'light' ? 'dark' : 'light'} mode`}
            >
              <span className="theme-icon sun-icon">
                <Sun size={18} />
              </span>
              <span className="theme-icon moon-icon">
                <Moon size={18} />
              </span>
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
