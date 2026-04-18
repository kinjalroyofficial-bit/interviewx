import { Link } from 'react-router-dom'
import { useNavigate } from 'react-router-dom'

export default function Dashboard() {
  const navigate = useNavigate()

  function handleLogout() {
    localStorage.removeItem('interviewx-user')
    navigate('/')
  }

  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <h1>Main Portal – Coming Soon</h1>
        <p>This is your dashboard placeholder page after successful login.</p>
        <button type="button" className="dashboard-logout-button" onClick={handleLogout}>Logout</button>
        <Link to="/" className="dashboard-link">Back to Landing</Link>
      </section>
    </main>
  )
}
