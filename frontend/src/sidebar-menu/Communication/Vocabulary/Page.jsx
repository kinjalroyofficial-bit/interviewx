import { useState } from 'react'

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

const toggleRowStyle = {
  display: 'inline-flex',
  border: '1px solid rgba(255, 255, 255, 0.22)',
  borderRadius: '999px',
  overflow: 'hidden',
  background: 'rgba(5, 14, 29, 0.45)'
}

const toggleButtonStyle = {
  border: 'none',
  background: 'transparent',
  color: '#d8e1ff',
  padding: '0.32rem 0.62rem',
  fontSize: '0.8rem',
  cursor: 'pointer'
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

function InlineToggle({ options, value, onChange }) {
  return (
    <div style={toggleRowStyle}>
      {options.map((option) => (
        <button
          key={option}
          type="button"
          style={{
            ...toggleButtonStyle,
            background: value === option ? 'rgba(70, 123, 229, 0.35)' : 'transparent',
            color: value === option ? '#ffffff' : '#d8e1ff'
          }}
          onClick={() => onChange(option)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

function LearnTestToggle({ value, onChange }) {
  return <InlineToggle options={['Learn', 'Test']} value={value} onChange={onChange} />
}

function TopicSection({ title, learnMode, onLearnModeChange, description, headerExtra = null, footerExtra = null }) {
  return (
    <section style={panelStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
        <h3 style={sectionTitleStyle}>{title}</h3>
        {headerExtra}
      </div>

      <LearnTestToggle value={learnMode} onChange={onLearnModeChange} />

      {footerExtra}

      <div style={cardStyle}>{description}</div>
    </section>
  )
}

export default function CommunicationVocabularyPage({ sidebarCollapsed = false }) {
  const [wordsMode, setWordsMode] = useState('Learn')
  const [phrasesType, setPhrasesType] = useState('Phrases')
  const [phrasesMode, setPhrasesMode] = useState('Learn')
  const [synonymType, setSynonymType] = useState('Synonym')
  const [synonymMode, setSynonymMode] = useState('Learn')
  const [partsMode, setPartsMode] = useState('Learn')
  const [grammarMode, setGrammarMode] = useState('Learn')
  const [voicesType, setVoicesType] = useState('Active')
  const [voicesMode, setVoicesMode] = useState('Learn')

  return (
    <div style={getSectionsRowStyle(sidebarCollapsed)}>
      <div style={verticalColumnStyle}>
        <TopicSection
          title="Words"
          learnMode={wordsMode}
          onLearnModeChange={setWordsMode}
          description="Core vocabulary builder placeholder."
        />

        <TopicSection
          title="Phrases & Idioms"
          learnMode={phrasesMode}
          onLearnModeChange={setPhrasesMode}
          headerExtra={<InlineToggle options={['Phrases', 'Idioms']} value={phrasesType} onChange={setPhrasesType} />}
          description={`${phrasesType} practice placeholder.`}
        />
      </div>

      <div style={verticalColumnStyle}>
        <TopicSection
          title="Synonym & Anonym"
          learnMode={synonymMode}
          onLearnModeChange={setSynonymMode}
          headerExtra={<InlineToggle options={['Synonym', 'Anonym']} value={synonymType} onChange={setSynonymType} />}
          description={`${synonymType} drills placeholder.`}
        />

        <TopicSection
          title="Parts of Speeches"
          learnMode={partsMode}
          onLearnModeChange={setPartsMode}
          headerExtra={(
            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
              {['Noun', 'Verb', 'Adj'].map((item) => (
                <span key={item} style={{ fontSize: '0.72rem', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '999px', padding: '0.14rem 0.45rem' }}>
                  {item}
                </span>
              ))}
            </div>
          )}
          description="Parts of speech practice placeholder."
        />
      </div>

      <div style={verticalColumnStyle}>
        <TopicSection
          title="Grammar"
          learnMode={grammarMode}
          onLearnModeChange={setGrammarMode}
          description="Grammar training placeholder."
        />

        <TopicSection
          title="Voices"
          learnMode={voicesMode}
          onLearnModeChange={setVoicesMode}
          headerExtra={<InlineToggle options={['Active', 'Passive']} value={voicesType} onChange={setVoicesType} />}
          description={`${voicesType} voice conversion drills placeholder.`}
        />
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
