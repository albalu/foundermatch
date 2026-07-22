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
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
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

export function getScore(db, rater, ratee) {
  return db.scores[rater]?.[ratee]?.value ?? DEFAULT_SCORE
}

export function getHistory(db, rater, ratee) {
  return db.scores[rater]?.[ratee]?.history ?? []
}

// Mutates db — call inside App's update().
export function recordScore(db, rater, ratee, value, note) {
  const mine = (db.scores[rater] ??= {})
  const entry = (mine[ratee] ??= { value: DEFAULT_SCORE, history: [] })
  entry.value = value
  entry.history.push({ value, note: (note || '').trim(), ts: Date.now() })
}

// How many rating updates this founder has made (admin activity view).
export function ratingActivity(db, rater) {
  return Object.values(db.scores[rater] ?? {}).reduce((n, e) => n + e.history.length, 0)
}

// Dropping out of an event only skips that event — they stay in the cohort.
export function eventParticipants(db, event) {
  return cohortMembers(db).filter((u) => !event.dropouts.includes(u.pin))
}

export function clampScore(v) {
  return Math.min(MAX_SCORE, Math.max(MIN_SCORE, Math.round(v * 2) / 2))
}

export function fmtScore(v) {
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}
