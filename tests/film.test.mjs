import test from 'node:test'
import assert from 'node:assert/strict'
import { cameraAt, dewReveal, environmentAt, finaleAt, SHOTS, shotAt, worldWeights } from '../src/film/timeline.ts'

test('the complete camera path remains finite and outside the product', () => {
  for (let step = 0; step <= 10000; step++) {
    const { position, target, fov } = cameraAt(step / 10000)
    assert.ok([...position, ...target, fov].every(Number.isFinite))
    assert.ok(Math.hypot(position[0], position[2]) > .7, 'camera never enters the can')
    assert.ok(fov >= 25 && fov <= 40, 'lens stays within its authored range')
    assert.ok(Math.hypot(...position.map((v, i) => v - target[i])) > .35, 'focus never crosses the lens')
  }
})

test('reversing and seeking reconstructs the identical camera pose without history', () => {
  const forward = Array.from({ length: 501 }, (_, i) => cameraAt(i / 500))
  for (let i = 500; i >= 0; i--) assert.deepEqual(cameraAt(i / 500), forward[i])
  assert.deepEqual(cameraAt(-1), cameraAt(0))
  assert.deepEqual(cameraAt(2), cameraAt(1))
})

test('small scroll steps cannot teleport the camera or its focus', () => {
  let previous = cameraAt(0)
  for (let i = 1; i <= 10000; i++) {
    const next = cameraAt(i / 10000)
    for (const field of ['position', 'target']) assert.ok(Math.hypot(...next[field].map((v, j) => v - previous[field][j])) < .035)
    previous = next
  }
})

test('the film visits snow, water and terrain before returning to stillness', () => {
  assert.deepEqual([.575, .67, .75, .835].map(environmentAt), [-1, 0, 1, 2])
  assert.equal(environmentAt(.99), -1)
  assert.equal(shotAt(0), 0)
  assert.equal(shotAt(1), SHOTS.length - 1)
  assert.equal(finaleAt(.9).quiet, 1)
  assert.equal(finaleAt(.99).quiet, 0)
})

test('LOCK IN holds alone before FOCZ and the closing actions, in either scroll direction', () => {
  for (let step = 8700; step <= 10000; step++) {
    const frame = finaleAt(step / 10000)
    assert.ok(Object.values(frame).every(value => value >= 0 && value <= 1))
    assert.equal(frame.lockIn * frame.focz, 0, 'the central titles never overlap')
    assert.equal(frame.focz * frame.ending, 0, 'the wordmark clears before the closing frame')
  }
  for (const progress of [.89, .905, .918, .925]) assert.equal(finaleAt(progress).lockIn, 1)
  const lockChapter = (SHOTS[10].at + SHOTS[11].at) / 2
  assert.equal(finaleAt(lockChapter).lockIn, 1, 'the chapter control lands on LOCK IN')
  assert.deepEqual(finaleAt(.995), { quiet: 0, lockIn: 0, focz: 0, ending: 1 })
  const forward = Array.from({ length: 101 }, (_, i) => finaleAt(.87 + i * .0013))
  for (let i = 100; i >= 0; i--) assert.deepEqual(finaleAt(.87 + i * .0013), forward[i])
})

test('the outdoor edit blends without doubling its exposure or skipping a setting', () => {
  for (let step = 0; step <= 10000; step++) {
    const weights = worldWeights(step / 10000)
    assert.ok(weights.every(weight => Number.isFinite(weight) && weight >= 0 && weight <= 1))
    assert.ok(weights.reduce((sum, weight) => sum + weight, 0) <= 1 + 1e-12)
  }
  assert.ok(worldWeights(.5)[0] > 0 && worldWeights(.5)[0] < .16, 'the release starts with a faint reflection')
  assert.deepEqual(worldWeights(.675), [1, 0, 0])
  assert.deepEqual(worldWeights(.755), [0, 1, 0])
  assert.deepEqual(worldWeights(.83), [0, 0, 1])
  assert.deepEqual(worldWeights(.9), [0, 0, 0])
})

test('the dew aperture opens continuously and the hero remains anchored', () => {
  let previousReveal = 0
  for (let step = 0; step <= 1000; step++) {
    const reveal = dewReveal(step / 1000)
    assert.ok(reveal >= previousReveal)
    previousReveal = reveal
  }
  assert.equal(dewReveal(.44), 0)
  assert.equal(dewReveal(.62), 1)
  assert.equal(dewReveal(1), 1)
  const anchor = cameraAt(.52).position
  for (let step = 520; step <= 870; step++) {
    const { position, target, fov } = cameraAt(step / 1000)
    assert.ok(Math.hypot(...position.map((value, index) => value - anchor[index])) < .4)
    assert.ok(position[0] > .23 && position[0] < .36, 'the camera never orbits the can')
    assert.ok(Math.abs(target[0]) < .005 && Math.abs(target[2]) < .005)
    assert.ok(fov >= 31.9 && fov <= 32.1)
  }
})
