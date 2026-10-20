# @yeral/domain

## 0.3.0

### Minor Changes

- [#86](https://github.com/azamatos/yeral/pull/86) [`46a5546`](https://github.com/azamatos/yeral/commit/46a55461a72145e74900610f8714ea24eeb88cdc) Thanks [@azamatos](https://github.com/azamatos)! - A business that moves tells its clients (book Q-215): when the owner or an administrator changes the address line,
  street or city, every waiting request and confirmed visit ahead gets an SMS with the new address, 10 minutes after the
  last change (a quick fix makes one SMS, a move and back none; a visit sooner hears it 30 minutes before, or at once).
  It goes whatever the client's SMS switches; a reminder that goes first says "new address" instead. The business page
  adds `movedAt` ("New address" for 30 days; a move back clears it), and a booking ahead adds it once its SMS went.
  Migration 0026 adds `bookings.address_told`, `businesses.moved_at` and `moved_from`.

- [#87](https://github.com/azamatos/yeral/pull/87) [`29643e6`](https://github.com/azamatos/yeral/commit/29643e63fe576a087fd96a138c6f3ab329270d15) Thanks [@azamatos](https://github.com/azamatos)! - A new booking (online or by the team) whose time the business's hours closed just then comes back as 409
  `slot_taken` with the nearest free times, as one taken by another booking does; a move or an offered time asks for
  that one time and still comes back without times. Two team endpoints (a team member's services, resending
  an invite) answer a refused value in the `validation_error` shape every other endpoint uses (`issues`). The domain
  drops `checkPlan` (`planRefusal` gives the same answer with its details).

- [#93](https://github.com/azamatos/yeral/pull/93) [`d5603a8`](https://github.com/azamatos/yeral/commit/d5603a8f5b7c69ab3c803738cc9a73e99ea81a19) Thanks [@azamatos](https://github.com/azamatos)! - Blocked time (book B-18): `POST /v1/w/{slug}/calendar/blocks` closes part of a day for one person ("Ýapyk · Okuw"),
  optionally every week up to a date; `GET` lists them and `DELETE …/blocks/{id}` takes one (or the rest of its series)
  away. Nobody books blocked time: free times leave it out, a move onto it is `cannot_move` with `blocked`, and a block
  over a booking is refused (`block_over_bookings`). The owner and administrators block anyone's time, a specialist only
  their own. Migration 0027 adds `staff_blocks`.

- [#84](https://github.com/azamatos/yeral/pull/84) [`bbcdae5`](https://github.com/azamatos/yeral/commit/bbcdae53e05deadb98abc119b138abaeded262b3) Thanks [@azamatos](https://github.com/azamatos)! - A business's cancel reaches the app as a code it words: the booking detail and the SMS link page add `businessCancel`
  (`{ reason, text }`, with the business's words for "Other reason" or the closed day's name), and `cancelReason` holds
  only the client's own words. The free times offered when a business closes over a booking are taken with their own
  source, `cancel` (`accept-alternative`), no longer `decline`.

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

- [#109](https://github.com/azamatos/yeral/pull/109) [`d4afcd0`](https://github.com/azamatos/yeral/commit/d4afcd0e1c97367c74ade23a8fdbca741df1e815) Thanks [@azamatos](https://github.com/azamatos)! - `GET /v1/me` (and the sign-in's account) says whether the number can be changed now (`canChangePhone`, false while the
  sign-in code shows on the screen), and an invite card says whether the person will answer booking requests there
  (`answersRequests`, from the business's rules and their own switch), so the card's lines fit (book B-08).

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

## 0.2.0

### Minor Changes

- [#76](https://github.com/azamatos/yeral/pull/76) [`a072307`](https://github.com/azamatos/yeral/commit/a072307a5d53407d43c6b4a41290254ed258ec8e) Thanks [@azamatos](https://github.com/azamatos)! - The business answers requests (book B-19–B-21): `GET /v1/w/{slug}/requests` lists the waiting requests and moves each
  person may see, most urgent first, with the client's visits and no-shows and whether they may answer;
  `POST …/confirm` confirms (a move moves its booking); `POST …/decline` declines with a reason and, for a new request,
  up to 3 offered times each checked free for its specialist. The client gets the declined SMS with the reason
  (en/tk/ru; a client who can't book online and got no times is asked to call), and a move's decline carries its reason.
  A request shared by two specialists is answered by the desk. The sdk adds `requests.list`, `confirm` and `decline`; booking events refresh the list.

- [#60](https://github.com/azamatos/yeral/pull/60) [`2731729`](https://github.com/azamatos/yeral/commit/27317290a96fe5e7fa982bf9fcee7d1e0532f882) Thanks [@azamatos](https://github.com/azamatos)! - The typical answer time is worked out (book Q-113): the business page's `typicalConfirmMinutes` is the median of the
  last 30 days' answer times, rounded up (15 min, 1 h …), and null until the business has answered 5 requests. Bookings
  keep when the business answered them (`answered_at`).

- [#82](https://github.com/azamatos/yeral/pull/82) [`276e50f`](https://github.com/azamatos/yeral/commit/276e50f1eecd30a07eeefa40daba6c30887c9fcd) Thanks [@azamatos](https://github.com/azamatos)! - A booking and a change of hours no longer pass each other: every way a booking takes its time checks the hours as they
  stand, ordered with an hours save. A waiting request on a day that closes is declined (with the day's name and offered
  times), not cancelled. A booking undone while the hours are saved no longer fails the save. A specialist's cancel is
  checked again under the lock. Yearly special days are checked against every weekday they may fall on. Undoing a team
  booking takes back the name it gave a nameless client record (migration 0025).

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

- [#71](https://github.com/azamatos/yeral/pull/71) [`420d5d1`](https://github.com/azamatos/yeral/commit/420d5d181095600443dae9c3d7ad79e4281fb8aa) Thanks [@azamatos](https://github.com/azamatos)! - Busy elsewhere (book Q-272): a person who works in several workspaces is taken in each by their waiting and confirmed
  bookings as a specialist in the others, buffers included. Free times leave that time out, and a booking that would
  clash at the last moment, or a cancel brought back after it, is refused with 409 `slot_taken`.

- [#44](https://github.com/azamatos/yeral/pull/44) [`e82254d`](https://github.com/azamatos/yeral/commit/e82254d16a3b78ada77b527bdaea9cf2fbfab327) Thanks [@azamatos](https://github.com/azamatos)! - The city is data (book Q-107): the market's cities and its main city, and `GET /v1/cities` with the city a position is
  in. Search, "Näme?" and "Nirede?" suggestions keep to the chosen city (the main one when none is chosen); a position
  or a map area crosses city lines. Cards, business pages, bookings, the workspace switcher and invites carry the city;
  a reminder SMS names it when the business is outside the main city.

- [#81](https://github.com/azamatos/yeral/pull/81) [`62627b2`](https://github.com/azamatos/yeral/commit/62627b285926a4d03094adc7d506bc0e87e68157) Thanks [@azamatos](https://github.com/azamatos)! - A booking keeps what the client knows of it, and its one waiting news SMS is worded when it goes: a confirmation tells
  the booking as it is, a change says what changed since the client knew it ("moved", "moved … with …", "now with …"),
  or nothing when it's back as they knew it. No more duplicate "booked" or "now with …" texts, no "moved" for a booking
  the client hadn't been told about, and a phone booking cancelled before its confirmation went texts nothing. A booking
  the team enters is first told 15 seconds after it's saved, so an undo at the last moment can't leave an SMS behind.
  Migration 0024 adds `bookings.told` and an index for a booking's waiting SMS.

- [#68](https://github.com/azamatos/yeral/pull/68) [`3eeb085`](https://github.com/azamatos/yeral/commit/3eeb08539054df0290f9784b8358f8fb00aa6f47) Thanks [@azamatos](https://github.com/azamatos)! - Lateness is a fixed 15 minutes at every business in the MVP (book Q-118): `LATE_MINUTES` in `@yeral/domain/rules`,
  shown in each business page's rules whatever a business had stored. Breaking for `@yeral/domain`:
  `BookingRules` and `DEFAULT_RULES` no longer have `lateToleranceMinutes`.

- [#42](https://github.com/azamatos/yeral/pull/42) [`926fe24`](https://github.com/azamatos/yeral/commit/926fe2405d7c05b93ada0260e6b18adddfeeeced) Thanks [@azamatos](https://github.com/azamatos)! - A request's hold time counts only while the business is open (book Q-120): `holdUntil()` takes the business's hours,
  uses up the hold inside its open stretches (special days included, breaks not, a night past midnight too) and never
  runs past the visit start. A request sent at 23:00 to a business opening at 09:00 with a 30-minute hold waits until
  09:30; with no open time at all before the visit, the hold counts plain time. `openStretches()` is the shared walk over
  open time, used by the hold and the open state.

- [#80](https://github.com/azamatos/yeral/pull/80) [`501579f`](https://github.com/azamatos/yeral/commit/501579f6fca638352a8dd7efee96b969b794b232) Thanks [@azamatos](https://github.com/azamatos)! - The owner and administrators set the opening hours and special days (book B-39, B-40): `GET`/`PUT
  /v1/w/{slug}/settings/hours` saves the week (30-minute steps, one break a day) and the holidays or unusual days (closed
  or other hours). Bookings ahead the change leaves outside the hours make it `bookings_affected` with the list; sent again
  with `keep` they stay, with `cancel` each client's booking is cancelled under the day's name (or "The opening hours
  changed") with up to 3 free times they can take in one tap, by SMS too (en/tk/ru). The client's booking detail adds
  `cancelOffers`. The sdk adds `settings.hours` and `updateHours`. Migration 0023 adds the two cancel reasons.

- [#39](https://github.com/azamatos/yeral/pull/39) [`c2e349a`](https://github.com/azamatos/yeral/commit/c2e349a373bb35b0312a176d00e96df5d1f658e8) Thanks [@azamatos](https://github.com/azamatos)! - Market settings and English as the source language (book chapter 10, P2 step 1; ADR 0022, ADR 0023).
  
  - `@yeral/domain/market`: `MARKET` holds the market's languages, currency, phone rules and time zone (Turkmenistan,
    English only for the first launch); time, phones and money read it.
  - The api answers in the market's main language (English) when no `?lang=` is given, creates new accounts in the
    language they signed in with or else that one, and sends SMS in it to people who never chose a language. Migration
    `0004` drops the database's `'tk'` default for `users.lang`.
  - Texts written per language need any one language: the asked language, else the market's main one, else whichever
    was written; search matches every language.
  - SMS texts take the brand from `common.brand`; money messages take the currency from the market.
  - `manatSchema` is `moneySchema`. `DEFAULT_LOCALE` comes from the market, and `MARKET_LOCALES` lists what the sites
    offer.
  - `PhoneInput` needs `prefix`, `maxDigits` and `format` (the market's: `COUNTRY_PREFIX`, `formatNational`) instead of defaulting to +993 and 8 digits. A person chooses only among the market's languages (`marketLocaleSchema`); `localizedSchema` requires one language at least.

- [#79](https://github.com/azamatos/yeral/pull/79) [`1f5a2ee`](https://github.com/azamatos/yeral/commit/1f5a2ee73f6ad4491ea37f8ab0ae6c563b11eca0) Thanks [@azamatos](https://github.com/azamatos)! - The business moves and cancels bookings (book B-26, B-27): `POST /v1/w/{slug}/bookings/{code}/move` takes a confirmed
  booking to a new time or another specialist's column, and a move that doesn't fit is `cannot_move` with the reason (the
  service, a day off, the hours, busy elsewhere with its time, another booking, the buffer); a booking with the client's
  move waiting is `move_waiting`. `POST …/cancel` cancels with a reason: "The client called to cancel" is the client's own
  cancel (no undo from the app), the others show the client the reason. The client hears both by SMS (new texts for a move,
  a new specialist and a cancel asked by phone, en/tk/ru), under their confirmations switch; a move's SMS defaults to
  the booking's own setting, and a change within a new booking's undo time tells nothing new. The business no longer moves a waiting
  request. The sdk adds `calendar.move` and `cancel`. Migration 0022 adds the cancel reason.

- [#55](https://github.com/azamatos/yeral/pull/55) [`f5ae0ed`](https://github.com/azamatos/yeral/commit/f5ae0edf7f8895b811e5b54c26f26074b762b8a6) Thanks [@azamatos](https://github.com/azamatos)! - Name and surname as two fields (book Q-156): the profile has `firstName` and an optional `surname` beside the whole
  `name`, `PATCH /v1/me` takes them (the old one-field `name` is split at the first space), and reviews are signed
  "Aýjemal G.", or "Aýjemal" without a surname. `@yeral/domain/names` holds the rules.

- [#45](https://github.com/azamatos/yeral/pull/45) [`3f95736`](https://github.com/azamatos/yeral/commit/3f95736031c6366024978391d97500ed4bd47d27) Thanks [@azamatos](https://github.com/azamatos)! - Offered times name one specialist (book Q-159): after an expired request the free times keep the client's specialist
  where they're free, and taking one books that person only. The booking shows each offered time with its specialist
  and as free, taken or past (Q-264), and which booking took one. With nothing free, the expiry SMS asks the client to
  pick another time (Q-252). A paused business or a phone-only client gets no free times or "move" on the booking, and
  `bookOnline: false` for the call card (Q-154).

- [#43](https://github.com/azamatos/yeral/pull/43) [`2ab7a0b`](https://github.com/azamatos/yeral/commit/2ab7a0be134fadb73bc287ca010ce4eaf739f3e3) Thanks [@azamatos](https://github.com/azamatos)! - Client reminders keep out of the night (book Q-285): `reminderPlan()` plans the day and 2-hour reminders, moves one
  that would arrive between 22:00 and 08:00 to 21:30 the evening before the visit (worded "tomorrow"), sends at most one
  reminder on any day before the visit, and leaves out a moved one within 2 hours of booking. A 07:00 visit gets one
  reminder at 21:30 the evening before, not one at 05:00. A moved reminder goes only if the client wants a reminder it
  stands for (its `covers`).

- [#46](https://github.com/azamatos/yeral/pull/46) [`8fca4fb`](https://github.com/azamatos/yeral/commit/8fca4fbf452e3319ad6289dec43a66f7398ec8fa) Thanks [@azamatos](https://github.com/azamatos)! - The phone-only limit restarts (book Q-127): when the business turns a client's block off, only no-shows marked after
  that count toward the limit again. Removing a wrong no-show or setting the limit to 0 still lifts a block that came
  from the count; one set by hand stays.

- [#41](https://github.com/azamatos/yeral/pull/41) [`46f6eba`](https://github.com/azamatos/yeral/commit/46f6eba0e302f62e27bee6055610731e171fa3b6) Thanks [@azamatos](https://github.com/azamatos)! - A business may be open past midnight (book Q-105, chapter 10 P2 step 3).
  
  - A business day keeps everything after its midnight, up to 48:00: hours like 18:00–02:00 are `open: 1080, close:
    1560`, and a 01:00 booking is the day before's, at minute 1500. `weekHoursErrors()` checks that a day's part past
    midnight ends by the next day's opening; the open state after midnight reads yesterday's hours.
  - Free times count the day before's late bookings and the day after's early ones (`busyOn()`); the api loads them.
  - Minutes in the contract reach 2880 (a start 2879). Migration `0007` puts `span` in absolute minutes, so the database
    refuses a specialist's or a table's overlap across midnight, and allows minutes up to 2880.

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

- [#56](https://github.com/azamatos/yeral/pull/56) [`c62685c`](https://github.com/azamatos/yeral/commit/c62685c44288edc0286f115689df56c891455812) Thanks [@azamatos](https://github.com/azamatos)! - Time limits (book Q-254, Q-206, Q-126): a no-show can be marked from the visit's start until 24 hours after its end,
  other complaints any time on a confirmed or completed booking (`canComplain`); a review can be written until 30 days
  after the visit (`review_window_passed`). New error codes `noshow_window_passed` and `review_window_passed`.

- [#49](https://github.com/azamatos/yeral/pull/49) [`bb12b70`](https://github.com/azamatos/yeral/commit/bb12b70764fd7e5f5d43ed3e98b68d329c61d6da) Thanks [@azamatos](https://github.com/azamatos)! - SMS links carry a long random token (`yeral.app/l/{token}`) instead of the booking code (book Q-168). The link page reads
  the booking signed out (`GET /v1/links/{token}`) with the phone masked, and signs in only with the booking's own phone
  (`POST /v1/links/{token}/code`, `/verify`).

- [#59](https://github.com/azamatos/yeral/pull/59) [`b737a56`](https://github.com/azamatos/yeral/commit/b737a56bb0322454a603f867b1aae126e9e3353f) Thanks [@azamatos](https://github.com/azamatos)! - An undo ("Yzyna al") that fails says why (ROUND6 A6), one error per reason: the time was taken (`slot_taken`), the class
  is full (`session_full`), the visit has started (`already_started`), the answer time ran out (`request_expired`); past
  the 5 minutes `restore_expired`, a second tap `invalid_status`. A request brought back counts as a new one (the waiting
  limit, a paused business). `canClientRestore` holds the rule; `undo.failed` and `undo.reasons` hold the texts.

- [#57](https://github.com/azamatos/yeral/pull/57) [`49e3e54`](https://github.com/azamatos/yeral/commit/49e3e540ee64bf6cac0e681018ad0a936fb800d0) Thanks [@azamatos](https://github.com/azamatos)! - A client may have at most 3 requests waiting at one business and 10 in all (book Q-124); past that, sending answers 409
  `too_many_waiting` with the limit it would pass. Move requests and instant bookings don't count.

## 0.1.0

### Minor Changes

- [#13](https://github.com/azamatos/yeral/pull/13) [`bc26121`](https://github.com/azamatos/yeral/commit/bc26121f71c0cfcadce5e511f4bcc74f96e47502) Thanks [@azamatos](https://github.com/azamatos)! - First version of the booking rules for every kind of business: business-local time, +993 phones, booking codes, booking rules with their options, opening hours with special days and staff shifts, free times for appointments (service chains, any specialist, buffers), tables and classes, the five-status lifecycle with hold times, workspace permissions, client stats and distances.

### Patch Changes

- [#21](https://github.com/azamatos/yeral/pull/21) [`4eb187d`](https://github.com/azamatos/yeral/commit/4eb187d89e3c0da34e5bcf39a80c60eda7f89878) Thanks [@azamatos](https://github.com/azamatos)! - Booking rules fixes from review: a hidden price is never added into a shown total; "open now" counts the break as closed and says when the place reopens; overlapping special days resolve the same way whatever their order (a dated one beats a yearly one, then the narrower range, then closed beats special hours); phone input with +993 or a leading 8 (also typed after +993) is read correctly while typing; staff bookings can't start before the current slot; `businessTotal()` gives the business its full sum, hidden prices included; `hasAppointmentSlot()` answers "any free time that day?" without listing every slot; a moved table booking no longer collides with its own table; long booking codes use their whole range.
