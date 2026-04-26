import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import loginBackground from './assets/login-bg-v2.webp'
import productLogo from './assets/interviewx-product-logo.webp'
import signupBackground from './assets/signup-bg.jpg'
import { googleLogin, login, signup } from './api'

const storageKey = 'interviewx-user'
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || 'GOOGLE_CLIENT_ID_PLACEHOLDER'

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
  position: 'relative',
  minHeight: '100vh',
  padding: '2rem 1rem 3rem',
  backgroundImage: `url(${loginBackground})`,
  backgroundSize: 'cover',
  backgroundPosition: 'center',
  backgroundRepeat: 'no-repeat',
  color: '#ffffff',
  overflow: 'hidden'
}

const headerStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', paddingLeft: '0.75rem', position: 'relative', zIndex: 1 }
const navLinksStyle = { display: 'flex', gap: '1.25rem' }
const navLinkStyle = { color: '#ffffff', textDecoration: 'none', fontWeight: 700, letterSpacing: '0.02em' }

const menuLoginButtonStyle = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0.48rem 0.95rem', borderRadius: '999px',
  border: '1px solid rgba(255, 255, 255, 0.7)', background: 'rgba(15, 19, 32, 0.35)', color: '#ffffff', fontWeight: 700, cursor: 'pointer'
}

const contentLayoutStyle = { display: 'grid', gridTemplateColumns: 'minmax(0, 64%) minmax(280px, 36%)', gap: '0rem', alignItems: 'center', width: 'calc(100% - 2rem)', maxWidth: '1680px', marginRight: 'auto', minHeight: 'calc(100vh - 8.5rem)' }
const featureListStyle = { listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: '0.75rem', width: '100%', transform: 'translateX(-32px)' }
const heroSectionStyle = { display: 'grid', placeItems: 'center', marginTop: '2rem', transform: 'translateY(-2rem)', textAlign: 'left' }
const centerLogoStyle = { width: 'min(72vw, 576px)', height: 'auto', marginBottom: '0.35rem', marginRight: '-0.75rem' }
const ctaRowStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.85rem', marginTop: 0, flexWrap: 'wrap' }

const registerButtonStyle = {
  background: 'linear-gradient(180deg, #1ca35c, #0a7f45)', color: '#ffffff', border: 'none', borderRadius: '10px',
  padding: '0.4rem 0.85rem', fontSize: '0.82rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 18px rgba(0,0,0,0.24)'
}

const authOverlayStyle = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'grid', placeItems: 'center', padding: '1rem', zIndex: 20
}

const authLayoutStyle = {
  width: 'min(700px, 70vw)', height: 'min(560px, 84vh)', borderRadius: '20px', overflow: 'hidden', background: '#f2f2f2',
  boxShadow: '0 28px 56px rgba(0,0,0,0.36)', display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 50%))'
}

const authFormPaneStyle = {
  background: '#efefef', color: '#232323', padding: '1.5rem 1.15rem 1.2rem', display: 'grid', alignContent: 'start', position: 'relative',
  minWidth: 0, overflow: 'hidden', borderRight: '1px solid #d9d9d9'
}

const authRightPaneStyle = {
  position: 'relative', backgroundImage: `url(${signupBackground})`, backgroundSize: 'cover', backgroundPosition: 'center', padding: '1rem', display: 'grid',
  gridTemplateRows: '1fr auto', gap: '0.75rem', color: '#121212', minWidth: 0, overflow: 'hidden'
}

const authPaneInnerStyle = { width: '100%', maxWidth: '312px', margin: '0 auto', display: 'grid', gap: '0.65rem', boxSizing: 'border-box' }
const authControlWrapStyle = { width: '88%', maxWidth: '268px', marginInline: 'auto' }
const authFieldGroupStyle = { width: '100%', display: 'grid', gap: '0.35rem' }
const authLabelStyle = { fontSize: '0.8rem', color: '#4a4a4a', fontWeight: 700, letterSpacing: '0.01em' }
const authInputStyle = {
  width: '100%', fontSize: '0.88rem', padding: '0.56rem 0.7rem', borderRadius: '9px', outline: 'none'
}

function featureItemStyle(borderColor, index) {
  return {
    display: 'grid', gridTemplateColumns: '40px 1fr', alignItems: 'center', gap: '0.65rem', background: 'rgba(24, 20, 45, 0.56)',
    border: `3px solid ${borderColor}`, borderRadius: '999px', padding: '0.3rem 0.75rem 0.3rem 0.3rem', fontWeight: 600,
    fontFamily: "'Segoe UI', Arial, sans-serif", letterSpacing: '0.01em', textShadow: '0 1px 2px rgba(0,0,0,0.2)',
    fontSize: '0.82rem', lineHeight: 1.25, width: '84%', justifySelf: 'center',
    '--base-shift': index % 2 === 0 ? '-16px' : '16px',
    '--hover-shift': index % 2 === 0 ? '-24px' : '24px'
  }
}

const numberBubbleStyle = {
  width: 34, height: 34, borderRadius: '50%', background: '#ffffff', display: 'grid', placeItems: 'center', fontSize: '1.2rem', fontWeight: 700, color: '#85a8bc'
}

const vizSvgStyle = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  display: 'block',
  zIndex: 0
}

const d3Config = {
  count: 337,
  scale: 3.1,
  collision: 2.7,
  charge: -6,
  center: 0.011,
  mouseStrength: 0.03,
  mouseRadius: 270,
  angleNoise: 1.5,
  velocity: 0.65,
  alpha: 0.075,
  wallStrength: 0.14,
  wallMargin: 71
}

export default function App() {
  const navigate = useNavigate()
  const [authMode, setAuthMode] = useState('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [showAuthPanel, setShowAuthPanel] = useState(false)
  const [currentUser, setCurrentUser] = useState(() => localStorage.getItem(storageKey) || '')
  const [activeSlide, setActiveSlide] = useState(0)
  const googleButtonRef = useRef(null)
  const vizSvgRef = useRef(null)
  const vizContainerRef = useRef(null)
  const logoImageRef = useRef(null)
  const circlesRef = useRef(null)
  const blobOpacity = 0.5
  const blobColor = '#C83F6F'

  useEffect(() => {
    let mounted = true
    let simulation
    let intervalId
    let detachLogoListener

    async function setupD3Viz() {
      if (!vizSvgRef.current) return

      if (!window.d3) {
        const existingScript = document.querySelector('script[data-interviewx-d3="true"]')
        if (!existingScript) {
          const script = document.createElement('script')
          script.src = 'https://d3js.org/d3.v7.min.js'
          script.async = true
          script.dataset.interviewxD3 = 'true'
          document.head.appendChild(script)
          await new Promise((resolve, reject) => {
            script.onload = resolve
            script.onerror = reject
          })
        } else {
          await new Promise((resolve, reject) => {
            if (window.d3) {
              resolve()
              return
            }
            existingScript.addEventListener('load', resolve, { once: true })
            existingScript.addEventListener('error', reject, { once: true })
          })
        }
      }

      if (!mounted || !window.d3 || !vizSvgRef.current) return

      const d3 = window.d3
      const svg = d3.select(vizSvgRef.current)
      const container = vizContainerRef.current
      const bounds = container?.getBoundingClientRect()
      const width = Math.max(bounds?.width || window.innerWidth, 360)
      const height = Math.max(bounds?.height || window.innerHeight, 420)
      svg.attr('width', width).attr('height', height).selectAll('*').remove()

      function getLogoCenter() {
        const logoBounds = logoImageRef.current?.getBoundingClientRect()
        if (!logoBounds || !bounds || logoBounds.width <= 0 || logoBounds.height <= 0) {
          return null
        }
        return {
          x: logoBounds.left - bounds.left + logoBounds.width * 0.15,
          y: logoBounds.top - bounds.top + logoBounds.height * 0.55
        }
      }

      let mouse = getLogoCenter() || { x: width / 2, y: height / 2 }
      const data = d3.range(d3Config.count).map(() => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: (Math.random() * 7 + 2) * d3Config.scale,
        color: blobColor
      }))

      const circles = svg.selectAll('circle')
        .data(data)
        .enter()
        .append('circle')
        .attr('r', (d) => d.r)
        .attr('fill', (d) => d.color)
        .attr('opacity', blobOpacity)
      circlesRef.current = circles

      function ticked() {
        circles.attr('cx', (d) => d.x).attr('cy', (d) => d.y)
      }

      function mouseForce(alpha) {
        for (const d of data) {
          const dx = d.x - mouse.x
          const dy = d.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)

          if (dist < d3Config.mouseRadius && dist > 0.01) {
            const angleNoise = (Math.random() - 0.5) * d3Config.angleNoise
            const newDx = dx * Math.cos(angleNoise) - dy * Math.sin(angleNoise)
            const newDy = dx * Math.sin(angleNoise) + dy * Math.cos(angleNoise)
            const factor = (1 - dist / d3Config.mouseRadius) * d3Config.mouseStrength * alpha * 25

            d.vx += newDx * factor
            d.vy += newDy * factor
          }
        }
      }

      function wallForce(alpha) {
        for (const d of data) {
          const leftDist = d.x - d.r
          if (leftDist < d3Config.wallMargin) {
            const push = (1 - leftDist / d3Config.wallMargin) * d3Config.wallStrength * alpha * 20
            d.vx += push
          }

          const rightDist = width - (d.x + d.r)
          if (rightDist < d3Config.wallMargin) {
            const push = (1 - rightDist / d3Config.wallMargin) * d3Config.wallStrength * alpha * 20
            d.vx -= push
          }

          d.vx *= 0.98
        }
      }

      simulation = d3.forceSimulation(data)
        .force('centerX', d3.forceX(width / 2).strength(d3Config.center))
        .force('centerY', d3.forceY(height / 2).strength(d3Config.center))
        .force('collision', d3.forceCollide((d) => d.r + d3Config.collision).strength(1))
        .force('charge', d3.forceManyBody().strength(d3Config.charge))
        .force('mouse', mouseForce)
        .force('walls', wallForce)
        .velocityDecay(d3Config.velocity)
        .alphaDecay(d3Config.alpha)
        .on('tick', ticked)

      function handleMove(event) {
        const [x, y] = d3.pointer(event, container || vizSvgRef.current)
        mouse = { x, y }
        simulation?.alphaTarget(0.25).restart()
      }

      function handleLeave() {
        mouse = { x: -9999, y: -9999 }
        simulation?.alphaTarget(0)
      }

      d3.select(container || vizSvgRef.current).on('mousemove', handleMove)
      d3.select(container || vizSvgRef.current).on('mouseleave', handleLeave)

      function resetToLogoCenter() {
        const logoCenter = getLogoCenter()
        if (!logoCenter) return
        mouse = logoCenter
        simulation?.alphaTarget(0.25).restart()
      }

      resetToLogoCenter()

      if (logoImageRef.current && !logoImageRef.current.complete) {
        const onLoad = () => resetToLogoCenter()
        logoImageRef.current.addEventListener('load', onLoad)
        detachLogoListener = () => logoImageRef.current?.removeEventListener('load', onLoad)
      }

      intervalId = window.setInterval(() => {
        simulation?.alpha(0.15).restart()
      }, 4000)
      simulation?.alphaTarget(0.25).restart()
    }

    setupD3Viz().catch(() => {})

    return () => {
      mounted = false
      if (intervalId) window.clearInterval(intervalId)
      if (detachLogoListener) detachLogoListener()
      if (simulation) simulation.stop()
      circlesRef.current = null
      if (window.d3 && vizSvgRef.current) {
        window.d3.select(vizContainerRef.current || vizSvgRef.current).on('mousemove', null).on('mouseleave', null)
      }
    }
  }, [])

  useEffect(() => {
    if (!showAuthPanel || currentUser) {
      return undefined
    }

    if (googleClientId === 'GOOGLE_CLIENT_ID_PLACEHOLDER') {
      setMessage('Google sign-in is not configured yet. Add VITE_GOOGLE_CLIENT_ID.')
      return
    }

    function initializeGoogleUi() {
      if (!window.google?.accounts?.id || !googleButtonRef.current) {
        return
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: handleGoogleCredentialResponse
      })

      googleButtonRef.current.innerHTML = ''
      window.google.accounts.id.renderButton(
        googleButtonRef.current,
        {
          theme: 'outline',
          size: 'large',
          width: 250
        }
      )

      window.google.accounts.id.prompt((notification) => {
        if (notification.isNotDisplayed() || notification.isSkippedMoment()) return
      })
    }

    if (window.google?.accounts?.id) {
      initializeGoogleUi()
      return
    }

    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = initializeGoogleUi
    script.onerror = () => setMessage('Unable to load Google sign-in right now. Please try again.')
    document.head.appendChild(script)
  }, [showAuthPanel, currentUser])

  const ctaText = useMemo(
    () => (currentUser ? `Welcome back, ${currentUser}!` : 'Get 1000 free credits to start your journey.'),
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
      setMessage('')
      setShowAuthPanel(false)
      navigate('/dashboard')
    } catch (error) {
      setMessage(error.message)
    }
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

  async function handleGoogleCredentialResponse(response) {
    const idToken = response?.credential
    if (!idToken) {
      setMessage('Google authentication failed. Please try again.')
      return
    }

    try {
      const data = await googleLogin(idToken)
      localStorage.setItem(storageKey, data.username)
      setCurrentUser(data.username)
      setMessage('')
      setShowAuthPanel(false)
      navigate('/dashboard')
    } catch (error) {
      setMessage(error.message)
    }
  }

  const active = carouselSlides[activeSlide]

  return (
    <div style={pageBackgroundStyle} ref={vizContainerRef}>
      <header style={headerStyle}>
        <nav style={navLinksStyle}>
          <a href="#" style={navLinkStyle}>Our Company</a>
          <a href="#" style={navLinkStyle}>Solutions</a>
          <a href="#" style={navLinkStyle}>Pricing</a>
        </nav>

        <button
          type="button"
          style={menuLoginButtonStyle}
          onClick={() => (currentUser ? navigate('/dashboard') : setShowAuthPanel((prev) => !prev))}
        >
          {showAuthPanel ? 'Close' : currentUser ? 'Account' : 'Login'}
        </button>
      </header>

      <div style={{ ...contentLayoutStyle, position: 'relative', zIndex: 1 }} className="landing-layout">
        <section className="hero-panel">
          <section style={heroSectionStyle}>
            <div className="logo-reveal-shell">
              <img ref={logoImageRef} src={productLogo} alt="InterviewX" style={centerLogoStyle} className="logo-reveal-image" />
            </div>
            <div style={ctaRowStyle}>
              <button type="button" style={registerButtonStyle} onClick={openAuthPanel}>Register Now</button>
              <strong style={{ fontSize: '1rem', lineHeight: 1.2, textAlign: 'left' }}>{ctaText}</strong>
            </div>
          </section>
        </section>

        <section className="features-panel">
          <ul style={featureListStyle}>
            {featureItems.map((item, index) => (
              <li key={item.id} style={featureItemStyle(item.borderColor, index)} className="feature-item">
                <span style={numberBubbleStyle}>{item.id}</span>
                <span>{item.text}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {showAuthPanel ? (
        <div style={authOverlayStyle} onClick={() => setShowAuthPanel(false)}>
          <div style={authLayoutStyle} className="auth-layout auth-slide-in" onClick={(event) => event.stopPropagation()}>
            <main style={authFormPaneStyle}>
              <div style={authPaneInnerStyle} className="auth-pane-inner">
                    <div style={{ ...authFieldGroupStyle, ...authControlWrapStyle, marginTop: '0.6rem' }}>
                      <label htmlFor="username" style={authLabelStyle}>Email or Username</label>
                      <input
                        id="username"
                        name="username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        autoComplete="username"
                        placeholder="you@company.com"
                        required
                        style={{ ...authInputStyle, border: '2px solid #2a2a2a' }}
                      />
                    </div>

                    <div style={{ ...authFieldGroupStyle, ...authControlWrapStyle, marginTop: '0.65rem' }}>
                      <label htmlFor="password" style={authLabelStyle}>Password</label>
                      <input
                        id="password"
                        name="password"
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete={authMode === 'signup' ? 'new-password' : 'current-password'}
                        placeholder="Enter your password"
                        required
                        style={{ ...authInputStyle, border: '1px solid #bbc2ce', background: '#dce3ef' }}
                      />
                    </div>

                    <div style={{ ...authControlWrapStyle, width: '100%', marginTop: '0.95rem' }} className="auth-partition">
                      <span>or</span>
                    </div>

                    <div style={{ ...authControlWrapStyle, width: '100%', marginTop: '0.5rem' }} className="google-official-shell">
                      <div ref={googleButtonRef} />
                    </div>

                    <label style={{ ...authControlWrapStyle, width: '100%', display: 'flex', gap: '0.45rem', alignItems: 'center', color: '#666', fontSize: '0.8rem', marginTop: '0.75rem' }}>
                      <input type="checkbox" defaultChecked /> I agree to the <a href="#">Terms of Service</a>
                    </label>

                    <button type="button" onClick={onSubmit} style={{
                      ...authControlWrapStyle, marginTop: '0.55rem', width: '100%', background: '#6b5a99', color: 'white', border: 'none', borderRadius: '10px',
                      padding: '0.6rem 0.8rem', fontSize: '0.96rem', fontWeight: 800, cursor: 'pointer'
                    }}>
                      {authMode === 'signup' ? 'SIGN UP' : 'SIGN IN'}
                    </button>

                    <p style={{ ...authControlWrapStyle, marginTop: '0.8rem', fontSize: '0.88rem' }}>
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
              </div>
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
