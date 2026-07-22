# FounderMatch — proof of concept

A mobile-first web app that helps solo founders in a small cohort (~20 people)
find a co-founder through a series of activities. After each activity everyone
rates their willingness to follow up with each person, and those ratings drive
how teams are matched for the next activity — but matches only "work" when the
interest is **mutual**.

Built with React + Vite. For this POC the "database" is `localStorage`
(see [src/lib/db.js](src/lib/db.js)) — the 8-digit PIN is the user id, so the
schema maps 1:1 to real tables later.

## How it works

- **Scores** run 0–10 in steps of **0.5**. Every pair starts at a mutual
  **10/10**, so founders who never rate anyone are all tied — and matching's
  random tie-breaking places them randomly, exactly as intended.
- **Mutual interest** between two founders is the *geometric mean* of the two
  directed scores: `sqrt(a→b × b→a)`. A one-sided 10/2 ranks well below a
  balanced 8/8 — both people have to want it.
- Ratings can be revisited **at any time**, and every change can carry a note
  ("great energy in the pitch", "different market interests…") so founders
  remember why they moved a score. Full history is kept per pair.
- Ratings are private: founders never see scores they received. The admin only
  sees *how many* updates each person has made, not the values.
- **Dropping out** of an event removes you from that event's matching only —
  you stay in the cohort and can rejoin or attend later events.

### Default events

1. **Founder Pitches** — 2-minute pitch + 1-minute Q&A per founder, covering:
   background · latest project · how/why they ended up on it · what they want
   in a co-founder · what they hope to get from the cohort. The admin shuffles
   a random pitch order.
2. **Group Build Sprint** — teams of ~4 (20 → 5×4, 19 → 4×4 + 1×3,
   21 → 3×4 + 3×3). Teams are formed from current ratings: strongest mutual
   pairs seed the teams (top choices first), greedy best-fit fills them, then
   2-swap hill climbing maximizes total intra-team mutual interest. (Partitioning
   into fixed-size groups is NP-hard — weighted clique partitioning — so a
   heuristic is standard here; the test suite pins the invariants.) Robust to
   popularity skew — nobody is left out, low-rated folks land where they fit
   best overall.
3. **Final Pitch** — teams of **2–3** matched from final ratings with
   **Edmonds' blossom algorithm** (1965), the standard exact algorithm for
   maximum-weight matching on a general graph, via the
   [`edmonds-blossom`](https://www.npmjs.com/package/edmonds-blossom) package
   (a port of the canonical `mwmatching` reference implementation). Run in
   maximum-cardinality mode on the complete graph it provably matches
   everyone; an odd headcount adds a zero-weight dummy, and whoever draws it
   joins the pair that wants them most — the one team of 3. Teams build a
   pitch and present to the cohort and judges.

Matching is deterministic library/algorithm code ([src/lib/matching.js](src/lib/matching.js))
— nothing is improvised at runtime. The only randomness is the intentional
tie-breaking jitter that makes non-raters land randomly.

Between events 2 and 3 the organizer can re-run matching any time as ratings
evolve (see TODOs for configurable optional refinement activities).

## Auth

Deliberately minimal: each cohort is named after a famous American founder or
founding company, and each member gets a personal **8-digit PIN** unique across
all users — the PIN is both the login and the user id. On first use of a PIN
the app requires an email or a LinkedIn URL (at least one) before entering.

## Run it

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # matching invariants + optimality checks (vitest)
```

The test suite ([src/lib/matching.test.js](src/lib/matching.test.js)) sweeps
cohort sizes 1–41 with randomized scores and asserts, for both matchers:
every participant is placed **exactly once** (no dangling, unaccounted-for
person, no duplicates), team sizes are exactly as specced, dropouts are
excluded, mutually top-choice pairs end up together, a person rated 0 by
everyone is still placed, and the blossom pairing equals a brute-force
optimal matching on small instances.

## Testing

The app auto-seeds the demo cohort **“Benjamin Franklin”** on first load
(reset any time from Admin → Danger zone).

**Admin / organizer PIN: `00000000`** — shuffles the pitch order, forms teams
for events 2 and 3, sees attendance + rating activity, resets demo data.

| Founder | PIN | Notes |
| --- | --- | --- |
| Tyler Brooks | `71543028` | not onboarded — demos the first-login contact gate |
| Emma Sullivan | `39274615` | |
| Jake Morrison | `82635190` | |
| Sarah Whitfield | `46198237` | |
| Ryan O'Connor | `15982647` | |
| Marcus Johnson | `63821974` | |
| Imani Washington | `28464951` | |
| Darius Coleman | `94316285` | |
| Keisha Thompson | `57204863` | |
| Priya Sharma | `31687542` | not onboarded — demos the first-login contact gate |
| Arjun Patel | `68153429` | |
| Ananya Iyer | `24957816` | |
| Rohan Mehta | `85742931` | |
| Wei Chen | `49325178` | not onboarded — demos the first-login contact gate |
| Grace Zhang | `76891354` | |
| Kevin Liu | `13579246` | |
| Mei Wang | `92468135` | |
| Sofia Ramirez | `58317642` | |
| Omar Haddad | `36925814` | |
| Ji-ho Park | `81264573` | |

The test cohort is intentionally diverse (white, Black American, Indian,
Chinese, plus Latina, Middle Eastern, and Korean founders); profile pictures
are procedurally generated SVG portraits matching each person.

### Suggested walkthrough

1. Log in as `71543028` (Tyler) → complete the contact gate → open
   **Founders**, lower a few scores with notes, check **History**.
2. Log out (Profile tab), log in as `39274615` (Emma) → rate Tyler high, drop
   out of Event 2, rejoin.
3. Log in as admin `00000000` → shuffle the pitch order, **Form teams of ~4**,
   then **Form final teams (2–3)**; re-form after changing more ratings.
4. Back as any founder → **Events** shows the pitch order and your highlighted
   team.

## TODOs

- [ ] Event designer: let organizers add/reorder/configure activities,
      including optional score-refinement rounds between events 2 and 3.
- [ ] Real backend (Postgres/SQLite) — keep the PIN as primary key; current
      localStorage shape maps 1:1 to tables.
- [ ] Multi-cohort support (next names: Thomas Edison, Madam C.J. Walker,
      Hewlett-Packard, Jobs & Wozniak, Henry Ford).
- [ ] Real profile photo uploads (avatars are procedural SVGs for now).
- [ ] Pluggable matching strategies per event (Irving's stable roommates,
      an ILP solver for provably-optimal groups of 4, skill-diversity
      constraints, judge-weighted final scoring).
- [ ] Judge scoring UI for the final pitch event.
