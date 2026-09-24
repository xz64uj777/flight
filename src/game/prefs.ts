export type SensKey = 'low' | 'med' | 'high'
export type PitchMode = 'realistic' | 'casual'

export const SENS_SCALE: Record<SensKey, number> = {
  low: 0.55,
  med: 1,
  high: 1.45,
}

export const STICK_DEADZONE = 0.08

/** Max age (ms) for a deviceorientation event to count as live. */
export const GYRO_LIVE_MS = 1000

/** Sticky copy when Tilt is on but motion never sustains. */
export const TILT_NO_SIGNAL_HINT =
  "Phone isn't sending motion — Chrome + HTTPS + screen unlocked."

export type FlightPrefs = {
  sens: SensKey
  /** Default Casual = game-feel (screen-up / W → nose UP; stick-left → bank LEFT). Realistic is opt-in heli. */
  pitchMode: PitchMode
  tiltCyclic: boolean
  /** Gyro zero (beta, gamma) after calibrate. */
  gyroZeroBeta: number
  gyroZeroGamma: number
  /** True only after sustained live (≥3 orientation events / 500ms) + calibrate. */
  gyroReady: boolean
  showHelp: boolean
  tipSeen: boolean
}

export function defaultPrefs(): FlightPrefs {
  return {
    sens: 'med',
    pitchMode: 'casual',
    tiltCyclic: false,
    gyroZeroBeta: 0,
    gyroZeroGamma: 0,
    gyroReady: false,
    showHelp: false,
    tipSeen: false,
  }
}

export function applyDeadzone(v: number, dz = STICK_DEADZONE): number {
  const a = Math.abs(v)
  if (a < dz) return 0
  const sign = v < 0 ? -1 : 1
  return sign * Math.min(1, (a - dz) / (1 - dz))
}
