import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import FileDropzone from '../components/FileDropzone'
import api from '../utils/api'
import { useAuth } from '../context/AuthContext'

const FIELDS = [
  { key: 'cnic_front',  label: 'CNIC Front',    icon: '🪪', desc: 'Front side of your CNIC card' },
  { key: 'cnic_back',   label: 'CNIC Back',     icon: '🪪', desc: 'Back side of your CNIC card' },
  { key: 'marksheet',   label: '12th Marksheet', icon: '📋', desc: 'Intermediate / FSc marksheet' },
  { key: 'transcript',  label: 'Transcript',     icon: '📜', desc: 'Official university transcript' },
]

export default function UploadPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [files, setFiles] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [progress, setProgress] = useState('')

  const setFile = (key) => (file) => {
    setFiles(f => ({ ...f, [key]: file }))
    setError('')
  }

  const allUploaded = FIELDS.every(f => files[f.key])

  const handleSubmit = async () => {
    if (!allUploaded) {
      setError('Please upload all four documents before submitting.')
      return
    }

    setLoading(true)
    setError('')

    const formData = new FormData()
    FIELDS.forEach(({ key }) => formData.append(key, files[key]))

    const steps = [
      'Extracting data with OCR…',
      'Validating eligibility criteria…',
      'Generating degree PDF…',
      'Computing SHA-256 hash…',
      'Recording on blockchain…',
    ]

    let stepIdx = 0
    setProgress(steps[0])
    const ticker = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1)
      setProgress(steps[stepIdx])
    }, 3500)

    try {
      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      clearInterval(ticker)
      // Pass result to result page via navigation state
      navigate('/result', { state: { result: res.data } })
    } catch (err) {
      clearInterval(ticker)
      const msg = err.response?.data?.error || err.response?.data?.message || 'Upload failed. Please check your Flask server.'
      setError(msg)
    } finally {
      setLoading(false)
      setProgress('')
    }
  }

  return (
    <div className="page-content">
      <div className="page-header">
        <p className="eyebrow">Step 1 of 1</p>
        <h1>Document Upload</h1>
        <p>
          Welcome, <strong style={{ color: 'var(--cyan)' }}>{user?.username}</strong>.
          Upload your four documents — OCR will extract the data automatically.
        </p>
      </div>

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
              marginTop: '5px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              textAlign: 'center',
            }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Upload checklist */}
      <div className="card card-sm" style={{ marginBottom: '1.5rem' }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          marginBottom: '10px',
          letterSpacing: '0.05em',
        }}>ELIGIBILITY CRITERIA</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {[
            ['CGPA', '≥ 2.5 required'],
            ['Percentage', '≥ 50% required'],
            ['CNIC', 'Must not be expired'],
          ].map(([k, v]) => (
            <div key={k} style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '8px 14px',
              fontSize: '0.8rem',
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
          {allUploaded ? '⛓ Submit & Verify on Blockchain' : `Upload all documents (${Object.keys(files).length}/4)`}
        </button>
      )}
    </div>
  )
}
