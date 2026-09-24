import { clamp, lerp, wrapAngle } from './physics'
import type { Cam, CamMode, Heli } from './types'

export function createCam(): Cam {
  return { x: 0, y: 8, z: -22, yaw: 0, pitch: -0.28, dist: 28 }
}

type CamX = Cam & { orbitAng?: number }

/**
 * Helios lag lessons adapted for heli:
 * - speed-scaled velocity lead so chase frames the path ahead
 * - exponential follow with rate boost on large frame error (snap)
 * - Chase → Pad → Orbit cycle
 *
 * Pitch sign matches render.ts: positive pitch looks up; subject below → negative.
 */
export function updateCamera(cam: Cam, heli: Heli, mode: CamMode, dt: number): void {
  const speed = Math.hypot(heli.vx, heli.vz)
  let tx = heli.x
  let ty = heli.y + 2.2
  let tz = heli.z
  let wantYaw = cam.yaw
  let wantPitch = cam.pitch
  let wantDist = cam.dist
  const c = cam as CamX

  if (mode === 'chase') {
    const lead = clamp(speed * 0.35, 0, 12)
    const back = 16 + clamp(speed * 0.35, 0, 12)
    const height = 5.5 + clamp(speed * 0.08, 0, 4)
    const lookX = heli.x + Math.sin(heli.yaw) * lead
    const lookY = heli.y + 1.4
    const lookZ = heli.z + Math.cos(heli.yaw) * lead
    tx = heli.x - Math.sin(heli.yaw) * back
    tz = heli.z - Math.cos(heli.yaw) * back
    ty = heli.y + height
    const dx = lookX - tx
    const dy = lookY - ty
    const dz = lookZ - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
    wantDist = back
  } else if (mode === 'pad') {
    tx = -32
    ty = 18
    tz = -32
    const dx = heli.x - tx
    const dy = heli.y + 1.5 - ty
    const dz = heli.z - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
    wantDist = 45
  } else {
    const orbitSpeed = 0.28
    const orbitAng = wrapAngle((c.orbitAng ?? heli.yaw + 0.9) + orbitSpeed * dt)
    c.orbitAng = orbitAng
    wantDist = 24 + clamp(speed * 0.25, 0, 10)
    tx = heli.x - Math.sin(orbitAng) * wantDist
    tz = heli.z - Math.cos(orbitAng) * wantDist
    ty = heli.y + 9
    const dx = heli.x - tx
    const dy = heli.y + 1.2 - ty
    const dz = heli.z - tz
    const horiz = Math.hypot(dx, dz) || 1
    wantYaw = Math.atan2(dx, dz)
    wantPitch = Math.atan2(dy, horiz)
  }

  // Speed-scaled lead on chase/orbit target position
  if (mode === 'chase' || mode === 'orbit') {
    const leadT = clamp(speed * 0.08, 0.04, 0.45)
    tx += heli.vx * leadT
    tz += heli.vz * leadT
    ty += heli.vy * leadT * 0.35
  }

  // Error-aware follow rate + snap (Helios: errFrames > thresholds → bump k)
  const err = Math.hypot(tx - cam.x, ty - cam.y, tz - cam.z)
  const frameW = Math.max(wantDist, 12)
  const errFrames = err / frameW
  let k = mode === 'pad' ? 6 : mode === 'chase' ? 10 : 7
  k *= 1 + clamp(errFrames * 0.9, 0, 4)
  if (errFrames > 2.4) k = Math.max(k, 48)
  else if (errFrames > 1.35) k = Math.max(k, 24)

  const a = 1 - Math.exp(-k * dt)
  cam.x = lerp(cam.x, tx, a)
  cam.y = lerp(cam.y, ty, a)
  cam.z = lerp(cam.z, tz, a)

  const ka = 1 - Math.exp(-(mode === 'orbit' ? 5 : 9) * dt)
  cam.yaw += wrapAngle(wantYaw - cam.yaw) * ka
  cam.pitch = lerp(cam.pitch, wantPitch, ka)
  cam.dist = lerp(cam.dist, wantDist, ka)
}

export const CAM_ORDER: CamMode[] = ['chase', 'pad', 'orbit']

export function nextCam(mode: CamMode): CamMode {
  const i = CAM_ORDER.indexOf(mode)
  return CAM_ORDER[(i + 1) % CAM_ORDER.length]!
}
