/** Copter Flight v2 — tunables (flight feel only). */

export const GRAVITY = 9.81

/** Mass (kg) — light utility heli feel. */
export const MASS = 2200

/** Max main-rotor thrust at collective=1 (N). ~1.55× weight for climb margin. */
export const MAX_THRUST = MASS * GRAVITY * 1.48

/** Collective that approximately hovers OGE. */
export const HOVER_COLLECTIVE = 0.72

/** Ground-effect height scale (m). Extra lift fades above this. */
export const GE_HEIGHT = 8

/** Max GE thrust bonus fraction. */
export const GE_BONUS = 0.18

/** Angular rates (rad/s) at full cyclic / pedal. */
export const PITCH_RATE = 0.85
export const ROLL_RATE = 1.1
export const YAW_RATE = 1.05

/** Translational damping — rotor disk, not airplane wing. */
export const DRAG_H = 0.55
export const DRAG_V = 2.4

/** Induced sink when thrusting while descending (simple settling). */
export const SETTLE = 0.35

/** Skid contact — soft spring/damper. */
export const SKID_H = 1.4
export const LAND_SPRING = 18000
export const LAND_DAMP = 4200
export const FRICTION = 8

/** World pad center. */
export const PAD_X = 0
export const PAD_Z = 0
export const PAD_R = 18

/** Quality presets (no ultra). */
export const QUALITY = {
  low: { trees: 12, buildings: 6, particles: 0, shadows: false, groundDetail: 8 },
  med: { trees: 28, buildings: 12, particles: 24, shadows: true, groundDetail: 14 },
  high: { trees: 48, buildings: 20, particles: 48, shadows: true, groundDetail: 22 },
} as const

export type QualityKey = keyof typeof QUALITY
