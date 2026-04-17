import { useState } from 'react'
import landingBg from './assets/login-bg-v2.webp'
import { login, signup } from './api'

const storageKey = 'interviewx-user'

const pageBackgroundStyle = {
  minHeight: '100vh',
  padding: '2rem 1rem',
  backgroundImage: `linear-gradient(rgba(18, 23, 40, 0.45), rgba(18, 23, 40, 0.45)), url(${landingBg})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
}

const cardStyle = {
  fontFamily: 'Arial, sans-serif',
  maxWidth: 460,
  margin: '4rem auto',
  lineHeight: 1.4,
  background: 'rgba(255,255,255,0.92)',
  borderRadius: '12px',
  padding: '1.5rem',
  boxShadow: '0 16px 40px rgba(0,0,0,0.25)'
}

export default function App() {
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem(storageKey) || '')

  async function onSubmit(event) {
    event.preventDefault()
    setMessage('')

    if (!username.trim() || !password) {
      setMessage('Username and password are required')
      return
    }

    try {
      const payload = { username: username.trim(), password }
      const data = authMode === 'signup' ? await signup(payload) : await login(payload)

      localStorage.setItem(storageKey, data.username)
      setCurrentUser(data.username)
      setUsername('')
      setPassword('')
      setMessage(data.message)
    } catch (error) {
      setMessage(error.message)
    }
  }

  function onLogout() {
    localStorage.removeItem(storageKey)
    setCurrentUser('')
    setMessage('Logged out successfully')
  }

  return (
    <div style={pageBackgroundStyle}>
      {!currentUser ? (
        <main style={cardStyle}>
          <h1>InterviewX User Access</h1>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
            <button type="button" onClick={() => setAuthMode('login')} disabled={authMode === 'login'}>
              Login
            </button>
            <button type="button" onClick={() => setAuthMode('signup')} disabled={authMode === 'signup'}>
              Sign up
            </button>
          </div>

          <form onSubmit={onSubmit} style={{ display: 'grid', gap: '0.75rem' }}>
            <label htmlFor="username">Username</label>
            <input
              id="username"
              name="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              required
            />

            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
              required
            />

            <button type="submit">{authMode === 'signup' ? 'Sign up' : 'Login'}</button>
          </form>

          <p>{message || `Please ${authMode === 'signup' ? 'sign up' : 'log in'} to continue.`}</p>
        </main>
      ) : (
        <main style={cardStyle}>
          <h1>Welcome, {currentUser}!</h1>
          <p>You are now logged in.</p>
          <button type="button" onClick={onLogout}>
            Logout
          </button>
          {message ? <p>{message}</p> : null}
        </main>
      )}
    </div>
  )
}
