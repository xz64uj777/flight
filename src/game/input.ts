import type { Controls } from './types'
import { GYRO_LIVE_MS, SENS_SCALE, STICK_DEADZONE, type FlightPrefs } from './prefs'
import { applyPitchMode, clampUnit, normalizedTilt, remapDeadzone } from './controlMath'

type GyroSource = 'orientation' | 'absolute' | 'motion' | ''

type PermissionResult = 'granted' | 'denied' | 'unsupported'

type PermissionCapable = {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

export type InputState = {
  keys: Set<string>
  stickX: number
  stickY: number
  yawStick: number
  /** Absolute 0..1 collective controlled by the slider and keyboard. */
  touchCollective: number
  gyroBeta: number
  gyroGamma: number
  gyroLastAt: number
  gyroTimes: number[]
  gyroSource: GyroSource
  /** Increments when a sensor family changes or tracking is invalidated. */
  gyroGeneration: number
  /** Generation that the current zero belongs to. */
  gyroCalibrationGeneration: number
  gyroSmoothPitch: number
  gyroSmoothRoll: number
}

export type GyroBind = {
  stop: () => void
  tryAbsoluteFallback: () => void
}

export function emptyControls(): Controls {
  return { cyclicPitch: 0, cyclicRoll: 0, collective: 0.42, yaw: 0 }
}

export function createInput(): InputState {
  return {
    keys: new Set<string>(),
    stickX: 0,
    stickY: 0,
    yawStick: 0,
    touchCollective: 0.42,
    gyroBeta: 0,
    gyroGamma: 0,
    gyroLastAt: 0,
    gyroTimes: [],
    gyroSource: '',
    gyroGeneration: 0,
    gyroCalibrationGeneration: -1,
    gyroSmoothPitch: 0,
    gyroSmoothRoll: 0,
  }
}

export function resetSpringSticks(input: InputState): void {
  input.stickX = 0
  input.stickY = 0
  input.yawStick = 0
  input.keys.clear()
}

export function resetGyroTracking(input: InputState): void {
  input.gyroLastAt = 0
  input.gyroTimes = []
  input.gyroSource = ''
  input.gyroGeneration += 1
  input.gyroSmoothPitch = 0
  input.gyroSmoothRoll = 0
}

/** Tie the current gyro zero to the currently active sensor family. */
export function markGyroCalibrated(input: InputState): void {
  input.gyroCalibrationGeneration = input.gyroGeneration
  input.gyroSmoothPitch = 0
  input.gyroSmoothRoll = 0
}

export function gyroIsLive(
  input: InputState,
  now = performance.now(),
  maxAgeMs = GYRO_LIVE_MS,
): boolean {
  return input.gyroLastAt > 0 && now - input.gyroLastAt <= maxAgeMs
}

export function gyroIsSustained(input: InputState, now = performance.now()): boolean {
  if (!gyroIsLive(input, now)) return false
  const cutoff = now - 500
  let recent = 0
  for (let i = input.gyroTimes.length - 1; i >= 0; i -= 1) {
    if (input.gyroTimes[i]! < cutoff) break
    recent += 1
  }
  return recent >= 3
}

function sensorFamily(source: GyroSource): 'orientation' | 'motion' | '' {
  if (source === 'orientation' || source === 'absolute') return 'orientation'
  return source
}

function acceptGyro(input: InputState, beta: number, gamma: number, source: GyroSource): void {
  if (!Number.isFinite(beta) || !Number.isFinite(gamma)) return
  const now = performance.now()
  const oldFamily = sensorFamily(input.gyroSource)
  const nextFamily = sensorFamily(source)
  if (oldFamily && nextFamily && oldFamily !== nextFamily) {
    input.gyroGeneration += 1
    input.gyroTimes = []
    input.gyroSmoothPitch = 0
    input.gyroSmoothRoll = 0
  }
  input.gyroBeta = beta
  input.gyroGamma = gamma
  input.gyroSource = source
  input.gyroLastAt = now
  input.gyroTimes.push(now)
  const cutoff = now - 700
  while (input.gyroTimes.length && input.gyroTimes[0]! < cutoff) input.gyroTimes.shift()
}

export function bindGyro(input: InputState): GyroBind {
  let absoluteBound = false

  const onOrientation = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return
    acceptGyro(input, e.beta, e.gamma, 'orientation')
  }

  const onAbsolute = (e: DeviceOrientationEvent) => {
    if (e.beta == null || e.gamma == null) return
    // Relative and absolute orientation share the same beta/gamma screen convention.
    acceptGyro(input, e.beta, e.gamma, 'absolute')
  }

  const onMotion = (e: DeviceMotionEvent) => {
    // Prefer orientation while it is healthy; motion is only a fallback.
    if (input.gyroSource !== 'motion' && gyroIsLive(input, performance.now(), 750)) return
    const g = e.accelerationIncludingGravity
    if (!g || g.x == null || g.y == null || g.z == null) return
    const roll = Math.atan2(g.x, Math.hypot(g.y, g.z)) * 180 / Math.PI
    const pitch = Math.atan2(-g.z, Math.hypot(g.y, g.x)) * 180 / Math.PI
    acceptGyro(input, pitch, roll, 'motion')
  }

  window.addEventListener('deviceorientation', onOrientation, true)
  window.addEventListener('devicemotion', onMotion, true)

  return {
    tryAbsoluteFallback() {
      if (absoluteBound) return
      absoluteBound = true
      window.addEventListener('deviceorientationabsolute', onAbsolute, true)
    },
    stop() {
      window.removeEventListener('deviceorientation', onOrientation, true)
      window.removeEventListener('devicemotion', onMotion, true)
      if (absoluteBound) {
        window.removeEventListener('deviceorientationabsolute', onAbsolute, true)
        absoluteBound = false
      }
    },
  }
}

export async function requestGyroPermission(): Promise<PermissionResult> {
  const orientation = window.DeviceOrientationEvent as typeof DeviceOrientationEvent & PermissionCapable
  const motion = window.DeviceMotionEvent as typeof DeviceMotionEvent & PermissionCapable
  const supported = typeof orientation !== 'undefined' || typeof motion !== 'undefined'
  if (!supported) return 'unsupported'

  const requests: Array<Promise<'granted' | 'denied'>> = []
  for (const api of [orientation, motion]) {
    if (api && typeof api.requestPermission === 'function') {
      try {
        requests.push(api.requestPermission())
      } catch {
        requests.push(Promise.resolve('denied'))
      }
    }
  }
  if (requests.length === 0) return 'granted'

  const results = await Promise.allSettled(requests)
  if (results.some((r) => r.status === 'fulfilled' && r.value === 'granted')) return 'granted'
  return 'denied'
}

export function bindKeyboard(input: InputState): () => void {
  const down = (e: KeyboardEvent) => {
    input.keys.add(e.code)
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) {
      e.preventDefault()
    }
  }
  const up = (e: KeyboardEvent) => input.keys.delete(e.code)
  const blur = () => resetSpringSticks(input)
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
  }
}

function keyAxis(keys: Set<string>, positive: string[], negative: string[]): number {
  let v = 0
  if (positive.some((k) => keys.has(k))) v += 1
  if (negative.some((k) => keys.has(k))) v -= 1
  return clampUnit(v)
}

function screenAngle(): number {
  const modern = window.screen?.orientation?.angle
  if (Number.isFinite(modern)) return modern
  const legacy = (window as Window & { orientation?: number }).orientation
  return Number.isFinite(legacy) ? legacy! : 0
}

export function sampleControls(
  input: InputState,
  previous: Controls,
  dt: number,
  prefs: FlightPrefs,
): Controls {
  const sens = SENS_SCALE[prefs.sens]
  const keyboardPitch = keyAxis(input.keys, ['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown'])
  const keyboardRoll = keyAxis(input.keys, ['ArrowRight', 'KeyL'], ['ArrowLeft', 'KeyJ'])
  const keyboardYaw = keyAxis(input.keys, ['KeyD', 'KeyE'], ['KeyA', 'KeyQ'])

  let rawPitch = clampUnit(input.stickY + keyboardPitch)
  let rawRoll = clampUnit(input.stickX + keyboardRoll)

  const gyroUsable =
    prefs.tiltCyclic &&
    prefs.gyroReady &&
    gyroIsLive(input) &&
    input.gyroCalibrationGeneration === input.gyroGeneration

  if (gyroUsable) {
    const tilt = normalizedTilt(
      input.gyroBeta,
      input.gyroGamma,
      prefs.gyroZeroBeta,
      prefs.gyroZeroGamma,
      screenAngle(),
      18,
    )
    const alpha = 1 - Math.exp(-10 * Math.max(0, Math.min(0.05, dt)))
    input.gyroSmoothPitch += (tilt.pitch - input.gyroSmoothPitch) * alpha
    input.gyroSmoothRoll += (tilt.roll - input.gyroSmoothRoll) * alpha
    // Touch remains available as trim/override while tilt is active.
    rawPitch = clampUnit(rawPitch + input.gyroSmoothPitch)
    rawRoll = clampUnit(rawRoll + input.gyroSmoothRoll)
  } else {
    // Sensor loss immediately hands cyclic authority back to touch/keyboard.
    input.gyroSmoothPitch = 0
    input.gyroSmoothRoll = 0
  }

  const pitchInput = clampUnit(remapDeadzone(rawPitch, STICK_DEADZONE) * sens)
  const rollInput = clampUnit(remapDeadzone(rawRoll, STICK_DEADZONE) * sens)
  const yawInput = clampUnit(
    remapDeadzone(clampUnit(input.yawStick + keyboardYaw), STICK_DEADZONE) * sens,
  )

  const collAxis = keyAxis(input.keys, ['KeyR', 'Space'], ['KeyF', 'ControlLeft', 'ControlRight'])
  if (collAxis !== 0) {
    input.touchCollective = Math.max(
      0,
      Math.min(1, previous.collective + collAxis * 0.45 * Math.max(0, Math.min(0.05, dt))),
    )
  }

  return {
    cyclicPitch: clampUnit(applyPitchMode(pitchInput, prefs.pitchMode)),
    cyclicRoll: rollInput,
    collective: Math.max(0, Math.min(1, input.touchCollective)),
    yaw: yawInput,
  }
}
