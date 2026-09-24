import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyPitchMode,
  normalizedTilt,
  remapDeadzone,
  rotateTiltToScreen,
  shortAngleDelta,
} from '../src/game/controlMath.ts'

test('deadzone centers small stick noise', () => {
  assert.equal(remapDeadzone(0.04), 0)
  assert.equal(remapDeadzone(-0.04), 0)
})

test('angle wrap takes the short path', () => {
  assert.equal(shortAngleDelta(-179, 179), 2)
})

test('screen rotation maps tilt consistently', () => {
  assert.deepEqual(rotateTiltToScreen(0.5, 0.25, 0), { pitch: 0.5, roll: 0.25 })
  assert.deepEqual(rotateTiltToScreen(0.5, 0.25, 90), { pitch: -0.25, roll: 0.5 })
  assert.deepEqual(rotateTiltToScreen(0.5, 0.25, 180), { pitch: -0.5, roll: -0.25 })
  assert.deepEqual(rotateTiltToScreen(0.5, 0.25, 270), { pitch: 0.25, roll: -0.5 })
})

test('calibrated tilt is neutral', () => {
  assert.deepEqual(normalizedTilt(42, -12, 42, -12, 90), { pitch: 0, roll: 0 })
})

test('casual mode reverses pitch but not roll', () => {
  assert.equal(applyPitchMode(0.7, 'casual'), -0.7)
  assert.equal(applyPitchMode(0.7, 'realistic'), 0.7)
})

test('tilt clamps at full authority', () => {
  assert.deepEqual(normalizedTilt(90, -90, 0, 0, 0, 18), { pitch: 1, roll: -1 })
})
