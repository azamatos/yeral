# Screens index

Hi-fi screens exported from the "Ýeral Web" canvas (14.10.2026, export v0.4 — see `../CHANGELOG.md`). Each `.dc.html` = one artboard. See `../CLAUDE.md` → "How to read a .dc.html screen".
Frame = size on the canvas. Pages are fluid (designed at 1440, must work down to 360); boards are fixed sheets.

## client/ — yeral.app

| File | Route | Kind · frame | States / tweaks |
|---|---|---|---|
| `Home.dc.html` | `/tk` | page · 1440×3180 | Static sections; links to Search |
| `Search.dc.html` | `/tk/search` | page · 1440×2780 | Category chips filter, day toggle, row↔pin hover; Glow Studio row → Venue |
| `Venue.dc.html` | `/tk/b/{slug}` | page · 1440×5160 | Service select/deselect, group chip filter, favourite toggle, summary card; tweak `preselect` |
| `Booking.dc.html` | `/tk/b/{slug}/book` | page · 1440×1600 | Tweaks `step` (services · staff · time · confirm · sent), `loggedIn`, `slotTaken`; code `0000` = wrong; phone 65 90 11 22 = existing user |
| `Booking-Table.dc.html` | `/tk/b/{slug}/book` (table) | page · 1440×1900 | Party 1–8/9+, date, time, area, requests, login; tweaks `sent`, `loggedIn` |
| `Booking-Class.dc.html` | `/tk/b/{slug}/book` (class) | page · 1440×1460 | Day tabs, sessions (seats left / Doly), seats stepper; tweaks `sent`, `loggedIn` |
| `Auth.dc.html` | `/tk/login` (modal) | board · 1800×1480 | Phone → code → new user → wrong code / 60 s lock; logged-in avatar menu |
| `Account-Bookings.dc.html` | `/tk/account/bookings[/{id}[/review]]` | page · 1440×1400 | Tabs Gelýän/Geçen, detail drawer by status, cancel modal + undo toast, review modal; tweaks `view` (list · drawer · cancel · review), `empty`, `late` (cancel window passed) |
| `Account-Profile.dc.html` | `/tk/account/profile`, `/favorites` | page · 1440×1600 | Profile form + dirty save bar, phone change via SMS, language, SMS switches, delete-account modal; favourites grid with remove + undo; tweak `pane` |
| `Mobile.dc.html` | — | board · 1442×2280 | Phone frames 390×844: Home, Search list, Map, Business page, Booking time step, My bookings sheet |
| `States.dc.html` | — | board · 1440×3760 | No results · location ask · location denied · slot taken · not bookable online · closed today · network error · loading skeleton · 404 · login required for favourite |
| `Client-Map.dc.html` | — | board · 1440×2860 | Site map, flow, inventory, decisions log |

## business/ — business.yeral.app (spec: `../business/README.md`)

| File | Route | Kind · frame | States / tweaks |
|---|---|---|---|
| `B-Shell.dc.html` | — | board · 1600×2140 | Sidebar, top bar, business switcher, user menu, tablet rail, request toast, verification banner |
| `B-Calendar.dc.html` | `/tk/calendar` | page · 1440×1420 | Tweaks `view` (dayAll · dayOne · weekAll · weekOne), `panel` (none · request · booking · new · decline · complaint · move); Play: click slots/blocks, confirm/decline, drag move, create booking |
| `B-Bookings.dc.html` | `/tk/bookings` | page · 1440×1320 | Tabs Haýyşlar/Şu gün/Gelýän/Geçen/Ýatyrylan, filters, bulk bar, drawers, decline modal; tweaks `tab`, `panel`, `selected` |
| `B-Clients.dc.html` | `/tk/clients` | page · 1440×1120 | Filter chips, search, bulk bar, new-client modal (phone only required); tweaks `filter`, `modal` |
| `B-Client.dc.html` | `/tk/clients/{id}` | page · 1440×1680 | Stats, notes (alert notes), upcoming, history, complaints, settings; tweaks `edit`, `composer` |
| `B-Onboarding.dc.html` | `/tk/signup` → `/tk/setup/{step}` | page · 1440×1024 | 8 steps; tweaks `step`, `homeBased` |
| `B-Settings.dc.html` | `/tk/settings/{profile,rules,hours,link,branches}` | page · 1440×1540 | Tweaks `pane`, `dirty`, `exceptionModal`; client-view preview of rules |
| `B-Services.dc.html` | `/tk/settings/services` | page · 1440×1440 | Catalog + service drawer; tweak `drawer` |
| `B-Team.dc.html` | `/tk/settings/team`, `/roles` | page · 1440×1360 | Team table, staff drawer, invite (3 steps), disable modal, role editor; tweaks `tab`, `panel` |
| `B-Analytics.dc.html` | `/tk/analytics[/staff[/{id}]\|/services\|/clients]` | page · 1440×1160 | Overview (tiles, revenue chart with hover tooltip, section rows), staff table + one staff, services (sortable), clients (weekly stacked bars, sources), first-weeks state; tweaks `view` (overview · staff · staffOne · services · clients · firstWeeks), `role` (owner · specialist — no money) |
| `B-Reviews.dc.html` | `/tk/reviews` | page · 1440×1980 | Summary + distribution, filters (Jogapsyz, stars, Hünärmen popover), sort, reply composer, edit/delete reply + undo, report modal → "Barlanýar"; tweaks `filter`, `composer`, `report` |
| `B-Notifications.dc.html` | `/tk/settings/notifications` | page · 1440×2060 | Browser-permission banner, 10 event rows (Haçan / Kim alýar + channel chips Brauzerde · Programmada · SMS), sound switches, quiet hours, summary times, save bar; tweaks `permission`, `dirty` |
| `B-Help.dc.html` | `/tk/help[/{article}]` | page · 1440×1260 | Search with live filter + no results, category tiles, popular articles, article view (steps with mini UI drawings, "Peýdaly boldumy?"), contact band, support-chat drawer; tweaks `view` (home · article), `chat` |
| `B-Billing.dc.html` | `/tk/settings/billing` (owner only) | page · 1440×2120 | Plan card (+ commission line), commission statement, invoices (Möhleti geçdi + "Töle"), bank transfer, company details form + save bar, compare modal (2 plans + commission row), Ýeke downgrade warning; tweaks `modal`, `dirty` |
| `B-Tables.dc.html` | `/tk/tables`, `/tk/settings/tables` | page · 1440×1240 | Bag kafe: timeline (areas, bars, requests, hold tails, now line, free-now side panel), floor plan, 2-person filter, reservation/request/walk-in drawers, table settings; tweaks `view` (timeline · floor · settings), `panel` (none · reservation · request · walkin) |
| `B-Classes.dc.html` | `/tk/classes`, `/tk/settings/classes` | page · 1440×1290 | Aýdyň ýoga: week grid (lanes, capacity bars, Doly, past, cancelled), session drawer (attendees, inline confirm/decline, add client), move modal, cancel-session modal with alternatives, add-class modal (recurring), class catalog; tweaks `view` (week · catalog), `panel` (session · cancel · add · none) |
| `B-Landing.dc.html` | `business.yeral.app` (logged out) | page · 1440×4680 | Header + phone menu, hero with drawn calendar mock, Kimler üçin (10 categories), features, 3 steps, pricing (2 plans + commission box), FAQ accordion, CTA band, footer |

## system/ — design system (v0.4)
| File | Kind · frame | What |
|---|---|---|
| `Main.dc.html` | board · 1440×3260 | Foundations: colour, type, layout, spacing (v0.3.1; v0.4 token additions are listed in `../COMPONENTS.md` Part 3) |
| `DS-Components.dc.html` | board · 1440×3900 | v0.3 components with hover/focus/pressed/disabled — the base of today's `@yeral/ui` + Storybook |
| `DS-Booking.dc.html` | board · 1440×2500 | Categories × booking types |
| `DS-Patterns.dc.html` | board · 1440×25400 | **v0.4 · Product components** — new domain-free components and new variants of existing ones (→ `@yeral/ui`). 8 sections: status & labels, feedback, data display, charts, inputs, navigation & layout, overlays, new variants |
| `DS-Business.dc.html` | board · 1440×40600 | **v0.4 · Business patterns** — domain components (→ FSD entities / features / widgets). 13 sections: calendar, requests & bookings, clients, team & services, settings & onboarding, reviews, notifications, analytics, billing, landing, tables, classes, client site |

Every drawing has a caption `Name · package · Storybook: … · from: …`; the full map is `../COMPONENTS.md`. Board heights are estimates (drawn without rendering) — some white space at the bottom is expected.

## explorations/
`Home-A/B/C.dc.html` — round-1 homepage options. **Not to build.** Final Home = B's hero + A's body.

## Developer notes collected while drawing

**Global**
- "Jaň et" = `tel:` link; "Ýol görkez" = maps deep link; both are `#` in the screens.
- Header "Giriş" opens the login modal (`/tk/login` as fallback route).
- Lists use skeletons while loading; buttons show an inline spinner and keep their width.
- `.hit` (Mobile board): pseudo-element that grows 36–40 px chips/slots to a 44 px touch area without changing their look — use it on touch layouts.

**Search**
- Sort nearest first; hide slots earlier than now + lead time.
- When geolocation is denied: hide distances, sort by rating × review count.

**Business page (Venue)**
- Specialist "Ýazylmak" → `/book?staff={id}`; "Dowam et" from the summary → `/book?services=…&step=staff`.
- Service chips filter (not scroll). Aside is sticky; ≤1023 it becomes a bottom bar.
- Logged-out heart → login modal first, then save (States tile 10).
- Main column `flex-basis` 540 so the aside doesn't wrap between 1024–1108 px.

**Appointment booking**
- Keep `step, services, staff, date, time` in the URL; scroll to top on step change.
- Availability: a slot is free only if the whole duration (all chosen services, back-to-back) fits the specialist's schedule. "Islendik hünärmen" = earliest time any qualified specialist (or combination per service) is free.
- Date strip: days of the hidden week are not focusable; arrows page by week; on phones it scrolls natively.
- SMS code: `inputmode="numeric"`, `autocomplete="one-time-code"`, paste fills all boxes, auto-submit on the 4th digit, "Tassykla" fallback, resend timer 0:59 and 60 s lock after 3 wrong tries are live timers.
- "Senenama goş" downloads an `.ics` file.
- `slotTaken`: show the banner for the chosen time; picking an alternative clears it; the taken slot shows as disabled in the time grid.

**Table / class booking**
- Close (×) returns to the business page `/b/{slug}`.
- Table: VIP area requires party ≥ 6; changing day clears an unavailable time; table is held 15 min after the time.
- Class: seats stepper max = min(2, seats left); full sessions disabled with "Sanawa ýazylmak — ýakynda" (waitlist later). Same-day sessions after the free-cancel window show "Mugt ýatyrmak wagty geçdi…".

**Account**
- Cancel window = each booking's start − the business's `cancelWindowMin` (default 120). Past it: only "Jaň et".
- A booking cancelled from Gelýän stays there greyed until reload.
- Review: 1 per completed booking, editable 7 days, shown as "Aýjemal G." (first name + surname initial).
- Favourites route opens the favourites pane directly.

**Business workspace (round 5)**
- Sidebar everywhere: Senenama (Stollar / Sapaklar by booking type) · Ýazylyşlar (amber count) · Müşderiler · Teswirler (grey count) · Hasabatlar · Sazlamalar · Ýeral sahypaňyz · Kömek. Settings nav: … · Şahamçalar · Habarnamalar · Töleg we tarif.
- Analytics: money only with `Girdejini görmek`; every chart has a hidden table / aria summary; period switch is label-only in the demo.
- Reviews: moderation reviews are visible but not counted (business README §15).
- Billing: commission is a layer on every plan, not a plan; "Töle" on an overdue invoice shows bank details + invoice number.
- Tables: confirmed booking past its start = seated; online bookings auto-assigned the smallest fitting table; time suffixes follow vowel harmony.
- Classes: "Gelmedi belle" only after the session starts; waitlist later.
- Help: articles come from the CMS; the article title is the page h1 (top bar title not h1 on that view).
- Landing: one gradient primary per view (header "Mugt başla"); FAQ = real buttons with `aria-expanded`.
