# 2026-10-31 · Slice 4, PR A1: the five api gaps

The plan's "API gaps" (`log/2026-10-31-slice-4-plan.md`), as one small contract + api PR ahead of the screen PRs
(B1–B13). Additive on `/v1` but for one shape: new endpoints, optional inputs, nullable new fields; `clientReportSchema.by`
(the client card's `reports[].by`) changes from the filer's name to `{ staffId, name } | null` (gap 5; no app read it
yet). Migration 0045 adds the `block_kind` enum and `staff_blocks.kind` (nullable; old rows stay null).

## 1. The internal note's write — `PUT /v1/w/{slug}/bookings/{code}/note`

- Body `{ note: string | null }` (`SetTeamNote`; trimmed, `TEAM_NOTE_MAX`); `null` or an empty text clears it. 204.
- Who: whoever sees the booking in the calendar (`canOn(actor, 'calendar', its staff)`): the owner, administrators, a
  specialist on their own; otherwise 404, as every team read of a booking answers. Any status, a cancelled one too.
- Writes `booking.updated` with no client in it: the team's open screens refresh, the client hears nothing and
  `GET /v1/me/bookings/{code}` never carries the note.
- Sdk: `sdk.calendar.setNote(slug)` → `{ code, note }`; invalidates the `calendar` prefix (the day view, the list, the
  one booking below). **B2** autosaves the whole text with it; no diff or cursor to send.

## 2. One booking by its code — `GET /v1/w/{slug}/bookings/{code}?lang=`

- Answers the `CalendarBooking` shape, byte for byte the block the day view draws (same status as people see it now,
  items with `bufferAfter`, `internalStatusId`, `alert`, `internalNote`, `complaint`, `move`), whatever its status.
- 404 for a booking the reader doesn't see in the calendar (a specialist: not their own), for an unknown code and for a
  move request's own code (the requests carry those). 400 for a code that isn't one (`export` included: the route
  sits after `GET …/bookings/export`).
- Sdk: `sdk.calendar.booking(slug, code, lang)`, key `keys.teamBooking` under the `calendar` prefix, so every booking
  event that refreshes the calendar refreshes it too. **B8**'s drawer, the client card's rows and a notification's
  «Open» (**B11**) read one booking with it; no day-scan.

## 3. Blocked time: a daily repeat and a reason `kind` — `POST /v1/w/{slug}/calendar/blocks`

- Input gains `repeat: 'daily' | 'weekly'` (optional; weekly when left out, as before) and
  `kind: 'training' | 'break' | 'personal' | 'other'` (optional) beside the free-text `reason` (still 40 characters,
  for Other said in words). `repeatUntil` bounds both repeats, a year at most (`BLOCK_REPEAT_DAYS`).
- A daily repeat is a row per date in one series (`seriesId`), checked like the weekly one: a booking under any of its
  days refuses the whole series with 409 `block_over_bookings` and `details.bookings` (code, date, start, end).
  `DELETE …/blocks/{id}?scope=series` takes this one and the later ones of either repeat.
- `Block` (the list, the calendar view's `blocks`) gains `kind: BlockKind | null` (null on blocks made before the
  chips). Keys come from `@yeral/domain/hours` (`BLOCK_KINDS`, `BLOCK_REPEATS`, `blockDates(date, until, repeat)`).
- **B1**'s form stores the chips as keys and sends `reason` only for Other; the calendar (slice 3's Closed layer)
  translates `kind` when it draws the block and falls back to `reason` where `kind` is null. The business app's
  calendar story fixture already carries `kind`.

## 4. The services menu for the whole team — `GET /v1/w/{slug}/services`

- The read is now `requireMember` (the whole team, a draft business included); the same menu the owner sees (every
  language, hidden amounts, services not online, who does each). Every write stays `requireServices` (owner,
  administrators; a specialist gets 403).
- **B5** (a specialist books for herself) and **B8** (the list's service filter) read `sdk.services.menu` as the owner
  does; nothing new in the sdk.

## 5. Who filed a complaint, one `by` shape — `complaint.by` and `reports[].by`

- `CalendarBooking.complaint` is `{ type, text, by: { staffId, name } | null, at } | null`; the client card's
  `reports[]` carry the same `by` (`complaintBySchema`, shared by `contract/calendar` and `contract/clients`) instead
  of a name alone. `by` is null when the author's staff row is gone.
- The api builds both from one helper (`complaintOf`, `complaintAuthors` in `modules/calendar/view.ts`); the filer is
  the staff id (`bookings.complaintBy`), and the removal rule is unchanged: owner and administrators any, a specialist
  their own, which the ReportBox (**B2**, **B9**) decides with `by.staffId === me.staffId`.
- The apps' fixtures: the client card's `by` was a string; no fixture in the apps built it yet.

## Choices made here (object to any)

- The note is `PUT`, whole, not `PATCH`: an autosave sends the field it owns, and `null` is the clear (the client's
  own note is `PATCH /v1/me/bookings/:code/note`, which also takes the whole text).
- The one-booking read lives in the calendar module and shape rather than a new `TeamBooking` DTO: the drawer that
  opens from the list is the calendar's drawer (B2), so one shape, one key prefix.
- `kind` is optional on input and nullable on output; `reason` stays free text for every kind (a Training block may
  still say which course), the form decides what to send.
- Tests: `modules/calendar/booking.test.ts` (new: gaps 1, 2, 5), `blocks.test.ts` (the daily repeat, `kind`),
  `menu.test.ts` (a specialist reads, can't write), `clients.test.ts` (the card's `by`),
  `packages/domain/src/hours.test.ts` (`blockDates` daily).

## Left for the screen PRs

- Translations of the four `kind` keys in the business app's messages (the calendar's block label, B1's chips).
- `complaint.by.name` is the staff name at read time, not frozen at filing; fine for the MVP.
