# 0017. One booking engine for any business that sells time

- Status: Accepted 2026-10-14 (revised the same day by the business design, round 4)
- Decided by: the web design spec (14.10.2026) + the business design spec (round 4, "decided 14.10.2026") + Claude (model)

## Context

The first version modelled beauty salons only (salon, staff, services, one booking flow, optional instant confirmation,
statuses incl. "declined" and "expired"). The design widens Ýeral to every business that sells time and defines four
booking types with one lifecycle. The API and database don't exist yet (M2), so the model can be right from the start.

The business workspace design (`docs/design/business/README.md` §2–3, §8, §10–11) then set how a business answers
requests, which rules it can change and what it records about a visit; the client spec was updated with it.

## Decision

- **Categories** live in the CMS catalogue: icon, TK/RU/EN names, booking types, specialist word, starter services.
  13 launch categories; new ones ship without a release.
- **Booking types**: `appointment`, `table`, `class` now; `resource` later. A business has one or more. The business
  workspace manages appointments only for now; table and class businesses are seeded (CMS later) and start as
  appointment in the setup wizard.
- **Model** (client spec §7 + business spec §10): `Business` (categories, booking types, geo, hideExactAddress, hours +
  exceptions, typicalConfirmMin, avgBill), `BookingRules` (below), `ServiceGroup`, `Service` (duration, price
  `{type: fixed|from|free|hidden, amount}`, buffer override, online switch, specialists), `Staff` (the client site's
  specialist = a bookable staff row; ADR 0018), `Session` (class), `TableArea` (table), `Booking` (type; appointment
  `items[{serviceId, staffId, start, end}]` | table `partySize + areaId` | class `sessionId + seats`; start, end,
  status, cancelledBy, cancelReason, clientNote, internalNote, source, price total TMT, code `YR-xxxxx`, holdUntil,
  decline, complaint), `Client` (the business's client record; ADR 0018), `Review`, `User`.
- **Booking rules** per business (business spec §8, decisions §11):

  | Field | Values (default) |
  |---|---|
  | `onlineEnabled` | on/off (on) — off = "online booking paused" on the client site |
  | `confirmMode` | `manual` (default) · `instant` |
  | `holdMinutes` | 15 · 30 · 60 · 120 · 360 · 1440 (30) |
  | `leadMinutes` | 0 (= no limit) · 30 · 60 · 120 · 240 · 1440 (60) |
  | `windowDays` | 7 · 14 · 30 · 60 · 90 (30) |
  | `bufferMinutes` | 0–120, presets 0/5/10/15/20/30 (10); a service may override it |
  | `slotStep` | 15 · 30 (15) |
  | `cancelWindowMinutes` | null (= any time) · 60 · 120 · 360 · 720 · 1440 · 2880 (120) |
  | `askCancelReason` | on/off (on) |
  | `blockAfterNoShows` | 0 (= off) – 5 (2) |
  | `lateToleranceMinutes`, `note` | shown in the business page's rules (client spec §4.3) |

- **Statuses**: `pending | confirmed | completed | cancelled | noshow` with `cancelledBy: client | business | system`.
- **Confirmation**: by default every online booking arrives as a request (`pending`) and the business confirms it by hand.
  A business may switch on **instant confirmation**: online bookings are then created `confirmed` and the client sees
  "Ýazylyş tassyklandy". Bookings made by staff (`source: phone | walkin`) are always created `confirmed`.
- **Hold time**: a request holds its slot until `holdUntil = min(createdAt + holdMinutes, start)` (never past the visit
  start; server-enforced). Unanswered by then → `cancelled` by `system`, and the client gets an SMS with 3 alternative
  times. This replaces "a pending request expires at its start time".
- **Decline** = `cancelled` by `business` with `decline { reason, text?, alternatives[≤3] }`. Reasons: `slot_busy`
  ("Bu wagt boş däl"), `no_staff` ("Hünärmen ýok"), `cannot_do` ("Bu hyzmaty edip bilmeýäris"), `other` (text required).
  The client sees the reason. Accepting one of the business's alternatives creates a booking that is `confirmed` at once
  (the business already offered that time), if the time is still free; alternatives sent by the system after an
  expired request start a normal request.
- **Completed** is automatic after the end time; there is no "came" button. **Complaint** ("Arz et") on a confirmed or
  completed booking from its start time: `complaint { type: noshow | late | rude | other, text? }`; `noshow` sets
  status `noshow`. Complaints show on the client record (team only). When a client's no-shows at a business reach
  `blockAfterNoShows`, that client can book there only by phone (`clients.onlineBlocked`).
- **Source**: `web | app | phone | walkin | ai`; the workspace shows web and app as "Onlaýn".
- **Reschedule** by the client = a new request for the new time; the old time stays held until the business answers; if
  declined, the original stays confirmed. A move by the business (drag or "Başga wagta geçir") changes the booking in place
  and notifies the client by SMS if the checkbox is on.
- **Availability** in `@yeral/domain`, per type: appointment — business hours with one optional break per day and
  exceptions (closed or special hours, yearly or dated); staff shifts (inherit business hours or own hours per day inside
  them), one break per day per person, personal days off; multi-service chains back to back (one specialist if possible,
  «Islendik hünärmen» picks per service; manual bookings choose a specialist who does all services); buffer after each
  specialist's part of the chain (the last service's override, else the business buffer); starts every `slotStep` minutes
  from opening; lead time; booking window; pending requests and reschedule holds block their slots; a business day ends by
  midnight (past-midnight hours are not designed). Table: party size per area capacity, 15-minute hold, VIP ≥ 6.
  Class: seats left per session.
- **Geo**: distances from the user's position, radius filter, nearest-first sort; fallback without location.

## Consequences

- `@yeral/domain` is written fresh in M2 from this model; the legacy rules (and their tests) are the starting point for appointment availability.
- The CMS needs a catalogue module before categories can change in production; until then they're seed data.
- Jobs: expire requests at `holdUntil` (+ SMS with alternatives), complete visits after their end, reminders, review asks.
- The client site shows the decline reason and the alternatives (accept in one tap), the instant-confirm sent screen,
  and "book by phone" for a blocked client; the alternatives and the blocked state aren't drawn on the client side yet
  (activeContext open questions).

## Alternatives considered

- **Port the salon model and generalise later**: every table, endpoint and screen would change twice.
- **Separate engines per type**: three lifecycles to keep consistent; the design asks for one.
- **Manual confirmation only** (this ADR's first version, 2026-10-14 morning): replaced the same day by the business
  design, which keeps manual as the default and adds instant confirmation and hold times as business settings.
- **A separate `declined` / `expired` status**: the design keeps five statuses; who cancelled and why is `cancelledBy` + `decline`.
