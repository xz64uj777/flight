import { useCallback, useEffect, useRef } from 'react'
import type { InputState } from '../game/input'
import { resetSpringSticks } from '../game/input'
import { STICK_DEADZONE } from '../game/prefs'

type Props = {
  input: InputState
  /** Initial collective knob 0..1 (matches sim start). */
  initialCollective?: number
}

type StickKind = 'cyclic' | 'yaw'

export function VirtualControls({ input, initialCollective = 0.42 }: Props) {
  const cyclicRef = useRef<HTMLDivElement>(null)
  const yawRef = useRef<HTMLDivElement>(null)
  const collRef = useRef<HTMLDivElement>(null)
  const cyclicId = useRef<number | null>(null)
  const yawId = useRef<number | null>(null)
  const collId = useRef<number | null>(null)

  const resetKnob = (el: HTMLDivElement | null) => {
    const knob = el?.querySelector('.stick-knob') as HTMLDivElement | null
    if (knob) knob.style.transform = 'translate(-50%, -50%)'
  }

  const endCyclic = useCallback(() => {
    cyclicId.current = null
    input.stickX = 0
    input.stickY = 0
    resetKnob(cyclicRef.current)
  }, [input])

  const endYaw = useCallback(() => {
    yawId.current = null
    input.yawStick = 0
    resetKnob(yawRef.current)
  }, [input])

  // Force spring-center on blur / visibility / lost capture — never zero collective
  useEffect(() => {
    const forceSpringEnd = () => {
      endCyclic()
      endYaw()
      collId.current = null
      resetSpringSticks(input)
    }
    const onVis = () => {
      if (document.visibilityState === 'hidden') forceSpringEnd()
    }
    window.addEventListener('blur', forceSpringEnd)
    document.addEventListener('visibilitychange', onVis)
    return () => {
      window.removeEventListener('blur', forceSpringEnd)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [endCyclic, endYaw, input])

  useEffect(() => {
    // Sync collective knob to flight start value (absolute hold baseline)
    const el = collRef.current
    if (!el) return
    const knob = el.querySelector('.collective-knob') as HTMLDivElement | null
    if (knob) knob.style.top = `${(1 - initialCollective) * 100}%`
  }, [initialCollective, input])

  const setStick = useCallback(
    (kind: StickKind, nx: number, ny: number) => {
      // Deadzone applied in sampleControls; raw stick here for knob feel
      if (kind === 'cyclic') {
        // Screen up (ny negative in CSS coords after normalize) → stickY +
        // Realistic: +stickY → nose down (applied in sampleControls)
        input.stickX = nx
        input.stickY = -ny
      } else {
        input.yawStick = nx
      }
    },
    [input],
  )

  const moveStick = (kind: StickKind, el: HTMLDivElement, cx: number, cy: number) => {
    const r = el.getBoundingClientRect()
    const ox = r.left + r.width / 2
    const oy = r.top + r.height / 2
    const max = r.width * 0.42
    let dx = cx - ox
    let dy = cy - oy
    if (kind === 'yaw') {
      // Yaw is horizontal-only. Vertical thumb drift must not weaken pedal authority.
      dx = Math.max(-max, Math.min(max, dx))
      dy = 0
    } else {
      const mag = Math.hypot(dx, dy) || 1
      if (mag > max) {
        dx = (dx / mag) * max
        dy = (dy / mag) * max
      }
    }
    const nx = dx / max
    const ny = dy / max
    // Visual deadzone ring: snap knob slightly toward center when tiny
    const rawMag = Math.hypot(nx, ny)
    if (rawMag < STICK_DEADZONE) {
      setStick(kind, 0, 0)
      const knob = el.querySelector('.stick-knob') as HTMLDivElement | null
      if (knob) knob.style.transform = 'translate(-50%, -50%)'
      return
    }
    setStick(kind, nx, ny)
    const knob = el.querySelector('.stick-knob') as HTMLDivElement | null
    if (knob) {
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`
    }
  }

  const onStickStart = (kind: StickKind) => (e: React.PointerEvent) => {
    e.preventDefault()
    const el = kind === 'cyclic' ? cyclicRef.current : yawRef.current
    if (!el) return
    const owner = kind === 'cyclic' ? cyclicId : yawId
    // Do not let a second finger steal an active control.
    if (owner.current !== null && owner.current !== e.pointerId) return
    owner.current = e.pointerId
    try {
      el.setPointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    moveStick(kind, el, e.clientX, e.clientY)
  }

  const onStickMove = (kind: StickKind) => (e: React.PointerEvent) => {
    const id = kind === 'cyclic' ? cyclicId.current : yawId.current
    if (id !== e.pointerId) return
    const el = kind === 'cyclic' ? cyclicRef.current : yawRef.current
    if (!el) return
    moveStick(kind, el, e.clientX, e.clientY)
  }

  const onStickEnd = (kind: StickKind) => (e: React.PointerEvent) => {
    const id = kind === 'cyclic' ? cyclicId.current : yawId.current
    if (id !== null && id !== e.pointerId) return
    if (kind === 'cyclic') endCyclic()
    else endYaw()
  }

  const onStickLost = (kind: StickKind) => () => {
    if (kind === 'cyclic') endCyclic()
    else endYaw()
  }

  const collMove = (clientY: number) => {
    const el = collRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const t = 1 - (clientY - r.top) / r.height
    const v = Math.max(0, Math.min(1, t))
    input.touchCollective = v
    const knob = el.querySelector('.collective-knob') as HTMLDivElement | null
    if (knob) knob.style.top = `${(1 - v) * 100}%`
  }

  const endColl = () => {
    collId.current = null
    // absolute hold — keep touchCollective + knob where they are
  }

  return (
    <div className="controls">
      <div
        className="stick"
        ref={cyclicRef}
        aria-label="Cyclic"
        onPointerDown={onStickStart('cyclic')}
        onPointerMove={onStickMove('cyclic')}
        onPointerUp={onStickEnd('cyclic')}
        onPointerCancel={onStickEnd('cyclic')}
        onLostPointerCapture={onStickLost('cyclic')}
      >
        <div className="stick-knob" />
        <span className="stick-label">Cyclic</span>
      </div>
      <div className="right-pad">
        <div
          className="stick yaw-stick"
          ref={yawRef}
          aria-label="Yaw"
          onPointerDown={onStickStart('yaw')}
          onPointerMove={onStickMove('yaw')}
          onPointerUp={onStickEnd('yaw')}
          onPointerCancel={onStickEnd('yaw')}
          onLostPointerCapture={onStickLost('yaw')}
        >
          <div className="stick-knob" />
          <span className="stick-label">Yaw</span>
        </div>
        <div
          className="collective"
          ref={collRef}
          aria-label="Collective"
          onPointerDown={(e) => {
            e.preventDefault()
            // Keep the first finger as owner until release/cancel/lost capture.
            if (collId.current !== null && collId.current !== e.pointerId) return
            collId.current = e.pointerId
            try {
              collRef.current?.setPointerCapture(e.pointerId)
            } catch {
              /* ignore */
            }
            collMove(e.clientY)
          }}
          onPointerMove={(e) => {
            if (collId.current !== e.pointerId) return
            collMove(e.clientY)
          }}
          onPointerUp={(e) => {
            if (collId.current !== null && collId.current !== e.pointerId) return
            endColl()
          }}
          onPointerCancel={endColl}
          onLostPointerCapture={endColl}
        >
          <div className="collective-knob" style={{ top: `${(1 - initialCollective) * 100}%` }} />
          <span className="stick-label coll-label">Coll</span>
        </div>
      </div>
    </div>
  )
}
