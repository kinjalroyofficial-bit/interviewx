import { useMemo, useRef, useState } from 'react'
import situationData from '../../../data/thought_org_situation.json'
import topicData from '../../../data/thought_org_topic.json'
import paraphrasingData from '../../../data/paraphrasing.json'

const sectionStyle = { border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '0.85rem', background: 'rgba(18, 27, 45, 0.55)', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: '0.75rem', height: '100%' }
const sectionTitleStyle = { fontSize: '1.6rem', margin: 0, lineHeight: 1.15 }
function getSectionsRowStyle(sidebarCollapsed) { return { display: 'grid', gridTemplateColumns: sidebarCollapsed ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: '1rem', alignItems: 'stretch', height: 'calc(100dvh - 115px)', minHeight: 0, marginTop: '0.5rem' } }
const cardStyle = { border: '1px solid rgba(255, 255, 255, 0.22)', borderRadius: '8px', background: 'rgba(5, 14, 29, 0.45)', padding: '0.8rem', fontSize: '0.92rem', lineHeight: 1.35 }
const primaryButtonStyle = { background: 'linear-gradient(135deg, #4da3ff, #2f6bff)', color: '#fff', border: 'none', borderRadius: '10px', padding: '0.7rem 0.9rem', fontWeight: 700, cursor: 'pointer' }
const secondaryButtonStyle = { background: 'rgba(255, 255, 255, 0.08)', color: '#e9f2ff', border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '10px', padding: '0.7rem 0.9rem', fontWeight: 600, cursor: 'pointer' }
const listeningStatusStyle = { margin: 0, fontSize: '0.82rem', color: '#e6efff', background: 'rgba(77, 163, 255, 0.2)', border: '1px solid rgba(77, 163, 255, 0.5)', borderRadius: '8px', padding: '0.45rem 0.6rem', fontWeight: 600 }

function getDeepgramProxyWebSocketUrl(language) {
  const apiBase = import.meta.env.VITE_API_BASE_URL || '/api'
  const origin = window.location.origin
  let baseUrl = apiBase
  if (baseUrl.startsWith('/')) baseUrl = `${origin}${baseUrl}`
  const httpUrl = new URL(baseUrl)
  const wsProtocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:'
  const wsPath = '/ws/deepgram-proxy'
  return `${wsProtocol}//${httpUrl.host}${wsPath}?language=${encodeURIComponent(language)}`
}

function useDeepgramTranscriber(defaultLanguage = 'en-US') {
  const [transcript, setTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [status, setStatus] = useState('Microphone is idle.')
  const [recognitionError, setRecognitionError] = useState('')
  const [language, setLanguage] = useState(defaultLanguage)
  const socketRef = useRef(null)
  const recorderRef = useRef(null)
  const mediaStreamRef = useRef(null)

  const stopEverything = () => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') recorderRef.current.stop()
    if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) socketRef.current.close()
    if (mediaStreamRef.current) mediaStreamRef.current.getTracks().forEach((track) => track.stop())
    recorderRef.current = null
    socketRef.current = null
    mediaStreamRef.current = null
    setIsRecording(false)
    setStatus('Microphone is idle.')
  }

  const startOrStopRecording = async () => {
    setRecognitionError('')
    if (isRecording) { stopEverything(); return }
    try {
      setStatus('Preparing microphone…')
      const mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true })
      mediaStreamRef.current = mediaStream
      const ws = new WebSocket(getDeepgramProxyWebSocketUrl(language))
      ws.onopen = () => {
        const recorder = new MediaRecorder(mediaStream, { mimeType: 'audio/webm;codecs=opus' })
        recorderRef.current = recorder
        recorder.ondataavailable = async (event) => {
          if (event.data?.size > 0 && ws.readyState === WebSocket.OPEN) ws.send(await event.data.arrayBuffer())
        }
        recorder.start(250)
        setIsRecording(true)
        setStatus('🎤 Microphone is ON. Listening live…')
      }
      ws.onmessage = (event) => {
        const payload = JSON.parse(event.data)
        if (payload.type === 'transcript' && payload.text) setTranscript((prev) => `${prev} ${payload.text}`.trim())
        if (payload.type === 'error') setRecognitionError(payload.message || 'Transcription error.')
      }
      ws.onerror = () => setRecognitionError('Unable to connect to Deepgram transcription proxy. Verify backend URL and DEEPGRAM_API_KEY.')
      ws.onclose = () => { if (isRecording) stopEverything() }
      socketRef.current = ws
    } catch {
      setRecognitionError('Microphone access failed. Please grant permission and retry.')
      stopEverything()
    }
  }

  const resetTranscript = () => setTranscript('')
  return { transcript, isRecording, recognitionError, startOrStopRecording, setTranscript: resetTranscript, language, setLanguage, status }
}

function ThoughtPromptSection({ title, prompts }) {
  const [promptIndex, setPromptIndex] = useState(0)
  const { transcript, isRecording, recognitionError, startOrStopRecording, setTranscript, language, setLanguage, status } = useDeepgramTranscriber('en-US')
  const activePrompt = prompts[promptIndex] || 'No prompt available.'

  return (
    <section style={sectionStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>
      <div style={cardStyle}>{activePrompt}</div>
      <label style={{ display: 'grid', gap: '0.25rem', fontSize: '0.82rem' }}>
        Language
        <select value={language} onChange={(event) => setLanguage(event.target.value)} style={{ ...cardStyle, padding: '0.4rem 0.5rem', color: '#fff' }}>
          <option value="en-US">English (US)</option><option value="en-GB">English (UK)</option><option value="hi-IN">Hindi (India)</option>
        </select>
      </label>
      <button type="button" style={primaryButtonStyle} onClick={startOrStopRecording}>{isRecording ? 'Stop my Recording' : 'Record my Response'}</button>
      <p style={listeningStatusStyle}>{status}</p>
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
