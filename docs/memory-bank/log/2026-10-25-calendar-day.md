# The calendar's day (P4 slice 3, B1; feat/calendar-day)

- Changed: `/w/{slug}/calendar` is the calendar's day (B-Calendar, design §4 and §27.4, book B-16;
  `pages/calendar`): `?date=` (today without it), `?cancelled=true`, `?booking=` the block picked (validated by
  `calendarSearch`). The toolbar: Today, the day before and after, the day as a title that opens the month (DatePicker
  `look="title"`, new in `@yeral/ui`), «1 request» (warning) or «No new requests», Show cancelled; the day's line «16
  bookings · 3 requests · Revenue (planned): 1,410 TMT» («Your earnings (planned)» for a specialist; «Revenue» on a day
  gone by; no money without the right). The grid (D3: our own, placed by minutes): a column per person the reader sees with the avatar, «Doesn't
  use the app» and «6 bookings · 1 request»; the hours from an hour before the earliest working start or booking to an
  hour after the latest end (08:00–21:00 when nobody works; past midnight for a night bar, from midnight when the night
  before runs past it, those bookings shown too); a line every quarter (20 px; an hour 80), darker on the hour; the now
  line with its time on today (and on the night before's grid past midnight). The page is as tall as the screen and the
  grid scrolls both ways inside it, the names and hours staying. A booking shared with a colleague shows each person's
  part in their column, with that part's time. Another day keeps the one on screen until it comes and drops the picked
  booking from the address.
- Changed: `BookingBlock` in `entities/booking` (DS-Business BookingBlock): the status's look (a request dashed on the
  warning tint, cancelled dashed white, struck through), line 1 the status icon, start and client, the services from 44
  px, «10:15–11:00 · 45 min» from 62 px, by phone or walk-in, the alert note, a request's TimerPill (counting only while
  the business is open, `openMinutesBetween`; «by 09:30» while it's closed); a cancelled block beside a live one takes the
  right half. Its name is what it shows, then the time, status, markers and timer in words. The status icons moved to
  `entities/booking` (the rules page reads them there). `WorkspacePage` takes `flush` (the calendar runs edge to edge).
- Live: the shell's events (#211) refresh the calendar's keys, so a request or an answer shows within a moment.
- Decided (Claude, delegated; chapter 9, 25.10.2026, B-16 (how)): the requests chip only counts until the request
  drawer (B3) opens it; Day/Week, one specialist and the legend come with slice 4; a specialist's timers count the
  clock's minutes (they don't read the business's hours).
- Next: B2 (off hours, breaks, blocked time, days off, busy elsewhere, buffers, a move's ghost), B3 the request drawer.
