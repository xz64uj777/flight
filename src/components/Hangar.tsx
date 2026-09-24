import { useEffect, useRef } from 'react'
import type { QualityKey } from '../game/config'

type Props = {
  quality: QualityKey
  onQuality: (q: QualityKey) => void
  onFly: () => void
}

/** Simple pad + bird silhouette behind the Fly CTA (not title-card only). */
function HangarPadCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let raf = 0
    let t0 = performance.now()
    let phase = 0

    const draw = (now: number) => {
      const dt = (now - t0) / 1000
      t0 = now
      phase += dt * 14
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
        canvas.width = Math.floor(w * dpr)
        canvas.height = Math.floor(h * dpr)
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, w, h)

      const g = ctx.createLinearGradient(0, h * 0.35, 0, h)
      g.addColorStop(0, 'rgba(90,122,72,0)')
      g.addColorStop(0.35, 'rgba(70,100,55,0.55)')
      g.addColorStop(1, 'rgba(40,55,35,0.85)')
      ctx.fillStyle = g
      ctx.fillRect(0, h * 0.35, w, h * 0.65)

      const cx = w * 0.5
      const cy = h * 0.78
      const padR = Math.min(w, h) * 0.22

      ctx.beginPath()
      ctx.ellipse(cx, cy, padR, padR * 0.38, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(50,55,60,0.9)'
      ctx.fill()
      ctx.strokeStyle = '#e8c84a'
      ctx.lineWidth = 2.5
      ctx.stroke()

      ctx.strokeStyle = '#e8c84a'
      ctx.lineWidth = 3
      const hs = padR * 0.28
      ctx.strokeRect(cx - hs, cy - hs * 0.55, hs * 2, hs * 1.1)
      ctx.beginPath()
      ctx.moveTo(cx - hs * 0.55, cy - hs * 0.4)
      ctx.lineTo(cx - hs * 0.55, cy + hs * 0.4)
      ctx.moveTo(cx + hs * 0.55, cy - hs * 0.4)
      ctx.lineTo(cx + hs * 0.55, cy + hs * 0.4)
      ctx.moveTo(cx - hs * 0.55, cy)
      ctx.lineTo(cx + hs * 0.55, cy)
      ctx.stroke()

      const hx = cx
      const hy = cy - padR * 0.22
      const s = padR * 0.045

      ctx.lineCap = 'round'
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2.2
      ctx.beginPath()
      ctx.moveTo(hx - 16 * s, hy + 12 * s)
      ctx.lineTo(hx + 8 * s, hy + 12 * s)
      ctx.moveTo(hx - 16 * s, hy + 12 * s + 6)
      ctx.lineTo(hx + 8 * s, hy + 12 * s + 6)
      ctx.stroke()

      ctx.strokeStyle = '#c0c8d0'
      ctx.lineWidth = 5
      ctx.beginPath()
      ctx.moveTo(hx + 18 * s, hy + 2 * s)
      ctx.lineTo(hx - 22 * s, hy)
      ctx.stroke()

      ctx.fillStyle = 'rgba(42,106,170,0.85)'
      ctx.fillRect(hx + 2 * s, hy - 4 * s, 12 * s, 8 * s)

      ctx.strokeStyle = '#b0b8c0'
      ctx.lineWidth = 2.5
      ctx.beginPath()
      ctx.moveTo(hx - 8 * s, hy)
      ctx.lineTo(hx - 38 * s, hy - 6 * s)
      ctx.stroke()

      const a = phase
      ctx.strokeStyle = 'rgba(30,30,35,0.55)'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(hx + Math.cos(a) * 36 * s, hy - 14 * s + Math.sin(a) * 8 * s)
      ctx.lineTo(hx - Math.cos(a) * 36 * s, hy - 14 * s - Math.sin(a) * 8 * s)
      ctx.stroke()
      ctx.beginPath()
      ctx.ellipse(hx, hy - 14 * s, 34 * s, 8 * s, 0, 0, Math.PI * 2)
      ctx.fillStyle = 'rgba(200,210,220,0.12)'
      ctx.fill()

      ctx.strokeStyle = '#888'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(hx, hy)
      ctx.lineTo(hx, hy - 14 * s)
      ctx.stroke()

      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)
    return () => cancelAnimationFrame(raf)
  }, [])

  return <canvas className="hangar-pad" ref={ref} aria-hidden />
}

export function Hangar({ quality, onQuality, onFly }: Props) {
  return (
    <div className="hangar">
      <HangarPadCanvas />
      <div className="hangar-ui">
        <h1>COPTER FLIGHT</h1>
        <p>
          Phone-friendly helicopter feel — collective lift, cyclic tilt, yaw pedals,
          hover band &amp; ground effect. Rescue jobs later; this drop is flight feel only.
        </p>
        <button type="button" className="fly-btn" onClick={onFly}>
          Fly
        </button>
        <div className="quality-row">
          {(['low', 'med', 'high'] as QualityKey[]).map((q) => (
            <button
              key={q}
              type="button"
              className={q === quality ? 'active' : ''}
              onClick={() => onQuality(q)}
            >
              {q}
            </button>
          ))}
        </div>
        <p className="hangar-hint">
          Casual pitch default · cyclic springs · coll holds · tilt heartbeat · Settings
        </p>
      </div>
    </div>
  )
}
