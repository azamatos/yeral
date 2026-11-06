# The owner's review of the live platform (04.11): the fix plan

_2026-11-06._ Source: the owner's list "PROBLEMS WITH YERAL" (51 problems, 4 ideas, 49 screenshots), reviewed against
the code by two read-only agents. The design request this plan waits on: `docs/design-requests/2026-11-06-round-7.md`.

## What the review found

- About half the problems are **the drawn pattern itself** (the code follows `docs/design` v0.6 and the owner now
  wants something else): hours with breaks, week view, booking drawer, clients table, calendar toolbar, home search,
  the business page, booking steps. These go to Claude Design (round 7), not to a code tweak.
- Four **systemic** causes repeat across ~20 problems: `tabular-nums` on Onest on every number (118 places, the
  "digit gap"); one native `<select>` used on 19 screens; ghost buttons with nothing at rest and text links used as
  actions; controls of 38/40/44/48 px mixed in one toolbar. Fixed once in `@yeral/ui` after the design decides them.
- Two features **were never built** though the api and the design exist: the business Reviews page (#45, a stand-in
  page today) and the invite link route (#46: the api sends `business…/invite/<token>`, the app has no such route).
- **#24 is the admin tool, not the business workspace.** The workspace is safe (team edits are owner-only); the admin
  tool has one role, and any admin can turn off any other, the first one included.
- **Telegram OTP plugs in behind the existing SMS port.** With a delivering adapter and `SIGN_IN_CODE_ON_SCREEN=false`,
  verification (#23), phone change and the old-account re-check switch back on with no other code.

## Wave 1: code only, starts now (no new design needed)

| Piece | Problems | Where | Size |
|---|---|---|---|
| W1-1 Business fixes | #46 invite route (signed out / other number / expired), #12 "Show more" keeps the scroll, #13 alert note as a note row, #37 Answer cell on one line, #47 examples per category, #2 padding override, "demo" wording (#44, business side) | `apps/business` | M |
| W1-2 Admin roles and sign-in | #24 superadmin + admin (schema, guards, `admin-invite`, Team page with roles; the first account becomes superadmin), #1 sign-in in two steps (login + password, then the code) | `apps/api` admin, `apps/cms`, contract, ADR 0026, book Q-011 | M–L |
| W1-3 Business Reviews page | #45 from B-Reviews (summary, filters, list, reply, report, Show more) | `apps/business` | M |
| W1-4 Client fixes | #18 category crumb links to the category page, #40/#44 Example badge, "not a real business" notice and demo wording off, #39 step logic (specialist first → their services, then time; no Specialist step), #19 hours line not run-on and shown once, #7 "Home" a real button | `apps/client` | M |
| W1-5 Clients: sort and counts | #11/#31 api `sort` (visits, last visit, total, name) + segment counts + Visits total and History count | contract, `apps/api` clients, sdk | M |
| W1-6 Telegram OTP | idea 4: Telegram Gateway adapter behind the SMS port, config, tests; then the flag off on the server → #23 verify works | `apps/api` auth, copy | M |

Order: W1-2 with W1-1 first (different packages), then W1-3 with W1-4, then W1-5 and W1-6 (W1-6 after the owner's
Telegram answer and token).

## Wave 2: after Claude Design's v0.7 export

| Piece | Problems | Design items |
|---|---|---|
| W2-1 DS foundations | #10 #15 #49 digits/font, all selects, #16 #22 #28 heights, #2 #7 buttons, #22 focus, #17 callouts, info icon | A1–A4, A9–A11 |
| W2-2 DS patterns | filter bar, sortable table + clickable rows, tags in place, facts/status, breadcrumbs | A5–A8 |
| W2-3 Calendar | #25 #26 #27 toolbar, #5 #34 week view | B2, B3 |
| W2-4 Hours | #3 #4 hours with breaks | B1 |
| W2-5 Booking drawer + new booking | #6, #35 #36 | B4, B7 |
| W2-6 Clients list + card | #8 #9 #11 #14 #31 #32 #33 | B5, B6 |
| W2-7 Bookings, team, permissions | #28 #37 #29 #30 | B8, B9 |
| W2-8 Home search | #43 #48 | C1 |
| W2-9 Business page | #38 #40 #42 #17–#20 | C2, C3 |
| W2-10 Booking steps | #39 #41 #50 #51 | C4 |
| W2-11 Telegram code step | idea 4 screens | B10 |

## Wave 3: the ideas (plan only until Wave 2 ships)

Trusted client (idea 1, per workspace first), "something changed since your last visit" (idea 2, the api has
`addressChangedAt`), follow a business (idea 3, needs a channel: the Telegram bot later). Each becomes a book row
before it's built.

## How each piece is checked

1. An implementer agent (Fable, xhigh) on its own branch: code, tests (a failing test first for each bug), stories
   for every changed component, filtered checks, a PR.
2. A fresh reviewer agent (Fable, xhigh) that gets the diff, not the implementer's reasoning: a code review plus a
   visual check of the changed stories at 1440 and 390 (screenshots compared with the owner's), then fixes what it
   finds (one round).
3. CI green on the PR's head → merge → `main`'s own run green before anything else.
4. End of each wave: a deploy (backup first), then a visual QA pass in the browser on the live apps at 1440 and 390,
   one screenshot per fixed problem next to the owner's.

## Budget

Up to about +50 points of the weekly limit for the whole run (owner, 06.11), at most two agents at once (one on
battery). Week at 35 % at the start (all projects), reset 07.11. The spend is reported after each wave.

## Waiting on the owner

- Send the round 7 request to Claude Design with the screenshots; bring back the export.
- Telegram: confirm the Gateway (≈ $0.01 a code, prepaid), create the account and the token, and put it in
  `/srv/yeral/.env` as `TELEGRAM_GATEWAY_TOKEN` (never through the chat).
