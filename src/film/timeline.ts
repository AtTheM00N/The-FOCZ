export const SHOTS = [
  { at: 0, name: 'Stillness', time: '00:00', cue: '' },
  { at: .06, name: 'Follow the light', time: '00:04', cue: '' },
  { at: .14, name: 'Cold to the touch', time: '00:10', cue: '' },
  { at: .23, name: 'Find the centre', time: '00:17', cue: '' },
  { at: .34, name: 'Pressure', time: '00:25', cue: '' },
  { at: .45, name: 'Controlled release', time: '00:33', cue: '' },
  { at: .52, name: 'Cognitive fuel', time: '00:38', cue: 'Tropical Punch 355 mL' },
  { at: .62, name: 'Snow', time: '00:46', cue: '' },
  { at: .71, name: 'Water', time: '00:52', cue: '' },
  { at: .79, name: 'Terrain', time: '00:58', cue: '' },
  { at: .87, name: 'Lock in', time: '01:04', cue: '' },
  { at: .965, name: 'All in', time: '01:12', cue: '' },
] as const

export type FilmSignal = { progress: number; velocity: number; visible: boolean }
export const clamp01 = (n: number) => Math.max(0, Math.min(1, n))
export const smooth = (a: number, b: number, p: number) => { const t = clamp01((p - a) / (b - a)); return t * t * (3 - 2 * t) }
export const windowed = (a: number, b: number, c: number, d: number, p: number) => smooth(a, b, p) * (1 - smooth(c, d, p))
export const shotAt = (p: number) => Math.max(0, SHOTS.findLastIndex(s => p >= s.at))
export const environmentAt = (p: number) => p >= .62 && p < .71 ? 0 : p >= .71 && p < .79 ? 1 : p >= .79 && p < .87 ? 2 : -1

// Every optical layer derives from scroll, so reversing is the same edit in reverse.
export const dewReveal = (p: number) => smooth(.45, .62, p)

// Each title clears before the next enters; a long, still hold gives LOCK IN its weight.
export function finaleAt(p: number) {
  return {
    quiet: windowed(.87, .888, .968, .985, p),
    lockIn: windowed(.877, .89, .925, .933, p),
    focz: windowed(.938, .947, .957, .966, p),
    ending: smooth(.968, .99, p),
  }
}

export function worldWeights(p: number): [number, number, number] {
  const snow = .16 * smooth(.455, .52, p) + .84 * smooth(.59, .65, p)
  const water = smooth(.696, .733, p)
  const terrain = smooth(.777, .814, p)
  const visibility = 1 - smooth(.85, .885, p)
  return [snow * (1 - water) * visibility, water * (1 - terrain) * visibility, terrain * visibility]
}

// Nonuniform Hermite interpolation preserves camera velocity across shot boundaries.
const CAMERA = [
  [0, .10, 1.47, .92, .02, 1.42, .12, 29],
  [.06, .38, 1.61, 1.04, .04, 1.39, .07, 28],
  [.14, .88, 1.71, 1.25, .04, 1.29, .04, 28],
  [.23, .64, .44, .92, .08, .37, .34, 30],
  [.34, .43, .28, 1.82, .025, .24, .24, 30],
  [.425, .34, .24, 3.45, .012, .15, .1, 31],
  [.455, .32, .23, 4.35, 0, .1, .04, 31],
  [.49, .305, .23, 5.88, 0, .078, .003, 31.8],
  [.505, .301, .23, 6.065, 0, .075, 0, 32],
  [.52, .3, .23, 6.1, 0, .075, 0, 32],
  [.62, .31, .25, 6.18, 0, .075, 0, 32],
  [.71, .32, .27, 6.22, 0, .075, 0, 32],
  [.79, .3, .28, 6.26, 0, .075, 0, 32],
  [.87, .3, .3, 6.35, 0, .075, 0, 32],
  [.95, .7, .4, 6.7, 0, .05, 0, 32],
  [1, .6, .42, 7.4, 0, .1, 0, 32],
] as const

export function cameraAt(progress: number) {
  const p = clamp01(progress)
  const i = Math.min(CAMERA.length - 2, Math.max(0, CAMERA.findLastIndex(k => p >= k[0])))
  const a = CAMERA[i], b = CAMERA[i + 1], before = CAMERA[Math.max(0, i - 1)], after = CAMERA[Math.min(CAMERA.length - 1, i + 2)]
  const dt = b[0] - a[0], t = (p - a[0]) / dt, t2 = t * t, t3 = t2 * t
  const value = (k: number) => {
    const m0 = (b[k] - before[k]) / (b[0] - before[0]) * dt
    const m1 = (after[k] - a[k]) / (after[0] - a[0]) * dt
    return (2 * t3 - 3 * t2 + 1) * a[k] + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * b[k] + (t3 - t2) * m1
  }
  return { position: [value(1), value(2), value(3)] as [number, number, number], target: [value(4), value(5), value(6)] as [number, number, number], fov: value(7) }
}
