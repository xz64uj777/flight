# Copter Flight v4

Phone-friendly helicopter **flight feel** sim (Vite + React + TypeScript + canvas).

Hangar (bird on pad) → **Fly**. No rescue / LifeStar / resume jobs yet.

## Run

```bash
cd /workspace/copter-flight
bun install
bun run dev
```

Dev server targets port **8090**.

## How controls work (v4)

| Control | Behavior |
|---------|----------|
| **Left stick (cyclic)** | Spring-centers on release / cancel / blur / lost capture. Small deadzone. **Casual default**: screen-up / W → nose **UP**; stick-left → bank **LEFT** (both axes flipped vs Realistic). **Realistic** (opt-in Settings) = heli, screen-up → nose down. |
| **Yaw stick (right)** | Spring-centers like cyclic. Left = nose left. |
| **Collective (slider)** | **Absolute hold** — on release keeps last value; knob stays; never snaps to idle. |
| **Tilt** | Optional phone gyro → cyclic. **OFF by default**. Permission on enable. **Tilt · live** only after sustained motion (≥3 orientation events / 500ms). **Tilt · no signal** sticks with plain hint until live resumes or Tilt OFF (no toast fade). Recalibrate disabled until live. Android absolute-orientation fallback if empty. |
| **Settings** | Sens Low/Med/High, Casual/Realistic, Tilt + Recalibrate. |
| **Help** | In-flight panel. First-flight tip dismisses. |

### Verify Casual + sticky Tilt

1. **Casual**: Fly fresh (no Settings toggle). Chase cam — stick-up / **W** → nose **UP**; stick-left / ← → bank **LEFT**.
2. **Tilt**: Turn Tilt on. A single orientation blip must **not** flash live forever — need sustained events. If no motion: chip stays **Tilt · no signal** + sticky “Phone isn’t sending motion — Chrome + HTTPS + screen unlocked.” until live or OFF. Recalibrate stays disabled until live sticks.

### Keyboard

| Key | Action |
|-----|--------|
| W / S | Cyclic pitch |
| Left/Right arrows / J L | Cyclic roll |
| A / D / Q / E | Yaw |
| R / Space | Collective up |
| F / Ctrl | Collective down |
| C | Cycle camera |
| H | Help |

Hover band ~**72%** collective OGE. Soft rotor loop + wind bed (WebAudio).

## Zips

Packed without node_modules:

- `/workspace/copter-drop/copter-flight-v4.zip`
- `/workspace/shared/copter-flight-v4.zip`

## Stack

Vite 5, React 18, TypeScript, canvas projected 3D (phone-light, no three.js).
