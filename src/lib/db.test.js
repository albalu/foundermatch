import { describe, it, expect } from 'vitest'
import {
  recordScore, deleteScoreEntry, getScore, getHistory, clampScore, migrateDB,
  DEFAULT_SCORE, MIN_SCORE, MAX_SCORE,
} from './db.js'

const freshDB = () => ({ scores: {} })

describe('clampScore — the single bound enforcer', () => {
  it('caps above 10 back to 10 and below 0 back to 0', () => {
    expect(clampScore(10.5)).toBe(MAX_SCORE)
    expect(clampScore(999)).toBe(MAX_SCORE)
    expect(clampScore(-0.5)).toBe(MIN_SCORE)
    expect(clampScore(-999)).toBe(MIN_SCORE)
  })

  it('snaps to the 0.5 grid', () => {
    expect(clampScore(7.3)).toBe(7.5)
    expect(clampScore(7.2)).toBe(7)
    expect(clampScore(0.24)).toBe(0)
  })

  it('falls back to the default on garbage', () => {
    expect(clampScore(NaN)).toBe(DEFAULT_SCORE)
    expect(clampScore('9')).toBe(DEFAULT_SCORE)
    expect(clampScore(undefined)).toBe(DEFAULT_SCORE)
  })
})

describe('recordScore', () => {
  it('stores the clamped value and the delta of each update', () => {
    const db = freshDB()
    recordScore(db, 'a', 'b', 7, 'first impression')
    recordScore(db, 'a', 'b', 8.5, 'great in Q&A')
    const history = getHistory(db, 'a', 'b')
    expect(history.map((h) => h.delta)).toEqual([-3, 1.5])
    expect(getScore(db, 'a', 'b')).toBe(8.5)
  })

  it('clamps out-of-range and off-grid inputs at the door', () => {
    const db = freshDB()
    recordScore(db, 'a', 'b', 22, '')
    expect(getScore(db, 'a', 'b')).toBe(MAX_SCORE)
    recordScore(db, 'a', 'c', 3.3, '')
    expect(getScore(db, 'a', 'c')).toBe(3.5)
    recordScore(db, 'a', 'd', -4, '')
    expect(getScore(db, 'a', 'd')).toBe(MIN_SCORE)
  })
})

describe('deleteScoreEntry — delete an update and revert its change', () => {
  it('reverting a drop clamps the score back at the 10 ceiling', () => {
    const db = freshDB()
    recordScore(db, 'a', 'b', 7, 'drop 3')   // delta −3
    recordScore(db, 'a', 'b', 8, 'back up')  // delta +1
    deleteScoreEntry(db, 'a', 'b', 0)        // revert the −3 → 10 + 1 = 11 → 10
    expect(getScore(db, 'a', 'b')).toBe(MAX_SCORE)
    expect(getHistory(db, 'a', 'b')).toHaveLength(1)
  })

  it('reverting a raise clamps the score at the 0 floor', () => {
    const db = freshDB()
    recordScore(db, 'a', 'b', 1, '')  // −9
    recordScore(db, 'a', 'b', 6, '')  // +5
    recordScore(db, 'a', 'b', 2, '')  // −4
    deleteScoreEntry(db, 'a', 'b', 1) // revert the +5 → 10 − 13 = −3 → 0
    expect(getScore(db, 'a', 'b')).toBe(MIN_SCORE)
  })

  it('deleting the latest update reverts to the previous score', () => {
    const db = freshDB()
    recordScore(db, 'a', 'b', 9, '')
    recordScore(db, 'a', 'b', 7.5, '')
    deleteScoreEntry(db, 'a', 'b', 1)
    expect(getScore(db, 'a', 'b')).toBe(9)
  })

  it('deleting every update returns the score to the default 10', () => {
    const db = freshDB()
    recordScore(db, 'a', 'b', 6, '')
    recordScore(db, 'a', 'b', 4, '')
    deleteScoreEntry(db, 'a', 'b', 1)
    deleteScoreEntry(db, 'a', 'b', 0)
    expect(getScore(db, 'a', 'b')).toBe(DEFAULT_SCORE)
    expect(getHistory(db, 'a', 'b')).toHaveLength(0)
  })

  it('ignores out-of-range indexes and unknown pairs', () => {
    const db = freshDB()
    recordScore(db, 'a', 'b', 6, '')
    deleteScoreEntry(db, 'a', 'b', 5)
    deleteScoreEntry(db, 'a', 'b', -1)
    deleteScoreEntry(db, 'x', 'y', 0)
    expect(getScore(db, 'a', 'b')).toBe(6)
  })
})

describe('bulletproof reads and migration', () => {
  it('getScore clamps corrupted stored values', () => {
    const db = { scores: { a: { b: { value: 15, history: [] } } } }
    expect(getScore(db, 'a', 'b')).toBe(MAX_SCORE)
    db.scores.a.b.value = -3
    expect(getScore(db, 'a', 'b')).toBe(MIN_SCORE)
    db.scores.a.b.value = 'corrupt'
    expect(getScore(db, 'a', 'b')).toBe(DEFAULT_SCORE)
  })

  it('migrateDB backfills deltas on legacy histories so deletes revert correctly', () => {
    const db = {
      scores: {
        a: {
          b: {
            value: 8,
            history: [
              { value: 9, note: 'legacy', ts: 1 },
              { value: 8, note: 'legacy', ts: 2 },
            ],
          },
        },
      },
    }
    migrateDB(db)
    expect(getHistory(db, 'a', 'b').map((h) => h.delta)).toEqual([-1, -1])
    expect(getScore(db, 'a', 'b')).toBe(8)
    deleteScoreEntry(db, 'a', 'b', 0) // revert the −1 → 10 − 1 = 9
    expect(getScore(db, 'a', 'b')).toBe(9)
  })

  it('migrateDB scrubs seeded LinkedIn URLs but keeps user-entered ones', () => {
    const db = {
      scores: {},
      users: {
        '11111111': { pin: '11111111', name: 'Emma Sullivan', linkedin: 'https://www.linkedin.com/in/emma-sullivan' },
        '22222222': { pin: '22222222', name: 'Wei Chen', linkedin: 'https://www.linkedin.com/in/my-real-handle-9' },
        '33333333': { pin: '33333333', name: 'Priya Sharma', linkedin: '' },
      },
    }
    migrateDB(db)
    expect(db.users['11111111'].linkedin).toBe('')
    expect(db.users['22222222'].linkedin).toBe('https://www.linkedin.com/in/my-real-handle-9')
    expect(db.users['33333333'].linkedin).toBe('')
  })

  it('migrateDB pulls out-of-bound cached values back into range', () => {
    const db = { scores: { a: { b: { value: 42, history: [{ value: 42, note: '', ts: 1 }] } } } }
    migrateDB(db)
    expect(getScore(db, 'a', 'b')).toBe(MAX_SCORE)
  })
})
