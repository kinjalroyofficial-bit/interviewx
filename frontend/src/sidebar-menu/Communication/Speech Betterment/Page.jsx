import { useEffect, useMemo, useRef, useState } from 'react'
import sentencesData from '../../../data/sentences.json'
import punctuationData from '../../../data/punctuation.json'
import audioData from '../../../data/audio.json'

const panelStyle = {
  border: '1px solid rgba(255, 255, 255, 0.12)',
  borderRadius: '12px',
  padding: '0.85rem',
  background: 'rgba(18, 27, 45, 0.55)',
  minHeight: 0,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column'
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
    alignItems: 'stretch',
    height: '100%',
    minHeight: 0,
    marginTop: '0.5rem'
  }
}

const sentenceCardStyle = {
  border: '1px solid rgba(255, 255, 255, 0.22)',
  borderRadius: '8px',
  padding: '0.95rem',
  background: 'rgba(5, 14, 29, 0.45)',
  display: 'flex',
  alignItems: 'center',
  fontSize: '0.92rem',
  lineHeight: 1.35,
  minHeight: '118px',
  wordBreak: 'break-word'
}

const transcriptCardStyle = {
  ...sentenceCardStyle,
  minHeight: '104px'
}

const primaryButtonStyle = {
  width: '100%',
  borderRadius: '8px',
  border: '1px solid rgba(255, 255, 255, 0.38)',
  background: 'rgba(9, 24, 48, 0.8)',
  color: '#f5f7ff',
  padding: '0.62rem 0.9rem',
  fontWeight: 600,
  fontSize: '0.95rem',
  cursor: 'pointer'
}

const secondaryButtonStyle = {
  ...primaryButtonStyle,
  background: 'rgba(15, 35, 68, 0.7)'
}

const scoreCardStyle = {
  border: '1px solid rgba(255, 255, 255, 0.22)',
  borderRadius: '8px',
  padding: '0.62rem 0.9rem',
  background: 'rgba(5, 14, 29, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const waveformStyle = {
  ...sentenceCardStyle,
  justifyContent: 'space-between',
  minHeight: '84px',
  padding: '0.75rem 0.95rem'
}

const waveformBarBaseStyle = {
  width: '6px',
  borderRadius: '6px',
  background: 'rgba(165, 198, 255, 0.8)',
  transition: 'height 0.2s ease',
  alignSelf: 'center'
}

const listeningStatusStyle = {
  margin: 0,
  fontSize: '0.82rem',
  color: '#e6efff',
  background: 'rgba(77, 163, 255, 0.2)',
  border: '1px solid rgba(77, 163, 255, 0.5)',
  borderRadius: '8px',
  padding: '0.45rem 0.6rem',
  fontWeight: 600
}

function createSimilarityScore(sourceText, targetText) {
  if (!sourceText || !targetText) return 0

  const source = sourceText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  const target = targetText
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!source || !target) return 0

  const sourceWords = source.split(/\s+/)
  const targetWords = target.split(/\s+/)
  const sourceWordCounts = sourceWords.reduce((acc, word) => {
    acc[word] = (acc[word] || 0) + 1
    return acc
  }, {})
  const matchedWords = targetWords.reduce((count, word) => {
    if (sourceWordCounts[word]) {
      sourceWordCounts[word] -= 1
      return count + 1
    }
    return count
  }, 0)

  const overlapScore = matchedWords / Math.max(sourceWords.length, targetWords.length)

  const sourceJoined = sourceWords.join(' ')
  const targetJoined = targetWords.join(' ')
  const sourceLength = sourceJoined.length
  const targetLength = targetJoined.length
  const cols = targetLength + 1
  const matrix = new Array((sourceLength + 1) * cols)

  for (let i = 0; i <= sourceLength; i += 1) {
    matrix[i * cols] = i
  }
  for (let j = 0; j <= targetLength; j += 1) {
    matrix[j] = j
  }

  for (let i = 1; i <= sourceLength; i += 1) {
    for (let j = 1; j <= targetLength; j += 1) {
      const substitutionCost = sourceJoined[i - 1] === targetJoined[j - 1] ? 0 : 1
      const deletion = matrix[(i - 1) * cols + j] + 1
      const insertion = matrix[i * cols + (j - 1)] + 1
      const substitution = matrix[(i - 1) * cols + (j - 1)] + substitutionCost

      matrix[i * cols + j] = Math.min(deletion, insertion, substitution)
    }
  }

  const editDistance = matrix[sourceLength * cols + targetLength]
  const editSimilarity = 1 - (editDistance / Math.max(sourceLength, targetLength, 1))

  const combinedScore = (overlapScore * 0.65) + (Math.max(0, editSimilarity) * 0.35)

  return Math.max(0, Math.min(100, Math.round(combinedScore * 100)))
}

function getRandomPromptIndex(length, currentIndex = -1) {
  if (!length || length <= 0) return 0
  if (length === 1) return 0

  let nextIndex = Math.floor(Math.random() * length)
  while (nextIndex === currentIndex) {
    nextIndex = Math.floor(Math.random() * length)
  }

  return nextIndex
}

function useSpeechRecognitionTranscriber(defaultLanguage = 'en-US') {
  const recognitionRef = useRef(null)
  const restartTimerRef = useRef(null)
  const finalTextRef = useRef('')
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isStarting, setIsStarting] = useState(false)
  const isListeningRef = useRef(false)
  const isStartingRef = useRef(false)
  const manualStopRef = useRef(false)
  const [recognitionError, setRecognitionError] = useState('')
  const [language, setLanguage] = useState(defaultLanguage)
  const languageRef = useRef(defaultLanguage)

  const isSpeechRecognitionSupported = useMemo(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition), [])

  function clearRestartTimer() {
    if (restartTimerRef.current) {
      window.clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }

  function safeStart(recognition) {
    if (!recognition || isStartingRef.current) return
    try {
      recognition.lang = languageRef.current
      setIsStarting(true)
      isStartingRef.current = true
      manualStopRef.current = false
      recognition.start()
    } catch {
      setIsStarting(false)
      isStartingRef.current = false
      clearRestartTimer()
      restartTimerRef.current = window.setTimeout(() => {
        try { recognition.start() } catch {}
      }, 500)
    }
  }

  useEffect(() => {
    languageRef.current = language
    if (recognitionRef.current && !isListeningRef.current && !isStartingRef.current) {
      recognitionRef.current.lang = language
    }
  }, [language])

  useEffect(() => {
    if (!isSpeechRecognitionSupported) return () => {}
    const SpeechRecognitionApi = window.SpeechRecognition || window.webkitSpeechRecognition
    const recognition = new SpeechRecognitionApi()

    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.lang = languageRef.current

    recognition.onstart = () => {
      setIsStarting(false)
      isStartingRef.current = false
      setIsListening(true)
      isListeningRef.current = true
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
        setRecognitionError('Microphone permission denied. Please allow access and retry.')
        setIsListening(false)
        isListeningRef.current = false
        setIsStarting(false)
        isStartingRef.current = false
        manualStopRef.current = true
        return
      }
      setRecognitionError('Unable to transcribe right now. Please try again.')
    }

    recognition.onend = () => {
      setIsStarting(false)
      isStartingRef.current = false
      if (manualStopRef.current) {
        setIsListening(false)
        isListeningRef.current = false
        return
      }
      if (isListeningRef.current) {
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
  }, [isSpeechRecognitionSupported])

  function startOrStopRecording() {
    setRecognitionError('')
    const recognition = recognitionRef.current

    if (!isSpeechRecognitionSupported) {
      setRecognitionError('Speech recognition is not supported in this browser. Use the latest Chrome desktop build.')
      return
    }

    if (!recognition) return

    if (isListeningRef.current || isStartingRef.current) {
      manualStopRef.current = true
      setIsListening(false)
      isListeningRef.current = false
      setIsStarting(false)
      isStartingRef.current = false
      clearRestartTimer()
      try { recognition.stop() } catch {}
      return
    }

    manualStopRef.current = false
    setIsListening(true)
    isListeningRef.current = true
    safeStart(recognition)
  }

  function resetTranscriptionState() {
    finalTextRef.current = ''
    setTranscript('')
    setRecognitionError('')
    clearRestartTimer()
    if ((isListeningRef.current || isStartingRef.current) && recognitionRef.current) {
      manualStopRef.current = true
      try { recognitionRef.current.stop() } catch {}
    }
    setIsListening(false)
    isListeningRef.current = false
    setIsStarting(false)
    isStartingRef.current = false
  }

  return {
    transcript,
    isRecording: isListening || isStarting,
    isPreparing: isStarting,
    isReadyToListen: isListening && !isStarting,
    recognitionError,
    startOrStopRecording,
    resetTranscriptionState,
    language,
    setLanguage
  }
}

function SpeechPracticePanel({ title, prompts }) {
  const [promptIndex, setPromptIndex] = useState(() => getRandomPromptIndex(prompts.length))
  const {
    transcript,
    isRecording,
    isPreparing,
    isReadyToListen,
    recognitionError,
    startOrStopRecording,
    resetTranscriptionState
  } = useSpeechRecognitionTranscriber()

  const activePrompt = prompts[promptIndex] || 'No sentence available.'
  const similarityScore = useMemo(() => createSimilarityScore(activePrompt, transcript), [activePrompt, transcript])

  function handleNextPrompt() {
    setPromptIndex((prev) => getRandomPromptIndex(prompts.length, prev))
    resetTranscriptionState()
  }

  return (
    <section style={panelStyle}>
      <h3 style={sectionTitleStyle}>{title}</h3>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={sentenceCardStyle}>
          <p style={{ margin: 0 }}>{activePrompt}</p>
        </div>

        <button type="button" style={primaryButtonStyle} onClick={startOrStopRecording}>
          {isRecording ? 'Stop Recording' : 'Record my Response'}
        </button>

        <p style={listeningStatusStyle}>
          {isPreparing ? 'Preparing microphone…' : isReadyToListen ? '🎤 Ready to listen. Please start speaking.' : 'Microphone is idle.'}
        </p>

        <div style={transcriptCardStyle}>
          <p style={{ margin: 0 }}>
            {transcript || 'Show the Transcript of what was Recorded'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={scoreCardStyle}>
            <strong style={{ fontSize: '0.95rem', lineHeight: 1.1 }}>{similarityScore}% matched</strong>
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

function AudioPracticePanel({ prompts }) {
  const [promptIndex, setPromptIndex] = useState(() => getRandomPromptIndex(prompts.length))
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [audioError, setAudioError] = useState('')
  const {
    transcript,
    isRecording,
    isPreparing,
    isReadyToListen,
    recognitionError,
    startOrStopRecording,
    resetTranscriptionState
  } = useSpeechRecognitionTranscriber()

  const activePrompt = prompts[promptIndex] || 'No sentence available.'
  const similarityScore = useMemo(() => createSimilarityScore(activePrompt, transcript), [activePrompt, transcript])
  const isSpeechSynthesisSupported = typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window

  useEffect(() => () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
  }, [])

  function handlePlayAudio() {
    setAudioError('')

    if (!isSpeechSynthesisSupported) {
      setAudioError('Speech playback is not supported in this browser.')
      return
    }

    if (!activePrompt || activePrompt === 'No sentence available.') {
      setAudioError('No audio sentence is available right now.')
      return
    }

    const utterance = new window.SpeechSynthesisUtterance(activePrompt)
    utterance.lang = 'en-US'
    utterance.rate = 0.96
    utterance.pitch = 1

    utterance.onstart = () => {
      setIsPlayingAudio(true)
    }
    utterance.onend = () => {
      setIsPlayingAudio(false)
    }
    utterance.onerror = () => {
      setIsPlayingAudio(false)
      setAudioError('Could not play audio. Please try again.')
    }

    window.speechSynthesis.cancel()
    window.speechSynthesis.speak(utterance)
  }

  function handleNextPrompt() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setIsPlayingAudio(false)
    setPromptIndex((prev) => getRandomPromptIndex(prompts.length, prev))
    resetTranscriptionState()
    setAudioError('')
  }

  return (
    <section style={panelStyle}>
      <h3 style={sectionTitleStyle}>Audio</h3>

      <div style={{ display: 'grid', gap: '1rem' }}>
        <div style={waveformStyle} aria-label="Audio waveform preview">
          {[18, 36, 25, 44, 30, 52, 30, 44, 25, 36, 18].map((height, index) => (
            <span
              key={`wave-${height}-${index}`}
              style={{
                ...waveformBarBaseStyle,
                height: `${isPlayingAudio ? Math.min(56, height + ((index % 3) * 7)) : height}px`
              }}
            />
          ))}
        </div>

        <button type="button" style={secondaryButtonStyle} onClick={handlePlayAudio}>
          {isPlayingAudio ? 'Playing Audio…' : 'Play Audio'}
        </button>

        <button type="button" style={primaryButtonStyle} onClick={startOrStopRecording}>
          {isRecording ? 'Stop Recording' : 'Record my Response'}
        </button>

        <p style={listeningStatusStyle}>
          {isPreparing ? 'Preparing microphone…' : isReadyToListen ? '🎤 Ready to listen. Please start speaking.' : 'Microphone is idle.'}
        </p>

        <div style={transcriptCardStyle}>
          <p style={{ margin: 0 }}>
            {transcript || 'Show the Transcript of what was Recorded'}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div style={scoreCardStyle}>
            <strong style={{ fontSize: '0.95rem', lineHeight: 1.1 }}>{similarityScore}% matched</strong>
          </div>

          <button type="button" style={secondaryButtonStyle} onClick={handleNextPrompt}>
            Next Sentence
          </button>
        </div>

        {audioError ? (
          <p style={{ margin: 0, color: '#ffb4b4', fontSize: '0.88rem' }}>{audioError}</p>
        ) : null}
        {recognitionError ? (
          <p style={{ margin: 0, color: '#ffb4b4', fontSize: '0.88rem' }}>{recognitionError}</p>
        ) : null}
      </div>
    </section>
  )
}

export default function CommunicationSpeechBettermentPage({ sidebarCollapsed = false }) {
  const sentencePrompts = useMemo(() => sentencesData.sentences || [], [])
  const punctuationPrompts = useMemo(() => punctuationData.sentences || [], [])
  const audioPrompts = useMemo(() => audioData.paragraphs || [], [])

  return (
    <div style={getSectionsRowStyle(sidebarCollapsed)}>
      <SpeechPracticePanel title="Sentence" prompts={sentencePrompts} />
      <SpeechPracticePanel title="Punctuation" prompts={punctuationPrompts} />
      <AudioPracticePanel prompts={audioPrompts} />

      {sidebarCollapsed ? (
        <section style={panelStyle}>
          <h3 style={sectionTitleStyle}>Analytics</h3>
          <p>Response analytics placeholder.</p>
          <p>Answer quality insights placeholder.</p>
        </section>
      ) : null}
    </div>
  )
}
