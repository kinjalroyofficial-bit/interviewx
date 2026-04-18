import { Link } from 'react-router-dom'

export default function Dashboard() {
  return (
    <main className="dashboard-shell">
      <section className="dashboard-card">
        <h1>Main Portal – Coming Soon</h1>
        <p>This is your dashboard placeholder page after successful login.</p>
        <Link to="/" className="dashboard-link">Back to Landing</Link>
      </section>
    </main>
  )
}
