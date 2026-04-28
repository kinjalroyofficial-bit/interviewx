const sectionTitleStyle = {
  fontSize: '1.6rem',
  margin: 0,
  lineHeight: 1.15
}

const panelStyle = {
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '0.85rem',
  background: 'rgba(18, 27, 45, 0.55)',
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem'
}

const cardStyle = {
  border: '1px solid rgba(255, 255, 255, 0.22)',
  borderRadius: '8px',
  background: 'rgba(5, 14, 29, 0.45)',
  padding: '0.8rem',
  fontSize: '0.92rem',
  lineHeight: 1.35
}

const verticalColumnStyle = {
  display: 'grid',
  gridTemplateRows: 'repeat(2, minmax(0, 1fr))',
  gap: '1rem',
  minHeight: 0
}

function PlaceholderSection({ title, description }) {
  return (
    <section style={panelStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={cardStyle}>{description}</div>
    </section>
  )
}

function getSectionsRowStyle(sidebarCollapsed) {
  return {
    display: 'grid',
    gridTemplateColumns: sidebarCollapsed ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
    gap: '1rem',
    alignItems: 'stretch',
    height: '100%',
    minHeight: 0,
    marginTop: '0.5rem'
  }
}

export default function CommunicationVocabularyPage({ sidebarCollapsed = false }) {
  return (
    <div style={getSectionsRowStyle(sidebarCollapsed)}>
      <div style={verticalColumnStyle}>
        <PlaceholderSection title="Words" description="Words practice placeholder." />
        <PlaceholderSection title="Synonyms" description="Synonyms practice placeholder." />
      </div>

      <div style={verticalColumnStyle}>
        <PlaceholderSection title="Phrases" description="Phrases practice placeholder." />
        <PlaceholderSection title="Grammar" description="Grammar practice placeholder." />
      </div>

      <div style={verticalColumnStyle}>
        <PlaceholderSection title="Usage" description="Contextual usage drills placeholder." />
        <PlaceholderSection title="Fluency" description="Vocabulary fluency drills placeholder." />
      </div>

      {sidebarCollapsed ? (
        <section style={panelStyle}>
          <h3 style={sectionTitleStyle}>Analytics</h3>
          <div style={cardStyle}>Vocabulary analytics placeholder.</div>
        </section>
      ) : null}
    </div>
  )
}
