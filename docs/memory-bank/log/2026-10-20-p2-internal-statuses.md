# Internal statuses (feat/p2-internal-statuses)

- Changed: P2 step 4, book B-29, F-104, F-133 (design: StatusSettings, InternalStatusChip; `statusesV2` in the business
  demo data: 8 icons, 6 colours, max 5, the presets off).
- How (chapter 9, 20.10.2026, Claude (delegated)):
  - `internal_statuses` and `bookings.internal_status_id` (migration 0028): a name unique per business whatever its
    case (an index on `lower(name)`), one row per preset.
  - `GET`/`POST /v1/w/{slug}/settings/statuses`, `PATCH`/`DELETE …/statuses/{id}` (`settings/statuses.ts`): the
    presets made on the first read (`withPresets`, named from `internalStatuses.*` in the market's language); an add
    counted under the business row (`no key update`), the sixth `statuses_full` (409); a name taken `validation_error`
    (`name`, `taken`); a preset never renamed or deleted (`preset`).
  - `PUT /v1/w/{slug}/bookings/{code}/internal-status` (`{ statusId | null }`): a confirmed booking, a status switched
    on, whoever sees the booking in the calendar; `booking.updated` with no client in it.
  - sdk: `settings.statuses`, `addStatus`, `updateStatus`, `deleteStatus`, `calendar.setInternalStatus`.
- Tests: `settings/statuses.test.ts` (the presets, adding, names taken, five at most, the lists, the team reads, a
  preset kept, a booking marked and cleared, by whom, a status off, a request, the client's view).
- Follow-ups: the calendar day view shows the chip (B-16, next).
