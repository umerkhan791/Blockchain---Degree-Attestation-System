import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Toast from '../components/Toast'
import { copyToClipboard, formatTimestamp } from '../utils/helpers'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

// How long to wait before initiating refund (ms) — give blockchain time
const REFUND_DELAY_MS = 5000

export default function ResultPage() {
  const { state }  = useLocation()
  const navigate   = useNavigate()
  const [toast, setToast]           = useState('')
  const [refundStep, setRefundStep] = useState('idle') // idle | pending | done | failed

  const result        = state?.result
  const paymentTx     = state?.paymentTx
  const paymentWallet = state?.paymentWallet

  const approved = result?.status === 'APPROVED'

  // Auto-trigger refund if rejected and payment was made
  useEffect(() => {
    if (!approved && paymentWallet && paymentTx && refundStep === 'idle') {
      const timer = setTimeout(() => initiateRefund(), REFUND_DELAY_MS)
      return () => clearTimeout(timer)
    }
  }, [approved, paymentWallet, paymentTx])

  const initiateRefund = async () => {
    if (!window.ethereum || !paymentWallet) return
    setRefundStep('pending')

    try {
      // University wallet sends back the fee to student
      // In a real system this would be backend-triggered.
      // For FYP demo: we show the refund tx hash from backend response if available.
      // If result.refund_tx exists (backend did it), show it. Otherwise show pending.
      if (result?.refund_tx) {
        setRefundStep('done')
      } else {
        // Simulate: in a real system backend sends refund automatically
        // Show the student their wallet address and that refund is processing
        setRefundStep('processing')
      }
    } catch (e) {
      setRefundStep('failed')
    }
  }

  if (!result) {
    return (
      <div className="page-content" style={{ textAlign: 'center', paddingTop: '4rem' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
        <h2>No result found</h2>
        <p style={{ color: 'var(--text-secondary)', margin: '8px 0 1.5rem' }}>
          Please complete the upload process first.
        </p>
        <Link to="/upload"><button className="btn btn-primary">Go to Upload</button></Link>
      </div>
    )
  }

  // Use Supabase public URLs if available (persist across redeploys)
  // Fall back to Render /download route if not
  const pdfFilename = result.pdf_path ? result.pdf_path.split(/[\\/]/).pop() : null
  const qrFilename  = result.qr_path  ? result.qr_path.split(/[\\/]/).pop()  : null
  const pdfUrl      = result.pdf_url  || (pdfFilename ? `${API_BASE}/download/${pdfFilename}` : null)
  const qrUrl       = result.qr_url   || (qrFilename  ? `${API_BASE}/qr/${qrFilename}`        : null)

  const copy = async (value, label) => {
    const ok = await copyToClipboard(value)
    if (ok) setToast(`${label} copied!`)
  }

  return (
    <div className="page-content">
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      <div className="page-header">
        <p className="eyebrow">Verification Result</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1>Degree Application</h1>
          <span className={`badge ${approved ? 'badge-approved' : 'badge-rejected'}`}>
            {approved ? '✓ Approved' : '✗ Rejected'}
          </span>
        </div>
        <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
          {approved
            ? 'All eligibility criteria met. Your degree has been recorded on the blockchain.'
            : 'The application did not meet one or more eligibility requirements.'}
        </p>
      </div>

      {/* ── Refund banner (rejected only) ─────────────────────────── */}
      {!approved && paymentTx && (
        <div style={{
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          background: refundStep === 'done'
            ? 'rgba(74,222,128,0.08)' : 'rgba(251,146,60,0.08)',
          border: `1px solid ${refundStep === 'done'
            ? 'rgba(74,222,128,0.3)' : 'rgba(251,146,60,0.3)'}`,
          borderRadius: 'var(--radius-sm)',
          padding: '14px 16px',
          marginBottom: '1.5rem',
          fontSize: '0.88rem',
        }}>
          <span style={{ fontSize: '1.3rem', flexShrink: 0 }}>
            {refundStep === 'done' ? '✅' : refundStep === 'failed' ? '❌' : '🔄'}
          </span>
          <div style={{ flex: 1 }}>
            {refundStep === 'idle' && (
              <><strong style={{ color: '#fb923c' }}>Refund initiating…</strong>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.8rem' }}>
                Your 0.001 ETH application fee will be refunded to your wallet shortly.
              </p></>
            )}
            {refundStep === 'pending' && (
              <><strong style={{ color: '#fb923c' }}>Processing refund…</strong>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.8rem' }}>
                Sending 0.001 ETH back to {paymentWallet?.slice(0, 10)}…
              </p></>
            )}
            {refundStep === 'processing' && (
              <><strong style={{ color: '#fb923c' }}>Refund in progress</strong>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.8rem' }}>
                0.001 ETH will be returned to <span style={{ fontFamily: 'var(--font-mono)' }}>{paymentWallet?.slice(0,16)}…</span> within a few minutes.
              </p></>
            )}
            {refundStep === 'done' && (
              <><strong style={{ color: '#4ade80' }}>Refund sent!</strong>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.8rem' }}>
                0.001 ETH has been returned to your wallet.
                {result.refund_tx && (
                  <a href={`https://sepolia.etherscan.io/tx/${result.refund_tx}`}
                    target="_blank" rel="noreferrer"
                    style={{ color: 'var(--cyan)', marginLeft: 8 }}>
                    View on Etherscan ↗
                  </a>
                )}
              </p></>
            )}
            {refundStep === 'failed' && (
              <><strong style={{ color: '#f87171' }}>Refund failed</strong>
              <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.8rem' }}>
                Please contact the university with your payment TX: {paymentTx?.slice(0,20)}…
              </p></>
            )}
          </div>
        </div>
      )}

      {/* ── Payment proof (approved) ───────────────────────────────── */}
      {approved && paymentTx && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(74,222,128,0.06)',
          border: '1px solid rgba(74,222,128,0.2)',
          borderRadius: 'var(--radius-sm)',
          padding: '10px 14px',
          marginBottom: '1.25rem',
          fontSize: '0.82rem',
        }}>
          <span>💳</span>
          <span style={{ color: 'var(--text-secondary)' }}>Payment confirmed:</span>
          <a href={`https://sepolia.etherscan.io/tx/${paymentTx}`}
            target="_blank" rel="noreferrer"
            style={{ color: 'var(--cyan)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
            {paymentTx?.slice(0, 24)}… ↗
          </a>
        </div>
      )}

      {/* ── Student details ────────────────────────────────────────── */}
      <div className="card" style={{ marginBottom: '1.25rem' }}>
        <p style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
          color: 'var(--text-muted)', letterSpacing: '0.08em',
          textTransform: 'uppercase', marginBottom: '1rem',
        }}>Student Information</p>
        <div className="data-grid">
          <div className="data-item">
            <span className="data-label">Student Name</span>
            <span className="data-value">{result.student_name || '—'}</span>
          </div>
          <div className="data-item">
            <span className="data-label">CGPA</span>
            <span className="data-value" style={{ color: result.cgpa >= 2.5 ? 'var(--green)' : 'var(--red)' }}>
              {result.cgpa ?? '—'}
            </span>
          </div>
          <div className="data-item">
            <span className="data-label">Percentage</span>
            <span className="data-value" style={{ color: result.percentage >= 50 ? 'var(--green)' : 'var(--red)' }}>
              {result.percentage != null ? `${result.percentage}%` : '—'}
            </span>
          </div>
          <div className="data-item">
            <span className="data-label">CNIC Expiry</span>
            <span className="data-value">{result.cnic_expiry || '—'}</span>
          </div>
        </div>
      </div>

      {/* ── Rejection reason ──────────────────────────────────────── */}
      {!approved && (
        <div style={{
          background: 'rgba(248,113,113,0.08)',
          border: '1px solid rgba(248,113,113,0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '1rem 1.25rem',
          marginBottom: '1.5rem',
        }}>
          <p style={{ fontWeight: 600, color: '#f87171', marginBottom: '8px' }}>Why was this rejected?</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.85rem' }}>
            {result.cgpa < 2.5 && (
              <div style={{ color: 'var(--text-secondary)' }}>
                ❌ <strong>CGPA {result.cgpa}</strong> is below the minimum of 2.5
              </div>
            )}
            {result.percentage < 50 && (
              <div style={{ color: 'var(--text-secondary)' }}>
                ❌ <strong>Percentage {result.percentage}%</strong> is below the minimum of 50%
              </div>
            )}
            {!result.cnic_valid && (
              <div style={{ color: 'var(--text-secondary)' }}>
                ❌ <strong>CNIC</strong> is expired or could not be verified
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Blockchain info (approved only) ───────────────────────── */}
      {approved && (
        <>
          <div className="card" style={{ marginBottom: '1.25rem' }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--text-muted)', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: '1rem',
            }}>Blockchain Record</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <p className="data-label" style={{ marginBottom: 5 }}>Degree Hash (SHA-256)</p>
                <div className="hash-box" onClick={() => copy(result.degree_hash, 'Degree hash')} title="Click to copy">
                  {result.degree_hash}
                </div>
              </div>
              <div>
                <p className="data-label" style={{ marginBottom: 5 }}>Blockchain Transaction</p>
                <div className="hash-box" onClick={() => copy(result.blockchain_tx, 'Transaction hash')} title="Click to copy">
                  {result.blockchain_tx}
                </div>
              </div>
              {result.etherscan_url && (
                <a href={result.etherscan_url} target="_blank" rel="noreferrer"
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    color: 'var(--cyan)', fontSize: '0.82rem', textDecoration: 'none',
                  }}>
                  🔗 View on Sepolia Etherscan ↗
                </a>
              )}
            </div>
          </div>

          {/* QR code */}
          <div className="card" style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
            <p style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
              color: 'var(--text-muted)', letterSpacing: '0.08em',
              textTransform: 'uppercase', marginBottom: '1rem',
            }}>Verification QR Code</p>
            {qrUrl ? (
              <img src={qrUrl} alt="QR Code" style={{
                width: '180px', height: '180px',
                imageRendering: 'pixelated',
                border: '3px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                background: '#fff', padding: '8px',
              }} onError={(e) => { e.target.style.display = 'none' }} />
            ) : (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>QR code not available</p>
            )}
            <p style={{ marginTop: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Scan to verify degree authenticity
            </p>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {pdfUrl && (
              <a href={pdfUrl} target="_blank" rel="noreferrer" style={{ flex: 1, minWidth: 180 }}>
                <button className="btn btn-primary" style={{ width: '100%' }}>
                  ⬇ Download Degree PDF
                </button>
              </a>
            )}
            <button
              className="btn btn-secondary"
              onClick={() => navigate('/verify', { state: { hash: result.degree_hash } })}
              style={{ flex: 1, minWidth: 180 }}
            >
              🔍 Verify This Degree
            </button>
          </div>
        </>
      )}

      {!approved && (
        <div style={{ marginTop: '1.5rem' }}>
          <button className="btn btn-secondary" onClick={() => navigate('/upload')}>
            ← Try Again
          </button>
        </div>
      )}
    </div>
  )
}
