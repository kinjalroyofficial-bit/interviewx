const sectionStyle = {
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

function getSectionsRowStyle(sidebarCollapsed) {
  return {
    display: 'grid',
    gridTemplateColumns: sidebarCollapsed ? 'repeat(3, minmax(0, 1fr)) minmax(220px, 0.92fr)' : 'repeat(3, minmax(0, 1fr))',
    gap: '1rem',
    alignItems: 'stretch',
    height: '100%',
    minHeight: 0,
    marginTop: '0.5rem'
  }
}

const cardStyle = {
  border: '1px solid rgba(255, 255, 255, 0.22)',
  borderRadius: '8px',
  background: 'rgba(5, 14, 29, 0.45)',
  padding: '0.8rem',
  fontSize: '0.92rem',
  lineHeight: 1.35
}

function PlaceholderSection({ title, description }) {
  return (
    <section style={sectionStyle}>
      <h3 style={{ fontSize: '2rem', marginBottom: '0.3rem' }}>{title}</h3>
      <div style={cardStyle}>{description}</div>
    </section>
  )
}

export default function CommunicationThoughtOrganizationPage({ sidebarCollapsed = false }) {
  return (
    <div style={getSectionsRowStyle(sidebarCollapsed)}>
      <PlaceholderSection title="Topic" description="Topic organization drills placeholder." />
      <PlaceholderSection title="Situation" description="Situation-based thought structure practice placeholder." />
      <PlaceholderSection title="Paraphrasing" description="Paraphrasing practice workspace placeholder." />

      {sidebarCollapsed ? <PlaceholderSection title="Analytics" description="Thought organization analytics placeholder." /> : null}
    </div>
  )
}
