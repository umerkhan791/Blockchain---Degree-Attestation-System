# DegreeChain Frontend

React + Vite frontend for the Blockchain Degree Verification System.

## Quick Start

```bash
cd degree-verify-frontend
npm install
npm run dev
```

Open http://localhost:3000

## Requirements
- Node.js 18+
- Flask backend running at http://127.0.0.1:5000

## Flask CORS Setup
Add this to your Flask `app.py` so the frontend can call the API:

```python
from flask_cors import CORS
CORS(app)
# pip install flask-cors
```

## Expected Flask API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/upload` | Upload 4 files, returns degree data |
| GET | `/verify/<hash>` | Verify a degree hash on blockchain |
| GET | `/download/<filename>` | Serve generated degree PDF |
| GET | `/qr/<filename>` | Serve QR code image |

## FormData Field Names (POST /upload)
- `cnic_front` — CNIC front image
- `cnic_back` — CNIC back image
- `marksheet` — 12th grade marksheet
- `transcript` — University transcript

## Pages

| Route | Page |
|-------|------|
| `/` | Home / Landing |
| `/login` | Student login |
| `/upload` | Document upload (protected) |
| `/result` | Verification result (protected) |
| `/verify` | Public hash verification |
| `/verify/:hash` | Direct hash verification via URL |

## Features
- Dark / Light theme toggle (persisted)
- Drag & drop file upload with image preview
- CNIC auto-formatting
- Multi-step progress feedback during blockchain write
- One-click hash copy to clipboard
- Direct PDF download
- QR code display
