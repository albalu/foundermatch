// Data layer — localStorage is the POC "database".
// The 8-digit PIN doubles as the user id (unique across all users, all cohorts).
// TODO: swap for a real backend (Postgres/SQLite); the shape below maps 1:1 to tables
//       (users, scores, score_history, events, event_dropouts).

const DB_KEY = 'foundermatch:db:v1'
const SESSION_KEY = 'foundermatch:session'

export const MIN_SCORE = 0
export const MAX_SCORE = 10
export const STEP = 0.5
// Everyone starts at a mutual 10/10 — founders who never touch their ratings
// are indistinguishable from each other, so matching places them randomly.
export const DEFAULT_SCORE = 10

export function loadDB() {
  try {
    const raw = localStorage.getItem(DB_KEY)
    return raw ? migrateDB(JSON.parse(raw)) : null
  } catch {
    return null
  }
}

// Backfill `delta` on history entries written before deltas existed, and
// re-derive every cached score through the clamp — after this runs, all
// stored scores are guaranteed in bounds regardless of what was on disk.
export function migrateDB(db) {
  if (!db?.scores) return db
  // Scrub seeded LinkedIn URLs from previously stored data: early seeds
  // shipped linkedin.com/in/<name-slug>, which resolve to real profiles.
  // Only the exact seeded pattern is removed — anything a user typed stays.
  for (const u of Object.values(db.users ?? {})) {
    if (!u.linkedin || !u.name) continue
    const slug = u.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '')
    if (u.linkedin === `https://www.linkedin.com/in/${slug}`) u.linkedin = ''
  }
  for (const rated of Object.values(db.scores)) {
    for (const entry of Object.values(rated)) {
      let prev = DEFAULT_SCORE
      for (const h of entry.history) {
        if (typeof h.delta !== 'number' || Number.isNaN(h.delta)) {
          h.delta = clampScore(h.value) - prev
        }
        prev = clampScore(h.value)
      }
      entry.value = replayScore(entry.history)
    }
  }
  return db
}

export function saveDB(db) {
  localStorage.setItem(DB_KEY, JSON.stringify(db))
}

export function clearDB() {
  localStorage.removeItem(DB_KEY)
}

export function getSession() {
  return localStorage.getItem(SESSION_KEY)
}
export function setSession(pin) {
  localStorage.setItem(SESSION_KEY, pin)
}
export function clearSession() {
  localStorage.removeItem(SESSION_KEY)
}

export function cohortMembers(db) {
  return Object.values(db.users).filter((u) => !u.isAdmin)
}

// Reads pass through the clamp too — even hand-edited storage can't produce
// an out-of-bounds score anywhere in the app or the matching engine.
export function getScore(db, rater, ratee) {
  const entry = db.scores[rater]?.[ratee]
  return entry ? clampScore(entry.value) : DEFAULT_SCORE
}

export function getHistory(db, rater, ratee) {
  return db.scores[rater]?.[ratee]?.history ?? []
}

// A score is always DEFAULT + the sum of surviving deltas, clamped. This is
// what makes deleting any history entry cleanly revert exactly that change.
function replayScore(history) {
  return clampScore(history.reduce((v, h) => v + (h.delta ?? 0), DEFAULT_SCORE))
}

// Mutates db — call inside App's update().
export function recordScore(db, rater, ratee, value, note) {
  const mine = (db.scores[rater] ??= {})
  const entry = (mine[ratee] ??= { value: DEFAULT_SCORE, history: [] })
  const next = clampScore(value)
  const delta = next - clampScore(entry.value)
  entry.history.push({ value: next, delta, note: (note || '').trim(), ts: Date.now() })
  entry.value = next
}

// Delete one update (by position in history) and revert its score change:
// the remaining deltas replay from the default 10, clamped back into 0–10
// whenever the removal would push the score out of bounds.
export function deleteScoreEntry(db, rater, ratee, index) {
  const entry = db.scores[rater]?.[ratee]
  if (!entry || index < 0 || index >= entry.history.length) return
  entry.history.splice(index, 1)
  entry.value = replayScore(entry.history)
}

// How many rating updates this founder has made (admin activity view).
export function ratingActivity(db, rater) {
  return Object.values(db.scores[rater] ?? {}).reduce((n, e) => n + e.history.length, 0)
}

// Dropping out of an event only skips that event — they stay in the cohort.
export function eventParticipants(db, event) {
  return cohortMembers(db).filter((u) => !event.dropouts.includes(u.pin))
}

// THE bound enforcer — every score write, replay, and read funnels through
// here: snap to the 0.5 grid, floor at 0, ceiling at 10. Anything that isn't
// a usable number falls back to the default.
export function clampScore(v) {
  if (typeof v !== 'number' || Number.isNaN(v)) return DEFAULT_SCORE
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(v * 2) / 2))
}

export function fmtScore(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
