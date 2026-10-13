# Product context

Rules here are product truth. Code implements them in `@yeral/domain` (rules) and `apps/api` (actions); the UI only
displays them. Source: the prototype, the design export and decisions taken while building the web marketplace.

## Glossary

| Русский | English (UI copy, docs) | Code |
|---|---|---|
| салон, заведение | salon, venue | `Salon` |
| мастер, сотрудник | master, team member | `Staff` |
| услуга | service | `Service` |
| запись | booking, visit | `Booking` |
| заявка | request (a booking waiting for the salon) | `Booking` with `status: 'pending'` |
| перенос, «предложить другое время» | proposal, reschedule | `Booking.proposal`, `rescheduled` |
| неявка | no-show | `status: 'noshow'` |
| клиент салона | salon client (the salon's card, may have no account) | `SalonClient` |
| пользователь | user (has a Yeral account) | `User` |
| окно | free slot | `Slot` |
| правила записи | booking rules | `Rules` |

## Booking statuses

Stored: `pending` → `confirmed` | `declined`; `confirmed` → `cancelled` | `noshow`; `pending` → `cancelled`.
Shown (`viewStatus`): a confirmed booking whose end has passed is **done** by default (one button marks a no-show,
there is no "came / didn't come" pair); a pending request whose start has passed is **expired**.
One colour semantics and one badge shape in every app; orange means "needs attention".

## Booking rules (per salon)

`online` (online booking on/off) · `manual` (requests wait for the salon; off = instant confirmation) ·
`minLead` (minimum minutes before a visit) · `windowDays` (how far ahead) · `buffer` (minutes after each visit, applied
silently) · `cancelHours` (free cancellation until N hours before; later = `late`) · `askReason` · `blockAfter2`
(after two no-shows the client must confirm the day before).

Availability = salon hours and exceptions ∩ staff schedule and exceptions − active bookings (+ buffer) − slots held by
pending proposals, starting at `now + minLead`, within `windowDays`. Candidate starts every 30 minutes plus right
after each busy block (rounded to 15).

## Client flows

- **Booking wizard**: services → master → time → confirm. «Любой мастер» is the time-first path: the time step shows
  every window and who is free at it. State lives in the URL (shareable, back button works).
- **Login**: phone + SMS code at the moment it's needed (inside the wizard, not before).
- **After booking**: request screen that follows the salon's answer; confirmed / declined (with reason) / proposal
  (accept or decline) / cancelled by salon.
- **My visits**: cancel (free or late), move (a new request; the old slot is kept until the salon answers),
  «это не я» for a phone booking made with a wrong number, confirm attendance when the salon requires it, review after a done visit
  (one per booking, editable), add to calendar (.ics), directions, call.
- **Favourites, notifications, profile** (name, birthday, gender, notification toggles).

## Mirror screens

Every salon action reaches the client, every client action reaches the salon (in production: push + SMS).

- Salon → client: confirms · declines (reason) · proposes another time · cancels · books by phone · marks a no-show.
- Client → salon: sends a request · cancels (late or not) · accepts / declines a proposal · «это не я» · confirms the visit · leaves a review.

## Business workspace decisions (from the Project Brief)

- The calendar shows one team member per wide column; week view is load only (blocks without text, tap opens the day).
- One button instead of "came / didn't come": a visit counts as done by default.
- Dragging a booking: a proposal for app clients, a direct move for phone clients.
- Settings tab, slider icon. Profile opens as a finished page, not a form.
- The business category drives how clients find the salon and which services are suggested.
- Address and phone are a separate screen with a map. Booking rules are their own section.
- Hours: one screen without tabs, about the salon only; exceptions start with a name.
- Team: invite block above the list, two-step invite. No stats on a staff card (they live in analytics).
- Disabling a team member moves their bookings to another master by default. Staff schedule and exceptions share one screen.
- Services catalogue lists services only (no staff).
- Notification settings describe *when* a message arrives, not toggles per event × role.
- Help is its own section. Analytics MVP answers three questions: about staff, services, clients.

## Demo behaviour (until the real backend)

- «Ножницы» (`/nozhnitsy`) confirms manually: answer from the business app (or the demo panel on the booking page).
- Other salons answer by themselves in a few seconds, or confirm instantly.
- Demo login: any `+993` number, code `1234`; `+993 65 12 34 56` is the demo client with history.
- Busy slots are synthetic but deterministic per master and day; real bookings always win.
