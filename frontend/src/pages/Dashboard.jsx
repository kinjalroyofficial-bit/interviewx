import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { sidebarMenu } from '../config/sidebarMenu'
import InterviewCenterPage from '../sidebar-menu/Interview Center/Page'
import QuantumQuestPage from '../sidebar-menu/Quantum Quest/Page'

export default function Dashboard() {
  const CREDIT_PURCHASE_OPTIONS = [5, 10, 1000, 2000, 3000, 4000, 5000]
  const BASE_PRICE_PER_1000_CREDITS = 499
  const GST_RATE = 0.18
  const COUPON_DISCOUNT_RATES = {
    INTERVIEWX10: 0.10,
    INTERVIEWX20: 0.20,
    INTERVIEWX30: 0.30
  }

  const navigate = useNavigate()
  const [theme, setTheme] = useState('dark')
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [activeLeafLabel, setActiveLeafLabel] = useState('')
  const currentUser = localStorage.getItem('interviewx-user')
  const creditsStorageKey = currentUser ? `interviewx-credits-${currentUser}` : ''
  const [credits, setCredits] = useState(() => {
    if (!currentUser) return 0
    const cachedCredits = Number(localStorage.getItem(`interviewx-credits-${currentUser}`) || 0)
    return Number.isFinite(cachedCredits) ? cachedCredits : 0
  })
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false)
  const [selectedCredits, setSelectedCredits] = useState(1000)
  const [baseAmount, setBaseAmount] = useState(0)
  const [gstAmount, setGstAmount] = useState(0)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [totalAmount, setTotalAmount] = useState(0)
  const [couponCode, setCouponCode] = useState('')
  const [couponApplied, setCouponApplied] = useState(false)
  const [couponDiscountRate, setCouponDiscountRate] = useState(0)
  const [couponStatus, setCouponStatus] = useState('')
  const [isCreatingPayment, setIsCreatingPayment] = useState(false)
  const [paymentError, setPaymentError] = useState('')
  const canvasRef = useRef(null)
  const displayName = currentUser ? currentUser.split('@')[0] : ''
  const greetingText = useMemo(() => {
    const hour = new Date().getHours()
    let baseGreeting = 'Good night'

    if (hour >= 5 && hour < 12) baseGreeting = 'Good morning'
    else if (hour >= 12 && hour < 17) baseGreeting = 'Good afternoon'
    else if (hour >= 17 && hour < 21) baseGreeting = 'Good evening'

    return displayName ? `${baseGreeting}, ${displayName}` : baseGreeting
  }, [displayName])

  function handleLogout() {
    if (creditsStorageKey) {
      localStorage.removeItem(creditsStorageKey)
    }
    localStorage.removeItem('interviewx-user')
    navigate('/')
  }

  const isInterviewCenterActive = activeLeafLabel === 'Interview Center'
  const isQuantumQuestActive = activeLeafLabel === 'Quantum Quest'
  const workspaceTitle = activeLeafLabel || 'My Workspace'

  useEffect(() => {
    const unitPricePerCredit = BASE_PRICE_PER_1000_CREDITS / 1000
    const base = Math.round(selectedCredits * unitPricePerCredit)
    const discount = couponApplied ? Math.round(base * couponDiscountRate) : 0
    const discountedBase = Math.max(0, base - discount)
    const gst = Math.round(discountedBase * GST_RATE)
    const total = discountedBase + gst

    setBaseAmount(base)
    setDiscountAmount(discount)
    setGstAmount(gst)
    setTotalAmount(total)
  }, [selectedCredits, couponApplied, couponDiscountRate])

  async function refreshCreditsForUser(username) {
    if (!username) return
    try {
      const response = await fetch(`/api/user/credits?username=${encodeURIComponent(username)}`)
      if (!response.ok) return
      const payload = await response.json()
      const nextCredits = Number(payload?.credits ?? 0)
      if (!Number.isFinite(nextCredits)) return
      setCredits(nextCredits)
      if (creditsStorageKey) {
        localStorage.setItem(creditsStorageKey, String(nextCredits))
      }
    } catch (error) {
      console.error('Failed to load credits', error)
    }
  }

  useEffect(() => {
    if (!currentUser) return
    refreshCreditsForUser(currentUser)
  }, [currentUser])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    let animationFrameId = 0
    let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }

    function setCanvasSize() {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }

    setCanvasSize()

    const balls = Array.from({ length: 40 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      r: 80 + Math.random() * 120
    }))

    function onMouseMove(event) {
      mouse = { x: event.clientX, y: event.clientY }
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (const b of balls) {
        b.x += b.vx
        b.y += b.vy

        if (b.x < 0 || b.x > canvas.width) b.vx *= -1
        if (b.y < 0 || b.y > canvas.height) b.vy *= -1

        const dx = b.x - mouse.x
        const dy = b.y - mouse.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const alpha = Math.max(0.05, 1 - dist / 400)

        const gradient = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        gradient.addColorStop(0, `rgba(0,200,255,${alpha})`)
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      }

      animationFrameId = window.requestAnimationFrame(draw)
    }

    window.addEventListener('resize', setCanvasSize)
    window.addEventListener('mousemove', onMouseMove)
    draw()

    return () => {
      window.cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', setCanvasSize)
      window.removeEventListener('mousemove', onMouseMove)
    }
  }, [])

  function openPurchaseModal() {
    setIsPurchaseModalOpen(true)
    setCouponStatus('')
  }

  function closePurchaseModal() {
    setIsPurchaseModalOpen(false)
    setPaymentError('')
  }

  function applyCoupon() {
    const normalizedCode = couponCode.trim().toUpperCase()
    if (!normalizedCode) {
      setCouponApplied(false)
      setCouponDiscountRate(0)
      setCouponStatus('Please enter a coupon code.')
      return
    }
    const matchedDiscountRate = COUPON_DISCOUNT_RATES[normalizedCode]
    if (matchedDiscountRate) {
      setCouponApplied(true)
      setCouponDiscountRate(matchedDiscountRate)
      setCouponStatus(`Coupon applied: ${Math.round(matchedDiscountRate * 100)}% off base amount.`)
      return
    }
    setCouponApplied(false)
    setCouponDiscountRate(0)
    setCouponStatus('Invalid coupon code.')
  }

  async function handleProceedToPay() {
    if (!currentUser || isCreatingPayment) return
    setIsCreatingPayment(true)
    setPaymentError('')
    try {
      const redirectParams = new URLSearchParams({
        source: 'interviewx_app',
        username: currentUser,
        credits: String(selectedCredits),
        coupon: couponCode.trim()
      })
      window.location.href = `https://koviki.com/pricing.php?${redirectParams.toString()}`
    } catch (error) {
      setPaymentError(error.message || 'Unable to proceed to payment.')
    } finally {
      setIsCreatingPayment(false)
    }
  }

  return (
    <main className={`dashboard-shell ${theme === 'light' ? 'dashboard-theme-light' : ''} ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`} style={{ position: 'relative', overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', background: '#0d0d18', zIndex: 0, pointerEvents: 'none' }}
        aria-hidden="true"
      />
      <div style={{ position: 'relative', zIndex: 1, display: 'contents' }}>
      <Sidebar
        menu={sidebarMenu}
        greetingText={greetingText}
        displayName={displayName}
        username={currentUser || ''}
        onLeafSelect={setActiveLeafLabel}
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
        onLogout={handleLogout}
      />

      <section className={`dashboard-main ${isInterviewCenterActive ? 'is-interview-center' : ''} ${isQuantumQuestActive ? 'is-quantum-quest' : ''}`}>
        <header className="dashboard-topbar">
          <div>
            <h1 className="dashboard-title">{workspaceTitle}</h1>
          </div>
          <div className="dashboard-top-actions">
            <button type="button" className="dashboard-theme-button" onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}>
              {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
            </button>
            <div className="dashboard-credit-pill" role="status" aria-live="polite">
              <span className="dashboard-credit-pill__label">Credits</span>
              <span className="dashboard-credit-pill__value">{credits.toLocaleString()}</span>
              <button type="button" className="dashboard-credit-pill__purchase-button" onClick={handleProceedToPay}>
                Purchase
              </button>
            </div>
          </div>
        </header>

        {isInterviewCenterActive ? (
          <InterviewCenterPage
            sidebarCollapsed={isSidebarCollapsed}
            onCreditsUpdated={() => refreshCreditsForUser(currentUser)}
          />
        ) : null}

        {isQuantumQuestActive ? <QuantumQuestPage /> : null}

        {!isInterviewCenterActive && !isQuantumQuestActive ? (
          <div className="dashboard-workspace-column">
            <section className="dashboard-content-card">
              <h2>{activeLeafLabel ? `Welcome to the ${activeLeafLabel} module` : 'Interview Center Overview'}</h2>
              <p>{activeLeafLabel ? 'Pick another module from the left menu to switch context.' : 'Select a module from the left menu to begin.'}</p>
            </section>
          </div>
        ) : null}
      </section>

      {isPurchaseModalOpen ? (
        <div className="dashboard-purchase-modal-backdrop" role="presentation" onClick={closePurchaseModal}>
          <section
            className="dashboard-purchase-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Purchase credits"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dashboard-purchase-modal__header">
              <h3>Purchase Credits</h3>
              <button type="button" className="dashboard-purchase-modal__close" onClick={closePurchaseModal}>
                ✕
              </button>
            </div>

            <label className="dashboard-purchase-modal__field">
              <span>Credits Selected</span>
              <select
                value={selectedCredits}
                onChange={(event) => {
                  setSelectedCredits(Number(event.target.value))
                  setCouponApplied(false)
                  setCouponDiscountRate(0)
                  setCouponStatus('')
                }}
              >
                {CREDIT_PURCHASE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option.toLocaleString()} Credits</option>
                ))}
              </select>
            </label>

            <div className="dashboard-purchase-modal__pricing">
              <p><span>Credits Selected</span><strong>{selectedCredits.toLocaleString()}</strong></p>
              <p><span>Base Amount</span><strong>₹{baseAmount.toLocaleString()}</strong></p>
              <p><span>Discount</span><strong>-₹{discountAmount.toLocaleString()}</strong></p>
              <p><span>GST (18%)</span><strong>₹{gstAmount.toLocaleString()}</strong></p>
              <p className="is-total"><span>Total Amount</span><strong>₹{totalAmount.toLocaleString()}</strong></p>
            </div>

            <label className="dashboard-purchase-modal__field">
              <span>Enter Coupon Code</span>
              <div className="dashboard-purchase-modal__coupon-row">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(event) => setCouponCode(event.target.value)}
                  placeholder="Enter Coupon Code"
                />
                <button type="button" onClick={applyCoupon}>Apply</button>
              </div>
            </label>
            <p className="dashboard-purchase-modal__coupon-hint">
              Available codes: INTERVIEWX10, INTERVIEWX20, INTERVIEWX30
            </p>
            {couponStatus ? <p className="dashboard-purchase-modal__status">{couponStatus}</p> : null}

            <button
              type="button"
              className="dashboard-purchase-modal__cta"
              onClick={handleProceedToPay}
              disabled={isCreatingPayment}
            >
              {isCreatingPayment ? 'Redirecting...' : 'Proceed to Pay'}
            </button>
            {paymentError ? <p className="dashboard-purchase-modal__status">{paymentError}</p> : null}
          </section>
        </div>
      ) : null}
      </div>
    </main>
  )
}
