# 0017. One booking engine for any business that sells time

- Status: Accepted 2026-10-14
- Decided by: the web design spec (14.10.2026) + owner (business always confirms by hand) + Claude (model)

## Context

The first version modelled beauty salons only (salon, staff, services, one booking flow, optional instant confirmation,
statuses incl. "declined" and "expired"). The design widens Ýeral to every business that sells time and defines four
booking types with one lifecycle. The API and database don't exist yet (M2), so the model can be right from the start.

## Decision

- **Categories** live in the CMS catalogue: icon, TK/RU/EN names, booking types, specialist word, starter services.
  13 launch categories; new ones ship without a release.
- **Booking types**: `appointment`, `table`, `class` now; `resource` later. A business has one or more.
- **Model** (design spec §7): `Business` (categories, booking types, geo, hideExactAddress, hours + exceptions, rules
  `{cancelWindowMin, lateToleranceMin, leadMin}`, typicalConfirmMin, avgBill, onlineBookingPaused), `ServiceGroup`,
  `Service` (duration, price `{type: fixed|from|free|hidden, amount}`, specialistIds), `Specialist`, `Session` (class),
  `TableArea` (table), `Booking` (type; appointment `items[{serviceId, specialistId, start, end}]` | table
  `partySize + areaId` | class `sessionId + seats`; start, end, status, cancelledBy, cancelReason, clientNote,
  `source: web|app|phone|ai`, price total TMT, code `YR-xxxxx`), `Review`, `User`.
- **Statuses**: `pending | confirmed | completed | cancelled | noshow` with `cancelledBy: client | business | system`.
  A pending request expires to cancelled-by-system at its start time; a confirmed booking becomes completed after it ends
  unless marked no-show (computed for display and settled by a job).
- **Every booking is confirmed by hand** by the business. No instant-confirmation setting.
- **Availability** in `@yeral/domain`, per type: appointment (multi-service chains back to back, any-specialist
  combinations, buffer, lead time, window, exceptions, holds for reschedules), table (party size per area capacity, 15-minute
  hold, VIP ≥ 6), class (seats left per session).
- **Geo**: distances from the user's position, radius filter, nearest-first sort; fallback without location.

## Consequences

- `@yeral/domain` is written fresh in M2 from this model; the legacy rules (and their tests) are the starting point for appointment availability.
- The CMS needs a catalogue module before categories can change in production; until then they're seed data.

## Alternatives considered

- **Port the salon model and generalise later**: every table, endpoint and screen would change twice.
- **Separate engines per type**: three lifecycles to keep consistent; the design asks for one.
