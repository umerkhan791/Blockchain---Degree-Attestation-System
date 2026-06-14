import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:5000',
  timeout: 120000, // 2 min — OCR + blockchain can be slow
})

export default api
