import { useState } from 'react'

export default function InterviewHistoryPanel({ interviews, activeId, activeInterview, onSelect }) {
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false)

  return (
    <aside className="ic3-panel ic3-history-panel" aria-label="Interview history">
      <header className="ic3-panel-header">
        <h2>Interview History</h2>
        <p>Recent practice sessions</p>
      </header>

      <div className="ic3-history-top">
        <div className="ic3-history-list" role="list">
          {interviews.map((interview) => (
            <button
              key={interview.id}
              type="button"
              role="listitem"
              className={`ic3-history-item ${activeId === interview.id ? 'is-active' : ''}`}
              onClick={() => onSelect(interview.id)}
            >
              <strong>{interview.title}</strong>
              <span>{interview.displayTime}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="ic3-history-bottom" aria-label="Current interview info">
        <h3>Current Interview</h3>
        <div className="ic3-kv-list">
          <div className="ic3-kv-row">
            <span>Topic</span>
            <span className="ic3-pill">{activeInterview.topics[0]}</span>
          </div>
          <div className="ic3-kv-row">
            <span>Difficulty</span>
            <span className="ic3-pill">{activeInterview.difficulty}</span>
          </div>
          <div className="ic3-kv-row">
            <span>Mode</span>
            <span className="ic3-pill">{activeInterview.mode}</span>
          </div>
        </div>
        <button type="button" className="ic3-browse-button" onClick={() => setIsBrowseModalOpen(true)}>Browse Topics</button>
      </div>

      {isBrowseModalOpen ? (
        <div className="ic3-modal-backdrop" role="presentation" onClick={() => setIsBrowseModalOpen(false)}>
          <section className="ic3-modal" role="dialog" aria-modal="true" aria-label="Browse topics" onClick={(event) => event.stopPropagation()}>
            <h4>Browse Topics</h4>
            <p>Placeholder modal body.</p>
            <button type="button" className="ic3-modal-close" onClick={() => setIsBrowseModalOpen(false)}>Close</button>
          </section>
        </div>
      ) : null}
    </aside>
  )
}
