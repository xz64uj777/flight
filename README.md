# Copter Flight v4.1

Phone-friendly helicopter flight-feel sim built with Vite, React, TypeScript, and a lightweight canvas renderer.

## Run

```bash
npm install
npm run dev
```

The dev server uses port **8090**.

## Controls

| Control | Behavior |
|---|---|
| **Left stick / W-S** | Cyclic pitch and bank. **Casual**: screen-up / W = nose up. **Realistic**: screen-up / W = nose down. Left always banks left in either mode. |
| **Yaw stick / A-D-Q-E** | Independent pedals. Horizontal-only touch tracking prevents vertical thumb drift from weakening yaw. |
| **Collective / R-F** | Absolute hold. Releasing the slider keeps the selected power. |
| **Tilt** | Optional phone tilt for cyclic. Screen-orientation aware, smoothed, and calibrated relative to the way the phone is being held. |
| **Pause / Esc** | Freezes flight safely. Switching apps or rotating the screen pauses automatically. |
| **Camera / C** | Cycles chase, pad, and orbit cameras. |
| **Help / H** | Opens the in-flight control guide. |

### Tilt behavior

Tilt is off by default and must be enabled from the game. A live tilt signal requires sustained sensor events rather than a single browser blip.

- Portrait and landscape orientations are mapped into the same screen-relative controls.
- A brief sensor dropout immediately returns cyclic authority to touch/keyboard. If the same sensor stream resumes, the existing calibration resumes with it.
- If the browser changes to a different sensor family, the game requires a fresh stable zero before tilt takes control again.
- Rotating the screen pauses flight and invalidates the old tilt zero so the aircraft cannot jump when play resumes.
- Android absolute-orientation events are used as a fallback when needed.
- Browser motion sensors generally require HTTPS and sensor permission.

## Verify

Node 22+ is recommended.

```bash
npm install
npm test
npm run build
```

`npm test` covers deadzone behavior, angular wraparound, portrait/landscape tilt mapping, neutral calibration, pitch-mode polarity, and full-authority clamping. CI runs the tests and production build for pushes and pull requests.

Hover is approximately **72% collective** out of ground effect. Rotor and wind audio are generated with WebAudio; no audio assets are required.
