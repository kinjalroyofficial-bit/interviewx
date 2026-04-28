const sectionStyle = {
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '1rem',
  background: 'rgba(18, 27, 45, 0.55)'
}

export default function CommunicationSpeechBettermentPage() {
  return (
    <div className="dashboard-workspace-column">
      <section className="dashboard-content-card">
        <h2>Speech Betterment</h2>
        <p>We will expand these modules in upcoming iterations.</p>

        <div style={{ display: 'grid', gap: '1rem', marginTop: '1rem' }}>
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
