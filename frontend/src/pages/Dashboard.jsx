import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { sidebarMenu } from '../config/sidebarMenu'

export default function Dashboard() {
  const navigate = useNavigate()
  const [theme, setTheme] = useState('dark')
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

  return (
    <main className={`dashboard-shell ${theme === 'light' ? 'dashboard-theme-light' : ''}`}>
      <Sidebar menu={sidebarMenu} greetingText={greetingText} displayName={displayName} onLeafSelect={setActiveLeafLabel} />

      <section className="dashboard-main">
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
          <h2>{activeLeafLabel ? `Welcome to the ${activeLeafLabel} module` : 'Interview Center Overview'}</h2>
          <p>{activeLeafLabel ? 'Pick another module from the left menu to switch context.' : 'Select a module from the left menu to begin.'}</p>
        </section>
      </section>
    </main>
  )
}
