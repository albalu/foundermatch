import { cohortMembers, eventParticipants, ratingActivity, clearDB, clearSession } from '../lib/db'
import { buildWeights, formGroups, formPairsAndTriples, shuffle } from '../lib/matching'

export default function AdminTab({ db, update }) {
  const members = cohortMembers(db)

  const generate = (ev) =>
    update((d) => {
      const e = d.events.find((x) => x.id === ev.id)
      const pins = eventParticipants(d, e).map((u) => u.pin)
      if (e.type === 'pitch') {
        e.pitchOrder = shuffle(pins)
      } else {
        const weight = buildWeights(d, pins)
        e.teams = e.type === 'group' ? formGroups(pins, weight, 4) : formPairsAndTriples(pins, weight)
      }
      e.formedAt = Date.now()
    })

  return (
    <div>
      <div className="card">
        <h2>Cohort “{db.cohort.name}”</h2>
        <p className="event-blurb">
          {members.length} founders. Matching uses each pair’s mutual score
          (geometric mean of both directions) — founders who never adjust their
          ratings are still all at 10s, so they’re placed randomly.
        </p>
      </div>

      {db.events.map((ev) => {
        const attending = eventParticipants(db, ev).length
        const droppedCount = members.length - attending
        const done = ev.type === 'pitch' ? !!ev.pitchOrder : !!ev.teams
        const label =
          ev.type === 'pitch'
            ? done ? 'Reshuffle pitch order' : 'Shuffle pitch order'
            : ev.type === 'group'
              ? done ? 'Re-form teams of ~4' : 'Form teams of ~4'
              : done ? 'Re-form final teams (2–3)' : 'Form final teams (2–3)'
        return (
          <div className="card" key={ev.id}>
            <div className="event-head">
              <span className="chip">Event {ev.order}</span>
              <h2>{ev.title}</h2>
            </div>
            <p className="admin-attendance">
              {attending} attending{droppedCount > 0 && ` · ${droppedCount} dropped out`}
            </p>
            <button className="btn btn-primary" onClick={() => generate(ev)}>
              {label}
            </button>
            {done && (
              <p className="hint">
                {ev.type === 'pitch' ? 'Order set' : 'Teams formed'} — everyone can
                see the result on their Events tab.
                {ev.type !== 'pitch' && ' Re-form after ratings change or someone drops out.'}
              </p>
            )}
          </div>
        )
      })}

      <div className="card">
        <h2>Founder activity</h2>
        <p className="event-blurb">Rating updates made, and who’s attending what.</p>
        <div className="activity-table">
          <div className="activity-row activity-header">
            <span>Founder</span>
            <span>E1</span>
            <span>E2</span>
            <span>E3</span>
            <span className="num">Updates</span>
          </div>
          {members
            .slice()
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((m) => (
              <div className="activity-row" key={m.pin}>
                <span>{m.name}</span>
                {db.events.map((ev) => (
                  <span key={ev.id} className={ev.dropouts.includes(m.pin) ? 'dot dot-out' : 'dot dot-in'}>
                    {ev.dropouts.includes(m.pin) ? '✕' : '✓'}
                  </span>
                ))}
                <span className="num">{ratingActivity(db, m.pin)}</span>
              </div>
            ))}
        </div>
      </div>

      <div className="card danger-card">
        <h2>Danger zone</h2>
        <button
          className="btn btn-danger"
          onClick={() => {
            if (confirm('Reset ALL demo data (scores, teams, dropouts) and reseed the test cohort?')) {
              clearDB()
              clearSession()
              location.reload()
            }
          }}
        >
          Reset demo data
        </button>
      </div>
    </div>
  )
}
