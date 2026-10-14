# Product context

Product truth for code. The full spec, with every screen's behaviour, is [`docs/design/README.md`](../design/README.md);
this file is the condensed version agents need while coding. Where they differ, the design spec wins on behaviour and
the `.dc.html` screens win on visuals. Rules are implemented in `@yeral/domain` and `apps/api`; the UI only displays them.

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
| Cancelled | Ýatyryldy | `cancelledBy`: client · business (with reason) · system (pending request expired at start time) | book again |
| No-show | Gelmedi | marked by the business; the only red status | book again, see the business note |

- **The business confirms every booking by hand** (owner decision 2026-10-14; no instant confirmation).
- Reschedule = a new request for the new time; the old time stays held until the business answers; if declined, the original stays Confirmed.
- Reviews: only after a Completed booking, one per booking, editable for 7 days, shown as "Aýjemal G.".
- A booking cancelled from the Upcoming tab stays there greyed (toast with "Yzyna al") until the next page load.
- Booking codes are human-readable: `YR-48213`.
- SMS (TK, or the user's language): confirmed, declined, reminders 1 day and 2 h before, review ask 2 h after the end.
  No SMS when a request is sent (on-screen only). Templates: design spec §6.

## Search and location

- Default location = browser geolocation ("Ýakynymda"), radius 5 km (1/3/5/10/25). Sort nearest first; never show a slot
  earlier than now + the business's lead time.
- Geolocation denied → IP city shown only inside the "Nirede?" field; distances hidden; sort by rating × review count.
- No city name anywhere else in UI copy. Distances `1,2 km`, under 1 km `850 m`. Cards: `category · distance`.

## Accounts

- Phone-only login: +993 phone → 4-digit SMS code (auto-submit, 3 tries then 60 s lock, resend after 0:59) → name for new users.
- Language TK/RU/EN saved per user; favourites; notification settings (SMS confirmation, reminders, review asks); delete account.

## Glossary (code ↔ Turkmen UI)

| Code | EN | TK |
|---|---|---|
| `Business` | business, place | biznes, ýer |
| `Category` | category | kategoriýa (Gözellik, Dellekhana, Dyrnak, Spa we massaž, Diş lukmany, Saglyk, Restoran, Kafe we çaýhana, Sport, Okuw, Awtoulag, Öý haýwanlary, Öý hyzmatlary) |
| `Specialist` | specialist / any specialist | hünärmen / islendik hünärmen |
| `Service`, `ServiceGroup` | service | hyzmat |
| `Session` | class session | sapak |
| `TableArea` | seating area | ýer (Zal, Terrasa, VIP otag) |
| `Booking` | booking / send booking | ýazylyş / ýazylyşy ugrat |
| `Slot` | free time | boş wagt |
| `Review` | review | teswir |

Full UI glossary: design spec §9. All Turkmen copy needs a native review before launch.

## Demo data

`docs/design/demo-data.json` is the seed for every screen: demo clock `2026-10-14T11:20+05:00`, user Aýjemal
(`+993 65 90 11 22`), businesses (Glow Studio, Barber Loft, Ak Diş, Ojak, Aýdyň ýoga …), bookings. In the designs, SMS
code `0000` is wrong and any other works; the real demo environment accepts `1234`.

## The first web version (`apps/legacy`)

Beauty-only, Russian, salon-centric model with instant-confirmation and "declined/expired" statuses. It stays live until
the client site replaces it (M3) and is not a reference for new behaviour.
