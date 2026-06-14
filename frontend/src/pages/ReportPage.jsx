import { useState, useEffect } from 'react'
import axios from 'axios'

const FLASK = 'http://127.0.0.1:5000'

const EVENT_COLORS = {
  DEGREE_ISSUED:            { color: 'var(--green)',  bg: 'var(--green-dim)',  icon: '🎓' },
  DEGREE_VERIFIED:          { color: 'var(--cyan)',   bg: 'var(--cyan-dim)',   icon: '✅' },
  DEGREE_REJECTED:          { color: 'var(--red)',    bg: 'var(--red-dim)',    icon: '❌' },
  FRAUD_ATTEMPT:            { color: 'var(--red)',    bg: 'var(--red-dim)',    icon: '🚨' },
  DUPLICATE_DEGREE_BLOCKED: { color: 'var(--gold)',   bg: 'var(--gold-dim)',   icon: '⚠️' },
  DEGREE_REVOKED:           { color: 'var(--gold)',   bg: 'var(--gold-dim)',   icon: '🔒' },
  UNAUTHORIZED_ACCESS:      { color: 'var(--red)',    bg: 'var(--red-dim)',    icon: '🛡' },
}

const DEFAULT_STYLE = { color: 'var(--text-secondary)', bg: 'var(--bg-elevated)', icon: '📋' }

export default function ReportPage() {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [tab,     setTab]     = useState('overview') // overview | log | degrees

  useEffect(() => {
    fetchReport()
  }, [])

  const fetchReport = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${FLASK}/admin/report`)
      setData(res.data)
    } catch (e) {
      setError('Could not load report. Is Flask running?')
    } finally {
      setLoading(false)
    }
  }

  if (loading) return (
    <div className="page-content">
      <div className="loading-overlay">
        <div className="spinner" />
        <p>Loading audit report...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="page-content">
      <div className="alert alert-error">{error}</div>
    </div>
  )

  const { counts, audit_log, degrees, total_events, blockchain_connected } = data

  const STAT_CARDS = [
    { label: 'Degrees Issued',      value: counts.DEGREE_ISSUED,            color: 'var(--green)' },
    { label: 'Degrees Rejected',    value: counts.DEGREE_REJECTED,          color: 'var(--red)'   },
    { label: 'Verifications',       value: counts.DEGREE_VERIFIED,          color: 'var(--cyan)'  },
    { label: 'Fraud Attempts',      value: counts.FRAUD_ATTEMPT,            color: 'var(--red)'   },
    { label: 'Duplicates Blocked',  value: counts.DUPLICATE_DEGREE_BLOCKED, color: 'var(--gold)'  },
    { label: 'Degrees Revoked',     value: counts.DEGREE_REVOKED,           color: 'var(--gold)'  },
    { label: 'Unauth Access',       value: counts.UNAUTHORIZED_ACCESS,      color: 'var(--red)'   },
    { label: 'Total Log Events',    value: total_events,                    color: 'var(--text-primary)' },
  ]

  return (
    <div className="page-content" style={{ maxWidth: '960px' }}>

      {/* Header */}
      <div className="page-header">
        <p className="eyebrow">Admin</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <h1>System Report & Audit</h1>
          <span className={`badge ${blockchain_connected ? 'badge-valid' : 'badge-invalid'}`}>
            {blockchain_connected ? '⛓ Blockchain Online' : '⛓ Blockchain Offline'}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)' }}>
          Live data from <code>audit.log</code> and <code>degrees.json</code>
        </p>
      </div>

      {/* Stat cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem',
      }}>
        {STAT_CARDS.map(({ label, value, color }) => (
          <div key={label} className="card card-sm" style={{ textAlign: 'center' }}>
            <div style={{
              fontSize: '2rem',
              fontFamily: 'var(--font-mono)',
              fontWeight: 700,
              color,
              marginBottom: 4,
            }}>{value}</div>
            <div style={{
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
        {[
          { key: 'overview', label: 'Overview' },
          { key: 'log',      label: `Audit Log (${total_events})` },
          { key: 'degrees',  label: `Degrees (${degrees.length})` },
        ].map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={tab === t.key ? 'btn btn-primary' : 'btn btn-secondary'}
            style={{ padding: '8px 18px', fontSize: '0.85rem' }}
          >
            {t.label}
          </button>
        ))}
        <button
          onClick={fetchReport}
          className="btn btn-ghost"
          style={{ marginLeft: 'auto', padding: '8px 14px', fontSize: '0.82rem' }}
        >
          ↻ Refresh
        </button>
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Approval rate */}
          <div className="card">
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: '1rem',
            }}>Approval Rate</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  height: 12,
                  background: 'var(--bg-elevated)',
                  borderRadius: 100,
                  overflow: 'hidden',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${counts.DEGREE_ISSUED + counts.DEGREE_REJECTED > 0
                      ? (counts.DEGREE_ISSUED / (counts.DEGREE_ISSUED + counts.DEGREE_REJECTED)) * 100
                      : 0}%`,
                    background: 'linear-gradient(90deg, var(--cyan), var(--green))',
                    borderRadius: 100,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '1.1rem',
                color: 'var(--green)',
                fontWeight: 700,
                minWidth: 50,
              }}>
                {counts.DEGREE_ISSUED + counts.DEGREE_REJECTED > 0
                  ? Math.round((counts.DEGREE_ISSUED / (counts.DEGREE_ISSUED + counts.DEGREE_REJECTED)) * 100)
                  : 0}%
              </span>
            </div>
            <div style={{ display: 'flex', gap: 20, marginTop: 10, fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--green)' }}>✓ Approved: {counts.DEGREE_ISSUED}</span>
              <span style={{ color: 'var(--red)'   }}>✗ Rejected: {counts.DEGREE_REJECTED}</span>
            </div>
          </div>

          {/* Security summary */}
          <div className="card">
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: '1rem',
            }}>Security Events</p>
            <div className="data-grid">
              {[
                { label: 'Fraud Attempts',     value: counts.FRAUD_ATTEMPT,            color: 'var(--red)'  },
                { label: 'Duplicates Blocked', value: counts.DUPLICATE_DEGREE_BLOCKED, color: 'var(--gold)' },
                { label: 'Revoked Degrees',    value: counts.DEGREE_REVOKED,           color: 'var(--gold)' },
                { label: 'Unauth Access',      value: counts.UNAUTHORIZED_ACCESS,      color: 'var(--red)'  },
              ].map(({ label, value, color }) => (
                <div key={label} className="data-item">
                  <span className="data-label">{label}</span>
                  <span className="data-value" style={{ color, fontSize: '1.4rem' }}>{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent 5 log entries */}
          <div className="card">
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--text-muted)', textTransform: 'uppercase',
              letterSpacing: '0.08em', marginBottom: '1rem',
            }}>Recent Activity</p>
            {audit_log.slice(0, 5).map((e, i) => {
              const s = EVENT_COLORS[e.event_type] || DEFAULT_STYLE
              return (
                <div key={i} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                  padding: '8px 0',
                  borderBottom: i < 4 ? '1px solid var(--border)' : 'none',
                }}>
                  <span style={{
                    background: s.bg, color: s.color,
                    borderRadius: 6, padding: '2px 8px',
                    fontSize: '0.7rem', fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {s.icon} {e.event_type.replace(/_/g, ' ')}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', flex: 1 }}>
                    {e.details}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', flexShrink: 0 }}>
                    {e.timestamp.split(' ')[1]}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Audit Log tab */}
      {tab === 'log' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {['Timestamp', 'Event', 'Details'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                      color: 'var(--text-muted)', textTransform: 'uppercase',
                      letterSpacing: '0.06em', borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {audit_log.map((e, i) => {
                  const s = EVENT_COLORS[e.event_type] || DEFAULT_STYLE
                  return (
                    <tr key={i} style={{
                      borderBottom: '1px solid var(--border)',
                      background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)',
                    }}>
                      <td style={{
                        padding: '8px 14px', color: 'var(--text-muted)',
                        fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                        whiteSpace: 'nowrap',
                      }}>{e.timestamp}</td>
                      <td style={{ padding: '8px 14px', whiteSpace: 'nowrap' }}>
                        <span style={{
                          background: s.bg, color: s.color,
                          padding: '2px 8px', borderRadius: 4,
                          fontSize: '0.68rem', fontWeight: 700,
                          fontFamily: 'var(--font-mono)',
                        }}>
                          {s.icon} {e.event_type}
                        </span>
                      </td>
                      <td style={{
                        padding: '8px 14px', color: 'var(--text-secondary)',
                        fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
                        wordBreak: 'break-all',
                      }}>{e.details}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Degrees tab */}
      {tab === 'degrees' && (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)' }}>
                  {['Student Name', 'Status', 'Degree Hash', 'Timestamp'].map(h => (
                    <th key={h} style={{
                      padding: '10px 14px', textAlign: 'left',
                      fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                      color: 'var(--text-muted)', textTransform: 'uppercase',
                      letterSpacing: '0.06em', borderBottom: '1px solid var(--border)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {degrees.map((d, i) => (
                  <tr key={i} style={{
                    borderBottom: '1px solid var(--border)',
                    background: i % 2 === 0 ? 'transparent' : 'var(--bg-elevated)',
                  }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {d.student_name}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={`badge ${d.status === 'APPROVED' ? 'badge-approved' : 'badge-rejected'}`}>
                        {d.status}
                      </span>
                    </td>
                    <td style={{
                      padding: '10px 14px',
                      fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                      color: 'var(--cyan)',
                    }}>
                      {d.degree_hash ? `${d.degree_hash.slice(0, 20)}...` : '—'}
                    </td>
                    <td style={{
                      padding: '10px 14px',
                      color: 'var(--text-muted)', fontSize: '0.78rem',
                    }}>
                      {d.timestamp
                        ? new Date(d.timestamp * 1000).toLocaleString('en-PK')
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
