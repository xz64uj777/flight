# Improvements

## Shipped in v4.1 — control reliability pass
- Restored the missing TypeScript input module so the React game is buildable from GitHub again.
- Ported the recovered screen-aware tilt mapping into the current React/TypeScript game.
- Smoothed tilt input and kept calibration stable across portrait/landscape screen coordinates.
- Casual/Realistic now changes **pitch only**; bank direction no longer reverses with pitch mode.
- Touch/keyboard cyclic takes over immediately if motion data stops; same-source tilt resumes automatically when readings return.
- A real sensor-family handover invalidates the old zero and safely recalibrates before tilt regains authority.
- Yaw touch is horizontal-only, so vertical thumb drift does not reduce pedal authority.
- Cyclic, yaw, and collective each keep their original pointer owner so a second finger cannot steal a live control.
- Switching apps or rotating the screen pauses flight, centers spring controls, silences audio, and prevents a physics jump on return.
- Added an explicit Pause control and Esc pause.
- Added six pure control-mapping regression tests and GitHub CI verification.

## Shipped in v4
- **Casual cyclic both axes**: `pitchSign` and `rollSign` −1 in `sampleControls` (stick + WASD/arrows); default Casual — stick-up → nose UP, stick-left → bank LEFT
- **Tilt sticky no-signal**: once latched, chip stays **Tilt · no signal** + plain sticky line (“Phone isn’t sending motion — Chrome + HTTPS + screen unlocked.”) until sustained live or Tilt OFF — no toast-and-fade
- **`gyroReady` gated on sustained live** (≥3 `deviceorientation` events / 500ms), not a single blip; Recalibrate disabled until live sticks

## Shipped in v3
- Casual default pitch (screen-up / W → nose UP); Realistic opt-in — Kyle no longer hunts the toggle for game-feel
- Casual `pitchSign` verified in `sampleControls` (−1 → nose UP); left stick left = left bank unchanged
- **Tilt heartbeat**: HUD **Tilt · live** / **Tilt · no signal** (~1s); permission on enable; `gyroReady` only after ≥1 `deviceorientation` event
- Recalibrate gated on live signal; Android `deviceorientationabsolute` fallback if events empty after 1s
- **Settings** sheet (Who): Sens / Casual·Realistic / Tilt / Recalibrate — keeps main HUD slim

## Shipped in v2
- Cyclic + yaw: spring-center with pointer cancel/capture/blur leak fixes + deadzone
- Collective: absolute hold (never snap idle)
- Realistic / Casual pitch polarity (Realistic = screen-up → nose down)
- Optional **Tilt · cyclic** (gyro, off by default) + Recalibrate
- Sensitivity Low/Med/High (default Med)
- Help panel + first-flight tip (no forever control-text spam)
- Hangar shows bird on pad behind Fly
- Rotor WebAudio loop (rpm + collective swell) + light wind with speed
- Physics comment hover synced to 0.72

## Flight feel (later)
- Torque/pedal coupling more explicit with collective changes
- Translational lift and ETL kick around 15-20 kt
- Vortex ring state when descending steeply under power
- Better skid scrape / slide friction on concrete vs grass
- Optional wind and gusts

## Camera
- Pinch zoom on chase
- Cockpit / seat cam
- Look-ahead lead tuned per quality tier

## Product north star (do not start until feel locks)
- Rescue / LifeStar job loop
- Resume / career layer
- Fuel and weight

## Tech
- Haptics on hard contact (phone)
- Share spawn seed for pad challenges
