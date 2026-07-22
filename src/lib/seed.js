import { saveDB } from './db'

// ---------------------------------------------------------------------------
// Test cohort — "Benjamin Franklin" (cohorts are named after famous American
// founders & founding companies).
// TODO: multi-cohort support — next cohort names on deck: Thomas Edison,
//       Madam C.J. Walker, Hewlett-Packard, Jobs & Wozniak, Henry Ford.
//
// Avatars are procedurally drawn SVG portraits (skin/hair/style per person).
// TODO: real photo uploads once there's a backend.
// ---------------------------------------------------------------------------

export const ADMIN_PIN = '00000000'

const SHIRTS = ['#4f46e5', '#0891b2', '#db2777', '#d97706', '#059669', '#7c3aed', '#dc2626', '#2563eb']
const BGS = ['#eef2ff', '#ecfeff', '#fdf2f8', '#fffbeb', '#ecfdf5', '#f5f3ff', '#fef2f2', '#eff6ff']

// profileComplete:false → demonstrates the first-login contact gate (email or
// LinkedIn required the first time a PIN is used).
const TEST_FOUNDERS = [
  { pin: '71543028', name: 'Tyler Brooks', tagline: 'AI copilot for independent insurance agents', avatar: { skin: '#f5cba8', hair: '#7b4b22', style: 'crop' }, onboarded: false },
  { pin: '39274615', name: 'Emma Sullivan', tagline: 'Marketplace for short-term lab equipment', avatar: { skin: '#f6d0b0', hair: '#c9a15c', style: 'long' } },
  { pin: '82635190', name: 'Jake Morrison', tagline: 'Cash-flow banking for seasonal small businesses', avatar: { skin: '#f0c39b', hair: '#3b2a1a', style: 'part', beard: true } },
  { pin: '46198237', name: 'Sarah Whitfield', tagline: 'Climate-risk analytics for home buyers', avatar: { skin: '#f5cba8', hair: '#8c4a24', style: 'bun', glasses: true } },
  { pin: '15982647', name: "Ryan O'Connor", tagline: 'Auto-generated integration tests for devs', avatar: { skin: '#f2c6a0', hair: '#a8552f', style: 'crop' } },
  { pin: '63821974', name: 'Marcus Johnson', tagline: "Telehealth for men's preventive care", avatar: { skin: '#6f4823', hair: '#17110c', style: 'waves', beard: true } },
  { pin: '28464951', name: 'Imani Washington', tagline: 'Payroll & benefits for the creator economy', avatar: { skin: '#8d5524', hair: '#17110c', style: 'curly' } },
  { pin: '94316285', name: 'Darius Coleman', tagline: 'Route optimization for independent trucking fleets', avatar: { skin: '#5c3a1e', hair: '#17110c', style: 'bald', beard: true } },
  { pin: '57204863', name: 'Keisha Thompson', tagline: 'College-application coaching at scale', avatar: { skin: '#7a4a26', hair: '#241a12', style: 'long' } },
  { pin: '31687542', name: 'Priya Sharma', tagline: 'AI scribe for veterinary clinics', avatar: { skin: '#c68642', hair: '#241a12', style: 'long' }, onboarded: false },
  { pin: '68153429', name: 'Arjun Patel', tagline: 'Supply-chain visibility for mid-market manufacturers', avatar: { skin: '#b87a3f', hair: '#241a12', style: 'crop', beard: true } },
  { pin: '24957816', name: 'Ananya Iyer', tagline: 'Consumer health app for PCOS management', avatar: { skin: '#c08048', hair: '#241a12', style: 'bun', glasses: true } },
  { pin: '85742931', name: 'Rohan Mehta', tagline: 'B2B payments reconciliation engine', avatar: { skin: '#a96b35', hair: '#241a12', style: 'part', glasses: true } },
  { pin: '49325178', name: 'Wei Chen', tagline: 'Robotics for last-mile grocery fulfillment', avatar: { skin: '#efcb9c', hair: '#241a12', style: 'crop' }, onboarded: false },
  { pin: '76891354', name: 'Grace Zhang', tagline: 'No-code data pipelines for ops teams', avatar: { skin: '#f3d3a5', hair: '#241a12', style: 'long' } },
  { pin: '13579246', name: 'Kevin Liu', tagline: 'Matchmaking-as-a-service for game studios', avatar: { skin: '#eec896', hair: '#241a12', style: 'part', glasses: true } },
  { pin: '92468135', name: 'Mei Wang', tagline: 'Sustainable packaging marketplace', avatar: { skin: '#f3d3a5', hair: '#241a12', style: 'bun' } },
  { pin: '58317642', name: 'Sofia Ramirez', tagline: 'Remittance-linked micro-savings for families', avatar: { skin: '#ce9560', hair: '#3b2a1a', style: 'long' } },
  { pin: '36925814', name: 'Omar Haddad', tagline: 'Halal food discovery & delivery network', avatar: { skin: '#c89563', hair: '#241a12', style: 'crop', beard: true } },
  { pin: '81264573', name: 'Ji-ho Park', tagline: 'AI interview practice for non-native English speakers', avatar: { skin: '#f0cd9e', hair: '#241a12', style: 'waves' } },
]

const PITCH_TOPICS = [
  'Your background',
  'Your latest project — what is it?',
  'How you ended up working on it, and why',
  'What you are looking for in a co-founder',
  'What you hope to get out of this cohort',
]

export function seedDB() {
  const pins = new Set(TEST_FOUNDERS.map((f) => f.pin))
  if (pins.size !== TEST_FOUNDERS.length || pins.has(ADMIN_PIN)) {
    throw new Error('Test PINs must be unique')
  }

  const users = {}
  TEST_FOUNDERS.forEach((f, i) => {
    const slug = f.name.toLowerCase().replace(/[^a-z]+/g, '-').replace(/(^-|-$)/g, '')
    users[f.pin] = {
      pin: f.pin,
      name: f.name,
      tagline: f.tagline,
      email: f.onboarded === false ? '' : `${slug}@example.com`,
      linkedin: '',
      profileComplete: f.onboarded !== false,
      avatar: { ...f.avatar, shirt: SHIRTS[i % SHIRTS.length], bg: BGS[i % BGS.length] },
    }
  })
  users[ADMIN_PIN] = {
    pin: ADMIN_PIN,
    name: 'Cohort Organizer',
    isAdmin: true,
    profileComplete: true,
  }

  const db = {
    cohort: { id: 'benjamin-franklin', name: 'Benjamin Franklin' },
    users,
    // scores[raterPin][rateePin] = { value, history: [{ value, note, ts }] }
    scores: {},
    // TODO: event designer — let organizers add/reorder/configure activities,
    //       including optional score-refinement rounds between events 2 and 3.
    events: [
      {
        id: 'e1',
        order: 1,
        type: 'pitch',
        title: 'Founder Pitches',
        blurb: '2-minute pitch on your passion or latest project, then 1 minute of questions from the cohort.',
        topics: PITCH_TOPICS,
        pitchOrder: null,
        dropouts: [],
      },
      {
        id: 'e2',
        order: 2,
        type: 'group',
        title: 'Group Build Sprint',
        blurb: 'Teams of ~4 tackle a hands-on challenge together. Teams are matched from everyone’s current ratings.',
        teams: null,
        dropouts: [],
      },
      {
        id: 'e3',
        order: 3,
        type: 'final',
        title: 'Final Pitch — Teams of 2–3',
        blurb: 'Matched from final ratings, each team builds a pitch and presents to the cohort and judges.',
        teams: null,
        dropouts: [],
      },
    ],
  }
  saveDB(db)
  return db
}
