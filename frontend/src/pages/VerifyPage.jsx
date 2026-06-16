import { useState, useEffect } from 'react'
import { useParams, useLocation } from 'react-router-dom'
import api from '../utils/api'
import { formatTimestamp } from '../utils/helpers'
import Toast from '../components/Toast'

export default function VerifyPage() {
  const { hash: routeHash } = useParams()
  const { state } = useLocation()

  const [inputHash, setInputHash] = useState(routeHash || state?.hash || '')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [toast,   setToast]   = useState('')

  useEffect(() => {
    if (routeHash || state?.hash) handleVerify(routeHash || state?.hash)
  }, [])

  const handleVerify = async (hashToCheck) => {
    const h = (hashToCheck || inputHash).trim()
    if (!h) { setError('Please enter a degree hash.'); return }

    setLoading(true)
    setError('')
    setResult(null)

    try {
      const res = await api.get(`/verify/${h}`)
      setResult(res.data)
    } catch (err) {
      if (err.response?.status === 404) {
        setResult({ status: 'INVALID', degree_hash: h })
      } else {
        setError(err.response?.data?.error || 'Could not reach the verification server.')
      }
    } finally {
      setLoading(false)
    }
  }

  const isValid = result?.status === 'VALID'

  return (
    <div className="page-content" style={{ maxWidth: '700px' }}>
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      <div className="page-header">
        <p className="eyebrow">Public Tool</p>
        <h1>Degree Verification</h1>
        <p>Enter a degree hash to verify its authenticity on the Sepolia blockchain.</p>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label htmlFor="hash-input">Degree Hash (SHA-256)</label>
            <input
              id="hash-input" type="text"
              placeholder="e.g. a3f1b2c9d4e5…"
              value={inputHash}
              onChange={(e) => { setInputHash(e.target.value); setError(''); setResult(null) }}
              style={{ fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
              onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
            />
          </div>
          <button className="btn btn-primary" onClick={() => handleVerify()} disabled={loading} style={{ flexShrink: 0 }}>
            {loading
              ? <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
              : '🔍 Verify'}
          </button>
        </div>
        {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}><span>⚠</span> {error}</div>}
      </div>

      {result && (
        <div className="card" style={{
          border: `1px solid ${isValid ? 'var(--green)' : 'var(--red)'}`,
          background: isValid ? 'var(--green-dim)' : 'var(--red-dim)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
            <div style={{ fontSize: '2.2rem', lineHeight: 1 }}>{isValid ? '✅' : '❌'}</div>
            <div>
              <span className={`badge ${isValid ? 'badge-valid' : 'badge-invalid'}`}>
                {isValid ? 'VALID — On Sepolia Blockchain' : 'INVALID — Not Found'}
              </span>
              <p style={{ marginTop: '4px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {isValid
                  ? 'This degree hash exists on the Sepolia blockchain and is authentic.'
                  : 'No record found for this hash. The document may be tampered or not issued.'}
              </p>
            </div>
          </div>

          {isValid && (
            <>
              <div className="divider" />
              <div className="data-grid" style={{ marginTop: '1rem' }}>
                <div className="data-item">
                  <span className="data-label">Student Name</span>
                  <span className="data-value">{result.student_name || '—'}</span>
                </div>
                <div className="data-item">
                  <span className="data-label">Timestamp</span>
                  <span className="data-value" style={{ fontSize: '0.9rem' }}>
                    {formatTimestamp(result.timestamp)}
                  </span>
                </div>
              </div>
              <div style={{ marginTop: '1.25rem' }}>
                <p className="data-label" style={{ marginBottom: 6 }}>Verified Hash</p>
                <div className="hash-box"
                  onClick={async () => { await navigator.clipboard.writeText(result.degree_hash); setToast('Hash copied!') }}
                  title="Click to copy"
                >
                  {result.degree_hash}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {!result && !loading && (
        <div className="card card-sm" style={{ marginTop: '1rem' }}>
          <p style={{
            fontFamily: 'var(--font-display)', fontSize: '0.8rem', fontWeight: 600,
            color: 'var(--text-muted)', marginBottom: '8px', letterSpacing: '0.05em',
          }}>HOW IT WORKS</p>
          <ol style={{
            color: 'var(--text-secondary)', fontSize: '0.85rem',
            paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '4px',
          }}>
            <li>The degree PDF is hashed with SHA-256 during issuance.</li>
            <li>That hash is stored on the Sepolia Ethereum blockchain via smart contract.</li>
            <li>Paste the hash here to confirm authenticity against the on-chain record.</li>
          </ol>
        </div>
      )}
    </div>
  )
}
