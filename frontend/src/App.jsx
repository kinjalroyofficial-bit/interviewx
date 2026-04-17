import { useState } from 'react'
import loginBackground from './assets/login-bg-v2.webp'
import productLogo from './assets/interviewx-product-logo.png'
import { login, signup } from './api'

const storageKey = 'interviewx-user'

const pageBackgroundStyle = {
  minHeight: '100vh',
  padding: '2rem 1.5rem',
  backgroundImage: `linear-gradient(rgba(18, 23, 40, 0.45), rgba(18, 23, 40, 0.45)), url(${loginBackground})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat'
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '3rem'
}

const navLinksStyle = {
  display: 'flex',
  gap: '1.5rem'
}

const navLinkStyle = {
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 600,
  letterSpacing: '0.02em'
}

const menuLoginButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.85rem',
  borderRadius: '999px',
  border: '1px solid rgba(255, 255, 255, 0.6)',
  background: 'rgba(15, 19, 32, 0.4)',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer'
}

const cardStyle = {
  fontFamily: 'Arial, sans-serif',
  width: '100%',
  maxWidth: 420,
  lineHeight: 1.4,
  background: 'rgba(255,255,255,0.92)',
  borderRadius: '12px',
  padding: '1.25rem',
  boxShadow: '0 16px 40px rgba(0,0,0,0.25)',
  marginLeft: 'auto'
}

const centerLogoWrapStyle = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '50vh'
}

const centerLogoStyle = {
  width: 'min(90vw, 720px)',
  height: 'auto'
}

export default function App() {
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [showAuthPanel, setShowAuthPanel] = useState(false)
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
    setAuthMode('login')
  }

  return (
    <div style={pageBackgroundStyle}>
      <header style={headerStyle}>
        <nav style={navLinksStyle}>
          <a href="#" style={navLinkStyle}>Our Company</a>
          <a href="#" style={navLinkStyle}>Solutions</a>
          <a href="#" style={navLinkStyle}>Pricing</a>
        </nav>

        <button type="button" style={menuLoginButtonStyle} onClick={() => setShowAuthPanel((prev) => !prev)}>
          <span aria-hidden="true">☰</span>
          <span>{showAuthPanel ? 'Close' : currentUser ? 'Account' : 'Login'}</span>
        </button>
      </header>

      <section style={centerLogoWrapStyle}>
        <img src={productLogo} alt="InterviewX" style={centerLogoStyle} />
      </section>

      {showAuthPanel ? (
        <main style={cardStyle}>
          {!currentUser ? (
            <>
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
            </>
          ) : (
            <>
              <h1>Welcome, {currentUser}!</h1>
              <p>You are now logged in.</p>
              <button type="button" onClick={onLogout}>
                Logout
              </button>
              {message ? <p>{message}</p> : null}
            </>
          )}
        </main>
      ) : null}
    </div>
  )
}
