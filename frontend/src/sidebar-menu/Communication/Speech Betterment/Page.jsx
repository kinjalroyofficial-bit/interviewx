import { useMemo, useState } from 'react'
import sentencesData from '../../../data/sentences.json'

const sectionStyle = {
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '1rem',
  background: 'rgba(18, 27, 45, 0.55)',
  minHeight: 0,
  overflowY: 'auto'
}

const sentenceSectionStyle = {
  ...sectionStyle,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}

const sectionsRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '1rem',
  alignItems: 'stretch',
  height: 'calc(100dvh - 155px)',
  minHeight: '420px',
  marginTop: '0.5rem'
}

const sentenceCardStyle = {
  border: '1px solid rgba(255, 255, 255, 0.22)',
  borderRadius: '8px',
  padding: '1.25rem',
  background: 'rgba(5, 14, 29, 0.45)',
  display: 'flex',
  alignItems: 'center',
  fontSize: '1.15rem',
  lineHeight: 1.5,
  minHeight: '140px'
}

const transcriptCardStyle = {
  ...sentenceCardStyle,
  minHeight: '120px'
}

const primaryButtonStyle = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.38)',
  background: 'rgba(9, 24, 48, 0.8)',
  color: '#f5f7ff',
  padding: '0.9rem 1rem',
  fontWeight: 700,
  cursor: 'pointer'
}

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: 'rgba(15, 35, 68, 0.7)'
}

const scoreCardStyle = {
  border: '1px solid rgba(255, 255, 255, 0.22)',
  borderRadius: '8px',
  padding: '0.85rem 1rem',
  background: 'rgba(5, 14, 29, 0.45)',
  display: 'grid',
  gap: '0.25rem'
}

export default function CommunicationSpeechBettermentPage() {
  const sentences = useMemo(() => sentencesData.sentences || [], [])
  const [sentenceIndex, setSentenceIndex] = useState(0)
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')

  const activeSentence = sentences[sentenceIndex] || 'No sentence available.'

  function handleRecordResponse() {
    setIsRecording((prev) => !prev)

    if (!isRecording) return

    setTranscript(activeSentence)
  }

  function handleNextSentence() {
    setSentenceIndex((prev) => (prev + 1) % sentences.length)
    setTranscript('')
    setIsRecording(false)
  }

  const similarityScore = transcript ? 100 : 0

  return (
    <div style={sectionsRowStyle}>
      <section style={sentenceSectionStyle}>
        <h3>Sentence</h3>

        <div style={{ display: 'grid', gap: '1rem', flex: 1, minHeight: 0 }}>
          <div style={{ ...sentenceCardStyle, flex: 1 }}>
            <p style={{ margin: 0 }}>{activeSentence}</p>
          </div>

          <button type="button" style={primaryButtonStyle} onClick={handleRecordResponse}>
            {isRecording ? 'Stop Recording' : 'Record my Response'}
          </button>

          <div style={{ ...transcriptCardStyle, flex: 1 }}>
            <p style={{ margin: 0 }}>
              {transcript || 'Show the Transcript of what was Recorded'}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div style={scoreCardStyle}>
              <span style={{ opacity: 0.8, fontSize: '0.92rem' }}>Score of Matching</span>
              <strong style={{ fontSize: '1.2rem' }}>{similarityScore}%</strong>
            </div>

            <button type="button" style={secondaryButtonStyle} onClick={handleNextSentence}>
              Next Sentence
            </button>
          </div>
        </div>
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
