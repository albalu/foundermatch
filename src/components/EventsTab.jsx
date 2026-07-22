import Avatar from './Avatar'

export default function EventsTab({ db, user, update }) {
  return (
    <div>
      <p className="tab-intro">
        Three activities, one goal: find the person you want to build with. Your
        ratings after each activity shape the next round of teams.
      </p>
      {db.events.map((ev) => (
        <EventCard key={ev.id} ev={ev} db={db} user={user} update={update} />
      ))}
    </div>
  )
}

function EventCard({ ev, db, user, update }) {
  const dropped = ev.dropouts.includes(user.pin)

  const toggleDropout = () =>
    update((d) => {
      const e = d.events.find((x) => x.id === ev.id)
      e.dropouts = e.dropouts.includes(user.pin)
        ? e.dropouts.filter((p) => p !== user.pin)
        : [...e.dropouts, user.pin]
    })

  return (
    <div className="card event-card">
      <div className="event-head">
        <span className="chip">Event {ev.order}</span>
        <h2>{ev.title}</h2>
      </div>
      <p className="event-blurb">{ev.blurb}</p>

      {ev.type === 'pitch' && (
        <>
          <div className="topics">
            <div className="section-label">Cover these in your pitch</div>
            <ol>
              {ev.topics.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </ol>
          </div>
          {ev.pitchOrder && (
            <div className="pitch-order">
              <div className="section-label">Pitch order</div>
              <ol>
                {ev.pitchOrder.map((pin) => (
                  <li key={pin} className={pin === user.pin ? 'me' : ''}>
                    {db.users[pin]?.name ?? 'Unknown'}
                    {pin === user.pin && ' (you)'}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {(ev.type === 'group' || ev.type === 'final') &&
        (ev.teams ? (
          <Teams teams={ev.teams} ev={ev} db={db} me={user} />
        ) : (
          <p className="waiting">
            Teams haven’t been formed yet — the organizer will match everyone
            from the latest ratings.
          </p>
        ))}

      {!user.isAdmin && (
        <div className="attendance">
          {dropped ? (
            <>
              <span className="tag tag-out">You’ve dropped out of this event</span>
              <button className="btn btn-ghost" onClick={toggleDropout}>Rejoin</button>
            </>
          ) : (
            <>
              <span className="tag tag-in">You’re in</span>
              <button className="btn btn-ghost" onClick={toggleDropout}>Drop out</button>
            </>
          )}
        </div>
      )}
      {!user.isAdmin && dropped && (
        <p className="hint">Dropping out only skips this event — you stay in the cohort.</p>
      )}
    </div>
  )
}

function Teams({ teams, ev, db, me }) {
  return (
    <div className="teams">
      {teams.map((team, i) => {
        const mine = me && team.includes(me.pin)
        return (
          <div className={'team' + (mine ? ' team-mine' : '')} key={i}>
            <div className="team-name">
              Team {i + 1}
              {mine && <span className="tag tag-in">your team</span>}
            </div>
            <div className="team-members">
              {team.map((pin) => {
                const u = db.users[pin]
                const out = ev.dropouts.includes(pin)
                if (!u) return null
                return (
                  <div key={pin} className={'team-member' + (out ? ' member-out' : '')}>
                    <Avatar user={u} size={26} />
                    <span>{u.name}</span>
                    {out && <span className="tag tag-out">dropped</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}
