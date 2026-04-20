export default function InterviewHistoryPanel({ interviews, activeId, onSelect }) {
  const hasHistory = interviews.length > 0

  return (
    <aside className="ic3-panel ic3-history-panel" aria-label="Interview history">
      <header className="ic3-panel-header">
        <h2>Interview History</h2>
      </header>

      <div className="ic3-history-top">
        {hasHistory ? (
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
        ) : (
          <p>Your interview history will appear over here.</p>
        )}
      </div>
    </aside>
  )
}
