# Screens index

Hi-fi screens exported from the "Ýeral Web" canvas (14.10.2026, export v0.5 — see `../CHANGELOG.md`). Each `.dc.html` = one artboard. See `../CLAUDE.md` → "How to read a .dc.html screen".
Frame = size on the canvas. Pages are fluid (designed at 1440, must work down to 360); boards are fixed sheets.

## client/ — yeral.app

| File | Route | Kind · frame | States / tweaks |
|---|---|---|---|
| `Home.dc.html` | `/tk` | page · 1440×3180 | Static sections; links to Search |
| `Search.dc.html` | `/tk/search` | page · 1440×2780 | Category chips filter, day toggle, row↔pin hover; Glow Studio row → Venue; restaurant party filter "Adam sany" (tweak `party`) |
| `Venue.dc.html` | `/tk/b/{slug}` | page · 1440×5480 | Service select, group chip filter, favourite toggle, summary card; tweaks `selection` (none · two · hidden · mixed — hidden price s12), `hoursCase` (normal · midnight), `restricted` (phone-only call card), `ownerPreview` (unverified banner); review under moderation in the list |
| `Booking.dc.html` | `/tk/b/{slug}/book` (`?move={id}`) | page · 1440×1680 | Tweaks `step` (services · staff · time · confirm · sent), `loggedIn`, `slotTaken`, `mode` (book · move), `confirmMode` (manual · instant), `price` (fixed · hidden · mixed), `restricted`; code `0000` = wrong; phone 65 90 11 22 = existing user; a landline (12 …) = mobile-only error |
| `Booking-Table.dc.html` | `/tk/b/{slug}/book` (table) | page · 1440×1900 | Party chips follow the business limit (tweak `maxParty` 8 · 6 → "{max+1}+" call note), date, time, area, requests, login (mobile-only error); tweaks `sent`, `loggedIn` |
| `Booking-Class.dc.html` | `/tk/b/{slug}/book` (class) | page · 1440×1460 | Day tabs, sessions (seats left / Doly), seats stepper, login (mobile-only error); tweaks `sent`, `loggedIn` |
| `Auth.dc.html` | `/tk/login` (modal) | board · 1800×1800 | Phone (short number, landline = mobile-only) → code → new user → wrong code / 60 s lock; logged-in avatar menu |
| `Account-Bookings.dc.html` | `/tk/account/bookings[/{id}[/review]]` | page · 1440×1880 | Tabs, drawer by status, cancel + undo, review; round 6: declined + offered times, expired + free times, canceller labels, waiting move, table/class without move, undo failed — tweaks `view` (list · drawer · cancel · review · declined · declinedConfirm · declinedTaken · offersExpired · expired · expiredTaken · moveWaiting · moveDeclined · moveUnanswered · moveAccepted · undoFailed), `undo`, `empty`, `late` |
| `Booking-Link.dc.html` | `/b/{code}` (SMS link) | page · 1440×1320 | One booking card signed out: tweak `state` (declined · expired · confirmed · pending · offersExpired · notFound · loginCode · success), `loginStep` (phone · code · wrongCode); Play: chip → Kod al → any code but 0000 |
| `Account-Profile.dc.html` | `/tk/account/profile`, `/favorites` | page · 1440×1600 | Profile form + dirty save bar, phone change via SMS, language, SMS switches, delete-account modal; favourites grid with remove + undo; tweak `pane` |
| `Mobile.dc.html` | — | board · 1442×6700 | Phone frames 390×844: Home, Search list, Map, Business page, Booking time step, My bookings sheet; round 6 frames 7–17 (offers, confirm sheet, expired, waiting move, undo failed, move mode, SMS link page + login, phone-only, hidden price) |
| `States.dc.html` | — | board · 1440×4320 | No results · location ask · location denied · slot taken · not bookable online · closed today · network error · loading skeleton · 404 · login required for favourite · 11 unverified business ("Bu sahypa entek açylmady") |
| `Client-Map.dc.html` | — | board · 1440×2860 | Site map, flow, inventory, decisions log |

## business/ — business.yeral.app (spec: `../business/README.md`)

| File | Route | Kind · frame | States / tweaks |
|---|---|---|---|
| `B-Login.dc.html` | `/tk/giris` | page · 1440×1160 | Phone → code (wrong, locked) → name → routing; invite (Kabul et / Ret et), invite expired, no workspace; tweak `step` (phone · phoneLandline · code · name · invite · inviteExpired · empty · routing); Play: 65 10 20 30 = Maýsa, 64 21 55 90 = Gülnar (invite), other numbers = new person |
| `B-Mobile.dc.html` | — | board · 1696×3480 | Phone layouts 390: login, calendar day, requests, booking sheet, quick phone booking (3 frames), Aýna's workspace switcher, Köp sheet, legend sheet |
| `B-Shell.dc.html` | — | board · 1600×6000 | Sidebar with workspace switcher (+ popover) and user block (+ menu), top bar, tablet rail, phone tab bar note, request toast, verification banner, "Bir adam — birnäçe iş ýeri" (Aýna's switcher), sidebars for Eýesi / Administrator / Hünärmen, default Rugsatlar matrix, Profilim drawers |
| `B-Calendar.dc.html` | `/tk/calendar` | page · 1440×1360 | Tweaks `view` (dayAll · dayOne · weekAll · weekOne), `panel` (none · request · booking · new · decline · complaint · move), `role` (owner · admin · specialist), `answers` (both · each · desk), `legend`, `internal`, `panel=move-request` (Wagt üýtgetmek); current-slot start 11:15, walk-in switch; status icons, Başga ýerde (Aýna 19:00–20:00), phone-first new booking, phone tab bar |
| `B-Bookings.dc.html` | `/tk/bookings` | page · 1440×1320 | Tabs Haýyşlar/Şu gün/Gelýän/Geçen/Ýatyrylan, filters, bulk bar, drawers, decline modal, legend; tweaks `tab`, `panel` (incl. `move-request`), `selected`, `role`, `answers` |
| `B-Clients.dc.html` | `/tk/clients` | page · 1440×1120 | Filter chips, search, bulk bar, new-client modal (phone only required); tweaks `filter`, `modal` |
| `B-Client.dc.html` | `/tk/clients/{id}` | page · 1440×1680 | Stats, notes (alert notes), upcoming, history, complaints, settings; tweaks `edit`, `composer` |
| `B-Onboarding.dc.html` | `/tk/signup` → `/tk/setup/{step}` | page · 1440×1100 | 8 steps (step 1 = same phone + SMS as login); tweaks `step`, `homeBased`, `fromSwitcher` ("Täze biznes döret" for a logged-in person, starts at step 2) |
| `B-Settings.dc.html` | `/tk/settings/{profile,rules,hours,link}` | page · 1440×2720 | Rules pane: Haýyşlara kim jogap berýär?, Ýazylyş ýagdaýlary (system + internal, add modal); tweaks `pane`, `dirty`, `exceptionModal`, `exceptionOverlap`, `statusModal`; end pickers up to 24:00 |
| `B-Services.dc.html` | `/tk/settings/services` | page · 1440×1440 | Catalog + service drawer; tweak `drawer` |
| `B-Team.dc.html` | `/tk/settings/team`, `/permissions` | page · 1440×1400 | Team table with Dereje + invite states, staff drawer (access level, own-requests override), invite (3 steps, SMS link 7 days), disable modal, Rugsatlar matrix, ownership transfer; tweaks `tab` (team · permissions), `panel` (none · staff · access · invite · disable · owner · transfer) |
| `B-Analytics.dc.html` | `/tk/analytics[/staff[/{id}]\|/services\|/clients]` | page · 1440×1160 | Overview, staff, one staff, services, clients, first weeks; tweaks `view`, `role` (owner · specialist — own earnings only) |
| `B-Reviews.dc.html` | `/tk/reviews` | page · 1440×1980 | Summary + distribution, filters (Jogapsyz, stars, Hünärmen popover), sort, reply composer, edit/delete reply + undo, report modal → "Barlanýar"; tweaks `filter`, `composer`, `report` |
| `B-Notifications.dc.html` | `/tk/settings/notifications` | page · 1440×2060 | Browser-permission banner, 10 event rows (Haçan / Kim alýar + channel chips Brauzerde · Programmada · SMS), sound switches, quiet hours, summary times, save bar; tweaks `permission`, `dirty` |
| `B-Help.dc.html` | `/tk/help[/{article}]` | page · 1440×1260 | Search, categories (incl. Profil we iş ýerleri), articles, contact band, support-chat drawer; tweaks `view` (home · article), `chat` |
| `B-Tables.dc.html` | `/tk/tables`, `/tk/settings/tables` | page · 1440×1180 | Bag kafe: timeline with status icons, cancelled chip + read-only drawer, floor plan, legend, drawers, table settings; tweaks `view` (timeline · floor · settings), `panel` (none · reservation · request · walkin · new8 = combined tables), `legend`; current slot 18:30 |
| `B-Classes.dc.html` | `/tk/classes`, `/tk/settings/classes` | page · 1440×1240 | Aýdyň ýoga: week grid with status icons, session drawer, move / cancel / add modals, catalog, legend; tweaks `view` (week · catalog), `panel` (session · cancel · add · none), `legend` |
| `B-Landing.dc.html` | `business.yeral.app` (logged out) | page · 1440×4020 | Header (Giriş → B-Login) + phone menu, hero with drawn calendar mock, Kimler üçin, features, 3 steps, "Mugt" band, FAQ (first: Ýeral Biznes mugtmy?), CTA band, footer |

## system/ — design system (v0.5)
| File | Kind · frame | What |
|---|---|---|
| `Main.dc.html` | board · 1440×3260 | Foundations: colour, type, layout, spacing (v0.3.1; v0.4 token additions are listed in `../COMPONENTS.md` Part 3) |
| `DS-Components.dc.html` | board · 1440×3900 | v0.3 components with hover/focus/pressed/disabled — the base of today's `@yeral/ui` + Storybook |
| `DS-Booking.dc.html` | board · 1440×2500 | Categories × booking types |
| `DS-Patterns.dc.html` | board · 1440×34800 | **v0.5 · Product components** — new domain-free components and new variants of existing ones (→ `@yeral/ui`). 8 sections: status & labels, feedback, data display, charts, inputs, navigation & layout, overlays, new variants |
| `DS-Business.dc.html` | board · 1440×69600 | **v0.5 · Business patterns** — domain components (→ FSD entities / features / widgets). 14 sections: calendar, requests & bookings, clients, team & services, settings & onboarding, reviews, notifications, analytics, access & accounts, landing (free), tables, classes, client site, phone |

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
- Sidebar everywhere: workspace switcher · Senenama (Stollar / Sapaklar by booking type) · Ýazylyşlar (amber count) · Müşderiler · Teswirler (grey count) · Hasabatlar · Sazlamalar (not for Hünärmen) · Ýeral sahypaňyz · Kömek · user block. Settings nav: Biznes profili · Ýazylyş düzgünleri · Iş wagty · Hyzmatlar · Topar · Rugsatlar · Salgy we QR · Habarnamalar.
- Analytics: money only with `Girdejini görmek`; every chart has a hidden table / aria summary; period switch is label-only in the demo.
- Reviews: moderation reviews are visible but not counted (business README §15).
- Billing: not in the MVP (everything is free); no billing screen is exported.
- Tables: confirmed booking past its start = seated; online bookings auto-assigned the smallest fitting table; time suffixes follow vowel harmony.
- Classes: "Gelmedi belle" only after the session starts; waitlist later.
- Help: articles come from the CMS; the article title is the page h1 (top bar title not h1 on that view).
- Landing: one gradient primary per view (header "Mugt başla"); FAQ = real buttons with `aria-expanded`.

**Round 6 (login, access, statuses, phones)**
- Phone shell on every business page under 768: top strip with the switcher, bottom tab bar, "Köp" sheet; the class names differ between screens — build the BottomTabBar from DS-Patterns.
- Status badges are icon + label everywhere (clock · check · check-check · x · user-x); legend button "Reňkler we nyşanlar" on calendar, bookings, tables, classes.
- Canvas-only switches: the `role` / `answers` tweaks show what each access level sees; in the app this comes from the signed-in person's level in the current workspace.
- Profilim is the drawer drawn on B-Shell; account-menu links point to it.
- B-Reviews still draws review-state pills with dots ("Jogapsyz", "Barlanýar") — build them as Pill with an icon (DS-Patterns).

**Round 6 · part B (client logic gaps)** — every state answers an item of `docs/design-requests/2026-10-16-round-6.md`; the table in `../ROUND6-ANSWERS.md` says which tweak shows which item.
