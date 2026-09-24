import {
  DRAG_H,
  DRAG_V,
  FRICTION,
  GE_BONUS,
  GE_HEIGHT,
  GRAVITY,
  LAND_DAMP,
  LAND_SPRING,
  MASS,
  MAX_THRUST,
  PITCH_RATE,
  ROLL_RATE,
  SETTLE,
  SKID_H,
  YAW_RATE,
} from './config'
import type { Controls, Heli } from './types'

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v
}

export function wrapAngle(a: number): number {
  const tau = Math.PI * 2
  let x = (a + Math.PI) % tau
  if (x < 0) x += tau
  return x - Math.PI
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function headingDeg(yaw: number): number {
  let d = (yaw * 180 / Math.PI) % 360
  if (d < 0) d += 360
  return d
}

export function createHeli(): Heli {
  return {
    x: 0,
    y: SKID_H,
    z: 0,
    vx: 0,
    vy: 0,
    vz: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    onGround: true,
    rotorRpm: 0.15,
  }
}

/**
 * Lightweight helicopter model retained from the working standalone prototype.
 * The rotor thrust vector follows pitch/roll, while yaw remains independently
 * pedal-driven. dt is capped so returning from a paused/background tab cannot
 * inject a giant physics step.
 */
export function stepHeli(h: Heli, c: Controls, dt: number): void {
  const dtC = clamp(dt, 0, 0.05)

  const wantRpm = 0.2 + c.collective * 0.8
  h.rotorRpm += (wantRpm - h.rotorRpm) * (1 - Math.exp(-3.5 * dtC))

  h.pitch += c.cyclicPitch * PITCH_RATE * dtC
  h.roll += c.cyclicRoll * ROLL_RATE * dtC

  // Small rotor-torque/cyclic coupling keeps the aircraft from feeling rail-like.
  const yawCmd = c.yaw * YAW_RATE + c.collective * 0.08 * c.cyclicRoll
  h.yaw = wrapAngle(h.yaw + yawCmd * dtC)

  h.pitch = clamp(h.pitch, -0.55, 0.55)
  h.roll = clamp(h.roll, -0.7, 0.7)

  if (Math.abs(c.cyclicPitch) < 0.05) h.pitch *= Math.exp(-0.35 * dtC)
  if (Math.abs(c.cyclicRoll) < 0.05) h.roll *= Math.exp(-0.4 * dtC)

  const cy = Math.cos(h.yaw)
  const sy = Math.sin(h.yaw)
  const cp = Math.cos(h.pitch)
  const sp = Math.sin(h.pitch)
  const cr = Math.cos(h.roll)
  const sr = Math.sin(h.roll)

  const ux = sy * sp * cr + cy * sr
  const uy = cp * cr
  const uz = cy * sp * cr - sy * sr

  const agl = Math.max(0, h.y - SKID_H)
  const groundEffect = GE_BONUS * Math.exp(-agl / GE_HEIGHT) * (h.onGround ? 0.4 : 1)
  const thrust = MAX_THRUST * c.collective * (0.75 + 0.25 * h.rotorRpm) * (1 + groundEffect)

  let fx = ux * thrust
  let fy = uy * thrust - MASS * GRAVITY
  let fz = uz * thrust

  const speed = Math.hypot(h.vx, h.vy, h.vz)
  fx -= h.vx * DRAG_H * MASS * (0.4 + speed * 0.02)
  fz -= h.vz * DRAG_H * MASS * (0.4 + speed * 0.02)
  fy -= h.vy * DRAG_V * MASS * 0.15

  if (h.vy < 0 && c.collective > 0.3) {
    fy -= SETTLE * MASS * (-h.vy) * c.collective
  }

  h.vx += (fx / MASS) * dtC
  h.vy += (fy / MASS) * dtC
  h.vz += (fz / MASS) * dtC

  h.x += h.vx * dtC
  h.y += h.vy * dtC
  h.z += h.vz * dtC

  if (h.y <= SKID_H) {
    const penetration = SKID_H - h.y
    const spring = LAND_SPRING * penetration
    const damp = LAND_DAMP * Math.min(0, h.vy)
    h.vy += ((spring - damp) / MASS) * dtC
    h.y = SKID_H

    const grip = clamp(1 - Math.abs(h.vy) * 0.5, 0.2, 1)
    h.vx *= Math.exp(-FRICTION * grip * dtC)
    h.vz *= Math.exp(-FRICTION * grip * dtC)

    if (c.collective < 0.55) {
      h.vy *= Math.exp(-6 * dtC)
      if (Math.abs(h.vy) < 1.5) {
        h.vy = 0
        h.onGround = true
        h.pitch *= Math.exp(-4 * dtC)
        h.roll *= Math.exp(-4 * dtC)
      } else {
        h.onGround = false
      }
    } else if (Math.abs(h.vy) < 0.35) {
      h.vy = 0
      h.onGround = true
    } else {
      h.onGround = Math.abs(h.vy) < 1.2
    }
  } else {
    h.onGround = false
  }
}

export function hardLanding(h: Heli): boolean {
  return h.y <= SKID_H + 0.05 && (h.vy < -7 || Math.hypot(h.vx, h.vz) > 16)
}
