import { useRef, useState } from 'react'

export default function FileDropzone({ label, accept, file, onChange, icon }) {
  const inputRef = useRef()
  const [dragging, setDragging] = useState(false)

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) onChange(dropped)
  }

  const preview = file ? URL.createObjectURL(file) : null

  return (
    <div
      className={`dropzone ${dragging ? 'dragging' : ''} ${file ? 'has-file' : ''}`}
      onClick={() => inputRef.current.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      style={{
        border: `2px dashed ${file ? 'var(--cyan)' : dragging ? 'var(--cyan-mid)' : 'var(--border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        cursor: 'pointer',
        transition: 'all var(--transition)',
        background: file ? 'var(--cyan-dim)' : dragging ? 'var(--bg-elevated)' : 'var(--bg-card)',
        textAlign: 'center',
        minHeight: '130px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept || 'image/*,.pdf'}
        style={{ display: 'none' }}
        onChange={(e) => onChange(e.target.files[0])}
      />

      {file && preview && file.type.startsWith('image/') ? (
        <img
          src={preview}
          alt="preview"
          style={{
            maxHeight: '70px',
            maxWidth: '100%',
            borderRadius: '6px',
            objectFit: 'contain',
          }}
        />
      ) : (
        <span style={{ fontSize: '1.8rem' }}>{icon || '📎'}</span>
      )}

      <div>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: '0.82rem',
          fontWeight: 600,
          color: file ? 'var(--cyan)' : 'var(--text-secondary)',
          marginBottom: '2px',
        }}>
          {label}
        </p>
        <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          {file ? file.name : 'Click or drop to upload'}
        </p>
      </div>
    </div>
  )
}
