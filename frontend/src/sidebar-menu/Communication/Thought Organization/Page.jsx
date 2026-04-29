import { useEffect, useMemo, useRef, useState } from 'react'
import situationData from '../../../data/thought_org_situation.json'
import topicData from '../../../data/thought_org_topic.json'

const sectionStyle = {
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '0.85rem',
  background: 'rgba(18, 27, 45, 0.55)',
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
  maxHeight: 'calc(100dvh - 260px)'
}

const sectionTitleStyle = {
  fontSize: '1.6rem',
  margin: 0,
  lineHeight: 1.15
}

function getSectionsRowStyle(sidebarCollapsed) {
  return {
    display: 'grid',
    gridTemplateColumns: sidebarCollapsed ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))',
    gap: '1rem',
    alignItems: 'start',
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

const primaryButtonStyle = {
  background: 'linear-gradient(135deg, #4da3ff, #2f6bff)',
  color: '#fff',
  border: 'none',
  borderRadius: '10px',
  padding: '0.7rem 0.9rem',
  fontWeight: 700,
  cursor: 'pointer'
}

const secondaryButtonStyle = {
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#e9f2ff',
  border: '1px solid rgba(255, 255, 255, 0.2)',
  borderRadius: '10px',
  padding: '0.7rem 0.9rem',
  fontWeight: 600,
  cursor: 'pointer'
}

function useSpeechRecognitionTranscriber() {
  const recognitionRef = useRef(null)
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recognitionError, setRecognitionError] = useState('')

  const isSpeechRecognitionSupported = useMemo(() => {
    if (typeof window === 'undefined') return false
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition)
  }, [])

  useEffect(() => {
    if (!isSpeechRecognitionSupported || typeof window === 'undefined') return undefined
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new RecognitionCtor()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event) => {
      let next = ''
      for (let i = 0; i < event.results.length; i += 1) {
        next += `${event.results[i][0].transcript} `
      }
      setTranscript(next.trim())
    }

    recognition.onend = () => setIsRecording(false)
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setRecognitionError('Microphone permission was denied.')
      } else {
        setRecognitionError('Speech recognition failed. Please try again.')
      }
      setIsRecording(false)
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
      recognitionRef.current = null
    }
  }, [isSpeechRecognitionSupported])

  function startOrStopRecording() {
    setRecognitionError('')
    if (!isSpeechRecognitionSupported) {
      setRecognitionError('Speech recognition is not supported in this browser.')
      return
    }
    if (!recognitionRef.current) return
    if (isRecording) {
      recognitionRef.current.stop()
      setIsRecording(false)
      return
    }
    recognitionRef.current.start()
    setIsRecording(true)
  }

  return { transcript, isRecording, recognitionError, startOrStopRecording, setTranscript }
}

function ThoughtPromptSection({ title, prompts }) {
  const [promptIndex, setPromptIndex] = useState(0)
  const { transcript, isRecording, recognitionError, startOrStopRecording, setTranscript } = useSpeechRecognitionTranscriber()

  const activePrompt = prompts[promptIndex] || 'No prompt available.'

  function handleNext() {
    setPromptIndex((prev) => (prompts.length ? (prev + 1) % prompts.length : 0))
    setTranscript('')
  }

  return (
    <section style={sectionStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={cardStyle}>{activePrompt}</div>

      <button type="button" style={primaryButtonStyle} onClick={startOrStopRecording}>
        {isRecording ? 'Stop Recording' : 'Record my Response'}
      </button>

      <div style={{ ...cardStyle, minHeight: '130px' }}>
        {transcript || 'Show the Transcript of what was Recorded'}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <button type="button" style={secondaryButtonStyle}>Review</button>
        <button type="button" style={secondaryButtonStyle} onClick={handleNext}>Next</button>
      </div>

      {recognitionError ? <p style={{ margin: 0, color: '#ffb4b4', fontSize: '0.88rem' }}>{recognitionError}</p> : null}
    </section>
  )
}

export default function CommunicationThoughtOrganizationPage({ sidebarCollapsed = false }) {
  const topics = useMemo(() => topicData.topics || [], [])
  const situations = useMemo(() => situationData.situations || [], [])

  return (
    <div style={getSectionsRowStyle(sidebarCollapsed)}>
      <ThoughtPromptSection title="Topic" prompts={topics} />
      <ThoughtPromptSection title="Situation" prompts={situations} />
      <section style={sectionStyle}>
        <h3 style={sectionTitleStyle}>Paraphrasing</h3>
        <div style={cardStyle}>Paraphrasing practice workspace placeholder.</div>
      </section>
    </div>
  )
}
