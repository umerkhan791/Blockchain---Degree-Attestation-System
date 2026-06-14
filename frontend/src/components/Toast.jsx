import { useState, useEffect } from 'react'

export default function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200)
    return () => clearTimeout(t)
  }, [onDone])

  return <div className="toast">✓ {message}</div>
}
