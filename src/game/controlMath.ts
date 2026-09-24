export type PitchMode = 'realistic' | 'casual'

export function clampUnit(v: number): number {
  return Math.max(-1, Math.min(1, v))
}

export function remapDeadzone(v: number, dz = 0.08): number {
  const a = Math.abs(v)
  if (a < dz) return 0
  return Math.sign(v || 1) * Math.min(1, (a - dz) / (1 - dz))
}

export function shortAngleDelta(current: number, zero: number): number {
  let d = (current - zero) % 360
  if (d > 180) d -= 360
  if (d < -180) d += 360
  return d
}

export function normalizeScreenAngle(angle: number): 0 | 90 | 180 | 270 {
  const n = ((angle % 360) + 360) % 360
  if (n >= 315 || n < 45) return 0
  if (n < 135) return 90
  if (n < 225) return 180
  return 270
}

/** Rotate portrait-relative pitch/roll into the current screen coordinates. */
export function rotateTiltToScreen(
  pitch: number,
  roll: number,
  angle: number,
): { pitch: number; roll: number } {
  let p = pitch
  let r = roll
  switch (normalizeScreenAngle(angle)) {
    case 90:
      p = -roll
      r = pitch
      break
    case 180:
      p = -pitch
      r = -roll
      break
    case 270:
      p = roll
      r = -pitch
      break
  }
  return { pitch: Object.is(p, -0) ? 0 : p, roll: Object.is(r, -0) ? 0 : r }
}

export function normalizedTilt(
  beta: number,
  gamma: number,
  zeroBeta: number,
  zeroGamma: number,
  screenAngle: number,
  fullScaleDeg = 18,
): { pitch: number; roll: number } {
  const portraitPitch = shortAngleDelta(beta, zeroBeta) / fullScaleDeg
  const portraitRoll = shortAngleDelta(gamma, zeroGamma) / fullScaleDeg
  const rotated = rotateTiltToScreen(portraitPitch, portraitRoll, screenAngle)
  return { pitch: clampUnit(rotated.pitch), roll: clampUnit(rotated.roll) }
}

/** Controls use +pitch = nose down. Casual reverses pitch only; roll never changes with pitch mode. */
export function applyPitchMode(pitch: number, mode: PitchMode): number {
  return mode === 'casual' ? -pitch : pitch
}
