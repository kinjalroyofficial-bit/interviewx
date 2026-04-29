import { useEffect, useMemo, useRef, useState } from 'react'
import situationData from '../../../data/thought_org_situation.json'
import topicData from '../../../data/thought_org_topic.json'
import paraphrasingData from '../../../data/paraphrasing.json'

const sectionStyle = { border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '0.85rem', background: 'rgba(18, 27, 45, 0.55)', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }
const sectionTitleStyle = { fontSize: '1.6rem', margin: 0, lineHeight: 1.15 }
function getSectionsRowStyle(sidebarCollapsed) { return { display: 'grid', gridTemplateColumns: sidebarCollapsed ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: '1rem', alignItems: 'stretch', height: 'calc(100dvh - 115px)', minHeight: 0, marginTop: '0.5rem' } }
const cardStyle = { border: '1px solid rgba(255, 255, 255, 0.22)', borderRadius: '8px', background: 'rgba(5, 14, 29, 0.45)', padding: '0.8rem', fontSize: '0.92rem', lineHeight: 1.35 }
const primaryButtonStyle = { background: 'linear-gradient(135deg, #4da3ff, #2f6bff)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem 0.9rem', fontWeight: 700, cursor: 'pointer' }
const secondaryButtonStyle = { background: 'rgba(255, 255, 255, 0.08)', color: '#e9f2ff', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '10px', padding: '0.7rem 0.9rem', fontWeight: 600, cursor: 'pointer' }

function useSpeechRecognitionTranscriber(defaultLanguage = 'en-US') {
  const recognitionRef = useRef(null)
  const restartTimerRef = useRef(null)
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const [manualStop, setManualStop] = useState(false)
  const [recognitionError, setRecognitionError] = useState('')
  const [language, setLanguage] = useState(defaultLanguage)
  const finalTextRef = useRef('')

  const isSpeechRecognitionSupported = useMemo(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), [])

  function clearRestartTimer() {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }

  function safeStart(recognition) {
    if (!recognition || isStarting) return

    try {
      recognition.lang = language
      setIsStarting(true)
      setManualStop(false)
      recognition.start()
    } catch {
      setIsStarting(false)
      clearRestartTimer()
      restartTimerRef.current = window.setTimeout(() => {
        try {
          recognition.start()
        } catch {}
      }, 500)
    }
  }

  useEffect(() => {
    if (!isSpeechRecognitionSupported || typeof window === 'undefined') return undefined
    const RecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new RecognitionCtor()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = language

    recognition.onstart = () => {
      setIsStarting(false)
      setIsListening(true)
      setRecognitionError('')
    }

    recognition.onresult = (event) => {
      let interimText = ''
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i]
        const text = result[0].transcript
        if (result.isFinal) {
          finalTextRef.current += `${text.trim()} `
        } else {
          interimText += text
        }
      }
      setTranscript(`${finalTextRef.current}${interimText}`.trim())
    }

    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'network' || event.error === 'aborted') return
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setRecognitionError('Microphone permission was denied.')
        setIsListening(false)
        setIsStarting(false)
        setManualStop(true)
        return
      }
      setRecognitionError('Speech recognition failed. Please try again.')
    }

    recognition.onend = () => {
      setIsStarting(false)
      if (manualStop) {
        setIsListening(false)
        return
      }
      if (isListening) {
        clearRestartTimer()
        restartTimerRef.current = window.setTimeout(() => safeStart(recognition), 350)
      }
    }

    recognitionRef.current = recognition

    return () => {
      clearRestartTimer()
      try { recognition.stop() } catch {}
      recognitionRef.current = null
    }
  }, [isSpeechRecognitionSupported, language, isListening, isStarting, manualStop])

  function startOrStopRecording() {
    setRecognitionError('')
    const recognition = recognitionRef.current
    if (!isSpeechRecognitionSupported || !recognition) return

    if (isListening || isStarting) {
      setManualStop(true)
      setIsListening(false)
      setIsStarting(false)
      clearRestartTimer()
      try { recognition.stop() } catch {}
      return
    }

    setManualStop(false)
    setIsListening(true)
    safeStart(recognition)
  }

  function resetTranscript() {
    finalTextRef.current = ''
    setTranscript('')
  }

  return { transcript, isRecording: isListening || isStarting, recognitionError, startOrStopRecording, setTranscript: resetTranscript, language, setLanguage }
}

function ThoughtPromptSection({ title, prompts }) {
  const [promptIndex, setPromptIndex] = useState(0)
  const { transcript, isRecording, recognitionError, startOrStopRecording, setTranscript, language, setLanguage } = useSpeechRecognitionTranscriber('en-US')
  const activePrompt = prompts[promptIndex] || 'No prompt available.'

  return (
    <section style={sectionStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={cardStyle}>{activePrompt}</div>
      <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem' }}>
        Language
        <select value={language} onChange={(event) => setLanguage(event.target.value)} style={{ ...cardStyle, padding: '0.4rem 0.5rem', color: '#fff' }}>
          <option value="en-US">English (US)</option>
          <option value="en-GB">English (UK)</option>
          <option value="hi-IN">Hindi (India)</option>
        </select>
      </label>
      <button type="button" style={primaryButtonStyle} onClick={startOrStopRecording}>{isRecording ? 'Stop my Recording' : 'Record my Response'}</button>
      <div style={{ ...cardStyle, minHeight: '130px', flex: 1, overflowY: 'auto' }}>{transcript || 'Show the Transcript of what was Recorded'}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
        <button type="button" style={secondaryButtonStyle}>Review</button>
        <button type="button" style={secondaryButtonStyle} onClick={() => { setPromptIndex((prev) => (prompts.length ? (prev + 1) % prompts.length : 0)); setTranscript('') }}>Next</button>
      </div>
      {recognitionError ? <p style={{ margin: 0, color: '#ffb4b4', fontSize: '0.88rem' }}>{recognitionError}</p> : null}
    </section>
  )
}

function ParaphrasingSection({ sentences }) { const [index, setIndex] = useState(0); const [responses, setResponses] = useState({}); const active = sentences[index] || { sentence: 'No sentence available.', target_intonations: [] }; return (<section style={sectionStyle}><h3 style={sectionTitleStyle}>Paraphrasing</h3><div style={cardStyle}>{active.sentence}</div><div style={{ display: 'grid', gap: '0.55rem' }}>{(active.target_intonations || []).slice(0, 4).map((intonation) => (<div key={intonation} style={{ padding: '0.2rem 0' }}><div style={{ fontWeight: 700, marginBottom: '0.35rem' }}>{intonation}</div><input type="text" value={responses[intonation] || ''} onChange={(event) => setResponses((prev) => ({ ...prev, [intonation]: event.target.value }))} style={{ width: '100%', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.3)', padding: '0.5rem', background: 'rgba(0,0,0,0.22)', color: '#fff' }} /></div>))}</div><div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}><button type="button" style={primaryButtonStyle}>Submit</button><button type="button" style={secondaryButtonStyle} onClick={() => setIndex((prev) => (sentences.length ? (prev + 1) % sentences.length : 0))}>Next</button></div></section>) }

export default function CommunicationThoughtOrganizationPage({ sidebarCollapsed = false }) {
  const topics = useMemo(() => topicData.topics || [], [])
  const situations = useMemo(() => situationData.questions || [], [])
  const paraphrasingSentences = useMemo(() => paraphrasingData.sentences || [], [])
  return <div style={getSectionsRowStyle(sidebarCollapsed)}><ThoughtPromptSection title="Topic" prompts={topics} /><ThoughtPromptSection title="Situation" prompts={situations} /><ParaphrasingSection sentences={paraphrasingSentences} /></div>
}
