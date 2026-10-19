# P1 · Round 2 — business app: shell, sign-in, setup, calendar, requests, bookings

Written by Claude Code on 19.10.2026 for the owner to paste into Claude Design (canvas "Ýeral Web") after round 1.
Source: the product book, chapter 7b ("Design to fix" lines), chapters 3, 5 and 6, and questions Q-004, Q-030,
Q-031, Q-036, Q-100, Q-105, Q-119, Q-120, Q-128, Q-200, Q-202, Q-203, Q-204, Q-206, Q-207, Q-209, Q-216, Q-271,
Q-272, Q-274. Round 3 covers clients, team, settings, services, notifications, reviews and the landing page.

## Prompt

```
Round 2 of the design pass (export v0.6): the business app, part 1. Use the English words and components from round 1
everywhere ("Ýeral Business", statuses, actions, the shared code step, the Example badge). Tokens and visual style
don't change.

Scope: B-Shell, B-Login, B-Onboarding, B-Calendar, B-Bookings, B-Mobile, and new patterns on DS · Business patterns.
Leave B-Clients, B-Client, B-Settings, B-Services, B-Team, B-Notifications, B-Reviews and B-Landing for round 3.

0. Canvas: move B-Tables, B-Classes, B-Analytics and B-Help to the "Later · not MVP" page, unchanged. Tables and
   classes come after the first release; so do analytics, help articles and the support chat.

1. Everywhere in this round:
   - Redraw the boards in English.
   - Page addresses carry no language and always the workspace: business.yeral.app/w/{slug}/calendar,
     …/w/{slug}/bookings, …/w/{slug}/settings/…; sign-in is business.yeral.app/login. Update board titles,
     breadcrumbs and any URL shown.
   - The first release takes appointments only: one booking type per business, so the sidebar shows Calendar,
     Bookings, Clients, Reviews, Settings. "Contact Ýeral" (phone, Telegram) stays in the account menu.
   - No SMS goes out at the first release: wherever a screen promises an SMS to the team or the client, keep the
     switch or line but don't promise delivery in copy you add this round.

2. B-Login and B-Onboarding (sign-up and setup wizard):
   - Phone step uses the shared code step from round 1, including the first-release variant with the code shown on
     the screen.
   - Setup can be left with "Continue later"; signing in again reopens the wizard at the saved step, not the
     "no workspace yet" card.
   - Category step: only appointment categories at the first release (restaurants and studios come later).
   - Hours step: pickers from 00:00 to 24:00 in 30-minute steps, and a day may close after midnight (18:00–02:00
     shows as "until 02:00, next day").
   - Rules step: the free-cancel choices are the same list as settings: any time, 1, 2, 6, 12, 24, 48 hours.
   - Team step: levels are Admin and Specialist. A Specialist has a "Uses the app" switch, on by default; off means
     they're bookable at once, never sign in, and the owner and admins handle their requests. A phone number is
     required either way (they can start using the app later with it). Remove "phone-only specialist" as a level.
   - Invites: the invite lasts 7 days and appears when that person signs in with the invited number ("They'll see
     the invite when they sign in with +993 65 •• •• 22"). Draw accept and decline.

3. B-Shell:
   - Workspace switcher and account menu in English; the address pattern above.
   - Profile drawer: drop the switch about showing my time in other workspaces and its caption.
   - "Leave this business" (not for the owner): after it, the owner gets a notification "Aýna left: 4 upcoming
     bookings need a new specialist" that opens the remove-staff flow (move to someone else, keep, or cancel with
     3 offered times).
   - Business status banners: "In review" (exists); add "Not approved" with the team's reason and "Fix and send
     again"; add the demo banner for "Try the business app": "This is a demo workspace. Changes reset every night."
     with "Create your business".

4. B-Calendar (and the same on B-Mobile):
   - Busy elsewhere: when a specialist has a confirmed booking or a waiting request in another workspace, their
     column shows a plain reserved block "Busy elsewhere" covering that time and its buffer. No business name,
     service or client, ever; nobody can book it.
   - Clicking an empty slot offers two actions: "New booking" and "Block time". Block time opens a small form:
     person, from–to, reason (Training, Break, Personal, Other), optional repeat (every day / every week, until a
     date). Same rights as adding bookings. A block can't cover an existing booking: show the error with the
     booking it hits. Blocks render as the existing closed layer ("Closed · Training"). On a phone, tapping an empty
     slot offers the same two; the round + still opens a new booking.
   - Internal statuses stay in the first release (team-only markers like Arrived, Started; off by default).
   - Requests: the hold timer counts only while the business is open. When it's closed, the request shows
     "Answer by 09:30 tomorrow" instead of a running timer.
   - Report on a booking: "No-show" appears only from the visit's start time; "Late", "Rude" and "Other" any time
     on a confirmed or completed booking. Add "Remove report" in the booking drawer for 7 days after it: the booking
     goes back to Completed and the client isn't told.

5. B-Bookings (bookings and requests list): the bulk bar keeps Confirm, Decline and Export CSV; remove "Move to
   another time" (bookings move one at a time).

6. DS · Business patterns: add each new piece with its states: the busy-elsewhere block; the empty-slot menu and the
   block-time form with its error; the request timer and its "Answer by" closed state; the report menu with and
   without No-show, and the remove-report action; the "Uses the app" switch on the level field; the "Not approved"
   and demo banners; the "someone left" notification; and an "affected bookings" list (rows of bookings with "Keep
   them" or "Cancel and offer 3 other times"), which round 3 uses when hours or a shift change.

When done, add to the CHANGELOG every board you changed or moved and every copy choice not covered here.
```

## What to check on the canvas afterwards (Claude Code)

- B-Tables, B-Classes, B-Analytics, B-Help on the Later page; sidebar with five items; addresses `/w/{slug}/…`, no
  language.
- Wizard: shared code step with the on-screen code, continue-later, appointment categories only, 00:00–24:00 pickers
  and past midnight, the settings cancel list, "Uses the app" with phone required, invite shown at sign-in.
- Shell: no busy-elsewhere switch; leave flow and the owner's notification; In review, Not approved, demo banners.
- Calendar and phone: busy-elsewhere block with no details; New booking / Block time; block form and its error;
  "Answer by" when closed; report rules and Remove report.
- Bookings: no bulk move. DS · Business patterns: every new piece with states.
