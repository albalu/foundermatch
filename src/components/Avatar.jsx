import { useId } from 'react'

// Procedural SVG portrait — deterministic per user (see seed.js avatar config).
// TODO: replace with uploaded photos once a backend exists.
export default function Avatar({ user, size = 44 }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, '')
  const a = user.avatar

  if (!a) {
    // Admin / users without an avatar config get initials.
    const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('')
    return (
      <div className="avatar-fallback" style={{ width: size, height: size, fontSize: size * 0.38 }}>
        {initials}
      </div>
    )
  }

  const hairFront = () => {
    switch (a.style) {
      case 'crop':
        return <ellipse cx="32" cy="17.5" rx="11.6" ry="7" fill={a.hair} />
      case 'waves':
        return <ellipse cx="32" cy="16.5" rx="11.3" ry="5.8" fill={a.hair} />
      case 'part':
        return (
          <g fill={a.hair}>
            <ellipse cx="30.5" cy="17.5" rx="11.6" ry="7" />
            <path d="M40 14 q4 3 3.5 9 q-3 -3 -6 -4 z" />
          </g>
        )
      case 'curly':
        return (
          <g fill={a.hair}>
            <circle cx="23.5" cy="16" r="6.5" />
            <circle cx="32" cy="12.5" r="7.5" />
            <circle cx="40.5" cy="16" r="6.5" />
            <ellipse cx="32" cy="18" rx="11.5" ry="6.5" />
          </g>
        )
      case 'bun':
        return (
          <g fill={a.hair}>
            <circle cx="32" cy="9" r="5.5" />
            <ellipse cx="32" cy="17.5" rx="11.6" ry="7" />
          </g>
        )
      case 'long':
        return <ellipse cx="32" cy="17.5" rx="11.8" ry="7.2" fill={a.hair} />
      case 'bald':
      default:
        return null
    }
  }

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={user.name} className="avatar">
      <defs>
        <clipPath id={id}>
          <circle cx="32" cy="32" r="32" />
        </clipPath>
      </defs>
      <g clipPath={`url(#${id})`}>
        <circle cx="32" cy="32" r="32" fill={a.bg} />
        {a.style === 'long' && (
          <path d="M32 9 C19 9 16.5 21 16.5 29 L16.5 50 C16.5 52 18 53 20 53 L44 53 C46 53 47.5 52 47.5 50 L47.5 29 C47.5 21 45 9 32 9 Z" fill={a.hair} />
        )}
        <path d="M9 64 C9 49 20 43 32 43 C44 43 55 49 55 64 Z" fill={a.shirt} />
        <rect x="27.5" y="31" width="9" height="9" rx="3.5" fill={a.skin} />
        <ellipse cx="32" cy="26" rx="11" ry="12" fill={a.skin} />
        {a.beard && (
          <path d="M21.5 27 a10.5 11.5 0 0 0 21 0 v3.5 a10.5 9.5 0 0 1 -21 0 z" fill={a.hair} opacity="0.9" />
        )}
        {hairFront()}
        {a.glasses && (
          <g stroke="#2f2f2f" strokeWidth="1.4" fill="none">
            <circle cx="26.5" cy="26.5" r="4.1" />
            <circle cx="37.5" cy="26.5" r="4.1" />
            <path d="M30.6 26.2 h2.8" />
          </g>
        )}
      </g>
    </svg>
  )
}
