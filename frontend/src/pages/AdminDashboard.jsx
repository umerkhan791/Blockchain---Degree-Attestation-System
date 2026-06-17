import { useState, useEffect } from 'react'
import api from '../utils/api'

const STAT_CARDS = [
  { key: 'total',         label: 'Total Applications', icon: '🎓', color: 'var(--cyan)'  },
  { key: 'approved',      label: 'Approved',           icon: '✅', color: '#4ade80'      },
  { key: 'rejected',      label: 'Rejected',           icon: '❌', color: '#f87171'      },
  { key: 'fraud',         label: 'Fraud Attempts',     icon: '🚨', color: '#fb923c'      },
  { key: 'verifications', label: 'Verifications',      icon: '🔍', color: '#a78bfa'      },
]

const STATUS_STYLE = {
  APPROVED: { bg: 'rgba(74,222,128,0.12)',  color: '#4ade80', border: 'rgba(74,222,128,0.25)',  label: 'APPROVED' },
  REJECTED: { bg: 'rgba(248,113,113,0.12)', color: '#f87171', border: 'rgba(248,113,113,0.25)', label: 'REJECTED' },
  REVOKED:  { bg: 'rgba(251,146,60,0.12)',  color: '#fb923c', border: 'rgba(251,146,60,0.25)',  label: 'REVOKED'  },
  PENDING:  { bg: 'rgba(167,139,250,0.12)', color: '#a78bfa', border: 'rgba(167,139,250,0.25)', label: 'PENDING'  },
}

function StatusBadge({ status, revoked }) {
  const key = revoked ? 'REVOKED' : (status || 'PENDING')
  const s   = STATUS_STYLE[key] || STATUS_STYLE.PENDING
  return (
    <span style={{
      fontSize: '0.72rem', fontWeight: 700,
      padding: '3px 10px', borderRadius: '100px',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
    }}>
      {s.label}
    </span>
  )
}

export default function AdminDashboard() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [lastUpdated, setLastUpdated] = useState(null)

  const fetchStats = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await api.get('/admin/stats')
      setStats(res.data)
      setLastUpdated(new Date().toLocaleTimeString())
    } catch (e) {
      setError('Could not connect to backend. Make sure it is running.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStats() }, [])

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchStats, 30_000)
    return () => clearInterval(interval)
  }, [])

  const approvalRate = stats
    ? stats.approved + stats.rejected > 0
      ? Math.round((stats.approved / (stats.approved + stats.rejected)) * 100)
      : 0
    : 0

  return (
    <div className="page-content" style={{ maxWidth: '960px' }}>

      {/* Header */}
      <div style={{ paddingTop: '2.5rem', marginBottom: '2rem' }}>
        <div style={{
          display: 'inline-flex', gap: '6px',
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          color: 'var(--cyan)', background: 'var(--cyan-dim)',
          border: '1px solid var(--cyan-mid)', borderRadius: '100px',
          padding: '4px 14px', marginBottom: '1rem',
          letterSpacing: '0.08em', textTransform: 'uppercase',
        }}>
          Admin Only · ChainDegree
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', marginBottom: '4px' }}>Admin Dashboard</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', margin: 0 }}>
                Live stats from Supabase · Sepolia blockchain
              </p>
              {stats && (
                <span style={{
                  fontSize: '0.72rem', padding: '2px 8px', borderRadius: '100px',
                  background: stats.blockchain_connected ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                  color: stats.blockchain_connected ? '#4ade80' : '#f87171',
                  border: `1px solid ${stats.blockchain_connected ? 'rgba(74,222,128,0.25)' : 'rgba(248,113,113,0.25)'}`,
                }}>
                  ⛓ {stats.blockchain_connected ? 'Sepolia Online' : 'Blockchain Offline'}
                </span>
              )}
            </div>
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

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠</span> {error}
        </div>
      )}

      {/* Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        {STAT_CARDS.map(({ key, label, icon, color }) => (
          <div key={key} className="card card-sm"
            style={{ transition: 'border-color var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cyan-mid)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: '1.5rem', marginBottom: '10px' }}>{icon}</div>
            <div style={{
              fontSize: '2rem', fontWeight: 700,
              fontFamily: 'var(--font-mono)', color,
              marginBottom: '4px', lineHeight: 1,
            }}>
              {loading ? '—' : (stats?.[key] ?? 0)}
            </div>
            <p style={{
              fontSize: '0.75rem', color: 'var(--text-secondary)', margin: 0,
              fontFamily: 'var(--font-display)', fontWeight: 600,
              textTransform: 'uppercase', letterSpacing: '0.05em',
            }}>{label}</p>
          </div>
        ))}
      </div>

      {/* Approval rate bar */}
      {stats && !loading && (
        <div className="card" style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: 0,
            }}>Auto-Approval Rate</p>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#4ade80', fontSize: '1.1rem' }}>
              {approvalRate}%
            </span>
          </div>
          <div style={{ height: 10, background: 'var(--bg-elevated)', borderRadius: 100, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${approvalRate}%`,
              background: 'linear-gradient(90deg, var(--cyan), #4ade80)',
              borderRadius: 100, transition: 'width 0.8s ease',
            }} />
          </div>
          <div style={{ display: 'flex', gap: 20, marginTop: 8, fontSize: '0.78rem' }}>
            <span style={{ color: '#4ade80' }}>✓ Approved: {stats.approved}</span>
            <span style={{ color: '#f87171' }}>✗ Rejected: {stats.rejected}</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontSize: '0.72rem' }}>
              Rule-based auto-validation · no manual approval needed
            </span>
          </div>
        </div>
      )}

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '0.5rem 0 1.5rem' }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '1rem' }}>⛓</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {/* Recent Degrees Table */}
      <div className="card" style={{ marginBottom: '2rem', padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontSize: '1rem', margin: 0, fontFamily: 'var(--font-display)', fontWeight: 700 }}>
            Recent Applications
          </h2>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last 10 records · Supabase</span>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            Loading from Supabase…
          </div>
        ) : !stats?.recent_degrees?.length ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            No applications yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Student Name', 'Degree Hash', 'Date', 'Status', 'Blockchain', 'Action'].map(h => (
                    <th key={h} style={{
                      padding: '10px 16px', textAlign: 'left',
                      color: 'var(--text-muted)', fontWeight: 600,
                      fontSize: '0.72rem', textTransform: 'uppercase',
                      letterSpacing: '0.05em', whiteSpace: 'nowrap',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.recent_degrees.map((deg, i) => (
                  <tr key={i}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background var(--transition)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-hover, rgba(255,255,255,0.03))'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '12px 16px', color: 'var(--text-primary)', fontWeight: 500 }}>
                      {deg.student_name || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {deg.degree_hash ? (
                        <span
                          onClick={() => {
                            navigator.clipboard.writeText(deg.degree_hash)
                            alert('Hash copied to clipboard!')
                          }}
                          title={`Click to copy full hash: ${deg.degree_hash}`}
                          style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                            color: 'var(--cyan)', background: 'var(--cyan-dim)',
                            padding: '2px 8px', borderRadius: '4px',
                            cursor: 'pointer',
                          }}
                        >
                          {deg.degree_hash.slice(0, 14)}… 📋
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px', color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>
                      {deg.timestamp
                        ? new Date(deg.timestamp).toLocaleDateString('en-PK')
                        : '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <StatusBadge status={deg.status} revoked={deg.revoked} />
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {deg.tx_hash ? (
                        <a
                          href={`https://sepolia.etherscan.io/tx/0x${deg.tx_hash.replace(/^0x/, '')}`}
                          target="_blank" rel="noreferrer"
                          style={{ color: 'var(--cyan)', fontSize: '0.75rem', textDecoration: 'none' }}
                        >
                          Sepolia ↗
                        </a>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      {deg.status === 'APPROVED' && deg.degree_hash ? (
                        <button
                          onClick={async () => {
                            if (!confirm(`Revoke degree for ${deg.student_name}?`)) return
                            try {
                              await api.post(`/admin/revoke/${deg.degree_hash}`)
                              alert('Degree revoked successfully!')
                              fetchStats()
                            } catch (e) {
                              alert('Failed to revoke degree: ' + (e.response?.data?.error || e.message))
                            }
                          }}
                          style={{
                            fontSize: '0.72rem', fontWeight: 600,
                            padding: '4px 10px', borderRadius: '4px',
                            background: 'rgba(248,113,113,0.12)',
                            color: '#f87171',
                            border: '1px solid rgba(248,113,113,0.3)',
                            cursor: 'pointer',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          🔒 REVOKE
                        </button>
                      ) : deg.status === 'REVOKED' ? (
                        <span style={{ fontSize: '0.72rem', color: '#fb923c', fontFamily: 'var(--font-mono)' }}>
                          🚫 REVOKED
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p style={{
        textAlign: 'center', marginTop: '2.5rem',
        fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)',
      }}>
        Sepolia · Solidity · Web3.py · SHA-256 · Supabase
      </p>
    </div>
  )
}
