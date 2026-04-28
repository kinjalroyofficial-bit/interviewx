import sentencesData from '../../../data/sentences.json'

const sectionStyle = {
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '1rem',
  background: 'rgba(18, 27, 45, 0.55)',
  minHeight: 0,
  overflowY: 'auto'
}

const sectionsRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '1rem',
  alignItems: 'stretch',
  height: 'calc(100vh - 170px)',
  minHeight: '320px',
  marginTop: '0.5rem'
}

const sentenceListStyle = {
  margin: '0.75rem 0 0',
  paddingLeft: '1.2rem',
  display: 'grid',
  gap: '0.65rem',
  lineHeight: 1.5
}

export default function CommunicationSpeechBettermentPage() {
  return (
    <div style={sectionsRowStyle}>
      <section style={sectionStyle}>
        <h3>Sentence</h3>
        <p>Practice sentence structure and delivery with real guided sentence prompts.</p>
        <ol style={sentenceListStyle}>
          {sentencesData.sentences.map((sentence, index) => (
            <li key={`${sentence}-${index}`}>{sentence}</li>
          ))}
        </ol>
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
  )
}
