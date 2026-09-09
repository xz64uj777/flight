# Rotorwake Rescue

A browser helicopter search-and-rescue game built with React, Three.js, and TanStack Start.

## Controls

### Mobile
- **Tilt phone** — cyclic pitch/bank
- **Tail L / R** — yaw
- **Power** — collective
- **Drag sky** — look around
- **Calibrate** — zero the phone at the angle you want to hold it

Tilt is rest-relative, screen-orientation-aware, and works in portrait or landscape. Yaw remains independent, so you can bank/pitch with the phone while using the tail control at the same time.

### Keyboard
- **W / S** — cyclic forward/back
- **A / D** — yaw left/right
- **Q / E** — bank left/right
- **Space / Shift** — collective up/down
- **C** — change camera
- **R** — restart
- **Esc** — pause

## Development

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run build:dev
```

## Recent flight-control fixes

- Independent DeviceOrientation and DeviceMotion calibration so Android event order cannot corrupt tilt zero.
- Screen-orientation-aware tilt mapping for portrait and landscape.
- Smoothing and dead zone retained without making yaw feel laggy.
- Tilt no longer silently re-enables after being switched off.
- Motion fallback resumes if orientation events stop arriving.
- Chase camera now follows helicopter yaw while Orbit remains free-look.
