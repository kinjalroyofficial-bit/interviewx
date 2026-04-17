import { useMemo, useState } from 'react'
import loginBackground from './assets/login-bg-v2.webp'
import productLogo from './assets/interviewx-product-logo.webp'
import signupBackground from './assets/signup-bg.jpg'
import { login, signup } from './api'

const storageKey = 'interviewx-user'

const featureItems = [
  { id: 1, text: 'Next-Gen Ai-enabled Automation of Interviews for ORGANIZATIONS', borderColor: '#ffc320' },
  { id: 2, text: 'White Labelled Interview practising tools for COLLEGES & PREP ORGS.', borderColor: '#40ff2b' },
  { id: 3, text: 'Placement support to INDIVIDUALS from preparation to getting the offer letter.', borderColor: '#f1b4ff' },
  { id: 4, text: '50+ Techs, Coding and non-Tech evaluations on multiple specializations.', borderColor: '#ffb8b8' },
  { id: 5, text: 'Subject Matter Expert (SME) curated contextualisation in the interviews.', borderColor: '#d5f493' },
  { id: 6, text: 'State-of-the-art Data driven Evaluation of SOFT SKILLS using in-house tools.', borderColor: '#83fff6' }
]

const carouselSlides = [
  {
    title: 'Profile Picker – Set the Right Interview Context',
    points: [
      'Allows you to define your professional background including years of experience, industry, and key skills.',
      'Personalizes the interview simulation experience so questions match your career stage and aspirations.',
      'Ensures the AI interviewer understands your profile context and tailors responses accordingly.'
    ]
  },
  {
    title: 'Job-Ready Mock Evaluation Engine',
    points: [
      'Simulates interviews for multiple roles—from junior developer to senior architect.',
      'Adapts follow-up questions based on confidence, accuracy, and communication style.',
      'Provides objective scoring with strengths and improvement areas.'
    ]
  },
  {
    title: 'Skill Graph and Feedback Loop',
    points: [
      'Tracks your technical and behavioral skill development over time.',
      'Suggests focused practice pathways to improve weak areas quickly.',
      'Converts interview attempts into measurable, actionable growth.'
    ]
  },
  {
    title: 'Institution and Enterprise Control',
    points: [
      'White-labeled experience for colleges, training partners, and organizations.',
      'Central dashboard to monitor candidate readiness and performance trends.',
      'Enables scalable interview operations with consistent quality benchmarks.'
    ]
  },
  {
    title: 'Outcome-Focused Candidate Journey',
    points: [
      'Combines AI interview prep with contextualized guidance for placements.',
      'Supports end-to-end readiness from preparation to offer-stage confidence.',
      'Built to make every attempt more relevant, authentic, and career-ready.'
    ]
  }
]

const testimonialPlaceholders = [
  {
    quote: '“Thanks to the feedback system, I understood where I was nervous and improved my tone.”',
    name: 'Rohan Malhotra',
    role: 'Full Stack Developer'
  },
  {
    quote: '“The simulation flow felt incredibly close to real interview rounds.”',
    name: 'Priya Saini',
    role: 'Software Engineer'
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

const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }
const navLinksStyle = { display: 'flex', gap: '1.25rem' }
const navLinkStyle = { color: '#ffffff', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.02em' }

const menuLoginButtonStyle = {
  display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem', borderRadius: '999px',
  border: '1px solid rgba(255, 255, 255, 0.7)', background: 'rgba(15, 19, 32, 0.35)', color: '#ffffff', fontWeight: 700, cursor: 'pointer'
}

const contentLayoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 65%) minmax(280px, 35%)', gap: '1.5rem', alignItems: 'start' }
const featureListStyle = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem', width: '100%' }
const heroSectionStyle = { display: 'grid', placeItems: 'center', marginTop: '3rem', textAlign: 'left' }
const centerLogoStyle = { width: 'min(72vw, 576px)', height: 'auto', marginBottom: '0.35rem' }
const ctaRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', flexWrap: 'wrap', marginTop: 0 }

const registerButtonStyle = {
  background: 'linear-gradient(180deg, #1ca35c, #0a7f45)', color: '#ffffff', border: 'none', borderRadius: '10px',
  padding: '0.55rem 1.05rem', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.28)'
}

const authOverlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: '1rem', zIndex: 20
}

const authLayoutStyle = {
  width: 'min(980px, 92vw)', height: 'min(620px, 88vh)', borderRadius: '22px', overflow: 'hidden', background: '#f2f2f2',
  boxShadow: '0 28px 56px rgba(0,0,0,0.36)', display: 'grid', gridTemplateColumns: 'minmax(300px, 40%) 1fr'
}

const authFormPaneStyle = {
  background: '#efefef', color: '#232323', padding: '1.75rem 1.5rem 1.25rem', display: 'grid', alignContent: 'start', gap: '0.75rem', position: 'relative'
}

const authRightPaneStyle = {
  position: 'relative', backgroundImage: `url(${signupBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '1rem', display: 'grid',
  gridTemplateRows: '1fr auto', gap: '0.75rem', color: '#121212'
}

function featureItemStyle(borderColor, index) {
  return {
    display: 'grid', gridTemplateColumns: '54px 1fr', alignItems: 'center', gap: '0.85rem', background: 'rgba(255,255,255,0.26)',
    border: `4px solid ${borderColor}`, borderRadius: '999px', padding: '0.4rem 1rem 0.4rem 0.4rem', fontWeight: 700,
    fontFamily: "Impact, Haettenschweiler, 'Arial Narrow Bold', sans-serif", letterSpacing: '0.02em', textShadow: '0 1px 3px rgba(0,0,0,0.25)',
    marginLeft: index % 2 === 0 ? '0' : '46px', width: index % 2 === 0 ? '100%' : 'calc(100% - 46px)'
  }
}

const numberBubbleStyle = {
  width: 48, height: 48, borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '2rem', fontWeight: 400, color: '#85a8bc'
}

export default function App() {
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem(storageKey) || '')
  const [activeSlide, setActiveSlide] = useState(0)

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

  function nextSlide() {
    setActiveSlide((prev) => (prev + 1) % carouselSlides.length)
  }

  function prevSlide() {
    setActiveSlide((prev) => (prev - 1 + carouselSlides.length) % carouselSlides.length)
  }

  const active = carouselSlides[activeSlide]

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

      <div style={contentLayoutStyle} className="landing-layout">
        <section className="hero-panel">
          <section style={heroSectionStyle}>
            <div className="logo-reveal-shell">
              <img src={productLogo} alt="InterviewX" style={centerLogoStyle} className="logo-reveal-image" />
            </div>
            <div style={ctaRowStyle}>
              <button type="button" style={registerButtonStyle} onClick={openAuthPanel}>Register Now</button>
              <strong style={{ fontSize: '1.45rem', lineHeight: 1.15 }}>{ctaText}</strong>
            </div>
          </section>
        </section>

        <section className="features-panel">
          <ul style={featureListStyle}>
            {featureItems.map((item, index) => (
              <li key={item.id} style={featureItemStyle(item.borderColor, index)}>
                <span style={numberBubbleStyle}>{item.id}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {showAuthPanel ? (
        <div style={authOverlayStyle} onClick={() => setShowAuthPanel(false)}>
          <div style={authLayoutStyle} onClick={(event) => event.stopPropagation()}>
            <main style={authFormPaneStyle}>
              {!currentUser ? (
                <>
                  <h1 style={{ fontSize: '2rem', margin: '0 0 0.6rem' }}>InterviewX</h1>
                  <input
                    id="username"
                    name="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    autoComplete="username"
                    placeholder="Email"
                    required
                    style={{ fontSize: '0.95rem', padding: '0.62rem 0.8rem', borderRadius: '10px', border: '2px solid #2a2a2a' }}
                  />
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                    placeholder="Password"
                    required
                    style={{ fontSize: '0.95rem', padding: '0.62rem 0.8rem', borderRadius: '10px', border: '1px solid #bbc2ce', background: '#dce3ef' }}
                  />

                  <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', color: '#666', fontSize: '0.92rem' }}>
                    <input type="checkbox" defaultChecked /> I agree to the <a href="#">Terms of Service</a>
                  </label>

                  <button type="button" onClick={onSubmit} style={{
                    marginTop: '0.25rem', background: '#6b5a99', color: 'white', border: 'none', borderRadius: '12px',
                    padding: '0.7rem 0.85rem', fontSize: '1.1rem', fontWeight: 800, cursor: 'pointer'
                  }}>
                    {authMode === 'signup' ? 'SIGN UP' : 'SIGN IN'}
                  </button>

                  <p style={{ marginTop: '0.8rem', fontSize: '0.88rem' }}>
                    {authMode === 'signup' ? 'Already have an account?' : 'Don’t have an account?'}{' '}
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#6b5a99', fontWeight: 700, cursor: 'pointer', fontSize: 'inherit' }}
                      onClick={() => setAuthMode((prev) => (prev === 'signup' ? 'login' : 'signup'))}
                    >
                      {authMode === 'signup' ? 'Sign In' : 'Sign Up'}
                    </button>
                  </p>
                  {message ? <p>{message}</p> : null}
                </>
              ) : (
                <>
                  <h1>Welcome, {currentUser}!</h1>
                  <p>You are now logged in.</p>
                  <button type="button" onClick={onLogout}>Logout</button>
                  {message ? <p>{message}</p> : null}
                </>
              )}
            </main>

            <aside style={authRightPaneStyle}>
              <section style={{
                background: 'rgba(243,246,255,0.45)', borderRadius: '20px', padding: '0.8rem 0.95rem',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)'
              }}>
                <h2 style={{ fontSize: '1.15rem', margin: '0 0 0.6rem' }}>{active.title}</h2>
                <ul style={{ margin: 0, paddingLeft: '1.35rem', fontSize: '0.9rem', lineHeight: 1.45 }}>
                  {active.points.map((point) => (
                    <li key={point}>{point}</li>
                  ))}
                </ul>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '0.6rem', marginTop: '0.7rem' }}>
                  {carouselSlides.map((slide, index) => (
                    <button
                      key={slide.title}
                      type="button"
                      onClick={() => setActiveSlide(index)}
                      aria-label={`Go to slide ${index + 1}`}
                      style={{
                        width: 10, height: 10, borderRadius: '50%', border: 'none', cursor: 'pointer',
                        background: index === activeSlide ? '#7550ff' : 'rgba(255,255,255,0.85)'
                      }}
                    />
                  ))}
                </div>
              </section>

              <section style={{
                background: 'rgba(21,28,42,0.36)', color: '#fff', borderRadius: '18px', padding: '0.7rem 0.8rem',
                backdropFilter: 'blur(7px)', WebkitBackdropFilter: 'blur(7px)', minHeight: '120px'
              }}>
                <div style={{ textAlign: 'center', color: '#ffd841', marginBottom: '0.5rem' }}>★★★★★</div>
                <p style={{ margin: 0, textAlign: 'center', fontSize: '0.88rem' }}>{testimonialPlaceholders[activeSlide % testimonialPlaceholders.length].quote}</p>
                <p style={{ margin: '0.5rem 0 0', textAlign: 'center', fontWeight: 700 }}>{testimonialPlaceholders[activeSlide % testimonialPlaceholders.length].name}</p>
                <p style={{ margin: '0.2rem 0 0', textAlign: 'center', opacity: 0.9 }}>{testimonialPlaceholders[activeSlide % testimonialPlaceholders.length].role}</p>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', marginTop: '0.3rem' }}>
                  <button type="button" onClick={prevSlide} style={{ borderRadius: '50%', border: '1px solid #fff', width: 28, height: 28, background: 'transparent', color: '#fff', cursor: 'pointer' }}>←</button>
                  <button type="button" onClick={nextSlide} style={{ borderRadius: '50%', border: '1px solid #fff', width: 28, height: 28, background: 'transparent', color: '#fff', cursor: 'pointer' }}>→</button>
                </div>
              </section>
            </aside>
          </div>
        </div>
      ) : null}
    </div>
  )
}
