import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { sidebarMenu } from '../config/sidebarMenu'
import InterviewCenterPage from '../sidebar-menu/Interview Center/Page'

export default function Dashboard() {
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
  const workspaceTitle = activeLeafLabel || 'My Workspace'

  useEffect(() => {
    if (!currentUser) return

    let isCancelled = false
    fetch(`/api/user/credits?username=${currentUser}`)
      .then((response) => response.json())
      .then((data) => {
        if (isCancelled) return
        const nextCredits = Number(data.credits || 0)
        const safeCredits = Number.isFinite(nextCredits) ? nextCredits : 0
        setCredits(safeCredits)
        localStorage.setItem(`interviewx-credits-${currentUser}`, String(safeCredits))
      })
      .catch((error) => {
        console.error('Failed to load credits', error)
      })

    return () => {
      isCancelled = true
    }
  }, [currentUser])

  return (
    <main className={`dashboard-shell ${theme === 'light' ? 'dashboard-theme-light' : ''} ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
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

      <section className={`dashboard-main ${isInterviewCenterActive ? 'is-interview-center' : ''}`}>
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
            </div>
          </div>
        </header>

        {isInterviewCenterActive ? <InterviewCenterPage sidebarCollapsed={isSidebarCollapsed} /> : null}

        {!isInterviewCenterActive ? (
          <div className="dashboard-workspace-column">
            <section className="dashboard-content-card">
              <h2>{activeLeafLabel ? `Welcome to the ${activeLeafLabel} module` : 'Interview Center Overview'}</h2>
              <p>{activeLeafLabel ? 'Pick another module from the left menu to switch context.' : 'Select a module from the left menu to begin.'}</p>
            </section>
          </div>
        ) : null}
      </section>
    </main>
  )
}
