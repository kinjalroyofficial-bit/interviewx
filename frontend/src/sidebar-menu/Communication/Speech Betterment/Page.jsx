import { useEffect, useMemo, useRef, useState } from 'react'
import sentencesData from '../../../data/sentences.json'
import punctuationData from '../../../data/punctuation.json'

const panelStyle = {
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '1rem',
  background: 'rgba(18, 27, 45, 0.55)',
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column'
}

const sectionsRowStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: '1rem',
  alignItems: 'stretch',
  height: '100%',
  minHeight: 0,
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

function createSimilarityScore(sourceText, targetText) {
  if (!sourceText || !targetText) return 0

  const source = sourceText.toLowerCase().replace(/[^\w\s]/g, '').trim()
  const target = targetText.toLowerCase().replace(/[^\w\s]/g, '').trim()
  if (!source || !target) return 0

  const sourceWords = source.split(/\s+/)
  const targetWords = target.split(/\s+/)
  const matchedWords = sourceWords.filter((word, index) => targetWords[index] === word).length

  return Math.round((matchedWords / sourceWords.length) * 100)
}

function SpeechPracticePanel({ title, prompts }) {
  const [promptIndex, setPromptIndex] = useState(0)
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recognitionError, setRecognitionError] = useState('')
  const recognitionRef = useRef(null)

  const activePrompt = prompts[promptIndex] || 'No sentence available.'
  const isSpeechRecognitionSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)

  const similarityScore = useMemo(() => createSimilarityScore(activePrompt, transcript), [activePrompt, transcript])

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
    }
  }, [])

  function handleNextPrompt() {
    setPromptIndex((prev) => (prev + 1) % prompts.length)
    setTranscript('')
    setRecognitionError('')

    if (recognitionRef.current) {
      recognitionRef.current.stop()
      recognitionRef.current = null
    }

    setIsRecording(false)
  }

  function handleRecordResponse() {
    setRecognitionError('')

    if (!isSpeechRecognitionSupported) {
      setRecognitionError('Speech recognition is not supported in this browser.')
      return
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop()
      return
    }

    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionApi()

    recognition.lang = 'en-US'
    recognition.continuous = false
    recognition.interimResults = true

    recognition.onstart = () => {
      setIsRecording(true)
    }

    recognition.onresult = (event) => {
      let collectedTranscript = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        collectedTranscript += event.results[i][0].transcript
      }

      setTranscript(collectedTranscript.trim())
    }

    recognition.onerror = (event) => {
      if (event.error === 'not-allowed') {
        setRecognitionError('Microphone permission was denied. Please allow access and retry.')
      } else {
        setRecognitionError('Could not process speech input. Please try again.')
      }
    }

    recognition.onend = () => {
      setIsRecording(false)
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  return (
    <section style={panelStyle}>
      <h3>{title}</h3>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={sentenceCardStyle}>
          <p style={{ margin: 0 }}>{activePrompt}</p>
        </div>

        <button type="button" style={primaryButtonStyle} onClick={handleRecordResponse}>
          {isRecording ? 'Stop Recording' : 'Record my Response'}
        </button>

        <div style={transcriptCardStyle}>
          <p style={{ margin: 0 }}>
            {transcript || 'Show the Transcript of what was Recorded'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={scoreCardStyle}>
            <span style={{ opacity: 0.8, fontSize: '0.92rem' }}>Percent Comparison</span>
            <strong style={{ fontSize: '1.2rem' }}>{similarityScore}% match</strong>
          </div>

          <button type="button" style={secondaryButtonStyle} onClick={handleNextPrompt}>
            Refresh Sentence
          </button>
        </div>

        {recognitionError ? (
          <p style={{ margin: 0, color: '#ffb4b4', fontSize: '0.88rem' }}>{recognitionError}</p>
        ) : null}
      </div>
    </section>
  )
}

export default function CommunicationSpeechBettermentPage() {
  const sentencePrompts = useMemo(() => sentencesData.sentences || [], [])
  const punctuationPrompts = useMemo(() => punctuationData.sentences || [], [])

  return (
    <div style={sectionsRowStyle}>
      <SpeechPracticePanel title="Sentence" prompts={sentencePrompts} />
      <SpeechPracticePanel title="Punctuation" prompts={punctuationPrompts} />

      <section style={panelStyle}>
        <h3>Audio</h3>
        <p>Placeholder content for audio-based pronunciation and speaking feedback.</p>
      </section>
    </div>
  )
}
