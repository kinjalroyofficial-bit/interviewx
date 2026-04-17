import { useEffect, useState } from 'react'
import { fetchHealth } from './api'

export default function App() {
  const [status, setStatus] = useState('Loading backend status...')

  useEffect(() => {
    fetchHealth()
      .then((data) => setStatus(`Backend: ${data.status}`))
      .catch(() => setStatus('Backend unreachable'))
  }, [])

  return (
    <main style={{ fontFamily: 'Arial, sans-serif', maxWidth: 680, margin: '4rem auto', lineHeight: 1.4 }}>
      <h1>InterviewX React + FastAPI Starter</h1>
      <p>This project is now set up with a React frontend and a FastAPI backend.</p>
      <p>{status}</p>
    </main>
  )
}
