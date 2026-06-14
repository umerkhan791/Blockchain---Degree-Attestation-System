import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE = 'http://127.0.0.1:5000'

const STAT_CARDS = [
  { key: 'total',         label: 'Total Degrees',       icon: '🎓', color: 'var(--cyan)' },
  { key: 'approved',      label: 'Approved',             icon: '✅', color: '#4ade80' },
  { key: 'rejected',      label: 'Rejected',             icon: '❌', color: '#f87171' },
  { key: 'fraud',         label: 'Fraud Attempts',       icon: '🚨', color: '#fb923c' },
  { key: 'verifications', label: 'Verification Requests', icon: '🔍', color: '#a78bfa' },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const [stats, setStats]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch(`${API_BASE}/admin/stats`)
      if (!res.ok) throw new Error(`Server returned ${res.status}`)
      const data = await res.json()
      setStats(data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      setError('Could not connect to Flask backend. Make sure it is running on port 5000.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  return (
    <div className="page-content" style={{ maxWidth: '860px' }}>

      {/* Header */}
      <div style={{ paddingTop: '2.5rem', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex',
          gap: '6px',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.72rem',
          color: 'var(--cyan)',
          background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-mid)',
          borderRadius: '100px',
          padding: '4px 14px',
          marginBottom: '1rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          Admin Only · DegreeChain
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Admin Dashboard</h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
              Live stats from the Ganache blockchain
            </p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            {lastUpdated && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                Updated {lastUpdated}
              </span>
            )}
            <button
              className="btn btn-secondary"
              onClick={fetchStats}
              disabled={loading}
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            >
              {loading ? '⏳ Loading…' : '↻ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {STAT_CARDS.map(({ key, label, icon, color }) => (
          <div
            key={key}
            className="card card-sm"
            style={{ transition: 'border-color var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cyan-mid)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{icon}</div>
            <div style={{
              fontSize: '2rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              color: color,
              marginBottom: '4px',
              lineHeight: 1,
            }}>
              {loading ? '—' : (stats?.[key] ?? 0)}
            </div>
            <p style={{
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
            }}>
              {label}
            </p>
          </div>
        ))}
      </div>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0.5rem 0 2rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '1rem' }}>⛓</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {/* Recent Degrees Table */}
      <div className="card" style={{ marginBottom: '2rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '1rem', margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Recent Degrees on Chain
          </h2>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            Querying blockchain…
          </div>
        ) : !stats?.recent_degrees?.length ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No degrees stored on blockchain yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Student Name', 'Degree Hash', 'Timestamp', 'Status'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      color: 'var(--text-muted)',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent_degrees.map((deg, i) => (
                  <tr
                    key={i}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover, rgba(255,255,255,0.03))'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {deg.student_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.78rem',
                        color: 'var(--cyan)',
                        background: 'var(--cyan-dim)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}>
                        {deg.degree_hash ? deg.degree_hash.slice(0, 16) + '…' : '—'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                      {deg.timestamp
                        ? new Date(deg.timestamp * 1000).toLocaleString()
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        padding: '3px 10px',
                        borderRadius: '100px',
                        background: deg.revoked ? 'rgba(248, 113, 113, 0.12)' : 'rgba(74, 222, 128, 0.12)',
                        color:      deg.revoked ? '#f87171' : '#4ade80',
                        border:     deg.revoked ? '1px solid rgba(248, 113, 113, 0.25)' : '1px solid rgba(74, 222, 128, 0.25)',
                      }}>
                        {deg.revoked ? 'REVOKED' : 'ACTIVE'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Footer note */}
      <p style={{
        textAlign: 'center',
        marginTop: '2.5rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        Ganache · Solidity · Web3.py · SHA-256
      </p>
    </div>
  )
}
