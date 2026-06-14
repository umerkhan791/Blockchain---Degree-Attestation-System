import { useLocation, useNavigate, Link } from 'react-router-dom'
import { useState } from 'react'
import Toast from '../components/Toast'
import { truncateHash, formatTimestamp, copyToClipboard } from '../utils/helpers'

const FLASK = 'http://127.0.0.1:5000'

export default function ResultPage() {
  const { state } = useLocation()
  const navigate = useNavigate()
  const [toast, setToast] = useState('')

  const result = state?.result

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

  const approved = result.status === 'APPROVED'

  // Build correct URLs from just the filename
  const pdfFilename = result.pdf_path ? result.pdf_path.split(/[\\/]/).pop() : null
  const qrFilename  = result.qr_path  ? result.qr_path.split(/[\\/]/).pop()  : null
  const pdfUrl      = pdfFilename ? `${FLASK}/download/${pdfFilename}` : null
  const qrUrl       = qrFilename  ? `${FLASK}/qr/${qrFilename}`       : null

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

      {/* Student details */}
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

      {approved && (
        <>
          {/* Blockchain info */}
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
                <p className="data-label" style={{ marginBottom: 5 }}>Blockchain Transaction Hash</p>
                <div className="hash-box" onClick={() => copy(result.blockchain_tx, 'Transaction hash')} title="Click to copy">
                  {result.blockchain_tx}
                </div>
              </div>
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
              <img
                src={qrUrl}
                alt="QR Code"
                style={{
                  width: '180px', height: '180px',
                  imageRendering: 'pixelated',
                  border: '3px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  background: '#fff',
                  padding: '8px',
                }}
                onError={(e) => { e.target.style.display = 'none' }}
              />
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
