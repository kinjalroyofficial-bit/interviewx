import { useMemo, useState } from 'react'
import loginBackground from './assets/login-bg-v2.webp'
import productLogo from './assets/interviewx-product-logo.webp'
import { login, signup } from './api'

const storageKey = 'interviewx-user'

const featureItems = [
  {
    id: 1,
    text: 'Next-Gen Ai-enabled Automation of Interviews for ORGANIZATIONS',
    borderColor: '#ffc320'
  },
  {
    id: 2,
    text: 'White Labelled Interview practising tools for COLLEGES & PREP ORGS.',
    borderColor: '#40ff2b'
  },
  {
    id: 3,
    text: 'Placement support to INDIVIDUALS from preparation to getting the offer letter.',
    borderColor: '#f1b4ff'
  },
  {
    id: 4,
    text: '50+ Techs, Coding and non-Tech evaluations on multiple specializations.',
    borderColor: '#ffb8b8'
  },
  {
    id: 5,
    text: 'Subject Matter Expert (SME) curated contextualisation in the interviews.',
    borderColor: '#d5f493'
  },
  {
    id: 6,
    text: 'State-of-the-art Data driven Evaluation of SOFT SKILLS using in-house tools.',
    borderColor: '#83fff6'
  }
]

const pageBackgroundStyle = {
  minHeight: '100vh',
  padding: '2rem 1.5rem 3rem',
  backgroundImage: `url(${loginBackground})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  color: '#ffffff'
}

const headerStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '1.5rem'
}

const navLinksStyle = {
  display: 'flex',
  gap: '1.25rem'
}

const navLinkStyle = {
  color: '#ffffff',
  textDecoration: 'none',
  fontWeight: 700,
  letterSpacing: '0.02em'
}

const menuLoginButtonStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '0.5rem',
  padding: '0.5rem 0.85rem',
  borderRadius: '999px',
  border: '1px solid rgba(255, 255, 255, 0.7)',
  background: 'rgba(15, 19, 32, 0.35)',
  color: '#ffffff',
  fontWeight: 700,
  cursor: 'pointer'
}

const contentLayoutStyle = {
  display: 'grid',
  gridTemplateColumns: 'minmax(280px, 560px) 1fr',
  gap: '2rem',
  alignItems: 'start'
}

const featureListStyle = {
  listStyle: 'none',
  margin: 0,
  padding: 0,
  display: 'grid',
  gap: '0.75rem'
}

const heroSectionStyle = {
  display: 'grid',
  placeItems: 'center',
  marginTop: '3rem',
  textAlign: 'left'
}

const centerLogoStyle = {
  width: 'min(90vw, 720px)',
  height: 'auto',
  marginBottom: '1rem'
}

const ctaRowStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '1rem',
  flexWrap: 'wrap'
}

const registerButtonStyle = {
  background: 'linear-gradient(180deg, #1ca35c, #0a7f45)',
  color: '#ffffff',
  border: 'none',
  borderRadius: '12px',
  padding: '0.75rem 1.5rem',
  fontSize: '1.1rem',
  fontWeight: 800,
  cursor: 'pointer',
  boxShadow: '0 8px 24px rgba(0,0,0,0.28)'
}

const cardStyle = {
  fontFamily: 'Arial, sans-serif',
  width: '100%',
  maxWidth: 420,
  lineHeight: 1.4,
  background: 'rgba(255,255,255,0.95)',
  borderRadius: '12px',
  padding: '1.25rem',
  boxShadow: '0 16px 40px rgba(0,0,0,0.35)',
  color: '#191919'
}

const authOverlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.45)',
  display: 'grid',
  placeItems: 'center',
  padding: '1rem',
  zIndex: 20
}

function featureItemStyle(borderColor) {
  return {
    display: 'grid',
    gridTemplateColumns: '54px 1fr',
    alignItems: 'center',
    gap: '0.85rem',
    background: 'rgba(255,255,255,0.26)',
    border: `4px solid ${borderColor}`,
    borderRadius: '999px',
    padding: '0.4rem 1rem 0.4rem 0.4rem',
    fontWeight: 700,
    textShadow: '0 1px 3px rgba(0,0,0,0.25)'
  }
}

const numberBubbleStyle = {
  width: 48,
  height: 48,
  borderRadius: '50%',
  background: '#ffffff',
  display: 'grid',
  placeItems: 'center',
  fontSize: '2rem',
  fontWeight: 700,
  color: '#85a8bc'
}

export default function App() {
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem(storageKey) || '')

  const ctaText = useMemo(
    () => (currentUser ? `Welcome back, ${currentUser}!` : 'Get 100 free credits to start your journey.'),
    [currentUser]
  )

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

  function openAuthPanel() {
    setShowAuthPanel(true)
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

      <div style={contentLayoutStyle}>
        <ul style={featureListStyle}>
          {featureItems.map((item) => (
            <li key={item.id} style={featureItemStyle(item.borderColor)}>
              <span style={numberBubbleStyle}>{item.id}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>

        <section style={heroSectionStyle}>
          <img src={productLogo} alt="InterviewX" style={centerLogoStyle} />
          <div style={ctaRowStyle}>
            <button type="button" style={registerButtonStyle} onClick={openAuthPanel}>
              Register Now
            </button>
            <strong style={{ fontSize: '2rem', lineHeight: 1.2 }}>{ctaText}</strong>
          </div>
        </section>
      </div>

      {showAuthPanel ? (
        <div style={authOverlayStyle} onClick={() => setShowAuthPanel(false)}>
          <main style={cardStyle} onClick={(event) => event.stopPropagation()}>
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
        </div>
      ) : null}
    </div>
  )
}
