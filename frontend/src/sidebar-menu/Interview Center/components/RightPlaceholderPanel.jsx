import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

const EMOTION_KEYS = ['happy', 'sad', 'neutral', 'angry', 'surprised']
const EMOTION_COLORS = {
  happy: '#fbbf24',
  sad: '#60a5fa',
  neutral: '#a78bfa',
  angry: '#f87171',
  surprised: '#34d399'
}
const GRAPH_WINDOW_MS = 15000
const DETECTION_INTERVAL_MS = 120
const MAX_SAMPLES = Math.ceil(GRAPH_WINDOW_MS / DETECTION_INTERVAL_MS) + 1
const GRAPH_TOP_PADDING_PX = 12
const GRAPH_BOTTOM_PADDING_PX = 8
const SMOOTHING_RADIUS = 2
let sharedFaceApi = null
let sharedModelLoadPromise = null

export default function RightPlaceholderPanel() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const faceApiRef = useRef(null)
  const detectionTimerRef = useRef(null)
  const graphCanvasRef = useRef(null)
  const graphAnimationRef = useRef(null)
  const emotionHistoryRef = useRef([])

  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')
  const [modelStatus, setModelStatus] = useState('idle')
  const [modelError, setModelError] = useState('')
  const [hasDetection, setHasDetection] = useState(false)

  const legendItems = useMemo(
    () => EMOTION_KEYS.map((key) => ({ key, label: key[0].toUpperCase() + key.slice(1), color: EMOTION_COLORS[key] })),
    []
  )

  const stopDetectionLoop = useCallback(() => {
    if (detectionTimerRef.current) {
      window.clearInterval(detectionTimerRef.current)
      detectionTimerRef.current = null
    }
  }, [])

  const appendEmotionSample = useCallback((sample) => {
    const point = {
      happy: sample.happy ?? 0,
      sad: sample.sad ?? 0,
      neutral: sample.neutral ?? 0,
      angry: sample.angry ?? 0,
      surprised: sample.surprised ?? 0
    }
    if (emotionHistoryRef.current.length === 0) {
      emotionHistoryRef.current = Array.from({ length: MAX_SAMPLES }, () => ({ ...point }))
      return
    }
    const nextHistory = [...emotionHistoryRef.current, point].slice(-MAX_SAMPLES)
    emotionHistoryRef.current = nextHistory
  }, [])

  const runDetectionTick = useCallback(async () => {
    const faceapi = faceApiRef.current
    const videoElement = videoRef.current
    if (!faceapi || !videoElement || videoElement.readyState < 2) return

    try {
      const detection = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceExpressions()

      if (!detection?.expressions) {
        setHasDetection(false)
        return
      }

      const expressions = detection.expressions
      const sample = {
        happy: expressions.happy ?? 0,
        sad: expressions.sad ?? 0,
        neutral: expressions.neutral ?? 0,
        angry: expressions.angry ?? 0,
        surprised: expressions.surprised ?? 0
      }
      appendEmotionSample(sample)
      setHasDetection(true)
    } catch (error) {
      console.log('[InterviewCenter] Detection tick failed:', error)
      setHasDetection(false)
    }
  }, [appendEmotionSample])

  const startDetectionLoop = useCallback(() => {
    stopDetectionLoop()
    detectionTimerRef.current = window.setInterval(() => {
      runDetectionTick()
    }, DETECTION_INTERVAL_MS)
  }, [runDetectionTick, stopDetectionLoop])

  const loadModels = useCallback(async () => {
    if (sharedFaceApi) {
      faceApiRef.current = sharedFaceApi
      setModelStatus('ready')
      return true
    }

    if (sharedModelLoadPromise) {
      setModelStatus('loading')
      const loadedFaceApi = await sharedModelLoadPromise
      if (loadedFaceApi) {
        faceApiRef.current = loadedFaceApi
        setModelStatus('ready')
        return true
      }
      setModelStatus('error')
      return false
    }

    setModelStatus('loading')
    setModelError('')
    try {
      sharedModelLoadPromise = (async () => {
        try {
          const faceapiModule = await import('face-api.js')
          const faceapi = faceapiModule.default ?? faceapiModule
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceExpressionNet.loadFromUri('/models')
          ])
          sharedFaceApi = faceapi
          return faceapi
        } catch (error) {
          sharedModelLoadPromise = null
          throw error
        }
      })()

      const loadedFaceApi = await sharedModelLoadPromise
      faceApiRef.current = loadedFaceApi
      setModelStatus('ready')
      return true
    } catch (error) {
      console.log('[InterviewCenter] Model load failed:', error)
      setModelError('Unable to load local AI models from /models. Please verify model files.')
      setModelStatus('error')
      return false
    }
  }, [])

  useEffect(() => () => {
    stopDetectionLoop()
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [stopDetectionLoop])

  useEffect(() => {
    function drawGraph() {
      const canvas = graphCanvasRef.current
      if (!canvas) {
        graphAnimationRef.current = window.requestAnimationFrame(drawGraph)
        return
      }
      const width = canvas.clientWidth
      const height = canvas.clientHeight
      if (width <= 0 || height <= 0) {
        graphAnimationRef.current = window.requestAnimationFrame(drawGraph)
        return
      }

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width
        canvas.height = height
      }

      const context = canvas.getContext('2d')
      if (!context) {
        graphAnimationRef.current = window.requestAnimationFrame(drawGraph)
        return
      }

      context.clearRect(0, 0, width, height)
      context.strokeStyle = 'rgba(132, 151, 190, 0.28)'
      context.lineWidth = 1

      for (let row = 1; row <= 4; row += 1) {
        const y = (height / 5) * row
        context.beginPath()
        context.moveTo(0, y)
        context.lineTo(width, y)
        context.stroke()
      }

      const points = emotionHistoryRef.current

      if (points.length > 1) {
        const drawableHeight = Math.max(1, height - GRAPH_TOP_PADDING_PX - GRAPH_BOTTOM_PADDING_PX)

        EMOTION_KEYS.forEach((emotion) => {
          const smoothedValues = points.map((_, index) => {
            let total = 0
            let count = 0
            for (let offset = -SMOOTHING_RADIUS; offset <= SMOOTHING_RADIUS; offset += 1) {
              const neighbor = points[index + offset]
              if (!neighbor) continue
              total += neighbor[emotion] ?? 0
              count += 1
            }
            return count > 0 ? total / count : 0
          })
          const sampled = smoothedValues.map((value, index) => ({
            x: (index / (smoothedValues.length - 1)) * width,
            y: GRAPH_TOP_PADDING_PX + (1 - Math.max(0, Math.min(1, value))) * drawableHeight
          }))
          context.beginPath()
          context.strokeStyle = EMOTION_COLORS[emotion]
          context.lineWidth = 2
          context.lineCap = 'round'
          context.lineJoin = 'round'
          context.moveTo(sampled[0].x, sampled[0].y)
          for (let index = 1; index < sampled.length - 1; index += 1) {
            const current = sampled[index]
            const next = sampled[index + 1]
            const controlX = (current.x + next.x) / 2
            const controlY = (current.y + next.y) / 2
            context.quadraticCurveTo(current.x, current.y, controlX, controlY)
          }
          const penultimate = sampled[sampled.length - 2]
          const last = sampled[sampled.length - 1]
          context.quadraticCurveTo(penultimate.x, penultimate.y, last.x, last.y)
          context.stroke()
        })
      }

      graphAnimationRef.current = window.requestAnimationFrame(drawGraph)
    }

    graphAnimationRef.current = window.requestAnimationFrame(drawGraph)
    return () => {
      if (graphAnimationRef.current) {
        window.cancelAnimationFrame(graphAnimationRef.current)
        graphAnimationRef.current = null
      }
    }
  }, [])

  async function toggleCamera() {
    if (cameraOn) {
      stopDetectionLoop()
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setCameraOn(false)
      setCameraError('')
      setHasDetection(false)
      console.log('[InterviewCenter] Camera stopped')
      return
    }

    try {
      const modelsLoaded = await loadModels()
      if (!modelsLoaded) {
        setCameraError('Loading AI models failed. Detection is unavailable.')
        return
      }

      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      console.log('[InterviewCenter] Stream acquired:', stream)
      streamRef.current = stream
      if (videoRef.current) {
        console.log('[InterviewCenter] Binding stream to video element')
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        console.log('[InterviewCenter] Video playback started')
      } else {
        console.log('[InterviewCenter] Video ref is null')
      }
      setCameraOn(true)
      setCameraError('')
      startDetectionLoop()
    } catch (error) {
      setCameraOn(false)
      setCameraError('Camera not available.')
      console.log('[InterviewCenter] Camera failed:', error)
    }
  }

  return (
    <aside className="ic3-panel ic3-placeholder-panel" aria-label="Future features">
      <header className="ic3-panel-header">
        <h2>Future Features</h2>
      </header>
      <div className="ic3-placeholder-body">
        <section className="ic3-video-section">
          {modelStatus === 'loading' ? (
            <div className="ic3-model-status" role="status" aria-live="polite">
              <span className="ic3-spinner" aria-hidden="true" />
              <span>Loading AI models...</span>
            </div>
          ) : null}
          {modelStatus === 'error' ? <p className="ic3-model-error">{modelError}</p> : null}
          <div className="ic3-video-shell">
            <button type="button" className="ic3-camera-floating-button" onClick={toggleCamera}>
              {cameraOn ? 'Stop Camera' : 'Start Camera'}
            </button>
            <video ref={videoRef} className={`ic3-video ${cameraOn ? 'is-visible' : ''}`} autoPlay playsInline muted />
            {!cameraOn ? <p>{cameraError || 'Camera feed is off.'}</p> : null}
          </div>
        </section>

        <section className="ic3-emotion-section" aria-label="Emotion trends graph">
          <div className="ic3-emotion-header">
            <h3>Emotion Trends</h3>
            {hasDetection ? null : <p>No emotion detected</p>}
          </div>
          <div className="ic3-emotion-graph-shell">
            {modelStatus !== 'ready' ? (
              <p className="ic3-emotion-overlay">Graph will appear after local models are ready.</p>
            ) : null}
            <canvas ref={graphCanvasRef} className="ic3-emotion-graph" />
          </div>
          <ul className="ic3-emotion-legend">
            {legendItems.map((item) => (
              <li key={item.key}>
                <span style={{ backgroundColor: item.color }} />
                <span>{item.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="ic3-future-content">
          <p>This area will host insights, analytics, and coaching recommendations.</p>
        </section>
      </div>
    </aside>
  )
}
