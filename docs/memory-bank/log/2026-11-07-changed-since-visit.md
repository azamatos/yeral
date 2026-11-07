# Something changed since the last visit (owner's idea 2, feat/changed-since-visit)

- Changed: the business page (`GET /v1/businesses/{slug}`, already per viewer and `no-store`) carries
  `changedSinceLastVisit: { address: { was: string | null } | null, hours: boolean, phone: boolean } | null`
  (`apps/api/src/modules/catalog/changed.ts`). Null for a guest, a client with no completed visit there, or nothing new;
  a visit is the client's (by account or by phone) completed or confirmed-and-ended booking. The address reads
  `movedAt` / `movedFrom` (book Q-215), `was` as the page would show it (the street for a home-based business).
- Changed: migration 0048 adds `businesses.hours_changed_at` (set when the week's hours change, not special days) and
  `phone_changed_at` (a phone change on a live business). Neither keeps the old value.
- Changed: client `entities/business` `ChangedNotice` (C7-Booking D1) at the head of the Confirm booking card; a new
  address holds Send booking until «I've seen the new address» is ticked, with the line under it. Stories
  `Client/Booking/ChangedNotice` and `Client/Pages/Booking` `Changed*`. Book row F-245 (06-scope).
- Decided: told once per change: the client's own online booking made after a change counts as seen (the board's
  "after a booking with the tick"), so nothing new is stored for the tick.
- Follow-ups: no "Was" for hours (old hours not kept; a `hoursBefore` column would add it); two moves since a visit show
  the latest one's "Was"; the board's later use on the My bookings card of a booking made before the move isn't built;
  the hours line shows the booking day's hours even when the week change touched another day.
