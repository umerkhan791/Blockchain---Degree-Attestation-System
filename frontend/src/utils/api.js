import axios from 'axios'

// Vite exposes env vars via import.meta.env
// Set VITE_API_URL in Vercel dashboard for production.
// Locally it defaults to http://127.0.0.1:5000
const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 120_000,   // 2 min — OCR + blockchain can be slow
})

export default api
