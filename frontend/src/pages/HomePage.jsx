import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const FEATURES = [
  { icon: '🪪', title: 'OCR Extraction', desc: 'Tesseract reads CNIC, marksheet, and transcript automatically.' },
  { icon: '🔐', title: 'SHA-256 Hashing', desc: 'Every degree PDF is fingerprinted with a unique tamper-proof hash.' },
  { icon: '⛓', title: 'Blockchain Storage', desc: 'Hash is written to a Ganache Ethereum smart contract permanently.' },
  { icon: '📱', title: 'QR Verification', desc: 'Scan the QR code on any printed degree to verify authenticity.' },
]

export default function HomePage() {
  const { isLoggedIn } = useAuth()

  return (
    <div className="page-content" style={{ maxWidth: '800px' }}>
      {/* Hero */}
      <div style={{
        textAlign: 'center',
        padding: '3.5rem 1rem 3rem',
      }}>
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
          marginBottom: '1.5rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
        }}>
          BSCS Final Year Project · Blockchain
        </div>

        <h1 style={{
          fontSize: 'clamp(2rem, 6vw, 3.2rem)',
          background: 'linear-gradient(135deg, var(--text-primary) 40%, var(--cyan))',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          marginBottom: '1.25rem',
          lineHeight: 1.15,
        }}>
          Degrees You Can Trust.<br />On Chain, Forever.
        </h1>

        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '1.05rem',
          maxWidth: '520px',
          margin: '0 auto 2rem',
          lineHeight: 1.7,
        }}>
          DegreeChain uses OCR, SHA-256, and Ethereum smart contracts to issue and verify
          academic degrees that cannot be forged.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to={isLoggedIn ? '/upload' : '/login'}>
            <button className="btn btn-primary" style={{ padding: '13px 28px', fontSize: '1rem' }}>
              {isLoggedIn ? '→ Upload Documents' : '→ Apply for Degree'}
            </button>
          </Link>
          <Link to="/verify">
            <button className="btn btn-secondary" style={{ padding: '13px 28px', fontSize: '1rem' }}>
              🔍 Verify a Degree
            </button>
          </Link>
        </div>
      </div>

      {/* Divider with chain */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        margin: '0.5rem 0 2.5rem',
      }}>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
        <span style={{ fontSize: '1.1rem' }}>⛓</span>
        <div style={{ flex: 1, height: '1px', background: 'var(--border)' }} />
      </div>

      {/* Features */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
        gap: '1rem',
      }}>
        {FEATURES.map(({ icon, title, desc }) => (
          <div key={title} className="card card-sm" style={{ transition: 'border-color var(--transition)' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--cyan-mid)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <div style={{ fontSize: '1.6rem', marginBottom: '10px' }}>{icon}</div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: '0.9rem',
              marginBottom: '5px',
              color: 'var(--text-primary)',
            }}>{title}</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{desc}</p>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <p style={{
        textAlign: 'center',
        marginTop: '3rem',
        fontSize: '0.75rem',
        color: 'var(--text-muted)',
        fontFamily: 'var(--font-mono)',
      }}>
        Flask · Ganache · Solidity · Tesseract OCR · SHA-256
      </p>
    </div>
  )
}
