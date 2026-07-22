import { useState } from 'react'
import Avatar from './Avatar'
import { normalizeLinkedin } from './ProfileSetup'

export default function ProfileTab({ db, user, update, onLogout }) {
  const [email, setEmail] = useState(user.email || '')
  const [linkedin, setLinkedin] = useState(user.linkedin || '')
  const [msg, setMsg] = useState('')

  const save = (e) => {
    e.preventDefault()
    const em = email.trim()
    const li = linkedin.trim()
    if (!user.isAdmin) {
      if (!em && !li) return setMsg('Keep at least one way to reach you — email or LinkedIn.')
      if (em && !/.+@.+\..+/.test(em)) return setMsg('That email doesn’t look right.')
    }
    update((d) => {
      const u = d.users[user.pin]
      u.email = em
      u.linkedin = normalizeLinkedin(li)
    })
    setMsg('Saved ✓')
  }

  return (
    <div>
      <div className="card profile-card">
        <Avatar user={user} size={72} />
        <div>
          <h2>{user.name}</h2>
          {user.tagline && <p className="founder-tagline">{user.tagline}</p>}
          <p className="hint">
            Cohort “{db.cohort.name}” · PIN {user.pin}
          </p>
        </div>
      </div>

      {!user.isAdmin && (
        <form className="card" onSubmit={save}>
          <label className="field-label" htmlFor="pf-email">Email</label>
          <input
            id="pf-email"
            className="text-input"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setMsg('') }}
          />
          <label className="field-label" htmlFor="pf-li">LinkedIn</label>
          <input
            id="pf-li"
            className="text-input"
            value={linkedin}
            onChange={(e) => { setLinkedin(e.target.value); setMsg('') }}
          />
          {msg && <p className={msg.startsWith('Saved') ? 'hint' : 'error'}>{msg}</p>}
          <button className="btn btn-primary" type="submit">Save</button>
        </form>
      )}

      <div className="card">
        <button className="btn btn-ghost btn-block" onClick={onLogout}>
          Log out
        </button>
      </div>
    </div>
  )
}
