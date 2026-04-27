import { useEffect, useMemo, useRef } from 'react'

function createBalls(width, height, count) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 2,
    vy: (Math.random() - 0.5) * 2,
    r: 80 + Math.random() * 120
  }))
}

export default function PageBackgroundCanvas({ theme = 'dark' }) {
  const canvasRef = useRef(null)
  const frameRef = useRef(0)
  const ballsRef = useRef([])
  const mouseRef = useRef({ x: 0, y: 0 })

  const palette = useMemo(() => (
    theme === 'light'
      ? { red: 72, green: 104, blue: 228, maxAlpha: 0.62, minAlpha: 0.06, falloff: 520 }
      : { red: 0, green: 200, blue: 255, maxAlpha: 1, minAlpha: 0.05, falloff: 400 }
  ), [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    function getCanvasSize() {
      const bounds = canvas.parentElement?.getBoundingClientRect()
      const width = Math.max(320, Math.floor(bounds?.width || window.innerWidth))
      const height = Math.max(320, Math.floor(bounds?.height || window.innerHeight))
      return { width, height, left: bounds?.left || 0, top: bounds?.top || 0 }
    }

    function resizeCanvas() {
      const { width, height } = getCanvasSize()
      canvas.width = width
      canvas.height = height
      if (!ballsRef.current.length) {
        ballsRef.current = createBalls(width, height, 40)
      }
      if (!mouseRef.current.x && !mouseRef.current.y) {
        mouseRef.current = { x: width / 2, y: height / 2 }
      }
    }

    function handleMouseMove(event) {
      const { left, top } = getCanvasSize()
      mouseRef.current = {
        x: event.clientX - left,
        y: event.clientY - top
      }
    }

    function animate() {
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      ballsRef.current.forEach((ball) => {
        ball.x += ball.vx
        ball.y += ball.vy

        if (ball.x < 0 || ball.x > width) ball.vx *= -1
        if (ball.y < 0 || ball.y > height) ball.vy *= -1

        const dx = ball.x - mouseRef.current.x
        const dy = ball.y - mouseRef.current.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        const alpha = Math.max(palette.minAlpha, palette.maxAlpha - dist / palette.falloff)

        const gradient = ctx.createRadialGradient(ball.x, ball.y, 0, ball.x, ball.y, ball.r)
        gradient.addColorStop(0, `rgba(${palette.red},${palette.green},${palette.blue},${alpha})`)
        gradient.addColorStop(1, 'transparent')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
        ctx.fill()
      })

      frameRef.current = window.requestAnimationFrame(animate)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    window.addEventListener('mousemove', handleMouseMove)
    frameRef.current = window.requestAnimationFrame(animate)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      window.removeEventListener('mousemove', handleMouseMove)
      window.cancelAnimationFrame(frameRef.current)
    }
  }, [palette])

  return <canvas ref={canvasRef} className="dashboard-page-background-canvas" aria-hidden="true" />
}
