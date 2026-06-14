import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('student') // 'student' | 'admin'

  const [studentForm, setStudentForm] = useState({
    username: '', fatherName: '', cnic: '', password: ''
  })

  const [adminForm, setAdminForm] = useState({
    username: '', password: ''
  })

  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  // ── Student form handlers ─────────────────────────────────────
  const handleStudentChange = (e) => {
    setStudentForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  const handleCnicChange = (e) => {
    const digits = e.target.value.replace(/\D/g, '').slice(0, 13)
    let val = digits
    if (digits.length > 5)  val = digits.slice(0, 5) + '-' + digits.slice(5)
    if (digits.length > 12) val = digits.slice(0, 5) + '-' + digits.slice(5, 12) + '-' + digits.slice(12)
    setStudentForm(f => ({ ...f, cnic: val }))
    setError('')
  }

  // ── Admin form handlers ───────────────────────────────────────
  const handleAdminChange = (e) => {
    setAdminForm(f => ({ ...f, [e.target.name]: e.target.value }))
    setError('')
  }

  // ── Validation ────────────────────────────────────────────────
  const validateStudent = () => {
    if (!studentForm.username.trim())   return 'Username is required.'
    if (!studentForm.fatherName.trim()) return "Father's name is required."
    if (!/^\d{5}-\d{7}-\d$/.test(studentForm.cnic))
      return 'Enter a valid CNIC (e.g. 42201-1234567-8).'
    if (studentForm.password.length < 4) return 'Password must be at least 4 characters.'
    return null
  }

  const validateAdmin = () => {
    if (!adminForm.username.trim()) return 'Username is required.'
    if (adminForm.password.length < 4) return 'Password must be at least 4 characters.'
    return null
  }

  // ── Submit ────────────────────────────────────────────────────
  const handleStudentSubmit = async (e) => {
    e.preventDefault()
    const err = validateStudent()
    if (err) { setError(err); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 600))

    login({
      username:   studentForm.username,
      fatherName: studentForm.fatherName,
      cnic:       studentForm.cnic,
      role:       'student',
    })
    navigate('/upload')
    setLoading(false)
  }

  const handleAdminSubmit = async (e) => {
    e.preventDefault()
    const err = validateAdmin()
    if (err) { setError(err); return }

    setLoading(true)
    await new Promise(r => setTimeout(r, 600))

    // Hard-coded admin credentials
    if (adminForm.username !== 'admin' || adminForm.password !== 'admin123') {
      setError('Invalid admin credentials.')
      setLoading(false)
      return
    }

    login({ username: 'admin', role: 'admin' })
    navigate('/admin')
    setLoading(false)
  }

  // ── Shared styles ─────────────────────────────────────────────
  const tabStyle = (active) => ({
    flex: 1,
    padding: '10px',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: '0.9rem',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    transition: 'all var(--transition)',
    background: active ? 'var(--cyan)' : 'transparent',
    color:      active ? '#000' : 'var(--text-secondary)',
  })

  return (
    <div className="page-content" style={{ maxWidth: '440px' }}>

      {/* Logo */}
      <div style={{ textAlign: 'center', marginBottom: '2rem', paddingTop: '2rem' }}>
        <div style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          width: 64, height: 64,
          background: 'linear-gradient(135deg, var(--cyan), var(--gold))',
          borderRadius: 16, fontSize: '2rem', marginBottom: '1rem',
          boxShadow: '0 8px 32px var(--cyan-mid)',
        }}>⛓</div>
        <h1 style={{ fontSize: '1.7rem', marginBottom: '6px' }}>DegreeChain Portal</h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          Select your role to continue
        </p>
      </div>

      <div className="card">

        {/* Tab switcher */}
        <div style={{
          display: 'flex', gap: 4, padding: 4,
          background: 'var(--bg-elevated)',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '1.5rem',
        }}>
          <button style={tabStyle(tab === 'student')} onClick={() => { setTab('student'); setError('') }}>
            🎓 Student
          </button>
          <button style={tabStyle(tab === 'admin')} onClick={() => { setTab('admin'); setError('') }}>
            👑 Admin
          </button>
        </div>

        {/* Student form */}
        {tab === 'student' && (
          <form onSubmit={handleStudentSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div className="form-group">
              <label>Username</label>
              <input name="username" type="text" placeholder="Enter your username"
                value={studentForm.username} onChange={handleStudentChange} />
            </div>
            <div className="form-group">
              <label>Father's Name</label>
              <input name="fatherName" type="text" placeholder="Enter father's name"
                value={studentForm.fatherName} onChange={handleStudentChange} />
            </div>
            <div className="form-group">
              <label>CNIC Number</label>
              <input name="cnic" type="text" placeholder="42201-1234567-8"
                value={studentForm.cnic} onChange={handleCnicChange} maxLength={15}
                style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" placeholder="Enter your password"
                value={studentForm.password} onChange={handleStudentChange} />
            </div>
            {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}>
              {loading ? 'Signing in…' : '🎓 Student Login →'}
            </button>
          </form>
        )}

        {/* Admin form */}
        {tab === 'admin' && (
          <form onSubmit={handleAdminSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
            <div style={{
              background: 'var(--gold-dim)', border: '1px solid var(--gold)',
              borderRadius: 'var(--radius-sm)', padding: '10px 14px',
              fontSize: '0.8rem', color: 'var(--gold)',
              fontFamily: 'var(--font-display)',
            }}>
              👑 Admin access only. Unauthorized attempts are logged.
            </div>
            <div className="form-group">
              <label>Admin Username</label>
              <input name="username" type="text" placeholder="Enter admin username"
                value={adminForm.username} onChange={handleAdminChange} />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input name="password" type="password" placeholder="Enter admin password"
                value={adminForm.password} onChange={handleAdminChange} />
            </div>
            {error && <div className="alert alert-error"><span>⚠</span> {error}</div>}
            <button type="submit" className="btn btn-primary btn-full" disabled={loading}
              style={{ background: 'linear-gradient(135deg, var(--gold), #c8a000)', color: '#000' }}>
              {loading ? 'Signing in…' : '👑 Admin Login →'}
            </button>
          </form>
        )}

        <div className="divider" />
        <p style={{ textAlign: 'center', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
          Want to verify a degree?{' '}
          <Link to="/verify" style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
            Use the Verify tool
          </Link>
        </p>
      </div>

      <p style={{
        textAlign: 'center', marginTop: '2rem',
        fontSize: '0.75rem', color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        Secured by Ethereum · SHA-256 · Ganache
      </p>
    </div>
  )
}
