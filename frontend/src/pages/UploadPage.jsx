import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FileDropzone from '../components/FileDropzone'
import PaymentModal from '../components/PaymentModal'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const FIELDS = [
  { key: 'cnic_front',  label: 'CNIC Front',     icon: '🪪', desc: 'Front side of your CNIC card' },
  { key: 'cnic_back',   label: 'CNIC Back',      icon: '🪪', desc: 'Back side of your CNIC card' },
  { key: 'marksheet',   label: '12th Marksheet', icon: '📋', desc: 'Intermediate / FSc marksheet' },
  { key: 'transcript',  label: 'Transcript',     icon: '📜', desc: 'Official university transcript' },
]

const STEPS_TEXT = [
  'Extracting data with OCR…',
  'Validating eligibility criteria…',
  'Generating degree PDF…',
  'Computing SHA-256 hash…',
  'Recording on blockchain…',
]

export default function UploadPage() {
  const { user } = useAuth()
  const navigate  = useNavigate()

  const [files,        setFiles]        = useState({})
  const [loading,      setLoading]      = useState(false)
  const [error,        setError]        = useState('')
  const [progress,     setProgress]     = useState('')
  const [showPayment,  setShowPayment]  = useState(false)

  // Payment state — stored so we can include tx in submission
  const [paymentTx,     setPaymentTx]     = useState(null)
  const [paymentWallet, setPaymentWallet] = useState(null)
  const [paymentDone,   setPaymentDone]   = useState(false)

  const setFile = (key) => (file) => {
    setFiles(f => ({ ...f, [key]: file }))
    setError('')
  }

  const allUploaded = FIELDS.every(f => files[f.key])

  // Called when PaymentModal confirms payment
  const handlePaymentSuccess = (txHash, walletAddress) => {
    setPaymentTx(txHash)
    setPaymentWallet(walletAddress)
    setPaymentDone(true)
    setShowPayment(false)
  }

  const handleSubmit = async () => {
    if (!allUploaded) {
      setError('Please upload all four documents before submitting.')
      return
    }
    if (!paymentDone) {
      setShowPayment(true)
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    FIELDS.forEach(({ key }) => formData.append(key, files[key]))
    // Send payment info to backend for audit
    formData.append('payment_tx',     paymentTx)
    formData.append('payment_wallet', paymentWallet)

    let stepIdx = 0
    setProgress(STEPS_TEXT[0])
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, STEPS_TEXT.length - 1)
      setProgress(STEPS_TEXT[stepIdx])
    }, 3500)

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      clearInterval(ticker)
      navigate('/result', { state: { result: res.data, paymentTx, paymentWallet } })
    } catch (err) {
      clearInterval(ticker)
      const msg = err.response?.data?.error || 'Upload failed. Please check your connection.'
      setError(msg)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="page-content">

      {/* Payment modal */}
      {showPayment && (
        <PaymentModal
          onSuccess={handlePaymentSuccess}
          onClose={() => setShowPayment(false)}
        />
      )}

      <div className="page-header">
        <p className="eyebrow">Step 1 of 1</p>
        <h1>Document Upload</h1>
        <p>
          Welcome, <strong style={{ color: 'var(--cyan)' }}>{user?.username}</strong>.
          Upload your four documents — OCR will extract the data automatically.
        </p>
      </div>

      {/* Payment status banner */}
      {paymentDone ? (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(74,222,128,0.08)',
          border: '1px solid rgba(74,222,128,0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: '1.5rem',
          fontSize: '0.88rem',
        }}>
          <span style={{ fontSize: '1.2rem' }}>✅</span>
          <div>
            <span style={{ color: '#4ade80', fontWeight: 600 }}>Payment confirmed</span>
            <span style={{ color: 'var(--text-muted)', marginLeft: 8, fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
              {paymentTx?.slice(0, 20)}…
            </span>
          </div>
          <a
            href={`https://sepolia.etherscan.io/tx/${paymentTx}`}
            target="_blank" rel="noreferrer"
            style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--cyan)' }}
          >
            View on Etherscan ↗
          </a>
        </div>
      ) : (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(251,146,60,0.08)',
          border: '1px solid rgba(251,146,60,0.25)',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 16px',
          marginBottom: '1.5rem',
          fontSize: '0.88rem',
        }}>
          <span style={{ fontSize: '1.2rem' }}>🦊</span>
          <span style={{ color: '#fb923c', fontWeight: 600 }}>Payment required</span>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
            0.001 ETH application fee · refunded if rejected
          </span>
          <button
            className="btn btn-primary"
            onClick={() => setShowPayment(true)}
            style={{ marginLeft: 'auto', padding: '6px 14px', fontSize: '0.82rem' }}
          >
            Pay Now →
          </button>
        </div>
      )}

      {/* Document grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(210px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {FIELDS.map(({ key, label, icon, desc }) => (
          <div key={key}>
            <FileDropzone
              label={label}
              icon={icon}
              file={files[key]}
              onChange={setFile(key)}
              accept="image/*,.pdf"
            />
            <p style={{
              marginTop: '5px', fontSize: '0.72rem',
              color: 'var(--text-muted)', textAlign: 'center',
            }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Eligibility criteria */}
      <div className="card card-sm" style={{ marginBottom: '1.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)', fontSize: '0.8rem',
          fontWeight: 600, color: 'var(--text-secondary)',
          marginBottom: '10px', letterSpacing: '0.05em',
        }}>ELIGIBILITY CRITERIA</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {[['CGPA', '≥ 2.5 required'], ['Percentage', '≥ 50% required'], ['CNIC', 'Must not be expired']].map(([k, v]) => (
            <div key={k} style={{
              background: 'var(--bg-elevated)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)', padding: '8px 14px', fontSize: '0.8rem',
            }}>
              <span style={{ color: 'var(--cyan)', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{k}</span>
              {' '}
              <span style={{ color: 'var(--text-secondary)' }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: '1rem' }}>
          <span>⚠</span> {error}
        </div>
      )}

      {loading ? (
        <div className="card loading-overlay">
          <div className="spinner" />
          <p>{progress}</p>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            This may take 30–90 seconds
          </p>
        </div>
      ) : (
        <button
          className="btn btn-primary btn-full"
          onClick={handleSubmit}
          disabled={!allUploaded}
          style={{ fontSize: '1rem', padding: '14px' }}
        >
          {!allUploaded
            ? `Upload all documents (${Object.keys(files).length}/4)`
            : !paymentDone
            ? '🦊 Pay & Submit Application'
            : '⛓ Submit & Verify on Blockchain'}
        </button>
      )}
    </div>
  )
}
