import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useTheme } from '../context/ThemeContext'

export default function Navbar() {
  const { isLoggedIn, logout, user, isAdmin } = useAuth()
  const { theme, toggle } = useTheme()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <nav className="navbar">

      <Link to="/" className="navbar-brand">
        <div className="brand-icon">⛓</div>
        <span className="brand-name">Degree<span>Chain</span></span>
      </Link>

      <div className="navbar-right">

        {/* Always visible */}
        <Link to="/verify" className="nav-link">Verify</Link>

        {/* STUDENT links — only when logged in as student */}
        {isLoggedIn && !isAdmin && (
          <>
            <Link to="/upload" className="nav-link">Upload</Link>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 4 }}>
              🎓 Student
            </span>
          </>
        )}

        {/* ADMIN links — only when logged in as admin */}
        {isLoggedIn && isAdmin && (
          <>
            <Link to="/admin"  className="nav-link">Dashboard</Link>
            <Link to="/report" className="nav-link">Report</Link>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginRight: 4 }}>
              👑 Admin
            </span>
          </>
        )}

        {/* Logout — any logged in user */}
        {isLoggedIn && (
          <button
            className="btn btn-ghost"
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={handleLogout}
          >
            Logout
          </button>
        )}

        {/* Login button — not logged in */}
        {!isLoggedIn && (
          <Link to="/login">
            <button className="btn btn-primary" style={{ padding: '8px 18px', fontSize: '0.85rem' }}>
              Login
            </button>
          </Link>
        )}

        <button className="btn-theme" onClick={toggle} title="Toggle theme">
          {theme === 'dark' ? '☀' : '🌙'}
        </button>

      </div>
    </nav>
  )
}
