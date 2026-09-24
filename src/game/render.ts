import { PAD_R, PAD_X, PAD_Z, QUALITY } from './config'
import { clamp } from './physics'
import type { Cam, Heli, Sim } from './types'

type Point3 = { x: number; y: number; z: number }
type ScreenPoint = { x: number; y: number; d: number }
type Dust = { x: number; z: number; life: number; vx: number; vz: number }
type HeliPart = { a: Point3; b: Point3; color: string; width: number }
type DrawnPart = { pa: ScreenPoint; pb: ScreenPoint; color: string; width: number; d: number }

function project(p: Point3, cam: Cam, w: number, h: number): ScreenPoint | null {
  const cy = Math.cos(cam.yaw)
  const sy = Math.sin(cam.yaw)
  const cp = Math.cos(cam.pitch)
  const sp = Math.sin(cam.pitch)
  const dx = p.x - cam.x
  const dy = p.y - cam.y
  const dz = p.z - cam.z
  const rx = dx * cy - dz * sy
  const rz = dx * sy + dz * cy
  const fy = dy * cp - rz * sp
  const fz = dy * sp + rz * cp
  if (fz < 0.6) return null
  const fov = 1.15
  return {
    x: w / 2 + (rx / fz) * (h * 0.5 * fov),
    y: h / 2 - (fy / fz) * (h * 0.5 * fov),
    d: fz,
  }
}

function hash(n: number): number {
  const s = Math.sin(n * 127.1) * 43758.5453
  return s - Math.floor(s)
}

function hex(value: string): [number, number, number] {
  const s = value.replace('#', '')
  return [
    Number.parseInt(s.slice(0, 2), 16),
    Number.parseInt(s.slice(2, 4), 16),
    Number.parseInt(s.slice(4, 6), 16),
  ]
}

function mix(a: string, b: string, t: number): string {
  const pa = hex(a)
  const pb = hex(b)
  return `rgb(${Math.trunc(pa[0] + (pb[0] - pa[0]) * t)},${Math.trunc(pa[1] + (pb[1] - pa[1]) * t)},${Math.trunc(pa[2] + (pb[2] - pa[2]) * t)})`
}

export class Renderer {
  private rotorPhase = 0
  private dust: Dust[] = []

  draw(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, dt: number): void {
    const q = QUALITY[sim.quality]
    this.rotorPhase += dt * (8 + sim.heli.rotorRpm * 40)
    this.sky(ctx, w, h, sim.heli.y)
    this.ground(ctx, sim, w, h, q.groundDetail)
    this.pad(ctx, sim.cam, w, h)
    this.buildings(ctx, sim, w, h, q.buildings)
    this.trees(ctx, sim, w, h, q.trees)
    if (q.particles > 0) this.particles(ctx, sim, w, h, dt, q.particles)
    this.heli(ctx, sim.heli, sim.cam, w, h, q.shadows)

    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.75)
    vignette.addColorStop(0, 'rgba(0,0,0,0)')
    vignette.addColorStop(1, 'rgba(0,0,0,0.35)')
    ctx.fillStyle = vignette
    ctx.fillRect(0, 0, w, h)
  }

  private sky(ctx: CanvasRenderingContext2D, w: number, h: number, alt: number): void {
    const t = clamp(alt / 120, 0, 1)
    const g = ctx.createLinearGradient(0, 0, 0, h)
    g.addColorStop(0, mix('#6ec8ff', '#1a3a6a', t * 0.5))
    g.addColorStop(0.45, mix('#a8d8f0', '#4a6a8a', t * 0.3))
    g.addColorStop(1, mix('#c8b898', '#6a6858', t * 0.2))
    ctx.fillStyle = g
    ctx.fillRect(0, 0, w, h)
  }

  private ground(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, detail: number): void {
    const cam = sim.cam
    const horizon = project(
      { x: cam.x + Math.sin(cam.yaw) * 800, y: 0, z: cam.z + Math.cos(cam.yaw) * 800 },
      cam,
      w,
      h,
    )
    const hy = horizon ? clamp(horizon.y, h * 0.25, h * 0.75) : h * 0.55
    const g = ctx.createLinearGradient(0, hy, 0, h)
    g.addColorStop(0, '#5a7a48')
    g.addColorStop(1, '#3a5230')
    ctx.fillStyle = g
    ctx.fillRect(0, hy, w, h - hy)

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, hy, w, h - hy)
    ctx.clip()
    const step = Math.max(8, 40 - detail)
    for (let i = -detail; i <= detail; i += 1) {
      const z0 = cam.z + Math.cos(cam.yaw) * (20 + i * step)
      const x0 = cam.x + Math.sin(cam.yaw) * (20 + i * step)
      const a = project({ x: x0 - 80, y: 0, z: z0 - 80 }, cam, w, h)
      const b = project({ x: x0 + 80, y: 0, z: z0 + 80 }, cam, w, h)
      if (!a || !b) continue
      ctx.strokeStyle = `rgba(40,60,30,${0.15 + 0.1 * (1 - Math.abs(i) / detail)})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(a.x, a.y)
      ctx.lineTo(b.x, b.y)
      ctx.stroke()
    }
    ctx.restore()
  }

  private pad(ctx: CanvasRenderingContext2D, cam: Cam, w: number, h: number): void {
    const ring: ScreenPoint[] = []
    for (let i = 0; i <= 32; i += 1) {
      const a = (i / 32) * Math.PI * 2
      const p = project(
        { x: PAD_X + Math.cos(a) * PAD_R, y: 0.05, z: PAD_Z + Math.sin(a) * PAD_R },
        cam,
        w,
        h,
      )
      if (p) ring.push(p)
    }
    if (ring.length > 4) {
      ctx.beginPath()
      ctx.moveTo(ring[0]!.x, ring[0]!.y)
      for (const p of ring) ctx.lineTo(p.x, p.y)
      ctx.closePath()
      ctx.fillStyle = 'rgba(50,55,60,0.85)'
      ctx.fill()
      ctx.strokeStyle = '#e8c84a'
      ctx.lineWidth = 2
      ctx.stroke()
    }

    const c = project({ x: PAD_X, y: 0.08, z: PAD_Z }, cam, w, h)
    if (!c) return
    const s = clamp(180 / c.d, 4, 28)
    ctx.strokeStyle = '#e8c84a'
    ctx.lineWidth = Math.max(2, s * 0.15)
    ctx.strokeRect(c.x - s, c.y - s * 0.7, s * 2, s * 1.4)
    ctx.beginPath()
    ctx.moveTo(c.x - s * 0.55, c.y - s * 0.5)
    ctx.lineTo(c.x - s * 0.55, c.y + s * 0.5)
    ctx.moveTo(c.x + s * 0.55, c.y - s * 0.5)
    ctx.lineTo(c.x + s * 0.55, c.y + s * 0.5)
    ctx.moveTo(c.x - s * 0.55, c.y)
    ctx.lineTo(c.x + s * 0.55, c.y)
    ctx.stroke()
  }

  private buildings(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, n: number): void {
    for (let i = 0; i < n; i += 1) {
      const ang = hash(i + 1.1) * Math.PI * 2
      const dist = 60 + hash(i + 2.2) * 140
      const bx = Math.cos(ang) * dist
      const bz = Math.sin(ang) * dist
      if (Math.hypot(bx, bz) < 35) continue
      const bw = 4 + hash(i + 3) * 8
      const bh = 6 + hash(i + 4) * 18
      const corners: Point3[] = [
        { x: bx - bw, y: 0, z: bz - bw },
        { x: bx + bw, y: 0, z: bz - bw },
        { x: bx + bw, y: 0, z: bz + bw },
        { x: bx - bw, y: 0, z: bz + bw },
        { x: bx - bw, y: bh, z: bz - bw },
        { x: bx + bw, y: bh, z: bz - bw },
        { x: bx + bw, y: bh, z: bz + bw },
        { x: bx - bw, y: bh, z: bz + bw },
      ]
      const projected = corners.map((p) => project(p, sim.cam, w, h))
      if (projected.some((p) => p === null)) continue
      const pts = projected as ScreenPoint[]

      const face = [4, 5, 6, 7].map((j) => pts[j]!)
      ctx.beginPath()
      ctx.moveTo(face[0]!.x, face[0]!.y)
      for (const p of face) ctx.lineTo(p.x, p.y)
      ctx.closePath()
      ctx.fillStyle = `rgb(${Math.trunc(70 + hash(i) * 40)},${Math.trunc(80 + hash(i + 5) * 30)},${Math.trunc(90 + hash(i + 6) * 40)})`
      ctx.fill()

      for (const indices of [[0, 1, 5, 4], [1, 2, 6, 5]]) {
        const side = indices.map((j) => pts[j]!)
        ctx.beginPath()
        ctx.moveTo(side[0]!.x, side[0]!.y)
        for (const p of side) ctx.lineTo(p.x, p.y)
        ctx.closePath()
        ctx.fillStyle = `rgba(40,50,60,${0.55 + hash(i + indices[0]!) * 0.2})`
        ctx.fill()
      }
    }
  }

  private trees(ctx: CanvasRenderingContext2D, sim: Sim, w: number, h: number, n: number): void {
    for (let i = 0; i < n; i += 1) {
      const ang = hash(i + 20.1) * Math.PI * 2
      const dist = 25 + hash(i + 21) * 120
      const tx = Math.cos(ang) * dist
      const tz = Math.sin(ang) * dist
      if (Math.hypot(tx - PAD_X, tz - PAD_Z) < PAD_R + 6) continue

      const base = project({ x: tx, y: 0, z: tz }, sim.cam, w, h)
      const top = project({ x: tx, y: 5 + hash(i) * 4, z: tz }, sim.cam, w, h)
      if (!base || !top) continue
      const s = clamp(40 / base.d, 2, 14)
      ctx.strokeStyle = '#4a3020'
      ctx.lineWidth = Math.max(1, s * 0.25)
      ctx.beginPath()
      ctx.moveTo(base.x, base.y)
      ctx.lineTo(top.x, top.y)
      ctx.stroke()
      ctx.fillStyle = `rgba(${Math.trunc(30 + hash(i) * 40)},${Math.trunc(90 + hash(i + 1) * 50)},40,0.85)`
      ctx.beginPath()
      ctx.arc(top.x, top.y, s, 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private particles(
    ctx: CanvasRenderingContext2D,
    sim: Sim,
    w: number,
    h: number,
    dt: number,
    max: number,
  ): void {
    const heli = sim.heli
    if (heli.y < 10 && heli.rotorRpm > 0.4 && !heli.onGround && this.dust.length < max && Math.random() < 0.5) {
      const a = Math.random() * Math.PI * 2
      this.dust.push({
        x: heli.x + Math.cos(a) * 3,
        z: heli.z + Math.sin(a) * 3,
        life: 0.6 + Math.random() * 0.5,
        vx: Math.cos(a) * (2 + Math.random() * 4),
        vz: Math.sin(a) * (2 + Math.random() * 4),
      })
    }

    for (let i = this.dust.length - 1; i >= 0; i -= 1) {
      const d = this.dust[i]!
      d.life -= dt
      d.x += d.vx * dt
      d.z += d.vz * dt
      if (d.life <= 0) {
        this.dust.splice(i, 1)
        continue
      }
      const p = project({ x: d.x, y: 0.2, z: d.z }, sim.cam, w, h)
      if (!p) continue
      ctx.fillStyle = `rgba(180,170,140,${d.life * 0.35})`
      ctx.beginPath()
      ctx.arc(p.x, p.y, clamp(30 / p.d, 2, 10), 0, Math.PI * 2)
      ctx.fill()
    }
  }

  private heli(
    ctx: CanvasRenderingContext2D,
    heli: Heli,
    cam: Cam,
    w: number,
    h: number,
    shadows: boolean,
  ): void {
    const cy = Math.cos(heli.yaw)
    const sy = Math.sin(heli.yaw)
    const cp = Math.cos(heli.pitch)
    const sp = Math.sin(heli.pitch)
    const cr = Math.cos(heli.roll)
    const sr = Math.sin(heli.roll)

    const xf = (lx: number, ly: number, lz: number): Point3 => {
      let x = lx * cr - ly * sr
      let y = lx * sr + ly * cr
      let z = lz
      const y2 = y * cp - z * sp
      const z2 = y * sp + z * cp
      y = y2
      z = z2
      return {
        x: heli.x + x * cy + z * sy,
        y: heli.y + y,
        z: heli.z - x * sy + z * cy,
      }
    }

    if (shadows && heli.y < 40) {
      const sh = project({ x: heli.x, y: 0.05, z: heli.z }, cam, w, h)
      if (sh) {
        const s = clamp(90 / sh.d, 4, 30) * (1 - clamp(heli.y / 40, 0, 0.85))
        ctx.fillStyle = 'rgba(0,0,0,0.28)'
        ctx.beginPath()
        ctx.ellipse(sh.x, sh.y, s * 1.2, s * 0.45, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const parts: HeliPart[] = [
      { a: xf(-1.2, -1.2, -2), b: xf(-1.2, -1.2, 2), color: '#333', width: 2 },
      { a: xf(1.2, -1.2, -2), b: xf(1.2, -1.2, 2), color: '#333', width: 2 },
      { a: xf(-1.2, -1.2, -1), b: xf(-0.6, -0.2, -0.5), color: '#444', width: 1.5 },
      { a: xf(1.2, -1.2, -1), b: xf(0.6, -0.2, -0.5), color: '#444', width: 1.5 },
      { a: xf(0, 0, -3.2), b: xf(0, 0.2, 2.5), color: '#c0c8d0', width: 5 },
      { a: xf(-0.9, 0.2, 0.2), b: xf(0.9, 0.2, 0.2), color: '#2a6aaa', width: 4 },
      { a: xf(-0.9, 0.2, 1.6), b: xf(0.9, 0.2, 1.6), color: '#2a6aaa', width: 4 },
      { a: xf(0, 0.3, -1), b: xf(0, 0.8, -5.5), color: '#b0b8c0', width: 2.5 },
      { a: xf(0, 0.8, -5.5), b: xf(0.8, 0.8, -5.5), color: '#888', width: 2 },
    ]

    const drawn = parts
      .map((part): DrawnPart | null => {
        const pa = project(part.a, cam, w, h)
        const pb = project(part.b, cam, w, h)
        if (!pa || !pb) return null
        return { pa, pb, color: part.color, width: part.width, d: (pa.d + pb.d) / 2 }
      })
      .filter((part): part is DrawnPart => part !== null)

    drawn.sort((a, b) => b.d - a.d)
    for (const part of drawn) {
      ctx.strokeStyle = part.color
      ctx.lineWidth = Math.max(1, part.width * clamp(40 / part.d, 0.4, 2))
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.moveTo(part.pa.x, part.pa.y)
      ctx.lineTo(part.pb.x, part.pb.y)
      ctx.stroke()
    }

    const hub = xf(0, 1.2, 0.2)
    for (let i = 0; i < 2; i += 1) {
      const a = this.rotorPhase + i * Math.PI / 2
      const tip1 = xf(Math.cos(a) * 5.5, 1.2, 0.2 + Math.sin(a) * 5.5)
      const tip2 = xf(Math.cos(a + Math.PI) * 5.5, 1.2, 0.2 + Math.sin(a + Math.PI) * 5.5)
      const p0 = project(hub, cam, w, h)
      const p1 = project(tip1, cam, w, h)
      const p2 = project(tip2, cam, w, h)
      if (p0 && p1 && p2) {
        ctx.strokeStyle = `rgba(30,30,35,${0.35 + heli.rotorRpm * 0.35})`
        ctx.lineWidth = Math.max(1, 2.5 * clamp(40 / p0.d, 0.4, 2))
        ctx.beginPath()
        ctx.moveTo(p1.x, p1.y)
        ctx.lineTo(p2.x, p2.y)
        ctx.stroke()
      }
    }

    const disc: ScreenPoint[] = []
    for (let i = 0; i <= 20; i += 1) {
      const a = i / 20 * Math.PI * 2
      const p = project(xf(Math.cos(a) * 5.2, 1.15, 0.2 + Math.sin(a) * 5.2), cam, w, h)
      if (p) disc.push(p)
    }
    if (disc.length > 8) {
      ctx.beginPath()
      ctx.moveTo(disc[0]!.x, disc[0]!.y)
      for (const p of disc) ctx.lineTo(p.x, p.y)
      ctx.closePath()
      ctx.fillStyle = `rgba(200,210,220,${0.06 + heli.rotorRpm * 0.08})`
      ctx.fill()
    }

    const tr = this.rotorPhase * 2.3
    const t1 = xf(0.8, 0.8 + Math.cos(tr) * 0.9, -5.5 + Math.sin(tr) * 0.3)
    const t2 = xf(0.8, 0.8 - Math.cos(tr) * 0.9, -5.5 - Math.sin(tr) * 0.3)
    const pt1 = project(t1, cam, w, h)
    const pt2 = project(t2, cam, w, h)
    if (pt1 && pt2) {
      ctx.strokeStyle = 'rgba(40,40,45,0.7)'
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.moveTo(pt1.x, pt1.y)
      ctx.lineTo(pt2.x, pt2.y)
      ctx.stroke()
    }
  }
}
