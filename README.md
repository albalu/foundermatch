# FounderMatch — proof of concept

See the live site: https://foundermatch-mu.vercel.app/

Mobile-first React + Vite app that matches solo founders in a cohort (~20)
through rated activities. Everyone rates everyone; ratings drive how teams are
formed for each next event, and matches favor **mutual** interest. The POC
"database" is `localStorage` ([src/lib/db.js](src/lib/db.js)); the 8-digit
login PIN doubles as the user id.

## Mechanics

- Scores run 0–10 in steps of 0.5; every pair starts at a mutual **10/10**.
- Mutual interest = geometric mean `sqrt(a→b × b→a)` — one-sided interest
  ranks low. A tiny random jitter breaks ties, so founders who never rate
  (still all 10s) get matched randomly.
- Ratings can be revisited any time; each change stores an optional note and
  its **delta**. Deleting a history entry reverts exactly that change — the
  score is re-derived as `10 + surviving deltas`, clamped.
- **Bounds are bulletproof**: one function, `clampScore`, is the sole
  enforcer (above 10 → 10, below 0 → 0, snap to the 0.5 grid, garbage →
  default). Every write, read, delete-replay, and migration funnels through it.
- Ratings are private — founders never see scores they received; the admin
  sees update counts only.
- Dropping out of an event skips only that event's matching; the founder
  stays in the cohort and can rejoin.

## Events

1. **Founder Pitches** — 2-min pitch + 1-min Q&A: background · latest project
   · how/why they're on it · what they want in a co-founder · what they hope
   to get from the cohort. Admin shuffles the pitch order.
2. **Group Build Sprint** — teams of ~4 (20 → 5×4, 19 → 4×4+3, 21 → 3×4+3×3)
   via greedy top-choice seeding + 2-swap hill climbing. (Exact fixed-size
   grouping is NP-hard, so a heuristic is standard; tests pin the invariants.)
3. **Final Pitch** — teams of 2–3, presented to the cohort and judges. Matched
   with **Edmonds' blossom algorithm** via the
   [`edmonds-blossom`](https://www.npmjs.com/package/edmonds-blossom) package
   in maximum-cardinality mode — provably nobody is left unmatched; an odd
   headcount yields the one team of 3.

Matching is deterministic algorithm code ([src/lib/matching.js](src/lib/matching.js))
— nothing is improvised at runtime.

## Auth

Cohorts are named after famous American founders/companies. Each member logs
in with a unique 8-digit PIN. First use requires an email or LinkedIn (at
least one).

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # vitest
```

Tests ([matching](src/lib/matching.test.js), [scores](src/lib/db.test.js))
assert: everyone placed **exactly once** (no dangling person, no duplicates)
across cohort sizes 1–41 with randomized scores, exact team sizes, dropout
exclusion, top-choice pairs kept together, blossom = brute-force optimum on
small instances, delta/revert semantics with ceiling/floor clamping,
clamped reads of corrupted storage, and legacy-data migration.

## Testing the demo

Demo cohort **“Benjamin Franklin”** seeds on first load (reset via Admin →
Danger zone). **Admin PIN: `00000000`** — shuffles pitch order, forms teams,
sees attendance and rating activity.

| Founder | PIN | | Founder | PIN |
| --- | --- | --- | --- | --- |
| Tyler Brooks * | `71543028` | | Arjun Patel | `68153429` |
| Emma Sullivan | `39274615` | | Ananya Iyer | `24957816` |
| Jake Morrison | `82635190` | | Rohan Mehta | `85742931` |
| Sarah Whitfield | `46198237` | | Wei Chen * | `49325178` |
| Ryan O'Connor | `15982647` | | Grace Zhang | `76891354` |
| Marcus Johnson | `63821974` | | Kevin Liu | `13579246` |
| Imani Washington | `28464951` | | Mei Wang | `92468135` |
| Darius Coleman | `94316285` | | Sofia Ramirez | `58317642` |
| Keisha Thompson | `57204863` | | Omar Haddad | `36925814` |
| Priya Sharma * | `31687542` | | Ji-ho Park | `81264573` |

\* not yet onboarded — demos the first-login contact gate.

Quick walkthrough: log in as `71543028` → complete the contact gate → rate a
few founders with notes, try deleting a history entry. Log in as `00000000` →
shuffle pitch order, form teams for events 2 and 3. Log back in as any
founder → see the pitch order and your highlighted team.

## Roadmap — for repository maintainers

These are engineering next steps for whoever develops this codebase (they are
**not** tasks for event organizers). Enough context per item for the next
coding agent to pick up cold:

- [ ] **Real backend.** Swap `localStorage` for an API + Postgres/SQLite. The
      db shape maps 1:1 to tables: `users` keyed by `pin` (primary key),
      `scores[rater][ratee] = { value, history: [{value, delta, note, ts}] }`,
      `events` with `dropouts` and `teams`. Storage touchpoints are confined
      to `loadDB/saveDB/migrateDB` in [src/lib/db.js](src/lib/db.js);
      `recordScore/deleteScoreEntry/getScore` become endpoints. Keep
      `clampScore` server-side so the 0–10 bound stays enforced at one gate.
- [ ] **Event designer (admin UI).** Events are hardcoded in
      [src/lib/seed.js](src/lib/seed.js) as `{ type: 'pitch' | 'group' |
      'final', ... }`. Add admin CRUD to create/reorder/configure activities,
      including optional score-refinement rounds between events 2 and 3.
      `EventsTab` renders cards by `type` and `AdminTab` maps each type to a
      matching action — a new type needs a card renderer plus an admin action.
- [ ] **Multi-cohort support.** The db holds a single `db.cohort`. Scope
      users/events per cohort id (PINs are already globally unique, so login
      can resolve the cohort). Name pool: Thomas Edison, Madam C.J. Walker,
      Hewlett-Packard, Jobs & Wozniak, Henry Ford.
- [ ] **Photo uploads.** Avatars are procedural SVGs
      ([src/components/Avatar.jsx](src/components/Avatar.jsx), configured per
      user in seed.js). Once a backend exists, accept image uploads and keep
      the SVG as fallback.
- [ ] **Pluggable matching strategies.** [src/lib/matching.js](src/lib/matching.js)
      exposes `formGroups` and `formPairsAndTriples`; add per-event strategy
      selection — e.g. Irving's stable roommates for pairs, an ILP solver
      (e.g. glpk.js) for provably optimal groups of 4, or skill-diversity
      constraints. New strategies must keep the test invariants (full
      coverage, spec team sizes).
- [ ] **Judge scoring.** Add a `judge` role (non-rated, non-rating users), a
      scoring UI for final pitches, and a results view.
