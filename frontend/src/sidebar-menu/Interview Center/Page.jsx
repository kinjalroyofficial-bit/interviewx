import { useEffect, useRef, useState } from 'react'
import { endInterview, evaluateAnswerQuality, evaluateInterview, getInterviewHistory, nextInterviewQuestion, startInterview, startVoiceInterviewSession } from '../../api'
import ChatComposer from './components/ChatComposer'
import ChatHeader from './components/ChatHeader'
import CurrentInterviewCard from './components/CurrentInterviewCard'
import InterviewHistoryPanel from './components/InterviewHistoryPanel'
import InterviewSetupFloating from './components/InterviewSetupFloating'
import MessagePane from './components/MessagePane'
import RightPlaceholderPanel from './components/RightPlaceholderPanel'
import ThemeToggle from './components/ThemeToggle'
import './interview-center.css'

export default function InterviewCenterPage({ sidebarCollapsed = false }) {
  const currentUsername = localStorage.getItem('interviewx-user') || ''
  const [isLightTheme, setIsLightTheme] = useState(false)
  const [interviews, setInterviews] = useState([])

  const [activeInterviewId, setActiveInterviewId] = useState('')
  const [liveInterview, setLiveInterview] = useState(null)
  const [isStartingInterview, setIsStartingInterview] = useState(false)
  const [isSendingAnswer, setIsSendingAnswer] = useState(false)
  const [isEndingInterview, setIsEndingInterview] = useState(false)
  const [hasLiveInterviewEnded, setHasLiveInterviewEnded] = useState(false)
  const [composerValue, setComposerValue] = useState('')
  const [startInterviewError, setStartInterviewError] = useState('')
  const [sendAnswerError, setSendAnswerError] = useState('')
  const [historyError, setHistoryError] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [analyticsError, setAnalyticsError] = useState('')
  const [analyticsPending, setAnalyticsPending] = useState(false)
  const [historyPerformanceMessage, setHistoryPerformanceMessage] = useState('')
  const [answerQualityCards, setAnswerQualityCards] = useState([])
  const [isEvaluating, setIsEvaluating] = useState(false)
  const [currentSetup, setCurrentSetup] = useState({
    selectedMode: 'Free-Flowing - Conversational',
    inputType: 'text',
    selectedTopics: []
  })
  const [voiceStatusMessage, setVoiceStatusMessage] = useState('')
  const [voiceSpeakerState, setVoiceSpeakerState] = useState({ user: false, assistant: false })
  const peerConnectionRef = useRef(null)
  const dataChannelRef = useRef(null)
  const localAudioStreamRef = useRef(null)
  const remoteAudioElementRef = useRef(null)
  const voiceStateTimersRef = useRef({ user: null, assistant: null })
  const fallbackInterview = {
    id: '',
    title: 'Current Interview',
    difficulty: 'Intermediate',
    topics: []
  }
  const activeInterview = interviews.find((item) => item.id === activeInterviewId) || null
  const defaultChatInterview = { title: 'My Interview' }

  useEffect(() => {
    const shell = document.querySelector('.dashboard-shell')
    if (!shell) return
    setIsLightTheme(shell.classList.contains('dashboard-theme-light'))
  }, [])

  useEffect(() => {
    if (!currentUsername) return
    loadInterviewHistory('')
  }, [currentUsername])

  useEffect(() => () => {
    stopVoiceInterviewSession()
  }, [])

  async function loadInterviewHistory(nextActiveInterviewId = '') {
    try {
      setHistoryError('')
      const data = await getInterviewHistory(currentUsername)
      const mappedInterviews = (data.interviews || []).map((interview) => {
        const messages = (interview.transcript_turns || []).map((turn, idx) => ({
          id: `${interview.interview_id}-${idx}`,
          author: turn.role || 'assistant',
          text: turn.content || '',
          time: turn.timestamp ? new Date(turn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'
        }))
        return {
          id: interview.interview_id,
          title: `Interview ${interview.interview_id.slice(-6)}`,
          displayTime: interview.created_at ? new Date(interview.created_at).toLocaleDateString() : 'Unknown',
          status: interview.status,
          interviewEnded: interview.status === 'ended',
          messages,
          performanceAnalytics: interview.performance_analytics || null
        }
      })
      setInterviews(mappedInterviews)
      if (nextActiveInterviewId) {
        const hasRequestedInterview = mappedInterviews.some((item) => item.id === nextActiveInterviewId)
        setActiveInterviewId(hasRequestedInterview ? nextActiveInterviewId : '')
      }
    } catch (error) {
      setHistoryError(error.message || 'Unable to load interview history.')
    }
  }

  async function handleSelectInterview(interviewId) {
    if (!interviewId || !currentUsername) return
    setLiveInterview(null)
    setHasLiveInterviewEnded(false)
    setComposerValue('')
    setActiveInterviewId('')
    setAnalytics(null)
    setAnalyticsError('')
    setAnalyticsPending(false)
    setHistoryPerformanceMessage('')
    setAnswerQualityCards([])
    await loadInterviewHistory(interviewId)
  }

  function handleThemeToggle() {
    const shell = document.querySelector('.dashboard-shell')
    if (!shell) return

    const nextIsLight = !shell.classList.contains('dashboard-theme-light')
    shell.classList.toggle('dashboard-theme-light', nextIsLight)
    setIsLightTheme(nextIsLight)
  }

  function formatResponseTime(durationMs) {
    if (durationMs < 1000) return `${durationMs} ms`
    return `${(durationMs / 1000).toFixed(2)} s`
  }

  function readLatestInterviewSetup() {
    const storageKey = `interviewx-setup-${currentUsername || 'guest'}`
    try {
      const rawValue = localStorage.getItem(storageKey)
      if (!rawValue) return currentSetup
      const parsedValue = JSON.parse(rawValue)
      const normalizedInputType = String(parsedValue?.inputType || currentSetup.inputType || 'text').toLowerCase()
      const selectedTopics = Array.isArray(parsedValue?.selectedTopics)
        ? parsedValue.selectedTopics
            .filter((entry) => entry && typeof entry.topic === 'string' && typeof entry.difficulty === 'string')
            .map((entry) => ({ topic: entry.topic, difficulty: entry.difficulty }))
        : currentSetup.selectedTopics
      return {
        selectedMode: typeof parsedValue?.selectedMode === 'string' ? parsedValue.selectedMode : currentSetup.selectedMode,
        inputType: normalizedInputType === 'voice' ? 'voice' : 'text',
        selectedTopics
      }
    } catch (error) {
      console.warn('[VoiceInterview] Failed to read setup from localStorage. Using in-memory setup.', error)
      return currentSetup
    }
  }

  function stopVoiceInterviewSession() {
    console.info('[VoiceInterview] Stopping realtime session and media tracks.')
    if (voiceStateTimersRef.current.user) {
      clearTimeout(voiceStateTimersRef.current.user)
      voiceStateTimersRef.current.user = null
    }
    if (voiceStateTimersRef.current.assistant) {
      clearTimeout(voiceStateTimersRef.current.assistant)
      voiceStateTimersRef.current.assistant = null
    }
    if (dataChannelRef.current) {
      try {
        dataChannelRef.current.close()
      } catch (error) {
        console.warn('[VoiceInterview] Failed to close data channel', error)
      }
      dataChannelRef.current = null
    }
    if (peerConnectionRef.current) {
      try {
        peerConnectionRef.current.close()
      } catch (error) {
        console.warn('[VoiceInterview] Failed to close peer connection', error)
      }
      peerConnectionRef.current = null
    }
    if (localAudioStreamRef.current) {
      localAudioStreamRef.current.getTracks().forEach((track) => track.stop())
      localAudioStreamRef.current = null
    }
    if (remoteAudioElementRef.current) {
      remoteAudioElementRef.current.pause()
      remoteAudioElementRef.current.srcObject = null
      remoteAudioElementRef.current = null
    }
    setVoiceSpeakerState({ user: false, assistant: false })
  }

  function pulseSpeaker(speakerKey) {
    setVoiceSpeakerState((current) => ({ ...current, [speakerKey]: true }))
    if (voiceStateTimersRef.current[speakerKey]) {
      clearTimeout(voiceStateTimersRef.current[speakerKey])
    }
    voiceStateTimersRef.current[speakerKey] = setTimeout(() => {
      setVoiceSpeakerState((current) => ({ ...current, [speakerKey]: false }))
      voiceStateTimersRef.current[speakerKey] = null
    }, 420)
  }

  async function ensureMicrophoneAccess() {
    if (localAudioStreamRef.current) return localAudioStreamRef.current
    console.info('[VoiceInterview] Requesting microphone permissions.')
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      }
    })
    localAudioStreamRef.current = stream
    return stream
  }

  function appendVoiceMessage(role, textValue) {
    const cleanText = (textValue || '').trim()
    if (!cleanText) return
    setLiveInterview((currentInterview) => {
      if (!currentInterview) return currentInterview
      const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      return {
        ...currentInterview,
        messages: [
          ...currentInterview.messages,
          {
            id: `${currentInterview.id}-${role}-${Date.now()}-${Math.random().toString(16).slice(2, 6)}`,
            author: role,
            text: cleanText,
            time: timestamp
          }
        ]
      }
    })
  }

  function handleRealtimeServerEvent(parsedMessage) {
    if (!parsedMessage || typeof parsedMessage !== 'object') return
    if (parsedMessage.type === 'session.created') {
      console.info('[VoiceInterview] session.created received, applying transcription settings.')
      const sessionUpdateEvent = {
        type: 'session.update',
        session: {
          type: 'realtime',
          input_audio_transcription: {
            model: 'gpt-4o-mini-transcribe',
            language: 'en'
          }
        }
      }
      dataChannelRef.current?.send(JSON.stringify(sessionUpdateEvent))
      dataChannelRef.current?.send(JSON.stringify({ type: 'response.create' }))
      return
    }
    if (parsedMessage.type === 'conversation.item.input_audio_transcription.completed') {
      pulseSpeaker('user')
      appendVoiceMessage('user', parsedMessage.transcript || '')
      return
    }
    if (parsedMessage.type === 'response.output_text.delta' || parsedMessage.type === 'response.output_audio.delta') {
      pulseSpeaker('assistant')
      return
    }
    if (parsedMessage.type === 'response.done') {
      pulseSpeaker('assistant')
      const outputItems = parsedMessage?.response?.output || []
      outputItems.forEach((item) => {
        if (item.type !== 'message' || !Array.isArray(item.content)) return
        item.content.forEach((contentPart) => {
          appendVoiceMessage('assistant', contentPart.transcript || contentPart.text || '')
        })
      })
      return
    }
    if (parsedMessage.type === 'error') {
      const message = parsedMessage?.error?.message || 'Realtime voice error.'
      console.error('[VoiceInterview] OpenAI realtime error event', parsedMessage)
      if (message.includes("session.type")) {
        console.warn('[VoiceInterview] Ignoring transient session.type error after applying update.')
        return
      }
      setSendAnswerError(message)
    }
  }

  async function initializeVoiceRealtimeConnection(ephemeralKey, modelName) {
    const stream = await ensureMicrophoneAccess()
    const peerConnection = new RTCPeerConnection()
    peerConnectionRef.current = peerConnection

    const remoteAudioElement = new Audio()
    remoteAudioElement.autoplay = true
    remoteAudioElementRef.current = remoteAudioElement
    peerConnection.ontrack = (event) => {
      remoteAudioElement.srcObject = event.streams[0]
    }
    peerConnection.onconnectionstatechange = () => {
      console.info('[VoiceInterview] Peer connection state:', peerConnection.connectionState)
      if (peerConnection.connectionState === 'failed') {
        setSendAnswerError('Voice connection failed. Please end and restart the interview.')
      }
    }
    peerConnection.addTrack(stream.getTracks()[0], stream)

    const dataChannel = peerConnection.createDataChannel('oai-events')
    dataChannelRef.current = dataChannel
    dataChannel.onopen = () => {
      console.info('[VoiceInterview] Data channel open.')
      setVoiceStatusMessage('Voice interview connected. Speak naturally to continue.')
    }
    dataChannel.onclose = () => {
      console.info('[VoiceInterview] Data channel closed.')
    }
    dataChannel.onerror = (event) => {
      console.error('[VoiceInterview] Data channel error', event)
    }
    dataChannel.onmessage = (event) => {
      try {
        const parsedMessage = JSON.parse(event.data)
        handleRealtimeServerEvent(parsedMessage)
      } catch (error) {
        console.warn('[VoiceInterview] Failed to parse realtime message', error)
      }
    }

    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)

    const handshakeHeaders = {
      Authorization: `Bearer ${ephemeralKey}`,
      'Content-Type': 'application/sdp'
    }
    let sdpText = ''
    let sdpResponse = await fetch('https://api.openai.com/v1/realtime/calls', {
      method: 'POST',
      body: offer.sdp,
      headers: handshakeHeaders
    })
    if (!sdpResponse.ok) {
      console.warn('[VoiceInterview] /v1/realtime/calls failed, retrying with legacy endpoint.')
      sdpResponse = await fetch(`https://api.openai.com/v1/realtime?model=${encodeURIComponent(modelName)}`, {
        method: 'POST',
        body: offer.sdp,
        headers: handshakeHeaders
      })
    }
    if (!sdpResponse.ok) {
      const rawBody = await sdpResponse.text()
      throw new Error(`Realtime SDP handshake failed (${sdpResponse.status}): ${rawBody}`)
    }
    sdpText = await sdpResponse.text()
    await peerConnection.setRemoteDescription({ type: 'answer', sdp: sdpText })
  }

  async function handleStartInterview() {
    if (!currentUsername) {
      setStartInterviewError('Please log in again before starting the interview.')
      return
    }

    setIsStartingInterview(true)
    setStartInterviewError('')
    setSendAnswerError('')
    const latestSetup = readLatestInterviewSetup()
    if (
      latestSetup.inputType !== currentSetup.inputType
      || latestSetup.selectedMode !== currentSetup.selectedMode
      || JSON.stringify(latestSetup.selectedTopics) !== JSON.stringify(currentSetup.selectedTopics)
    ) {
      setCurrentSetup(latestSetup)
    }
    console.info('[Interview] Starting interview with setup', latestSetup)
    const requestStart = Date.now()
    try {
      if (latestSetup.inputType === 'voice') {
        setVoiceStatusMessage('Preparing microphone and voice session...')
        await ensureMicrophoneAccess()
        const voiceData = await startVoiceInterviewSession({
          username: currentUsername,
          selected_mode: latestSetup.selectedMode,
          selected_topics: latestSetup.selectedTopics
        })
        await initializeVoiceRealtimeConnection(voiceData.client_secret, voiceData.model)
        const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        setLiveInterview({
          id: voiceData.interview_id,
          title: 'Live Voice Interview',
          interviewEnded: false,
          lastResponseId: null,
          transcriptFilePath: null,
          isVoice: true,
          messages: [
            {
              id: `${voiceData.interview_id}-voice-ready`,
              author: 'assistant',
              text: 'Voice interview is ready. I will start with a question.',
              time: nowTime,
              responseTimeLabel: `response ${formatResponseTime(Date.now() - requestStart)}`
            }
          ]
        })
        setHasLiveInterviewEnded(false)
        setAnswerQualityCards([])
        return
      }
      const data = await startInterview({
        username: currentUsername,
        selected_mode: latestSetup.selectedMode,
        input_type: latestSetup.inputType,
        selected_topics: latestSetup.selectedTopics
      })
      const responseTimeLabel = `response ${formatResponseTime(Date.now() - requestStart)}`
      const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLiveInterview({
        id: data.interview_id,
        title: 'Live Interview',
        interviewEnded: false,
        lastResponseId: data.response_id || null,
        transcriptFilePath: null,
        isVoice: false,
        messages: [
          {
            id: `${data.interview_id}-q1`,
            author: 'assistant',
            text: data.first_question,
            time: nowTime,
            responseTimeLabel
          }
        ]
      })
      setHasLiveInterviewEnded(false)
      setAnswerQualityCards([])
      await loadInterviewHistory(liveInterview?.id || '')
    } catch (error) {
      if (latestSetup.inputType === 'voice') {
        stopVoiceInterviewSession()
      }
      setStartInterviewError(error.message || 'Unable to start interview.')
    } finally {
      setIsStartingInterview(false)
    }
  }

  async function handleSendAnswer() {
    if (!liveInterview || liveInterview.interviewEnded || isSendingAnswer) return
    if (liveInterview.isVoice) {
      setSendAnswerError('Voice interview uses microphone input directly. Text composer is disabled.')
      return
    }
    const answer = composerValue.trim()
    if (!answer) return

    setIsSendingAnswer(true)
    setSendAnswerError('')
    const userMessageId = `${liveInterview.id}-u-${Date.now()}`
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    setLiveInterview((currentInterview) => {
      if (!currentInterview) return currentInterview
      return {
        ...currentInterview,
        messages: [
          ...currentInterview.messages,
          {
            id: userMessageId,
            author: 'user',
            text: answer,
            time: nowTime
          }
        ]
      }
    })
    setComposerValue('')

    try {
      const requestStart = Date.now()
      const data = await nextInterviewQuestion({
        interview_id: liveInterview.id,
        answer,
        previous_response_id: liveInterview.lastResponseId || null
      })
      const nextInterviewEnded = Boolean(data.interview_ended)
      if (nextInterviewEnded) setHasLiveInterviewEnded(true)
      const responseTimeLabel = `response ${formatResponseTime(Date.now() - requestStart)}`
      const assistantTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      setLiveInterview((currentInterview) => {
        if (!currentInterview) return currentInterview
        return {
          ...currentInterview,
          interviewEnded: nextInterviewEnded,
          lastResponseId: data.response_id || currentInterview.lastResponseId || null,
          transcriptFilePath: data.transcript_file_path || currentInterview.transcriptFilePath || null,
          messages: [
            ...currentInterview.messages,
            {
              id: `${currentInterview.id}-a-${Date.now()}`,
              author: 'assistant',
              text: data.next_question,
              time: assistantTime,
              responseTimeLabel
            }
          ]
        }
      })
      await loadInterviewHistory(liveInterview?.id || '')
    } catch (error) {
      console.error('nextInterviewQuestion failed', {
        interviewId: liveInterview.id,
        error
      })
      setSendAnswerError(error.message || 'Unable to send answer.')
    } finally {
      dispatchAnswerQualityEvaluation(answer, liveInterview.id)
      setIsSendingAnswer(false)
    }
  }

  function dispatchAnswerQualityEvaluation(answerText, interviewId) {
    window.setTimeout(() => {
      void triggerAnswerQualityEvaluation(answerText, interviewId)
    }, 0)
  }

  async function triggerAnswerQualityEvaluation(answerText, interviewId) {
    const cleanAnswer = (answerText || '').trim()
    if (!cleanAnswer) return
    try {
      const result = await evaluateAnswerQuality({
        answer: cleanAnswer,
        interview_id: interviewId
      })
      setAnswerQualityCards((cards) => [
        {
          id: `aq-${Date.now()}`,
          status: result.status || 'needs_improvement',
          feedback: result.feedback || '',
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        },
        ...cards
      ])
    } catch (error) {
      console.error('answer quality evaluation failed', {
        interviewId,
        answerPreview: cleanAnswer.slice(0, 80),
        error
      })
    }
  }

  async function handleEndInterview() {
    if (!liveInterview) return
    if (liveInterview.interviewEnded) {
      stopVoiceInterviewSession()
      setVoiceStatusMessage('')
      setComposerValue('')
      setLiveInterview(null)
      setActiveInterviewId('')
      setHasLiveInterviewEnded(false)
      return
    }
    setSendAnswerError('')
    setIsEndingInterview(true)
    try {
      if (liveInterview.isVoice) {
        stopVoiceInterviewSession()
        setLiveInterview((currentInterview) => {
          if (!currentInterview) return currentInterview
          return {
            ...currentInterview,
            interviewEnded: true
          }
        })
        setHasLiveInterviewEnded(true)
        setVoiceStatusMessage('Voice interview ended.')
        return
      }
      await endInterview({ interview_id: liveInterview.id, transcript_turns: [] })
      setLiveInterview((currentInterview) => {
        if (!currentInterview) return currentInterview
        return {
          ...currentInterview,
          interviewEnded: true
        }
      })
      setHasLiveInterviewEnded(true)
      await loadInterviewHistory()
    } catch (error) {
      setSendAnswerError(error.message || 'Unable to end interview.')
    } finally {
      setIsEndingInterview(false)
    }
  }

  function handleCloseInterview() {
    if (!liveInterview) return
    if (liveInterview.isVoice) {
      stopVoiceInterviewSession()
      setVoiceStatusMessage('')
    }
    setComposerValue('')
    setLiveInterview(null)
    setActiveInterviewId('')
    setHasLiveInterviewEnded(false)
  }

  async function handleMyPerformance() {
    if (!liveInterview || isEvaluating || !liveInterview.interviewEnded) return
    setHistoryPerformanceMessage('')
    await loadPerformanceAnalytics(liveInterview.id)
  }

  async function loadPerformanceAnalytics(interviewId) {
    if (!interviewId || isEvaluating) return
    setIsEvaluating(true)
    setAnalyticsError('')
    setAnalyticsPending(false)
    setHistoryPerformanceMessage('')
    try {
      const maxAttempts = 15
      for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
        try {
          const evaluation = await evaluateInterview({ interview_id: interviewId })
          setAnalyticsPending(false)
          setAnalytics(evaluation)
          setInterviews((items) => items.map((item) => (
            item.id === interviewId
              ? { ...item, performanceAnalytics: evaluation }
              : item
          )))
          await loadInterviewHistory(interviewId)
          return
        } catch (error) {
          const message = error.message || 'Unable to evaluate interview.'
          if (!message.includes('Interview analytics is being generated. Please wait...')) {
            throw error
          }
          setAnalyticsPending(true)
          await new Promise((resolve) => {
            setTimeout(resolve, 2000)
          })
        }
      }
      setAnalyticsError('Interview analytics is being generated. Please wait...')
    } catch (error) {
      setAnalyticsError(error.message || 'Unable to evaluate interview.')
    } finally {
      setIsEvaluating(false)
    }
  }

  useEffect(() => {
    if (!activeInterview || liveInterview || isEvaluating) return
    if (activeInterview.performanceAnalytics) {
      setAnalyticsPending(false)
      setAnalyticsError('')
      setHistoryPerformanceMessage('')
      setAnalytics(activeInterview.performanceAnalytics)
      return
    }
    setAnalyticsPending(false)
    setAnalyticsError('')
    setAnalytics(null)
    setHistoryPerformanceMessage("Performance analytics not available. Please run 'My Performance' to generate it.")
  }, [activeInterviewId, activeInterview, liveInterview, isEvaluating])

  useEffect(() => {
    const handleWindowUnload = () => {
      stopVoiceInterviewSession()
    }
    window.addEventListener('beforeunload', handleWindowUnload)
    return () => {
      window.removeEventListener('beforeunload', handleWindowUnload)
    }
  }, [])

  return (
    <main className={`ic3-layout ${sidebarCollapsed ? 'is-sidebar-collapsed' : ''}`}>
      <header className="ic3-workspace-header">
        <h1>Interview Center</h1>
        <div className="ic3-header-actions">
          <ThemeToggle checked={isLightTheme} onChange={handleThemeToggle} />
          <button type="button" className="ic3-header-button">Logout</button>
        </div>
      </header>

      <section className="ic3-left-stack">
        <InterviewHistoryPanel
          interviews={interviews}
          activeId={activeInterview?.id || ''}
          onSelect={handleSelectInterview}
        />
        {historyError ? <p>{historyError}</p> : null}
        <CurrentInterviewCard
          username={currentUsername}
          currentSetup={currentSetup}
        />
      </section>

      <section className="ic3-panel ic3-chat-panel">
        <ChatHeader interview={liveInterview || activeInterview || defaultChatInterview} />
        {liveInterview ? (
          <>
            {liveInterview.isVoice ? (
              <section className="ic3-voice-speakers" aria-label="Voice activity indicators">
                <article className="ic3-voice-speaker-card">
                  <div className={`ic3-voice-blob is-assistant ${voiceSpeakerState.assistant ? 'is-active' : ''}`} />
                  <p>Interviewer</p>
                </article>
                <article className="ic3-voice-speaker-card">
                  <div className={`ic3-voice-blob is-user ${voiceSpeakerState.user ? 'is-active' : ''}`} />
                  <p>You</p>
                </article>
              </section>
            ) : null}
            {liveInterview.isVoice && voiceStatusMessage ? (
              <p className="ic3-voice-status">{voiceStatusMessage}</p>
            ) : null}
            <MessagePane messages={liveInterview.messages} />
            {hasLiveInterviewEnded ? (
              <button
                type="button"
                className="ic3-end-interview-floating-button"
                onClick={handleCloseInterview}
              >
                Close Interview
              </button>
            ) : (
              <button
                type="button"
                className="ic3-end-interview-floating-button"
                onClick={handleEndInterview}
                disabled={isEndingInterview}
              >
                {isEndingInterview ? 'Saving...' : 'End Interview'}
              </button>
            )}
            {hasLiveInterviewEnded ? (
              <button
                type="button"
                className="ic3-end-interview-floating-button is-secondary"
                onClick={handleMyPerformance}
                disabled={isEvaluating || liveInterview.isVoice}
              >
                {isEvaluating ? 'Evaluating...' : 'My Performance'}
              </button>
            ) : null}
            {liveInterview.isVoice ? (
              <div className="ic3-voice-composer-note">Microphone streaming is active. Speak naturally; text input is disabled in voice mode.</div>
            ) : (
              <ChatComposer
                value={composerValue}
                onChange={setComposerValue}
                onSend={handleSendAnswer}
                disabled={isSendingAnswer || isEndingInterview || liveInterview.interviewEnded}
                placeholder={liveInterview.interviewEnded ? 'Interview ended.' : (isSendingAnswer ? 'Sending...' : 'Type your answer...')}
              />
            )}
            {sendAnswerError ? <p>{sendAnswerError}</p> : null}
            {liveInterview.transcriptFilePath ? <p>Transcript file: {liveInterview.transcriptFilePath}</p> : null}
          </>
        ) : activeInterview ? (
          <>
            <MessagePane messages={activeInterview.messages} />
            {historyPerformanceMessage ? <p>{historyPerformanceMessage}</p> : null}
            <ChatComposer disabled placeholder="Start a live interview to send answers..." />
          </>
        ) : (
          <div className="ic3-chat-empty-state">
            <div className="ic3-chat-empty-setup">
              <InterviewSetupFloating
                activeInterview={activeInterview || fallbackInterview}
                username={currentUsername}
                onSetupChange={setCurrentSetup}
              />
            </div>
            <button
              type="button"
              className="ic3-start-interview-button"
              onClick={handleStartInterview}
              disabled={isStartingInterview}
            >
              {isStartingInterview ? 'Starting Interview...' : 'Start My Interview'}
            </button>
            {startInterviewError ? <p>{startInterviewError}</p> : null}
          </div>
        )}
      </section>

      <RightPlaceholderPanel />

      <aside className={`ic3-response-rail ${sidebarCollapsed ? 'is-visible' : ''}`} aria-label="Response analytics">
        <section className="ic3-answer-quality-panel">
          <p>Answer Quality Insights</p>
          {answerQualityCards.length ? (
            <div className="ic3-answer-quality-list">
              {answerQualityCards.map((card) => (
                <article key={card.id} className="ic3-answer-quality-card">
                  <header>
                    <strong>{card.status === 'good' ? 'Good' : 'Needs improvement'}</strong>
                    <time>{card.createdAt}</time>
                  </header>
                  <p>{card.feedback}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="ic3-response-analytics-empty">Answer quality insights will appear after you submit answers.</p>
          )}
        </section>
        <section className="ic3-performance-analytics-panel">
          <p>Response Analytics</p>
          {analyticsError ? <p>{analyticsError}</p> : null}
          {analyticsPending ? <p className="ic3-response-analytics-empty">Interview analytics is being generated. Please wait...</p> : null}
          {analytics ? (
            <div className="ic3-analytics-dashboard">
              <div className="ic3-analytics-overall-card">
                <h3>Overall score</h3>
                <strong>{analytics.overall_score}/100</strong>
              </div>
              <div className="ic3-analytics-metric-card">
                <h3>Technical competency</h3>
                <p className="ic3-analytics-metric-score">{analytics.technical_competency?.score ?? 0}/100</p>
                <p>{analytics.technical_competency?.summary || 'No summary available.'}</p>
              </div>
              <div className="ic3-analytics-metric-card">
                <h3>Communication</h3>
                <p className="ic3-analytics-metric-score">{analytics.communication?.score ?? 0}/100</p>
                <p>{analytics.communication?.summary || 'No summary available.'}</p>
              </div>
              <div className="ic3-analytics-metric-card">
                <h3>Areas of improvement</h3>
                {(analytics.areas_of_improvement || []).length ? (
                  <ul>
                    {analytics.areas_of_improvement.map((item, index) => (
                      <li key={`${index}-${item.slice(0, 24)}`}>{item}</li>
                    ))}
                  </ul>
                ) : (
                  <p>No improvement areas identified.</p>
                )}
              </div>
            </div>
          ) : (
            <p className="ic3-response-analytics-empty">Run "My Performance" after ending an interview to view analytics.</p>
          )}
        </section>
      </aside>
    </main>
  )
}
