import { useState } from 'react'

export default function CurrentInterviewCard({ activeInterview }) {
  const [isBrowseModalOpen, setIsBrowseModalOpen] = useState(false)

  return (
    <section className="ic3-panel ic3-current-interview-panel" aria-label="Current interview info">
      <div className="ic3-current-card">
        <h3>Current Interview</h3>

        <div className="ic3-kv-row ic3-kv-row-topic">
          <span>Topic</span>
          <span className="ic3-pill">{activeInterview.topics[0]}</span>
        </div>

        <div className="ic3-kv-row-double">
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
    </section>
  )
}
