import { HOVER_COLLECTIVE, type QualityKey } from './config'
import { createCam, nextCam, updateCamera } from './camera'
import { createHeli, hardLanding, headingDeg, stepHeli } from './physics'
import type { Controls, Hud, Sim } from './types'
import { emptyControls } from './input'

export function createSim(quality: QualityKey = 'med'): Sim {
  return {
    phase: 'hangar',
    heli: createHeli(),
    cam: createCam(),
    camMode: 'chase',
    controls: emptyControls(),
    quality,
    time: 0,
    crashed: false,
    message: '',
  }
}

export function startFlight(sim: Sim): void {
  sim.phase = 'flight'
  sim.heli = createHeli()
  sim.cam = createCam()
  sim.camMode = 'chase'
  sim.controls = { ...emptyControls(), collective: 0.42 }
  sim.crashed = false
  sim.message = 'Spool up — raise Coll (right slider / R) to lift'
  sim.time = 0
}

export function resetToHangar(sim: Sim): void {
  sim.phase = 'hangar'
  sim.heli = createHeli()
  sim.crashed = false
  sim.message = ''
}

export function cycleCamera(sim: Sim): void {
  sim.camMode = nextCam(sim.camMode)
}

export function setQuality(sim: Sim, q: QualityKey): void {
  sim.quality = q
}

export function stepSim(sim: Sim, controls: Controls, dt: number): void {
  if (sim.phase !== 'flight' || sim.crashed) return
  sim.controls = controls
  sim.time += dt

  const prevY = sim.heli.y
  const prevVy = sim.heli.vy
  stepHeli(sim.heli, controls, dt)

  if (hardLanding(sim.heli) || (sim.heli.y <= 1.45 && prevVy < -7)) {
    sim.crashed = true
    sim.message = 'Hard landing — tap Reset'
    sim.heli.vx = 0
    sim.heli.vz = 0
    sim.heli.vy = 0
  } else if (sim.heli.onGround && controls.collective < HOVER_COLLECTIVE - 0.12) {
    if (sim.time > 2 && Math.hypot(sim.heli.vx, sim.heli.vz) < 0.4) {
      sim.message = 'Planted on pad — raise collective to take off'
    }
  } else if (!sim.heli.onGround && Math.abs(sim.heli.vy) < 0.6 && Math.abs(controls.collective - HOVER_COLLECTIVE) < 0.08) {
    sim.message = 'Hover band — fine-tune collective'
  } else if (sim.heli.y > prevY && sim.heli.y > 3) {
    sim.message = ''
  }

  updateCamera(sim.cam, sim.heli, sim.camMode, dt)
}

export function hudFrom(sim: Sim): Hud {
  const h = sim.heli
  return {
    alt: Math.max(0, h.y - 1.4),
    speed: Math.hypot(h.vx, h.vz) * 1.94384, // m/s → knots-ish display
    hdg: headingDeg(h.yaw),
    collective: sim.controls.collective,
    onGround: h.onGround,
    cam: sim.camMode,
    quality: sim.quality,
  }
}
