import type { QualityKey } from './config'

export type Phase = 'hangar' | 'flight'
export type CamMode = 'chase' | 'pad' | 'orbit'

export type Controls = {
  /** Cyclic fore/aft: + = nose down / forward. */
  cyclicPitch: number
  /** Cyclic lateral: + = roll right. */
  cyclicRoll: number
  /** Collective 0..1. */
  collective: number
  /** Pedals: + = nose right (clockwise from above). A/left → negative. */
  yaw: number
}

export type Heli = {
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  /** Radians: pitch (nose down / forward +), roll (right +), yaw (heading, 0 = +Z). */
  pitch: number
  roll: number
  yaw: number
  onGround: boolean
  rotorRpm: number
}

export type Cam = {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  dist: number
}

export type Hud = {
  alt: number
  speed: number
  hdg: number
  collective: number
  onGround: boolean
  cam: CamMode
  quality: QualityKey
}

export type Sim = {
  phase: Phase
  heli: Heli
  cam: Cam
  camMode: CamMode
  controls: Controls
  quality: QualityKey
  time: number
  crashed: boolean
  message: string
}
