const sectionStyle = {
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '1rem',
  background: 'rgba(18, 27, 45, 0.55)'
}

const verticalSectionsStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem'
}

export default function CommunicationSpeechBettermentPage() {
  return (
    <div className="dashboard-workspace-column">
      <section className="dashboard-content-card">
        <div style={verticalSectionsStyle}>
          <section style={sectionStyle}>
            <h3>Sentence</h3>
            <p>Placeholder content for sentence structure practice and guided drills.</p>
          </section>

          <section style={sectionStyle}>
            <h3>Punctuation</h3>
            <p>Placeholder content for punctuation correction exercises and examples.</p>
          </section>

          <section style={sectionStyle}>
            <h3>Audio</h3>
            <p>Placeholder content for audio-based pronunciation and speaking feedback.</p>
          </section>
        </div>
      </section>
    </div>
  )
}
