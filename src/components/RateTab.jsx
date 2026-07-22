import { useState } from 'react'
import Avatar from './Avatar'
import {
  cohortMembers, getScore, getHistory, recordScore, deleteScoreEntry,
  clampScore, fmtScore, MIN_SCORE, MAX_SCORE, STEP,
} from '../lib/db'

const fmtDelta = (d) => (d > 0 ? '+' : '') + (Number.isInteger(d) ? d : d.toFixed(1))

// Ratings can be revisited at any time — before, during, or after any event.
// Each change can carry a note so founders remember why they moved a score.
export default function RateTab({ db, user, update }) {
  const others = cohortMembers(db)
    .filter((u) => u.pin !== user.pin)
    .sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div>
      <p className="tab-intro">
        How interested are you in following up with each founder? Everyone starts
        at <strong>10</strong> — nudge scores as you learn more. Your ratings are
        private; only team matching uses them.
      </p>
      <div className="card list-card">
        {others.map((f) => (
          <FounderRow key={f.pin} founder={f} db={db} me={user} update={update} />
        ))}
      </div>
    </div>
  )
}

function FounderRow({ founder, db, me, update }) {
  const saved = getScore(db, me.pin, founder.pin)
  const history = getHistory(db, me.pin, founder.pin)
  const [draft, setDraft] = useState(null) // null = no pending change
  const [note, setNote] = useState('')
  const [showHistory, setShowHistory] = useState(false)

  const current = draft ?? saved

  // Functional update so rapid taps can't read a stale draft and drop steps.
  const change = (delta) => {
    setDraft((prev) => {
      const next = clampScore((prev ?? saved) + delta)
      return next === saved ? null : next
    })
  }

  const save = () => {
    update((d) => recordScore(d, me.pin, founder.pin, draft, note))
    setDraft(null)
    setNote('')
  }

  const cancel = () => {
    setDraft(null)
    setNote('')
  }

  const removeEntry = (index) => {
    if (!confirm('Delete this update and revert its score change?')) return
    update((d) => deleteScoreEntry(d, me.pin, founder.pin, index))
    setDraft(null) // the saved score just moved — drop any pending edit
    setNote('')
  }

  return (
    <div className="founder-row">
      <div className="founder-main">
        <Avatar user={founder} size={44} />
        <div className="founder-id">
          <div className="founder-name">{founder.name}</div>
          <div className="founder-tagline">{founder.tagline}</div>
          {history.length > 0 && (
            <button className="link-btn" onClick={() => setShowHistory(!showHistory)}>
              {showHistory ? 'Hide history' : `History (${history.length})`}
            </button>
          )}
        </div>
        <div className="stepper">
          <button aria-label={`Lower score for ${founder.name}`} onClick={() => change(-STEP)} disabled={current <= MIN_SCORE}>
            −
          </button>
          <span className={'score' + (draft !== null ? ' pending' : '')}>{fmtScore(current)}</span>
          <button aria-label={`Raise score for ${founder.name}`} onClick={() => change(STEP)} disabled={current >= MAX_SCORE}>
            +
          </button>
        </div>
      </div>

      {draft !== null && (
        <div className="note-panel">
          <input
            className="text-input"
            placeholder="Why the change? (optional note for future-you)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="note-actions">
            <button className="btn btn-ghost" onClick={cancel}>Cancel</button>
            <button className="btn btn-primary" onClick={save}>
              Save {fmtScore(draft)}
            </button>
          </div>
        </div>
      )}

      {showHistory && history.length > 0 && (
        <ul className="history">
          {history
            .map((h, index) => ({ ...h, index }))
            .reverse()
            .map((h) => (
              <li key={`${h.ts}-${h.index}`}>
                <span className="history-score">{fmtScore(h.value)}</span>
                <span className={'history-delta' + (h.delta < 0 ? ' down' : h.delta > 0 ? ' up' : '')}>
                  {fmtDelta(h.delta ?? 0)}
                </span>
                <span className="history-note">{h.note || 'no note'}</span>
                <span className="history-ts">
                  {new Date(h.ts).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                </span>
                <button
                  className="history-delete"
                  aria-label="Delete this update and revert its change"
                  title="Delete this update and revert its change"
                  onClick={() => removeEntry(h.index)}
                >
                  ×
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
