import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
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
    localStorage.removeItem('interviewx-user')
    navigate('/')
  }

  const isInterviewCenterActive = activeLeafLabel === 'Interview Center'

  return (
    <main className={`dashboard-shell ${theme === 'light' ? 'dashboard-theme-light' : ''} ${isSidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <Sidebar
        menu={sidebarMenu}
        greetingText={greetingText}
        displayName={displayName}
        onLeafSelect={setActiveLeafLabel}
        collapsed={isSidebarCollapsed}
        onCollapsedChange={setIsSidebarCollapsed}
      />

      <section className={`dashboard-main ${isInterviewCenterActive ? 'is-interview-center' : ''}`}>
        {isInterviewCenterActive ? <InterviewCenterPage sidebarCollapsed={isSidebarCollapsed} /> : null}

        <div className="dashboard-workspace-column">
          <header className="dashboard-topbar">
            <div>
              <h1 className="dashboard-title">My Workspace</h1>
            </div>
            <div className="dashboard-top-actions">
              <button type="button" className="dashboard-theme-button" onClick={() => setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'))}>
                {theme === 'dark' ? 'Light Theme' : 'Dark Theme'}
              </button>
              <button type="button" className="dashboard-logout-button" onClick={handleLogout}>Logout</button>
              <Link to="/" className="dashboard-link">Landing</Link>
            </div>
          </header>

          <section className="dashboard-content-card">
            {isInterviewCenterActive ? (
              <>
                <h2>Interview Center Overview</h2>
                <p>Your interview chat workspace is now docked to the left. Continue your session there.</p>
              </>
            ) : (
              <>
                <h2>{activeLeafLabel ? `Welcome to the ${activeLeafLabel} module` : 'Interview Center Overview'}</h2>
                <p>{activeLeafLabel ? 'Pick another module from the left menu to switch context.' : 'Select a module from the left menu to begin.'}</p>
              </>
            )}
          </section>
        </div>
      </section>
    </main>
  )
}
