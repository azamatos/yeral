# 2026-11-07 · Trusted client (design v0.7 · D, book F-246)

Branch `feat/trusted-client`. The owner's idea 1 of round 7 ("Verified client like Instagram does"), drawn on
`C7-Booking.dc.html` D2 with business close-ups; the rule in `README.md` §15 (7.3).

## What's there

- **The rule** (`@yeral/domain/clients`: `trustedStanding`, `TRUSTED_MIN_VISITS` 5, `TRUSTED_STRIKE_DAYS` 365): the
  account's completed visits on Ýeral at any business (`effectiveStatus` as people see it now: stored completed, or
  confirmed and ended), 5 or more, and no no-show or report (`status = 'noshow'` or a complaint of any type) on a day
  younger than 12 months. A strike pauses the mark at once; the count starts again after it and 5 visits bring it
  back; a strike 12 months old is forgotten. Worked out, never stored: a no-show or report taken back gives the mark
  back. Counted by `bookings.user_id` (the account), so the team's phone bookings for a linked number count too; a
  client row without an account is never trusted. Moves (`reschedule_of`) don't count.
- **api:** `trustFactsSql` / `trustedSql` in `clients/facts.ts` (the SQL twin of the rule, one scalar subquery per
  client row); `trusted` on `ClientRow`, `ClientCard` and a request's `client`; the Tag filter's `?auto=trusted` and
  the list's `auto.trusted` count (one Tag filter: a team tag or the mark keeps a client); `GET /v1/me/trusted` →
  `{ state: trusted | almost | paused, visits, pausedSince }` (`clients/trusted.ts`); booking rules
  `confirmTrustedAtOnce` (migration `0050_confirm_trusted_at_once`, off by default); `onlineStatus()` in
  `bookings/create.ts` decides pending or confirmed for a new request, a client's move and an offer taken after an
  expiry, through the existing instant-confirm path (hours, slot, waiting room and the rest unchanged).
- **business:** `TrustedTag` (`entities/client`, `TagChip kind="trusted"`, completed tones, shield-check, tooltip)
  first among the tags on the row, the card head, the booking drawer's client card and the request drawer; the Tag
  menu now has groups «Automatic» (Trusted with its count) and «Your tags»; Settings › Booking rules gets «Confirm
  trusted clients at once» with an ⓘ, only in manual mode (hidden in instant mode, its value kept).
- **client:** `TrustedBadge` and `TrustedCard` (`entities/client`): the badge under the name in the account aside, the
  card on top of Profile and settings (Trusted / «2 more visits…» with the five-step bar / «Trusted is paused»).
- **Tests:** domain table; `clients/trusted.test.ts` (the standing over two businesses, the row, card, filter and
  count, a no-show and a report, the 12-month edge, the setting on and off, the request's mark); the settings rules
  shape; stories for the tag, the list's filter, the card, the drawer, the rules switch, the account page's three
  states and the badge/card.

## Decisions taken here

- The 12 months and the strike are the design's; the design says both "no no-show in 12 months" and "5 more visits
  bring it back" — built as: a strike younger than 12 months pauses it and only visits after it count, so 5 after
  the strike restore it before the 12 months pass.
- A report of any type (late, rude, other) counts as a strike, as README §15 says ("a no-show or a report").
- The account's standing is its own endpoint (`GET /v1/me/trusted`), not a field on `Me`: `Me` is read on every page
  of both apps and the business app has no use for it.
- The business-side `trusted` lives on `ClientCard`, which the booking drawer already reads; `CalendarBooking.client`
  stays as it was.
- The migration holds only the new column. `pnpm db:generate` also wants to drop `users.demo` and
  `businesses.sandbox` (#316 removed them from the schema, the columns still exist): kept out of this PR, the
  snapshot carries them so a later generate still emits the drops (the planned follow-up migration).

## Left

- tk/ru strings (English only, as asked).
- The confirm step's "Booking confirmed · Glow Studio confirms trusted clients at once" and the account row's badge on
  the client's booking flow (`pages/booking/**`, another agent's files): the api already answers `confirmed`, the flow
  shows "Booking confirmed" for it.
- The design's "7 visits on Ýeral, no missed bookings" copy shows the counted visits; after a strike older than
  12 months it still reads "no missed bookings".
- Running the api tests on a scratch Postgres with locale `C` fails `catalog.test.ts`' Cyrillic search (`lower()`
  without a locale); CI's Postgres is fine.
