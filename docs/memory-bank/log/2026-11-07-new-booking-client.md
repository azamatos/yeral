# 2026-11-07 · New booking: one client field and the service picker (design v0.7 · B7)

Branch `feat/new-booking-client`, worktree `.claude/worktrees/shared`. Owner's complaints #35 (the client search in New
booking: «What if I have 100 Jahan?», the phone/name switch) and #36 («Show all services» isn't a button). Board:
`docs/design/screens/business/B7-Booking.dc.html` → B7.

## Done

- `apps/business/src/features/create-booking/ui/client-field.tsx` — **one Client field** on `@yeral/ui` `Combobox`:
  letters search names, digits search numbers (`model/client-search.ts`: `isDigitsQuery`, `matchIn`, `digitsMatchIn`,
  unit-tested), through `sdk.clients.list(slug, { q, sort: 'visits', limit })` — 5 frequent clients before typing, at
  most 8 matches with the grouped number and «Last visit 2 Oct · 14 visits», the match in bold (`ui/highlight.tsx`),
  «Showing 8 of 23 — keep typing» from `counts.all`, «+ New client “…”» last (digits → the number prefilled, letters →
  the name), the inline New client form with «This number is saved for {name}.» + «Choose {name}» (no duplicates), the
  chosen client as a card with Change (brings the search back with the name typed). A client whose number passed to
  someone else (`phone: null`) isn't offered. The lookup by the whole number stays for the alert notes and the usual
  services (`known` in the drawer).
- `service-picker.tsx` — Segmented «{name}’s services · All services» sharing the width (the first option disabled with
  a `title` until a specialist is chosen; the ⓘ waits for `InfoTip` from #318), a search over the open option («Search
  20 services»), «N matches in All services · Show them» switching without losing the search, a 420-high list with
  sticky group headers and counts, «{name} doesn’t do this» under a service in All services, the picks as chips with ×
  and the Total. A specialist booking for themself keeps their own list without the control.
- `new-booking-drawer.tsx` — state: `picked: ChosenClient | null` (a list row or the card «Book again» opened with),
  `creating` (the inline form), `scope: 'own' | 'all'`; `hasClient` = a chosen client, or a complete new number nobody
  has. The phone sheet focuses the one field (no keypad: a name may be typed too).
- `@yeral/ui` `Combobox`: options take `meta` (the right-hand line), the list takes `more` (the «keep typing» line, under
  the create row so the listbox holds only options), and the create row is highlighted when nothing matches (Enter
  creates). `missing.client` reads «client».
- Stories: `create-booking/ui/new-booking-drawer.stories.tsx` (100 clients with five Jahans, 100 services in 15 groups:
  frequent, «jahan», «ja» keep typing, digits, no match, chosen, services search, no specialist, 390);
  `calendar-page.stories.tsx` plays on the one field, its fake api answers `GET /w/glow-studio/clients` and the card
  with `stats` + `settings`. Run green: `create-booking`, `calendar-page` (64).

## Left

- The ⓘ on the disabled «Specialist’s services» option (InfoTip lands with #318); the «keep typing» line sits under the
  create row, not above it; the Warning callout «change the specialist» under the list when a pick isn't the person's
  (today the Specialist section's callout and the disabled chips say it); the known-number check runs only once the
  number is complete.
- Phone: after «+ New client» the focus doesn't move into the form yet.
- `tk`/`ru` strings come with the market's translation pass (English only today).
