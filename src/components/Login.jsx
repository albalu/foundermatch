import { useState } from 'react'

// Auth is intentionally minimal: an 8-digit PIN, unique across all users,
// is both the credential and the user id.
export default function Login({ db, onLogin }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')

  const submit = (e) => {
    e.preventDefault()
    if (!/^\d{8}$/.test(pin)) return setError('Enter your 8-digit PIN.')
    if (!db.users[pin]) return setError('PIN not found — double-check with your organizer.')
    onLogin(pin)
  }

  return (
    <div className="app login-screen">
      <div className="login-hero">
        <div className="login-logo">🤝</div>
        <h1>
          Founder<span>Match</span>
        </h1>
        <p>Meet your cohort. Rate the chemistry. Find your co-founder.</p>
      </div>
      <form className="card" onSubmit={submit}>
        <label className="field-label" htmlFor="pin">
          Your 8-digit PIN
        </label>
        <input
          id="pin"
          className="pin-input"
          inputMode="numeric"
          autoComplete="off"
          maxLength={8}
          placeholder="········"
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, ''))
            setError('')
          }}
        />
        {error && <p className="error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit">
          Enter your cohort
        </button>
        <p className="hint">Demo PINs are listed in the project README.</p>
      </form>
    </div>
  )
}
