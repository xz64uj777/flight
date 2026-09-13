# Tilt and yaw correction

Source: user-supplied copter-flight.zip (standalone canvas game). This differs from the React/Three.js game described in the repository README.

Changes:
- Map calibrated tilt deltas into screen coordinates in portrait and landscape; wrap angular differences.
- Recalibrate when changing sensor angle conventions; keep absolute/relative orientation in one calibration family.
- Ignore samples while disabled, remove capture listeners correctly, and defer calibration until data exists.
- Treat yaw pad as horizontal only, prevent a second pointer taking it over, and release on lost capture.

Run: node test-controls.cjs
Result: 15 passing checks, including simultaneous tilt/yaw, rotations 0/90/180/270, calibration handover, wraparound, disabled input, and pointer ownership/release. The original fails the sensor-handover regression (full pitch instead of neutral). Whole embedded script syntax checked.

Manual phone check (not performed here): serve copter-flight.html over HTTPS, enable Tilt, hold comfortably and Calibrate. Bank/pitch while holding yaw left/right; drift thumb vertically and verify yaw strength remains steady. Repeat in portrait and both landscape directions, calibrating after rotating. Switch Tilt off/on, then release yaw and verify it stops.

Limitations: synthetic sensor and pointer tests do not replace real phone/browser testing. Existing sensor fallback policy and flight physics remain unchanged. No APK build is involved: this is a standalone HTML game.
