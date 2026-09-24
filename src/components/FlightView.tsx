import { useCallback, useEffect, useRef, useState } from 'react'
import type { QualityKey } from '../game/config'
import { createRotorAudio } from '../game/audio'
import {
  bindGyro,
  bindKeyboard,
  createInput,
  gyroIsLive,
  gyroIsSustained,
  markGyroCalibrated,
  requestGyroPermission,
  resetGyroTracking,
  resetSpringSticks,
  sampleControls,
  type GyroBind,
} from '../game/input'
import {
  defaultPrefs,
  GYRO_LIVE_MS,
  TILT_NO_SIGNAL_HINT,
  type FlightPrefs,
  type PitchMode,
  type SensKey,
} from '../game/prefs'
import { Renderer } from '../game/render'
import {
  createSim,
  cycleCamera,
  hudFrom,
  resetToHangar,
  setQuality,
  startFlight,
  stepSim,
} from '../game/sim'
import type { Hud, Sim } from '../game/types'
import { HUD, type TiltHeartbeat } from './HUD'
import { VirtualControls } from './VirtualControls'

type Props = {
  quality: QualityKey
  onHangar: () => void
}

export function FlightView({ quality, onHangar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const simRef = useRef<Sim | null>(null)
  const inputRef = useRef(createInput())
  const prefsRef = useRef<FlightPrefs>(defaultPrefs())
  const audioRef = useRef(createRotorAudio())
  const gyroRef = useRef<GyroBind | null>(null)
  const pendingCalRef = useRef(false)
  const fallbackTriedRef = useRef(false)
  const tiltOnAtRef = useRef(0)
  /** Once no-signal latches, chip + sticky hint stay until sustained live or Tilt OFF. */
  const noSignalStickyRef = useRef(false)
  const pausedRef = useRef(false)

  const [hud, setHud] = useState<Hud | null>(null)
  const [message, setMessage] = useState('')
  const [crashed, setCrashed] = useState(false)
  const [prefs, setPrefs] = useState<FlightPrefs>(defaultPrefs())
  const [calStatus, setCalStatus] = useState<string | null>(null)
  const [tip, setTip] = useState(true)
  const [tiltHb, setTiltHb] = useState<TiltHeartbeat>('off')
  const [showSettings, setShowSettings] = useState(false)
  /** Sticky no-signal line (does not toast-and-fade). */
  const [tiltSticky, setTiltSticky] = useState<string | null>(null)
  const [paused, setPaused] = useState(false)
  const [pauseReason, setPauseReason] = useState('')

  const patchPrefs = useCallback((partial: Partial<FlightPrefs>) => {
    setPrefs((p) => {
      const next = { ...p, ...partial }
      prefsRef.current = next
      return next
    })
  }, [])

  useEffect(() => {
    prefsRef.current = prefs
  }, [prefs])

  const pauseFlight = useCallback((reason = 'Paused') => {
    pausedRef.current = true
    resetSpringSticks(inputRef.current)
    audioRef.current.stop()
    setPauseReason(reason)
    setPaused(true)
  }, [])

  const resumeFlight = useCallback(() => {
    pausedRef.current = false
    setPauseReason('')
    setPaused(false)
    audioRef.current.start()
  }, [])

  const invalidateTiltForInterruption = useCallback(() => {
    if (!prefsRef.current.tiltCyclic) return
    resetGyroTracking(inputRef.current)
    pendingCalRef.current = true
    fallbackTriedRef.current = false
    noSignalStickyRef.current = false
    tiltOnAtRef.current = performance.now()
    patchPrefs({ gyroReady: false })
    setTiltHb('pending')
    setTiltSticky(null)
    setCalStatus('Hold still…')
  }, [patchPrefs])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      pauseFlight('Paused while the app was in the background')
      invalidateTiltForInterruption()
    }
    const onRotate = () => {
      pauseFlight('Screen rotated — controls paused for safety')
      invalidateTiltForInterruption()
    }

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('orientationchange', onRotate)
    window.screen?.orientation?.addEventListener?.('change', onRotate)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('orientationchange', onRotate)
      window.screen?.orientation?.removeEventListener?.('change', onRotate)
    }
  }, [invalidateTiltForInterruption, pauseFlight])

  useEffect(() => {
    const sim = createSim(quality)
    startFlight(sim)
    simRef.current = sim
    const input = inputRef.current
    const unbind = bindKeyboard(input)
    const gyro = bindGyro(input)
    gyroRef.current = gyro
    const renderer = new Renderer()
    const audio = audioRef.current
    audio.start()
    let raf = 0
    let last = performance.now()
    let hudTick = 0

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const s = simRef.current!
      if (input.keys.has('Escape')) {
        input.keys.delete('Escape')
        if (!pausedRef.current) pauseFlight('Paused')
      }

      if (!pausedRef.current) {
        const controls = sampleControls(input, s.controls, dt, prefsRef.current)
        if (input.keys.has('KeyC')) {
          input.keys.delete('KeyC')
          cycleCamera(s)
        }
        if (input.keys.has('KeyH')) {
          input.keys.delete('KeyH')
          const cur = prefsRef.current
          const next = { ...cur, showHelp: !cur.showHelp }
          prefsRef.current = next
          setPrefs(next)
        }
        stepSim(s, controls, dt)
        audio.update(s.heli.rotorRpm, controls.collective, Math.hypot(s.heli.vx, s.heli.vz))
      }

      const canvas = canvasRef.current
      if (canvas) {
        const dpr = Math.min(window.devicePixelRatio || 1, s.quality === 'low' ? 1 : 2)
        const w = canvas.clientWidth
        const h = canvas.clientHeight
        if (canvas.width !== Math.floor(w * dpr) || canvas.height !== Math.floor(h * dpr)) {
          canvas.width = Math.floor(w * dpr)
          canvas.height = Math.floor(h * dpr)
        }
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
          renderer.draw(ctx, s, w, h, dt)
        }
      }

      hudTick += dt
      if (hudTick > 0.1) {
        hudTick = 0
        setHud(hudFrom(s))
        setMessage(s.message)
        setCrashed(s.crashed)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      unbind()
      gyro.stop()
      gyroRef.current = null
      audio.stop()
    }
  }, [quality])

  // Tilt heartbeat: sustained live (≥3 events / 500ms); sticky no-signal until live or OFF
  useEffect(() => {
    if (!prefs.tiltCyclic) {
      setTiltHb('off')
      pendingCalRef.current = false
      fallbackTriedRef.current = false
      noSignalStickyRef.current = false
      setTiltSticky(null)
      return
    }

    const tick = () => {
      const input = inputRef.current
      const now = performance.now()
      const sustained = gyroIsSustained(input, now)

      if (sustained) {
        if (
          prefsRef.current.gyroReady &&
          input.gyroCalibrationGeneration !== input.gyroGeneration
        ) {
          pendingCalRef.current = true
          patchPrefs({ gyroReady: false })
          setTiltHb('pending')
          setCalStatus('Sensor changed — hold still…')
          return
        }
        noSignalStickyRef.current = false
        setTiltSticky(null)
        setTiltHb('live')
        if (pendingCalRef.current) {
          pendingCalRef.current = false
          markGyroCalibrated(input)
          patchPrefs({
            gyroReady: true,
            gyroZeroBeta: input.gyroBeta,
            gyroZeroGamma: input.gyroGamma,
          })
          setCalStatus('Calibrated')
          window.setTimeout(() => setCalStatus(null), 1400)
        }
        return
      }

      // Drop ready as soon as sustain is lost (single blips never keep ready)
      if (prefsRef.current.gyroReady) {
        patchPrefs({ gyroReady: false })
      }

      const waited = now - tiltOnAtRef.current
      const anyRecent = gyroIsLive(input, now, GYRO_LIVE_MS)
      // Sparse blips → pending (not live). No events past live window → sticky no-signal.
      if (noSignalStickyRef.current || (waited >= GYRO_LIVE_MS && !anyRecent)) {
        noSignalStickyRef.current = true
        setTiltHb('no-signal')
        setTiltSticky(TILT_NO_SIGNAL_HINT)
        setCalStatus(null) // drop Hold still… so sticky hint stays visible
        if (!fallbackTriedRef.current) {
          fallbackTriedRef.current = true
          gyroRef.current?.tryAbsoluteFallback()
        }
      } else {
        setTiltHb('pending')
        if (!fallbackTriedRef.current && waited >= GYRO_LIVE_MS) {
          fallbackTriedRef.current = true
          gyroRef.current?.tryAbsoluteFallback()
        }
      }
    }

    tick()
    const id = window.setInterval(tick, 200)
    return () => window.clearInterval(id)
  }, [prefs.tiltCyclic, patchPrefs])

  const sim = () => simRef.current

  const cycleSens = () => {
    const order: SensKey[] = ['low', 'med', 'high']
    const i = order.indexOf(prefs.sens)
    patchPrefs({ sens: order[(i + 1) % order.length]! })
  }

  const togglePitchMode = () => {
    const next: PitchMode = prefs.pitchMode === 'realistic' ? 'casual' : 'realistic'
    patchPrefs({ pitchMode: next })
  }

  const toggleTilt = async () => {
    if (prefs.tiltCyclic) {
      pendingCalRef.current = false
      fallbackTriedRef.current = false
      noSignalStickyRef.current = false
      patchPrefs({ tiltCyclic: false, gyroReady: false })
      setTiltHb('off')
      setCalStatus(null)
      setTiltSticky(null)
      return
    }
    const perm = await requestGyroPermission()
    if (perm === 'denied') {
      setCalStatus('Tilt permission denied')
      setTiltHb('off')
      return
    }
    if (perm === 'unsupported') {
      setCalStatus('Tilt unsupported')
      setTiltHb('off')
      return
    }
    // Reset signal tracking; gyroReady only after sustained live
    resetGyroTracking(inputRef.current)
    fallbackTriedRef.current = false
    pendingCalRef.current = true
    noSignalStickyRef.current = false
    tiltOnAtRef.current = performance.now()
    patchPrefs({ tiltCyclic: true, gyroReady: false })
    setTiltHb('pending')
    setTiltSticky(null)
    setCalStatus('Hold still…')
  }

  const recalibrate = () => {
    if (!prefs.tiltCyclic) return
    const input = inputRef.current
    if (!gyroIsSustained(input)) {
      noSignalStickyRef.current = true
      setTiltHb('no-signal')
      setTiltSticky(TILT_NO_SIGNAL_HINT)
      return
    }
    pendingCalRef.current = true
    setCalStatus('Hold still…')
    window.setTimeout(() => {
      if (!pendingCalRef.current) return
      if (!gyroIsSustained(inputRef.current)) {
        pendingCalRef.current = false
        noSignalStickyRef.current = true
        setTiltHb('no-signal')
        setTiltSticky(TILT_NO_SIGNAL_HINT)
        return
      }
      const inp = inputRef.current
      pendingCalRef.current = false
      markGyroCalibrated(inp)
      patchPrefs({
        gyroReady: true,
        gyroZeroBeta: inp.gyroBeta,
        gyroZeroGamma: inp.gyroGamma,
      })
      setCalStatus('Calibrated')
      window.setTimeout(() => setCalStatus(null), 1400)
    }, 400)
  }

  return (
    <div className="flight">
      <canvas ref={canvasRef} />
      {hud && (
        <HUD
          hud={hud}
          message={message}
          crashed={crashed}
          prefs={prefs}
          calStatus={calStatus}
          tiltSticky={tiltSticky}
          tiltHb={tiltHb}
          showSettings={showSettings}
          onToggleSettings={() => setShowSettings((v) => !v)}
          onCam={() => {
            const s = sim()
            if (s) cycleCamera(s)
          }}
          onReset={() => {
            const s = sim()
            if (s) startFlight(s)
          }}
          onHangar={() => {
            const s = sim()
            if (s) resetToHangar(s)
            onHangar()
          }}
          onQuality={(q) => {
            const s = sim()
            if (s) setQuality(s, q)
          }}
          onHelp={() => {
            setShowSettings(false)
            patchPrefs({ showHelp: !prefs.showHelp })
          }}
          onSens={cycleSens}
          onPitchMode={togglePitchMode}
          onTilt={toggleTilt}
          onRecalibrate={recalibrate}
          onPause={() => pauseFlight('Paused')}
        />
      )}
      {tip && !prefs.showHelp && (
        <div className="flight-tip" onClick={() => setTip(false)}>
          First flight: raise <strong>Coll</strong> (right) to lift · left stick = cyclic (spring) ·
          W / stick-up = nose UP (Casual) · stick-left = bank LEFT · yaw springs · coll holds. Tap to
          dismiss.
        </div>
      )}
      {paused && (
        <div className="pause-overlay" role="dialog" aria-modal="true" aria-label="Flight paused">
          <div className="pause-card">
            <strong>Flight paused</strong>
            <p>{pauseReason || 'Paused'}</p>
            <button type="button" onClick={resumeFlight}>Resume</button>
          </div>
        </div>
      )}
      <VirtualControls input={inputRef.current} initialCollective={0.42} />
    </div>
  )
}
