# @yeral/sdk

## 0.3.0

### Minor Changes

- [#93](https://github.com/azamatos/yeral/pull/93) [`d5603a8`](https://github.com/azamatos/yeral/commit/d5603a8f5b7c69ab3c803738cc9a73e99ea81a19) Thanks [@azamatos](https://github.com/azamatos)! - Blocked time (book B-18): `POST /v1/w/{slug}/calendar/blocks` closes part of a day for one person ("Ýapyk · Okuw"),
  optionally every week up to a date; `GET` lists them and `DELETE …/blocks/{id}` takes one (or the rest of its series)
  away. Nobody books blocked time: free times leave it out, a move onto it is `cannot_move` with `blocked`, and a block
  over a booking is refused (`block_over_bookings`). The owner and administrators block anyone's time, a specialist only
  their own. Migration 0027 adds `staff_blocks`.

- [#104](https://github.com/azamatos/yeral/pull/104) [`7bfaf2b`](https://github.com/azamatos/yeral/commit/7bfaf2b093fea7ad3885342de2fe6d9960f417bd) Thanks [@azamatos](https://github.com/azamatos)! - The business's bookings list (book B-30, B-31): the tabs Today, Upcoming, Past and Cancelled (with who cancelled, a
  request that ran out included), searched by booking code, client or number, filtered by specialist, service and
  dates; a specialist sees their own. The owner and administrators export the same rows as a CSV in their language.

- [#84](https://github.com/azamatos/yeral/pull/84) [`bbcdae5`](https://github.com/azamatos/yeral/commit/bbcdae53e05deadb98abc119b138abaeded262b3) Thanks [@azamatos](https://github.com/azamatos)! - A business's cancel reaches the app as a code it words: the booking detail and the SMS link page add `businessCancel`
  (`{ reason, text }`, with the business's words for "Other reason" or the closed day's name), and `cancelReason` holds
  only the client's own words. The free times offered when a business closes over a booking are taken with their own
  source, `cancel` (`accept-alternative`), no longer `decline`.

- [#95](https://github.com/azamatos/yeral/pull/95) [`88677dd`](https://github.com/azamatos/yeral/commit/88677dd6d62df9c597aac96d5684ffa4233e1150) Thanks [@azamatos](https://github.com/azamatos)! - The business's calendar (book B-16, B-17): `GET /v1/w/{slug}/calendar` gives a day or a week, everyone the reader
  sees or one person, with each day's working hours, breaks and days off, the bookings and requests with their markers
  and a client's waiting move, blocked time, time taken in another workspace, and each day's line with the money the
  reader may see. A specialist sees only their own column and earnings.

- [#101](https://github.com/azamatos/yeral/pull/101) [`ee5e856`](https://github.com/azamatos/yeral/commit/ee5e8561cf10c5579ff808f16c8802923aa610af) Thanks [@azamatos](https://github.com/azamatos)! - The business's clients (book B-32, B-34): the list (by name or number, the chips New, Regular, Lapsed, Reported,
  the most recently seen first), the new-booking drawer's lookup (from 3 digits or 2 letters, with alert notes and usual
  services) and the client card (numbers, notes, bookings ahead and before, reports, switches). A specialist sees only
  their own clients and bookings; sums only with "See revenue". Requests carry the client's alert notes and id, the
  calendar's bookings the client's id.

- [#103](https://github.com/azamatos/yeral/pull/103) [`d5c9ac2`](https://github.com/azamatos/yeral/commit/d5c9ac2a4cfe6ee174e0840841de068ac4624795) Thanks [@azamatos](https://github.com/azamatos)! - Keeping the business's clients (book B-33–B-36): add one by the number (a number already there opens its card), the
  card's edit (a number held by a Ýeral account is locked), "Phone only" and "Don't send reminders", team notes with
  "show when they book", and delete (refused while bookings are ahead or requests wait; past bookings stay without the
  name). A `client.updated` live event refreshes the clients pages, the calendar and requests.

- [#100](https://github.com/azamatos/yeral/pull/100) [`124e33c`](https://github.com/azamatos/yeral/commit/124e33cfab8800f95ffbe97b625fe6b33bcf7899) Thanks [@azamatos](https://github.com/azamatos)! - "Arz et" (book B-28): the team files one complaint per appointment booking (no-show from the visit's start until a
  day after it, late from the start, rude or other any time); a no-show changes the booking's status, which the client
  sees, and counts toward the phone-only limit. A mistaken one is taken back within 7 days, the booking as it was,
  the complaint a no-show replaced included. The calendar's booking shows it. Migration 0029 adds
  `bookings.complaint_by` and `complaint_before`.

- [#94](https://github.com/azamatos/yeral/pull/94) [`029a2d8`](https://github.com/azamatos/yeral/commit/029a2d8cbfa77836a727251c1ea80396259f677e) Thanks [@azamatos](https://github.com/azamatos)! - Internal statuses (book B-29): team-only markers such as "Arrived" and "Started" for confirmed bookings, which never
  change the booking's status and never reach the client. `…/settings/statuses` lists the two presets (off at first)
  and up to three of the business's own, with a name, one of 8 icons and one of 6 colours; `PUT
  …/bookings/{code}/internal-status` puts one on a booking. Migration 0028 adds `internal_statuses` and
  `bookings.internal_status_id`.

- [#90](https://github.com/azamatos/yeral/pull/90) [`25fb650`](https://github.com/azamatos/yeral/commit/25fb65064a4439a10840735885a50c0298b8d621) Thanks [@azamatos](https://github.com/azamatos)! - The owner sets each specialist's schedule (book B-47): `GET`/`PUT /v1/w/{slug}/team/{staffId}/schedule` with their
  shift (or the business hours), one break per weekday and personal days off; administrators read it. Bookings ahead it
  leaves outside their day are asked about first (409 `bookings_affected`), then moved to a free colleague who does the
  services (else cancelled with 3 other times) or kept. Removing someone (B-50) now asks about their bookings ahead the
  same way and moves them to a named colleague, keeps them, or cancels them with 3 other times; it answers 200 with what
  happened. A booking being made checks its specialist's day as it stands. The sdk's `team.remove` takes the choice, and adds
  `team.schedule` and `team.updateSchedule`.

- [#106](https://github.com/azamatos/yeral/pull/106) [`97064a6`](https://github.com/azamatos/yeral/commit/97064a613171e073aa311513f4291b8d4becd40a) Thanks [@azamatos](https://github.com/azamatos)! - The business's reviews (book B-53, B-54): the page with the summary, filters and sort (a specialist reads the reviews
  of their own visits); the reply, written, changed or taken away by the owner and administrators; and a report to
  Ýeral, which takes the review out of the rating while Ýeral checks it, 48 hours at most, then it counts again. The
  public review says `underReview`. Migration 0030 adds the reply's author and the report to `reviews`.

### Patch Changes

- [#107](https://github.com/azamatos/yeral/pull/107) [`85472bc`](https://github.com/azamatos/yeral/commit/85472bc28d4e00cf440636f495551919b165ef60) Thanks [@azamatos](https://github.com/azamatos)! - Nothing of the last person shows after a sign-in, a log-out, a sign-in as someone else or a session that ended on its
  own: the sdk empties their workspaces, invites, team, calendar, clients, bookings and favourites, and what they saw as
  a team member, by itself (any 401 counts). Leaving a workspace forgets it; a phone change refreshes the invites.
- Updated dependencies [[`46a5546`](https://github.com/azamatos/yeral/commit/46a55461a72145e74900610f8714ea24eeb88cdc), [`d5603a8`](https://github.com/azamatos/yeral/commit/d5603a8f5b7c69ab3c803738cc9a73e99ea81a19), [`7bfaf2b`](https://github.com/azamatos/yeral/commit/7bfaf2b093fea7ad3885342de2fe6d9960f417bd), [`bbcdae5`](https://github.com/azamatos/yeral/commit/bbcdae53e05deadb98abc119b138abaeded262b3), [`88677dd`](https://github.com/azamatos/yeral/commit/88677dd6d62df9c597aac96d5684ffa4233e1150), [`ee5e856`](https://github.com/azamatos/yeral/commit/ee5e8561cf10c5579ff808f16c8802923aa610af), [`d5c9ac2`](https://github.com/azamatos/yeral/commit/d5c9ac2a4cfe6ee174e0840841de068ac4624795), [`a362d86`](https://github.com/azamatos/yeral/commit/a362d86e0857e5ef51e738344a791c53820c9613), [`124e33c`](https://github.com/azamatos/yeral/commit/124e33cfab8800f95ffbe97b625fe6b33bcf7899), [`029a2d8`](https://github.com/azamatos/yeral/commit/029a2d8cbfa77836a727251c1ea80396259f677e), [`d4afcd0`](https://github.com/azamatos/yeral/commit/d4afcd0e1c97367c74ade23a8fdbca741df1e815), [`25fb650`](https://github.com/azamatos/yeral/commit/25fb65064a4439a10840735885a50c0298b8d621), [`97064a6`](https://github.com/azamatos/yeral/commit/97064a613171e073aa311513f4291b8d4becd40a)]:
  - @yeral/contract@0.3.0

## 0.2.0

### Minor Changes

- [#54](https://github.com/azamatos/yeral/pull/54) [`35119c8`](https://github.com/azamatos/yeral/commit/35119c81aab14aa43024b7f9075f98ba2931c49e) Thanks [@azamatos](https://github.com/azamatos)! - Deleting an account deletes its reviews too, and the businesses' ratings no longer count them (book Q-172); a
  `review.deleted` event tells open screens, and the sdk refreshes that business's reviews and page.

- [#76](https://github.com/azamatos/yeral/pull/76) [`a072307`](https://github.com/azamatos/yeral/commit/a072307a5d53407d43c6b4a41290254ed258ec8e) Thanks [@azamatos](https://github.com/azamatos)! - The business answers requests (book B-19–B-21): `GET /v1/w/{slug}/requests` lists the waiting requests and moves each
  person may see, most urgent first, with the client's visits and no-shows and whether they may answer;
  `POST …/confirm` confirms (a move moves its booking); `POST …/decline` declines with a reason and, for a new request,
  up to 3 offered times each checked free for its specialist. The client gets the declined SMS with the reason
  (en/tk/ru; a client who can't book online and got no times is asked to call), and a move's decline carries its reason.
  A request shared by two specialists is answered by the desk. The sdk adds `requests.list`, `confirm` and `decline`; booking events refresh the list.

- [#72](https://github.com/azamatos/yeral/pull/72) [`604464c`](https://github.com/azamatos/yeral/commit/604464c4b4529e7c3381acb8108c62af286662fe) Thanks [@azamatos](https://github.com/azamatos)! - Business settings start with the booking rules (book B-41, B-42): `GET`/`PATCH /v1/w/{slug}/settings/rules` for the
  owner and administrators, with the screen's options checked per field and lateness read-only. A change writes
  `business.updated`, which the whole team hears; the sdk's `settings.rules`/`settings.updateRules` refresh the page,
  free times and the switcher.

- [#78](https://github.com/azamatos/yeral/pull/78) [`388f52c`](https://github.com/azamatos/yeral/commit/388f52c14806bec76f47e6481945162a105d1f20) Thanks [@azamatos](https://github.com/azamatos)! - The team books clients who call or walk in (book B-23–B-25): `GET /v1/w/{slug}/free-times` gives the nearest four free
  times with their specialist, a day's starts with who is free at each and the 14-day strip, never before the current
  step; `POST /v1/w/{slug}/bookings` saves a booking confirmed at once, finding the client by the phone or adding them;
  `POST …/bookings/{code}/undo` takes it back within 10 seconds (`undo_expired` after). A phone booking texts the client
  the date, time and address once the undo is over (en/tk/ru); a walk-in sends no booking SMS unless asked, and reminders
  follow the client's own switches. A specialist books only themself. A booking the business entered shows the client
  "confirmed" from the start, never a request they sent. SMS no longer go to landlines. The sdk adds `calendar.freeTimes`, `add` and `undo`.

- [#75](https://github.com/azamatos/yeral/pull/75) [`7d35f34`](https://github.com/azamatos/yeral/commit/7d35f34ab61bd3e9af5469540335d9720ea663c9) Thanks [@azamatos](https://github.com/azamatos)! - The business profile for the owner and administrators (book B-37): `GET`/`PATCH /v1/w/{slug}/settings/profile` with
  the name, description, contact phone, amenities (`AMENITIES` in `@yeral/domain/model`), category (same kind of
  booking only), women-only, and the address with its map pin, entrance note and home-based switch. A new address keeps
  the page and is noted for the Ýeral team (Q-215). The logo and photos come with uploads.

- [#44](https://github.com/azamatos/yeral/pull/44) [`e82254d`](https://github.com/azamatos/yeral/commit/e82254d16a3b78ada77b527bdaea9cf2fbfab327) Thanks [@azamatos](https://github.com/azamatos)! - The city is data (book Q-107): the market's cities and its main city, and `GET /v1/cities` with the city a position is
  in. Search, "Näme?" and "Nirede?" suggestions keep to the chosen city (the main one when none is chosen); a position
  or a map area crosses city lines. Cards, business pages, bookings, the workspace switcher and invites carry the city;
  a reminder SMS names it when the business is outside the main city.

- [#80](https://github.com/azamatos/yeral/pull/80) [`501579f`](https://github.com/azamatos/yeral/commit/501579f6fca638352a8dd7efee96b969b794b232) Thanks [@azamatos](https://github.com/azamatos)! - The owner and administrators set the opening hours and special days (book B-39, B-40): `GET`/`PUT
  /v1/w/{slug}/settings/hours` saves the week (30-minute steps, one break a day) and the holidays or unusual days (closed
  or other hours). Bookings ahead the change leaves outside the hours make it `bookings_affected` with the list; sent again
  with `keep` they stay, with `cancel` each client's booking is cancelled under the day's name (or "The opening hours
  changed") with up to 3 free times they can take in one tap, by SMS too (en/tk/ru). The client's booking detail adds
  `cancelOffers`. The sdk adds `settings.hours` and `updateHours`. Migration 0023 adds the two cancel reasons.

- [#61](https://github.com/azamatos/yeral/pull/61) [`b7c7822`](https://github.com/azamatos/yeral/commit/b7c782229e625e06495157ebd049db66f8e1d69a) Thanks [@azamatos](https://github.com/azamatos)! - The business page says whether whoever looks may book there online (`bookOnline`, book A7, Q-154): false while the
  business is paused and for a signed-in client who may book it only by phone, so the "Jaň et" card shows before
  anything is sent. The sdk refreshes business pages at sign-in and sign-out.

- [#79](https://github.com/azamatos/yeral/pull/79) [`1f5a2ee`](https://github.com/azamatos/yeral/commit/1f5a2ee73f6ad4491ea37f8ab0ae6c563b11eca0) Thanks [@azamatos](https://github.com/azamatos)! - The business moves and cancels bookings (book B-26, B-27): `POST /v1/w/{slug}/bookings/{code}/move` takes a confirmed
  booking to a new time or another specialist's column, and a move that doesn't fit is `cannot_move` with the reason (the
  service, a day off, the hours, busy elsewhere with its time, another booking, the buffer); a booking with the client's
  move waiting is `move_waiting`. `POST …/cancel` cancels with a reason: "The client called to cancel" is the client's own
  cancel (no undo from the app), the others show the client the reason. The client hears both by SMS (new texts for a move,
  a new specialist and a cancel asked by phone, en/tk/ru), under their confirmations switch; a move's SMS defaults to
  the booking's own setting, and a change within a new booking's undo time tells nothing new. The business no longer moves a waiting
  request. The sdk adds `calendar.move` and `cancel`. Migration 0022 adds the cancel reason.

- [#48](https://github.com/azamatos/yeral/pull/48) [`e04b213`](https://github.com/azamatos/yeral/commit/e04b2133a1d955ec6f2341a458b659a1174991bb) Thanks [@azamatos](https://github.com/azamatos)! - A waiting move can be withdrawn ("Haýyşy yzyna al", `POST /v1/me/bookings/{code}/withdraw-move`), the booking shows a
  move the business declined or let lapse (`moveRefused`), and a lapsed move sends the client an SMS (book Q-289).

- [#37](https://github.com/azamatos/yeral/pull/37) [`7b6c25a`](https://github.com/azamatos/yeral/commit/7b6c25ad56787dba1bac36bddbe13168704704b9) Thanks [@azamatos](https://github.com/azamatos)! - The api runs only on the own server (ADR 0024): the Cloudflare Workers entry, Wrangler and Hyperdrive are gone.
  `GET /v1/places/ip` is removed with `ipPlaceSchema` and `sdk.catalog.ipPlace()`: it read Cloudflare's request data and
  always answered `{ place: null }` on Node. No app used it yet and the api isn't public, so `/v1` stays. The SMS log no
  longer keeps every message in memory.

- [#52](https://github.com/azamatos/yeral/pull/52) [`0d74925`](https://github.com/azamatos/yeral/commit/0d749256912b63737a0b2207e7574b80833a8119) Thanks [@azamatos](https://github.com/azamatos)! - A phone number that passes to someone else (book Q-270): signing in links a phone's bookings only if upcoming or from
  the last 6 months, and business records only if made in that time or holding a booking from it. An account unused for
  6 months that holds bookings, team rows or client records answers `POST /v1/auth/verify` (and the link page's verify)
  with 202 `{ isThisYou: { name, ticket } }` before anyone signs in (`name` is null when it has none); one holding
  nothing of a person's starts afresh. `POST /v1/auth/identity` takes the answer: yes signs in, no lets the old account
  go, leaving what was sent to the number lately to its new holder, and starts a fresh one. The sdk's
  `auth.answerIdentity` sends the answer.
  
  A changed phone keeps the person's business records (book Q-171): they move to the new number, merged with a recent
  record a business already kept for it; the bookings ahead and the person's active team rows take the new number;
  invites to the old number are cancelled.

- [#74](https://github.com/azamatos/yeral/pull/74) [`422547d`](https://github.com/azamatos/yeral/commit/422547decfeb6fb442d972ec85e0178b0553614b) Thanks [@azamatos](https://github.com/azamatos)! - The services menu for the owner and administrators (book B-38): groups and services with every language, hidden
  amounts, services not online and who does each; add, change, delete with undo (bookings ahead stay, Q-210), groups
  deleted only when empty (`group_not_empty`), and the clients' order. The limits are `serviceErrors` in
  `@yeral/domain/services`; the sdk's `settings.menu` and its mutations refresh the page and free times.

- [#40](https://github.com/azamatos/yeral/pull/40) [`72e46b9`](https://github.com/azamatos/yeral/commit/72e46b938f6c09ea1516c6bac299dfea596b7472) Thanks [@azamatos](https://github.com/azamatos)! - Three fixed access levels, the team model, invites and the team endpoints (book chapter 3, chapter 10 P2 step 2;
  ADR 0025).
  
  - `@yeral/domain/permissions`: the levels and the fixed permission table (11 rows), `canOn()` (a booking shared with
    another specialist is changed by the owner or an administrator), `canManageTeam()` and `canAnswerRequest()` with
    the business's "who answers requests" setting (`requestAnswerers` in the booking rules) and the per-person
    override. `@yeral/domain/team`: invites are valid 7 days.
  - The database: each team member is their `staff` row, linked to their account with a level; invites have their own
    table. Migrations `0005` (moves the data) and `0006` drop `roles` and `memberships`. Staff status `disabled` is
    `removed`.
  - New endpoints (`@yeral/contract/team`, `sdk.team`): the switcher `GET /v1/me/workspaces` (request counts, the last
    opened), the person's invites `GET /v1/me/invites` with accept and decline, the link `GET /v1/invites/{token}`, and
    the team the owner manages under `/v1/w/{slug}/team` (invite, resend, cancel, a specialist without the app and
    switching the app on, level and override, remove, reactivate) and `POST /v1/w/{slug}/leave`. New errors
    `already_on_team`, `invite_expired`, `invite_answered`, `owner_cannot_leave`, `owns_workspace`; new event
    `team.changed`.
  - Signing in no longer joins a team by itself; invited people aren't on the client site until they accept; a team
    member's live events follow their level; deleting an account takes its rows off every team, and an owner can't
    delete theirs.

- [#49](https://github.com/azamatos/yeral/pull/49) [`bb12b70`](https://github.com/azamatos/yeral/commit/bb12b70764fd7e5f5d43ed3e98b68d329c61d6da) Thanks [@azamatos](https://github.com/azamatos)! - SMS links carry a long random token (`yeral.app/l/{token}`) instead of the booking code (book Q-168). The link page reads
  the booking signed out (`GET /v1/links/{token}`) with the phone masked, and signs in only with the booking's own phone
  (`POST /v1/links/{token}/code`, `/verify`).

### Patch Changes

- Updated dependencies [[`35119c8`](https://github.com/azamatos/yeral/commit/35119c81aab14aa43024b7f9075f98ba2931c49e), [`a072307`](https://github.com/azamatos/yeral/commit/a072307a5d53407d43c6b4a41290254ed258ec8e), [`2731729`](https://github.com/azamatos/yeral/commit/27317290a96fe5e7fa982bf9fcee7d1e0532f882), [`604464c`](https://github.com/azamatos/yeral/commit/604464c4b4529e7c3381acb8108c62af286662fe), [`388f52c`](https://github.com/azamatos/yeral/commit/388f52c14806bec76f47e6481945162a105d1f20), [`7d35f34`](https://github.com/azamatos/yeral/commit/7d35f34ab61bd3e9af5469540335d9720ea663c9), [`f5d7fdf`](https://github.com/azamatos/yeral/commit/f5d7fdfa7885af15ca627f1b16c50e5672c122d6), [`e82254d`](https://github.com/azamatos/yeral/commit/e82254d16a3b78ada77b527bdaea9cf2fbfab327), [`2b38b79`](https://github.com/azamatos/yeral/commit/2b38b791de6cfd06e0f10d65fc48ae3cf70dcbc4), [`501579f`](https://github.com/azamatos/yeral/commit/501579f6fca638352a8dd7efee96b969b794b232), [`b7c7822`](https://github.com/azamatos/yeral/commit/b7c782229e625e06495157ebd049db66f8e1d69a), [`c2e349a`](https://github.com/azamatos/yeral/commit/c2e349a373bb35b0312a176d00e96df5d1f658e8), [`1f5a2ee`](https://github.com/azamatos/yeral/commit/1f5a2ee73f6ad4491ea37f8ab0ae6c563b11eca0), [`e04b213`](https://github.com/azamatos/yeral/commit/e04b2133a1d955ec6f2341a458b659a1174991bb), [`25413c8`](https://github.com/azamatos/yeral/commit/25413c829b2b4000490831feb17d88df70c1ec70), [`f5ae0ed`](https://github.com/azamatos/yeral/commit/f5ae0edf7f8895b811e5b54c26f26074b762b8a6), [`3f95736`](https://github.com/azamatos/yeral/commit/3f95736031c6366024978391d97500ed4bd47d27), [`cb68085`](https://github.com/azamatos/yeral/commit/cb680852c4a3593289018d0eb7bc4e80efe376a5), [`288bc83`](https://github.com/azamatos/yeral/commit/288bc835328c9c2cbc4e907dcdf4590aeb7c1552), [`7b6c25a`](https://github.com/azamatos/yeral/commit/7b6c25ad56787dba1bac36bddbe13168704704b9), [`32d906d`](https://github.com/azamatos/yeral/commit/32d906d85a8a88addbf77141a27ef8d9ca301c4c), [`46f6eba`](https://github.com/azamatos/yeral/commit/46f6eba0e302f62e27bee6055610731e171fa3b6), [`0d74925`](https://github.com/azamatos/yeral/commit/0d749256912b63737a0b2207e7574b80833a8119), [`041cfb4`](https://github.com/azamatos/yeral/commit/041cfb42f38f0515c015e338204db290147a7f64), [`422547d`](https://github.com/azamatos/yeral/commit/422547decfeb6fb442d972ec85e0178b0553614b), [`72e46b9`](https://github.com/azamatos/yeral/commit/72e46b938f6c09ea1516c6bac299dfea596b7472), [`c62685c`](https://github.com/azamatos/yeral/commit/c62685c44288edc0286f115689df56c891455812), [`bb12b70`](https://github.com/azamatos/yeral/commit/bb12b70764fd7e5f5d43ed3e98b68d329c61d6da), [`49e3e54`](https://github.com/azamatos/yeral/commit/49e3e540ee64bf6cac0e681018ad0a936fb800d0)]:
  - @yeral/contract@0.2.0

## 0.1.0

### Minor Changes

- [#18](https://github.com/azamatos/yeral/pull/18) [`1b9975d`](https://github.com/azamatos/yeral/commit/1b9975df284cfcabca6087ce17eab42d6e20ab83) Thanks [@azamatos](https://github.com/azamatos)! - The typed api client for the apps: query and mutation options for every client screen, errors with the contract's codes, and live updates that refresh what other people changed.

### Patch Changes

- Updated dependencies [[`292c035`](https://github.com/azamatos/yeral/commit/292c0356081295639eb76d814558c6507aa11f59), [`bc4864c`](https://github.com/azamatos/yeral/commit/bc4864c0da941448ae26ad6be0bbfde9b424f394), [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878), [`1b9975d`](https://github.com/azamatos/yeral/commit/1b9975df284cfcabca6087ce17eab42d6e20ab83)]:
  - @yeral/contract@0.1.0
