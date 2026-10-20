# Product context

Product truth for code. **The product book [`docs/product/`](../product/README.md) is the source of product rules**
(ADR 0021, 2026-10-17); while it has open questions, this file still describes what is built. The design spec
([`docs/design/README.md`](../design/README.md)) covers behaviour the book doesn't, and the `.dc.html` screens win on
visuals. Where this file and the book differ, the book wins. Rules are implemented in `@yeral/domain` and `apps/api`;
the UI only displays them.

## Booking types: one engine, four types

| Type | TK | Client steps | Card shows | Used by |
|---|---|---|---|---|
| Appointment | Wagt bellemek | service(s) → specialist or «Islendik hünärmen» → date & time → details → send | next free slots | barbers, salons, dentists, physio, tutors, mechanics, groomers, home services |
| Table | Stol bronlamak | party size → date & time → seating area → details → send | times for the party size (default 2), average bill | restaurants, cafés, tea houses |
| Class | Topar sapagy | session from the schedule → seats → details → send | next session + seats left | yoga, group fitness, courses |
| Resource *(later)* | Ýer kärendesi | resource → time range → details → send | free hours strip | pitches, saunas, studios |

- A business has one or more types; its category sets the default (a gym = classes + personal training).
- Where: at the business (default), at the client's address, or online. Home-based businesses can hide the exact address
  until confirmed (the map shows an approximate circle).
- Specialist word: *hünärmen*; categories rename it (*lukman*, *mugallym*, *tälimçi*, *ussa*, beauty roles). A solo business skips the step.
- Several services in one appointment run back to back, with one specialist if possible; «Islendik hünärmen» lets the
  system pick per service. A slot is free only if the whole chain fits.
- Prices: fixed (`80 TMT`), from (`250 TMT-den`), free (`Mugt`), hidden (restaurants show `≈ 150 TMT` average bill). Durations on every service.
- Table: party chips 1–8, "9+" means call; VIP areas need ≥ 6; a table is held 15 minutes after the time.
- Class: seats stepper up to min(2, seats left); full sessions disabled (waitlist later).

## Statuses and lifecycle

| Status | TK | Meaning | Client can |
|---|---|---|---|
| Pending | Garaşylýar | sent, waiting for the business | cancel (no fee), edit note |
| Confirmed | Tassyklandy | business accepted (phone bookings: + phone icon) | reschedule or cancel until the cancellation window (default 120 min before start); after it only "Jaň et" |
| Completed | Tamamlandy | default after the slot ends | review (if none), book again |
| Cancelled | Ýatyryldy | `cancelledBy`: client · business (decline or cancel, with reason) · system (request not answered within the hold time) | book again; after a decline, accept one of the business's alternative times |
| No-show | Gelmedi | set by the business through "Arz et" (complaint); the only red status | book again, see the business note |

- **Confirmation** (business spec §2, ADR 0017): manual by default — online bookings arrive as requests (*Garaşylýar*);
  a business may switch on instant confirmation (then *Tassyklandy* at once, "Ýazylyş tassyklandy"). Staff-made bookings
  (phone, walk-in) are always confirmed.
- **Hold time** (manual mode): a request holds its slot 15 min – 24 h (default 30 min), never past the start; unanswered →
  cancelled by the system + SMS with 3 alternative times.
- **Decline**: reason chips (+ text for "Başga sebäp") that the client sees, plus up to 3 alternative times the client
  accepts in one tap (accepted = confirmed at once).
- **Complaint** ("Arz et"): Gelmedi (→ no-show) · Gijä galdy · Gödek gylyk · Başga; goes to the client card (team only).
  After N no-shows at a business (default 2) the client can book there only by phone.
- Reschedule = a new request for the new time; the old time stays held until the business answers; if declined, the original stays Confirmed.
- Reviews: only after a Completed booking, one per booking, editable for 7 days, shown as "Aýjemal G.".
- A booking cancelled from the Upcoming tab stays there greyed (toast with "Yzyna al") until the next page load.
- Booking codes are human-readable: `YR-48213`.
- SMS (TK, or the user's language): confirmed, declined (with reason), expired (with 3 times), reminders 1 day and 2 h
  before; no review ask (book Q-259). No SMS when a request is sent (on-screen only). Templates: design spec §6.

## Search and location

- Default location = browser geolocation ("Ýakynymda"), radius 5 km (1/3/5/10/25). Sort nearest first; never show a slot
  earlier than now + the business's lead time.
- Geolocation denied → IP city shown only inside the "Nirede?" field; distances hidden; sort by rating × review count.
- No city name anywhere else in UI copy. Distances `1,2 km`, under 1 km `850 m`. Cards: `category · distance`.

## Accounts

- Phone-only login: +993 phone → 4-digit SMS code (auto-submit, 3 tries then 60 s lock, resend after 0:59) → name for new users.
- Language TK/RU/EN saved per user; favourites; notification settings (SMS confirmation, reminders); delete account.

## Business workspace (business.yeral.app)

Spec: `docs/design/business/README.md` (round 4: daily work + setup; round 5, design v0.4: analytics, reviews,
notifications, help, billing, B2B landing, tables, classes; decisions in §22, open questions in §24). Model: ADR 0018, levels and team rows ADR 0025.

Three fixed levels (book chapter 3, ADR 0025; the full table is in the book and `@yeral/domain/permissions`):

| Level | Sees | Can |
|---|---|---|
| Eýesi (owner, exactly one per workspace) | everything | everything, incl. revenue, the team and invites |
| Administrator | whole calendar, all clients | answer requests, bookings, no-shows, clients, review replies, services, settings, analytics without money; sees the team |
| Hünärmen (specialist) | own column only | own requests (by the "who answers" setting), own bookings and clients, own earnings |
| Hünärmen without the app (*programmasyz*) | — (never signs in; a phone is required) | — ; bookable online, owner/admin answer for them |

- The table is fixed in the MVP (the owner editing it is Later, F-089). Enforced by the api, hidden in the UI.
- One Ýeral account can be a client and a member of several businesses; a branch is its own business (switcher in the sidebar).
- New businesses are "Barlagda" (in review) until the Ýeral team verifies them (≤ 24 h); they use the workspace at once but aren't public.
- Day summary: count = all non-cancelled bookings incl. requests and no-shows; planned revenue = confirmed + pending + completed prices (revenue permission only).
- Client segments: Yzygiderli (≥ 3 visits in 6 months) · Täze (first visit ≤ 30 days) · Köpden bäri gelmedik (60+ days) · Arz edilen (has complaints).
- Reviews (§15): only after a Completed booking, one per booking; the business can't delete them, can reply (and edit or
  delete its reply), and can report one ("Arz et": false / didn't come · insulting · about another business · spam ·
  other) to Ýeral moderation. **A reported review stays visible on both sides but isn't counted** in the average, the
  count or the star bars until Ýeral clears it; removed → gone. Teswirler badge = unanswered count, neutral grey.
- Analytics (§14): money only with the revenue permission ("Girdejini görmek"); others see counts, no export or client lists.
- Notifications (§16): one sentence per event + channels (browser · app · SMS); SMS to staff only for critical events
  (a new request when the person has no app), never at night; quiet hours and summaries.
- Tables (§20): online bookings get the smallest fitting table automatically (staff can change it); a confirmed booking
  past its start counts as seated; walk-ins = confirmed + person icon.
- Classes (§21): "Gelmedi belle" only after the session starts; a manual add = 1 seat, source phone, confirmed; clashes =
  same trainer or room; waitlist later.

### Plans and commission (§18) — later: **Ýeral is free for now** (owner, 2026-10-16)

Every business gets everything at no cost: no plans, no commission, no invoices, no limit on specialists. The model below
is the design's plan for later (round 5, decided 14.10.2026, prices never set); nothing of it is built until the owner
turns it on.

- **Ýeke**: free, one specialist (online booking, calendar, clients, SMS reminders, link and QR). **Topar**: `[PRICE]` TMT
  a month per business (not per staff), unlimited staff, roles, analytics, support chat; each branch billed on its own;
  "Synap gör" trial terms open.
- **Commission is a layer on every plan, not a plan**: `[X]%` of the **first completed visit of a new client who found
  the business through Ýeral search**. Always free: the business's own link or QR, phone bookings, returning clients;
  never charged: no-shows and cancellations. So bookings must remember where the client came from (search vs own
  link/QR) — needed by M5 billing.
- SMS reminders to clients are included on every plan (Ýeral pays). Payment = invoice + bank transfer; plan changes take
  effect at the next invoice; Topar → Ýeke is blocked while more than one specialist is active.

## Glossary (code ↔ Turkmen UI)

| Code | EN | TK |
|---|---|---|
| `Business` | business, place | biznes, ýer |
| `Category` | category | kategoriýa (Gözellik, Dellekhana, Dyrnak, Spa we massaž, Diş lukmany, Saglyk, Restoran, Kafe we çaýhana, Sport, Okuw, Awtoulag, Öý haýwanlary, Öý hyzmatlary) |
| `Staff` (bookable = specialist) | specialist / any specialist / team | hünärmen / islendik hünärmen / topar |
| `Client` | a business's client | müşderi |
| `Staff.level`, `Invite` | access level, invite | dereje (Eýesi, Administrator, Hünärmen), çakylyk |
| `Service`, `ServiceGroup` | service | hyzmat |
| `Session` | class session | sapak |
| `TableArea` | seating area | ýer (Zal, Terrasa, VIP otag) |
| `Booking` | booking / send booking | ýazylyş / ýazylyşy ugrat |
| `Slot` | free time | boş wagt |
| `Review` | review | teswir |

Full UI glossary: design spec §9. The owner checks every translation before a market launches (book Q-101).

## Demo data

`docs/design/demo-data.json` (client) and `docs/design/business/demo-data.json` (Glow Studio's workspace: team, roles,
rules, hours, calendar day, clients) are the seed for every screen: demo clock `2026-10-14T11:20+05:00`, user Aýjemal
(`+993 65 90 11 22`), businesses (Glow Studio, Barber Loft, Ak Diş, Ojak, Aýdyň ýoga …), bookings. In the designs, SMS
code `0000` is wrong and any other works; the real demo environment accepts `1234`.

## The first web version (`apps/legacy`)

Beauty-only, Russian, salon-centric model with instant-confirmation and "declined/expired" statuses. It stays live until
the client site replaces it (M3) and is not a reference for new behaviour.
