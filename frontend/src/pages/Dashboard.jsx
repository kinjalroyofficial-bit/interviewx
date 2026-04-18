import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import { sidebarMenu } from '../config/sidebarMenu'

export default function Dashboard() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('interviewx-user')
    navigate('/')
  }

  return (
    <main className="dashboard-shell">
      <Sidebar menu={sidebarMenu} />

      <section className="dashboard-main">
        <header className="dashboard-topbar">
          <div>
            <p className="dashboard-eyebrow">My Workspace</p>
            <h1 className="dashboard-title">Good evening, welcome back</h1>
          </div>
          <div className="dashboard-top-actions">
            <button type="button" className="dashboard-logout-button" onClick={handleLogout}>Logout</button>
            <Link to="/" className="dashboard-link">Landing</Link>
          </div>
        </header>

        <section className="dashboard-content-card">
          <h2>Interview Center Overview</h2>
          <p>Select a module from the left menu to begin.</p>
        </section>
      </section>
    </main>
  )
}
