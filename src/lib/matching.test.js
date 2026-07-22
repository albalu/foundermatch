import { describe, it, expect } from 'vitest'
import { teamSizes, formGroups, formPairsAndTriples, buildWeights } from './matching.js'

// Deterministic PRNG so failures are reproducible.
function lcg(seed) {
  let s = seed >>> 0
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0
    return s / 2 ** 32
  }
}

const makePins = (n) => Array.from({ length: n }, (_, i) => 'p' + String(i).padStart(2, '0'))

function randomWeight(n, seed) {
  const rand = lcg(seed)
  const cache = new Map()
  return (a, b) => {
    const k = a < b ? a + '|' + b : b + '|' + a
    if (!cache.has(k)) cache.set(k, rand() * 10)
    return cache.get(k)
  }
}

// Every person appears exactly once across all teams — nobody dangling,
// nobody duplicated. The core invariant of the whole matching engine.
function expectFullCoverage(teams, pins) {
  const flat = teams.flat()
  expect(flat.length).toBe(pins.length)
  expect(new Set(flat).size).toBe(pins.length)
  expect(new Set(flat)).toEqual(new Set(pins))
}

describe('teamSizes', () => {
  it('always sums to n with teams of at most 4', () => {
    for (let n = 1; n <= 60; n++) {
      const sizes = teamSizes(n, 4)
      expect(sizes.reduce((a, b) => a + b, 0)).toBe(n)
      expect(Math.max(...sizes)).toBeLessThanOrEqual(4)
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(1)
      if (n >= 6) expect(Math.min(...sizes)).toBeGreaterThanOrEqual(3)
    }
  })

  it('matches the spec examples', () => {
    expect(teamSizes(20)).toEqual([4, 4, 4, 4, 4])
    expect(teamSizes(19)).toEqual([4, 4, 4, 4, 3])
    expect(teamSizes(21)).toEqual([4, 4, 4, 3, 3, 3])
  })
})

describe('formGroups (Event 2 — teams of ~4)', () => {
  it('places everyone exactly once for cohort sizes 3–40', () => {
    for (let n = 3; n <= 40; n++) {
      const pins = makePins(n)
      const teams = formGroups(pins, randomWeight(n, n * 7 + 1), 4)
      expectFullCoverage(teams, pins)
      expect(teams.map((t) => t.length)).toEqual(teamSizes(n, 4))
    }
  })

  it('keeps a mutually top-choice pair together', () => {
    const pins = makePins(12)
    // p00–p01 love each other (weight 10); everything else is lukewarm.
    const weight = (a, b) =>
      (a === 'p00' && b === 'p01') || (a === 'p01' && b === 'p00') ? 10 : 3
    const teams = formGroups(pins, weight, 4)
    const teamOf = (p) => teams.find((t) => t.includes(p))
    expect(teamOf('p00')).toBe(teamOf('p01'))
  })

  it('still places a person everyone rated at zero', () => {
    const pins = makePins(20)
    const weight = (a, b) => (a === 'p19' || b === 'p19' ? 0 : 5)
    const teams = formGroups(pins, weight, 4)
    expectFullCoverage(teams, pins)
  })
})

describe('formPairsAndTriples (Event 3 — Edmonds blossom)', () => {
  it('places everyone exactly once for cohort sizes 1–41', () => {
    for (let n = 1; n <= 41; n++) {
      const pins = makePins(n)
      const teams = formPairsAndTriples(pins, randomWeight(n, n * 13 + 5))
      expectFullCoverage(teams, pins)
      if (n >= 4) {
        // Pairs everywhere, with exactly one triple when the count is odd.
        const sizes = teams.map((t) => t.length)
        expect(sizes.filter((s) => s === 3).length).toBe(n % 2)
        expect(sizes.every((s) => s === 2 || s === 3)).toBe(true)
      }
    }
  })

  it('handles tiny cohorts', () => {
    expect(formPairsAndTriples(makePins(1), () => 1)).toEqual([['p00']])
    expect(formPairsAndTriples(makePins(2), () => 1)).toEqual([['p00', 'p01']])
    expect(formPairsAndTriples(makePins(3), () => 1).flat().sort()).toEqual(['p00', 'p01', 'p02'])
  })

  it('matches the brute-force optimum on random instances (n ≤ 10)', () => {
    // Oracle: try every perfect matching.
    function bruteBest(list, wf) {
      if (!list.length) return 0
      const [a, ...rest] = list
      let best = -Infinity
      for (let i = 0; i < rest.length; i++) {
        const others = rest.filter((_, j) => j !== i)
        best = Math.max(best, wf(a, rest[i]) + bruteBest(others, wf))
      }
      return best
    }
    for (const n of [4, 6, 8, 10]) {
      for (let trial = 0; trial < 10; trial++) {
        const pins = makePins(n)
        const wf = randomWeight(n, n * 1000 + trial)
        const teams = formPairsAndTriples(pins, wf)
        const total = teams.reduce((s, [a, b]) => s + wf(a, b), 0)
        // Engine rounds weights to 1/1000ths, so allow that much slack.
        expect(total).toBeGreaterThanOrEqual(bruteBest(pins, wf) - (n / 2) * 0.001)
      }
    }
  })

  it('fuzz: 100 random cohorts, full coverage every time', () => {
    // Deliberately varied weights so the blossom algorithm's inner machinery
    // (addBlossom / expandBlossom) is exercised — this is also what guards the
    // strict-mode patch in patches/edmonds-blossom+1.0.0.patch.
    const rand = lcg(2024)
    for (let trial = 0; trial < 100; trial++) {
      const n = 5 + Math.floor(rand() * 37) // 5..41
      const pins = makePins(n)
      const teams = formPairsAndTriples(pins, randomWeight(n, trial * 31 + 7))
      expectFullCoverage(teams, pins)
      expect(teams.every((t) => t.length === 2 || t.length === 3)).toBe(true)
    }
  })

  it('pairs mutually top-choice people and never drops the unpopular one', () => {
    const pins = makePins(9) // odd → one triple
    const weight = (a, b) => {
      if ((a === 'p00' && b === 'p01') || (a === 'p01' && b === 'p00')) return 10
      if (a === 'p08' || b === 'p08') return 0 // p08 rated 0 by everyone
      return 4
    }
    const teams = formPairsAndTriples(pins, weight)
    expectFullCoverage(teams, pins)
    const teamOf = (p) => teams.find((t) => t.includes(p))
    expect(teamOf('p00')).toBe(teamOf('p01'))
    expect(teamOf('p08')).toBeTruthy()
  })
})

describe('end-to-end with real score data', () => {
  it('an untouched cohort (all default 10s) still fully matches — randomly via jitter', () => {
    const db = { scores: {} }
    const pins = makePins(20)
    const weight = buildWeights(db, pins)
    expectFullCoverage(formGroups(pins, weight, 4), pins)
    expectFullCoverage(formPairsAndTriples(pins, weight), pins)
  })

  it('dropouts are excluded and everyone else is still placed', () => {
    const db = { scores: {} }
    const all = makePins(20)
    const dropouts = new Set(['p03', 'p11'])
    const pins = all.filter((p) => !dropouts.has(p))
    const weight = buildWeights(db, pins)
    const groups = formGroups(pins, weight, 4)
    expectFullCoverage(groups, pins)
    expect(groups.flat()).not.toContain('p03')
    const finals = formPairsAndTriples(pins, weight)
    expectFullCoverage(finals, pins)
    expect(finals.flat()).not.toContain('p11')
  })
})
