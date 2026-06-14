export const truncateHash = (hash, start = 8, end = 8) => {
  if (!hash) return ''
  if (hash.length <= start + end + 3) return hash
  return `${hash.slice(0, start)}...${hash.slice(-end)}`
}

export const formatTimestamp = (ts) => {
  if (!ts) return '—'
  const date = new Date(ts * 1000)
  return date.toLocaleString('en-PK', {
    year: 'numeric', month: 'short', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
