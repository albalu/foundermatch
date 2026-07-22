import { useEffect, useState } from 'react'
import { loadDB, saveDB, getSession, setSession, clearSession } from './lib/db'
import { seedDB } from './lib/seed'
import Login from './components/Login'
import ProfileSetup from './components/ProfileSetup'
import RateTab from './components/RateTab'
import EventsTab from './components/EventsTab'
import AdminTab from './components/AdminTab'
import ProfileTab from './components/ProfileTab'

export default function App() {
  const [db, setDb] = useState(() => loadDB() ?? seedDB())
  const [pin, setPin] = useState(() => getSession())
  const [tab, setTab] = useState('events')

  useEffect(() => {
    saveDB(db)
  }, [db])

  // All mutations go through here: clone → mutate → set → (effect) persist.
  const update = (fn) =>
    setDb((prev) => {
      const next = structuredClone(prev)
      fn(next)
      return next
    })

  const user = pin ? db.users[pin] : null

  if (!user) {
    return (
      <Login
        db={db}
        onLogin={(p) => {
          setSession(p)
          setPin(p)
          setTab('events')
        }}
      />
    )
  }

  if (!user.profileComplete) {
    return <ProfileSetup user={user} update={update} />
  }

  const logout = () => {
    clearSession()
    setPin(null)
  }

  const tabs = user.isAdmin
    ? [
        { id: 'events', label: 'Events', icon: CalendarIcon },
        { id: 'admin', label: 'Admin', icon: SlidersIcon },
        { id: 'profile', label: 'Profile', icon: UserIcon },
      ]
    : [
        { id: 'events', label: 'Events', icon: CalendarIcon },
        { id: 'rate', label: 'Founders', icon: StarIcon },
        { id: 'profile', label: 'Profile', icon: UserIcon },
      ]

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          Founder<span>Match</span>
        </div>
        <div className="cohort-chip">{db.cohort.name}</div>
      </header>

      <main>
        {tab === 'events' && <EventsTab db={db} user={user} update={update} />}
        {tab === 'rate' && <RateTab db={db} user={user} update={update} />}
        {tab === 'admin' && user.isAdmin && <AdminTab db={db} update={update} />}
        {tab === 'profile' && <ProfileTab db={db} user={user} update={update} onLogout={logout} />}
      </main>

      <nav className="tabbar">
        {tabs.map((t) => (
          <button key={t.id} aria-label={t.label} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <t.icon />
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function CalendarIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="16" rx="3" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  )
}

function StarIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3l2.7 5.6 6.1.8-4.5 4.3 1.1 6L12 16.8 6.6 19.7l1.1-6L3.2 9.4l6.1-.8z" />
    </svg>
  )
}

function SlidersIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="8" cy="16" r="2.2" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="8" r="4" />
      <path d="M4.5 20.5c1.5-3.5 4.2-5 7.5-5s6 1.5 7.5 5" />
    </svg>
  )
}
