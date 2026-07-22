import blossom from 'edmonds-blossom'
import { getScore } from './db.js'

// ---------------------------------------------------------------------------
// Matching engine
//
// Mutual interest between two founders is the geometric mean of the two
// directed scores: sqrt(a→b × b→a). Both people have to want it — a 10/2
// split (mutual 4.5) ranks well below an 8/8 (mutual 8).
//
// A tiny random jitter is added to every pair weight, which breaks ties.
// Since every score starts at the default 10, founders who never rate anyone
// are all tied — the jitter is exactly what makes the admin's matching of
// non-raters random, as intended.
//
// Pair matching (Event 3) is Edmonds' blossom algorithm (1965) — the
// standard exact algorithm for maximum-weight matching on a general graph —
// via the `edmonds-blossom` package (a port of Joris van Rathenau's
// reference mwmatching implementation). Run in maximum-cardinality mode on a
// complete graph, it provably never leaves anyone unmatched.
//
// Group formation (Event 2) is a heuristic: partitioning people into
// fixed-size teams that maximize intra-team weight is NP-hard (weighted
// clique partitioning), so there is no exact polynomial algorithm to reach
// for. Greedy top-choice seeding + 2-swap hill climbing is used instead, and
// the test suite pins the invariants that matter: everyone is placed exactly
// once, team sizes are correct, nobody dangles.
//
// TODO: pluggable strategies per event (stable roommates / Irving, an ILP
//       solver for provably-optimal groups, skill-diversity constraints,
//       judge-weighted final round, etc.)
// ---------------------------------------------------------------------------

export function mutualWeight(db, a, b) {
  return Math.sqrt(getScore(db, a, b) * getScore(db, b, a))
}

// Returns weight(a, b) with symmetric random tie-breaking baked in.
export function buildWeights(db, pins) {
  const w = new Map()
  const key = (a, b) => (a < b ? a + '|' + b : b + '|' + a)
  for (let i = 0; i < pins.length; i++)
    for (let j = i + 1; j < pins.length; j++)
      w.set(key(pins[i], pins[j]), mutualWeight(db, pins[i], pins[j]) + Math.random() * 0.01)
  return (a, b) => w.get(key(a, b)) ?? 0
}

// Split n people into teams as close to `target` as possible.
// 20 → [4,4,4,4,4] · 19 → [4,4,4,4,3] · 21 → [4,4,4,3,3,3]
export function teamSizes(n, target = 4) {
  if (n <= 0) return []
  const t = Math.max(1, Math.ceil(n / target))
  const base = Math.floor(n / t)
  const extra = n % t
  return Array.from({ length: t }, (_, i) => (i < extra ? base + 1 : base))
}

// Group formation (Event 2): greedy seeding on top mutual choices, then
// 2-swap hill climbing to maximize total intra-team mutual interest.
export function formGroups(pins, weight, target = 4) {
  const sizes = teamSizes(pins.length, target)
  const teams = sizes.map(() => [])
  const unassigned = new Set(pins)

  // Seed each team with the strongest remaining mutual pair (top choices first).
  for (const team of teams) {
    if (unassigned.size < 2) break
    const rest = [...unassigned]
    let best = null
    for (let i = 0; i < rest.length; i++)
      for (let j = i + 1; j < rest.length; j++) {
        const s = weight(rest[i], rest[j])
        if (!best || s > best.s) best = { a: rest[i], b: rest[j], s }
      }
    team.push(best.a, best.b)
    unassigned.delete(best.a)
    unassigned.delete(best.b)
  }

  // Greedy best-fit: place whoever fits best anywhere with room.
  while (unassigned.size) {
    let best = null
    for (const p of unassigned) {
      teams.forEach((team, ti) => {
        if (team.length >= sizes[ti]) return
        const avg = team.length
          ? team.reduce((s, m) => s + weight(p, m), 0) / team.length
          : 0
        if (!best || avg > best.avg) best = { p, ti, avg }
      })
    }
    teams[best.ti].push(best.p)
    unassigned.delete(best.p)
  }

  // 2-swap hill climbing until no swap improves the total.
  const link = (p, team, excl) =>
    team.reduce((s, m) => (m === p || m === excl ? s : s + weight(p, m)), 0)
  let improved = true
  let guard = 0
  while (improved && guard++ < 200) {
    improved = false
    for (let a = 0; a < teams.length; a++)
      for (let b = a + 1; b < teams.length; b++)
        for (let i = 0; i < teams[a].length; i++)
          for (let j = 0; j < teams[b].length; j++) {
            const p = teams[a][i]
            const q = teams[b][j]
            const delta =
              link(p, teams[b], q) + link(q, teams[a], p) -
              link(p, teams[a]) - link(q, teams[b])
            if (delta > 1e-9) {
              teams[a][i] = q
              teams[b][j] = p
              improved = true
            }
          }
  }
  return teams
}

// Final matching (Event 3): teams of 2, one team of 3 when the count is odd.
// Exact maximum-weight matching via Edmonds' blossom algorithm (O(n³), works
// at any cohort size). An odd headcount gets a zero-weight dummy node; whoever
// draws the dummy joins the pair that wants them most, forming the one triple.
export function formPairsAndTriples(pins, weight) {
  if (pins.length === 0) return []
  if (pins.length === 1) return [[pins[0]]]
  if (pins.length === 2) return [[pins[0], pins[1]]]

  const DUMMY = '__none__'
  const list = pins.length % 2 === 1 ? [...pins, DUMMY] : [...pins]

  // The reference implementation expects integer weights. maxCardinality mode
  // guarantees a perfect matching on this complete graph — nobody dangles.
  const SCALE = 1000
  const edges = []
  for (let i = 0; i < list.length; i++)
    for (let j = i + 1; j < list.length; j++) {
      const w = list[i] === DUMMY || list[j] === DUMMY ? 0 : weight(list[i], list[j])
      edges.push([i, j, Math.round(w * SCALE)])
    }
  const mate = blossom(edges, true)

  const teams = []
  // Strays: the dummy's partner, plus anyone the solver ever left unmatched
  // (can't happen with maxCardinality on a complete graph, but the no-dangling
  // guarantee shouldn't hinge on a dependency's internals).
  const strays = []
  for (let i = 0; i < list.length; i++) {
    const j = mate[i]
    if (j === -1) {
      if (list[i] !== DUMMY) strays.push(list[i])
      continue
    }
    if (j < i) continue // pair already emitted from the other end
    if (list[i] === DUMMY) strays.push(list[j])
    else if (list[j] === DUMMY) strays.push(list[i])
    else teams.push([list[i], list[j]])
  }
  while (strays.length >= 2) teams.push([strays.pop(), strays.pop()])
  if (strays.length === 1) {
    const p = strays[0]
    if (!teams.length) return [[p]]
    let best = null
    teams.forEach((t, i) => {
      const s = t.reduce((acc, m) => acc + weight(p, m), 0)
      if (!best || s > best.s) best = { i, s }
    })
    teams[best.i].push(p)
  }
  return teams
}

export function shuffle(arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
