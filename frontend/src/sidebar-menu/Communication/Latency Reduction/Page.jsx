import { useEffect, useMemo, useRef, useState } from 'react'
import { startVoiceInterviewSession } from '../../../api'

const sectionStyle = { border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '12px', padding: '0.85rem', background: 'rgba(18, 27, 45, 0.55)', minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: 'calc(100dvh - 260px)' }
const sectionTitleStyle = { fontSize: '1.6rem', margin: 0, lineHeight: 1.15 }
function getSectionsRowStyle(sidebarCollapsed) { return { display: 'grid', gridTemplateColumns: sidebarCollapsed ? 'repeat(4, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: '1rem', alignItems: 'start', height: '100%', minHeight: 0, marginTop: '0.5rem' } }
const cardStyle = { border: '1px solid rgba(255, 255, 255, 0.22)', borderRadius: '8px', background: 'rgba(5, 14, 29, 0.45)', padding: '0.8rem', fontSize: '0.92rem', lineHeight: 1.35 }

function PlaceholderSection({ title, description }) { return <section style={sectionStyle}><h3 style={sectionTitleStyle}>{title}</h3><div style={cardStyle}>{description}</div></section> }

function NormalConversationSection() {
  const [status, setStatus] = useState('Idle')
  const [isRunning, setIsRunning] = useState(false)
  const [speakerState, setSpeakerState] = useState({ assistant: false, user: false })
  const [messages, setMessages] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const peerConnectionRef = useRef(null)
  const dataChannelRef = useRef(null)
  const localAudioStreamRef = useRef(null)
  const remoteAudioRef = useRef(null)

  const pulse = (key) => { setSpeakerState((s) => ({ ...s, [key]: true })); setTimeout(() => setSpeakerState((s) => ({ ...s, [key]: false })), 420) }

  const endAndScore = () => {
    const userTexts = messages.filter((m) => m.role === 'user').map((m) => m.text).join(' ')
    const words = userTexts.split(/\s+/).filter(Boolean)
    const fillerCount = (userTexts.match(/\b(um|uh|like|you know|basically)\b/gi) || []).length
    const uniqueWords = new Set(words.map((w) => w.toLowerCase())).size
    const communicationScore = Math.max(0, Math.min(100, Math.round(70 + Math.min(20, uniqueWords / 8) - Math.min(20, fillerCount * 2))))
    setResult({ communicationScore, wordsSpoken: words.length, uniqueWords, fillerCount, summary: communicationScore > 80 ? 'Clear and fluent conversation with good word variety.' : 'Good attempt. Improve fluency by reducing fillers and adding variety.' })
  }

  const stopSession = () => {
    if (dataChannelRef.current) dataChannelRef.current.close()
    if (peerConnectionRef.current) peerConnectionRef.current.close()
    if (localAudioStreamRef.current) localAudioStreamRef.current.getTracks().forEach((t) => t.stop())
    if (remoteAudioRef.current) { remoteAudioRef.current.pause(); remoteAudioRef.current.srcObject = null }
    dataChannelRef.current = null; peerConnectionRef.current = null; localAudioStreamRef.current = null
    setIsRunning(false); setStatus('Ended')
    endAndScore()
  }

  const startSession = async () => {
    try {
      setError(''); setResult(null); setMessages([]); setStatus('Preparing voice session...')
      const username = localStorage.getItem('interviewx-user') || 'guest'
      const voiceData = await startVoiceInterviewSession({ username, selected_mode: 'Free-Flowing - Conversational', selected_topics: [] })
      const pc = new RTCPeerConnection(); peerConnectionRef.current = pc
      const remoteAudio = new Audio(); remoteAudio.autoplay = true; remoteAudioRef.current = remoteAudio
      pc.ontrack = (event) => { remoteAudio.srcObject = event.streams[0]; pulse('assistant') }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true }); localAudioStreamRef.current = stream
      stream.getTracks().forEach((track) => pc.addTrack(track, stream))
      const dc = pc.createDataChannel('oai-events'); dataChannelRef.current = dc
      dc.onmessage = (event) => {
        const msg = JSON.parse(event.data)
        if (msg.type === 'response.audio_transcript.done' && msg.transcript) { setMessages((p) => [...p, { role: 'assistant', text: msg.transcript }]); pulse('assistant') }
        if (msg.type === 'conversation.item.input_audio_transcription.completed' && msg.transcript) { setMessages((p) => [...p, { role: 'user', text: msg.transcript }]); pulse('user') }
      }
      const offer = await pc.createOffer(); await pc.setLocalDescription(offer)
      let sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', { method: 'POST', body: offer.sdp, headers: { Authorization: `Bearer ${voiceData.client_secret}`, 'Content-Type': 'application/sdp' } })
      if (!sdpResponse.ok) sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(voiceData.model)}`, { method: 'POST', body: offer.sdp, headers: { Authorization: `Bearer ${voiceData.client_secret}`, 'Content-Type': 'application/sdp' } })
      const answerSdp = await sdpResponse.text(); await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })
      dc.onopen = () => {
        dc.send(JSON.stringify({ type: 'response.create', response: { modalities: ['audio', 'text'], instructions: 'You are Communication Guide. Start by asking the user which topic they want to talk about. Continue a natural conversation. Keep responses concise and friendly.' } }))
      }
      setIsRunning(true); setStatus('Live conversation in progress...')
    } catch (e) {
      setError(e.message || 'Unable to start conversation.')
      setStatus('Failed')
      stopSession()
    }
  }

  useEffect(() => () => stopSession(), [])

  return <section style={sectionStyle}><h3 style={sectionTitleStyle}>Normal</h3><div style={cardStyle}>Talk naturally with the Communication Guide. The assistant starts by asking what topic you want to discuss.</div>
    <div style={{ display: 'grid', gap: '0.6rem', gridTemplateColumns: '1fr', justifyItems: 'center' }}><div style={{ width: 76, height: 76, borderRadius: '50%', border: '2px solid #6aa7ff', background: speakerState.assistant ? '#2f6bff' : 'rgba(47,107,255,0.25)' }} /><small>Communication Guide</small><div style={{ width: 76, height: 76, borderRadius: '50%', border: '2px solid #9df9c4', background: speakerState.user ? '#2ba56f' : 'rgba(43,165,111,0.25)' }} /><small>User</small></div>
    <div style={cardStyle}>Mic Status: {isRunning ? 'ON' : 'OFF'} • Session: {status}</div>
    <div style={{ ...cardStyle, minHeight: 120 }}>{messages.slice(-6).map((m, i) => <p key={`${m.role}-${i}`} style={{ margin: '0.2rem 0' }}><strong>{m.role === 'assistant' ? 'Guide' : 'You'}:</strong> {m.text}</p>)}</div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}><button onClick={startSession} disabled={isRunning}>Start Conversation</button><button onClick={stopSession} disabled={!isRunning}>End & Show Result</button></div>
    {error ? <p style={{ color: '#ffb4b4', margin: 0 }}>{error}</p> : null}
    {result ? <div style={cardStyle}><strong>Conversation Result</strong><p>Communication Score: {result.communicationScore}/100</p><p>Words Spoken: {result.wordsSpoken} • Unique Words: {result.uniqueWords} • Fillers: {result.fillerCount}</p><p>{result.summary}</p></div> : null}
  </section>
}

export default function CommunicationLatencyReductionPage({ sidebarCollapsed = false }) {
  return <div style={getSectionsRowStyle(sidebarCollapsed)}><NormalConversationSection /><PlaceholderSection title="Drive" description="Latency drive exercises placeholder." /><PlaceholderSection title="Turn Tests" description="Turn-based timing test placeholder." />{sidebarCollapsed ? <section style={sectionStyle}><h3 style={sectionTitleStyle}>Analytics</h3><div style={cardStyle}>Latency analytics placeholder.</div></section> : null}</div>
}
