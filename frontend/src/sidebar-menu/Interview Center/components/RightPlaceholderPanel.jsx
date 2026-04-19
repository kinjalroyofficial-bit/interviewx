import { useEffect, useRef, useState } from 'react'

export default function RightPlaceholderPanel() {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraOn, setCameraOn] = useState(false)
  const [cameraError, setCameraError] = useState('')

  useEffect(() => () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }, [])

  async function toggleCamera() {
    if (cameraOn) {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null
      }
      setCameraOn(false)
      setCameraError('')
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
      }
      setCameraOn(true)
      setCameraError('')
    } catch (error) {
      setCameraOn(false)
      setCameraError('Camera permission denied or unavailable.')
    }
  }

  return (
    <aside className="ic3-panel ic3-placeholder-panel" aria-label="Future features">
      <header className="ic3-panel-header">
        <h2>Future Features</h2>
        <p>Reserved for upcoming capabilities</p>
      </header>
      <div className="ic3-placeholder-body">
        <section className="ic3-video-section">
          <div className="ic3-video-header">
            <h3>Video Feed</h3>
            <button type="button" className="ic3-camera-button" onClick={toggleCamera}>{cameraOn ? 'Stop Camera' : 'Start Camera'}</button>
          </div>
          <div className="ic3-video-shell">
            {cameraOn ? (
              <video ref={videoRef} className="ic3-video" autoPlay playsInline muted />
            ) : (
              <p>{cameraError || 'Camera feed is off.'}</p>
            )}
          </div>
        </section>

        <section className="ic3-future-content">
          <p>This area will host insights, analytics, and coaching recommendations.</p>
        </section>
      </div>
    </aside>
  )
}
