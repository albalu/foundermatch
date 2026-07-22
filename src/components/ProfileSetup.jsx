import { useState } from 'react'
import Avatar from './Avatar'

export function normalizeLinkedin(raw) {
  const v = raw.trim()
  if (!v) return ''
  if (/^https?:\/\//i.test(v)) return v
  if (/linkedin\.com/i.test(v)) return 'https://' + v.replace(/^\/+/, '')
  return 'https://www.linkedin.com/in/' + v.replace(/^@/, '')
}

// First-time gate: an email or a LinkedIn profile (at least one) is required
// the first time a PIN is used.
export default function ProfileSetup({ user, update }) {
  const [email, setEmail] = useState(user.email || '')
  const [linkedin, setLinkedin] = useState(user.linkedin || '')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    const em = email.trim()
    const li = linkedin.trim()
    if (!em && !li) return setError('Add an email or LinkedIn — at least one, so your matches can reach you.')
    if (em && !/.+@.+\..+/.test(em)) return setError('That email doesn’t look right.')
    update((d) => {
      const u = d.users[user.pin]
      u.email = em
      u.linkedin = normalizeLinkedin(li)
      u.profileComplete = true
    })
  }

  return (
    <div className="app login-screen">
      <div className="login-hero">
        <Avatar user={user} size={72} />
        <h1>Welcome, {user.name.split(' ')[0]}!</h1>
        <p>Before you jump in — how can other founders reach you after the cohort?</p>
      </div>
      <form className="card" onSubmit={submit}>
        <label className="field-label" htmlFor="su-email">Email</label>
        <input
          id="su-email"
          className="text-input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError('') }}
        />
        <label className="field-label" htmlFor="su-li">LinkedIn</label>
        <input
          id="su-li"
          className="text-input"
          placeholder="linkedin.com/in/you"
          value={linkedin}
          onChange={(e) => { setLinkedin(e.target.value); setError('') }}
        />
        <p className="hint">At least one is required.</p>
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit">
          Let’s go
        </button>
      </form>
    </div>
  )
}
