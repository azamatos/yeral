# Screens index

Hi-fi screens exported from the "Ýeral Web" canvas (export **v0.6 round 3.4**, 20.10.2026 — see `../CHANGELOG.md`). English: the design-system boards and the **whole business app** (spec `../business/README.md` §27–28). Still Turkmen until rounds 4a–4b: the client screens. The first release has one language (English). Each `.dc.html` = one artboard. See `../CLAUDE.md` → "How to read a .dc.html screen".
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

## business/ — business.yeral.app (spec: `../business/README.md`; round 2 = §27, round 3 = §28)

All boards are English. Shared shell: five-item sidebar, account menu with Contact Ýeral (no Language row), no top-bar search, switcher rows "access level · city", banners via the `banner` tweak (In review · Not approved · Hidden by Ýeral · Demo = signed-out shared demo).

| File | Route | Kind · frame | States / tweaks |
|---|---|---|---|
| `B-Login.dc.html` | `/login` | page · 1440×1160 | SignInCodeStep with the code on screen by default (tweak `sms` = later SMS copy): phone → code (visible Confirm, wrong / locked 60 s / lock over / "Get a new code" / 5 codes per hour → "Too many codes. Try again in 42 minutes.") → name → routing; invite accept / decline ("Back · Decline invite") / expired, with the city; Continue setting up (→ `/setup/hours`); no workspace + Try the business app; tweak `step` (phone · phoneSending · phoneIncomplete · phoneLandline · phoneLimit · code · codeChecking · codeWrong · codeLocked · codeLockOver · codeResendReady · codeResent · codeLimit · name · invite · inviteDecline · inviteExpired · setup · empty · routing); Play: 65 10 20 30 = Maýsa, 64 21 55 90 = Gülnar (invite), 62 48 15 30 = unfinished setup, 0000 = wrong code |
| `B-Mobile.dc.html` | phone frames for every business screen | board · 1696×7454 | 23 phone frames 390: 1 log in · 1b code on screen · 2 calendar · 2b slot sheet · 2c Block time sheet · 3 requests · 3b arrived while closed · 4 booking sheet + report sheet · 4b reported booking · 5a–c phone-first new booking · 6 workspace switcher · 7 More · 8 legend · **9 clients list · 9b–9c client card · 10 Settings (chip row + save bar above the tab bar) · 11 Team · 11b member sheet · 12 Reviews (from More) · 13 landing at 390**; notes panel |
| `B-Shell.dc.html` | `/w/{slug}/…` | board · 1600×9000 | Address line, sidebar + workspace switcher ("Owner · Ashgabat"), signed-out demo sidebar, account menu + Contact Ýeral, top bar (no search), tablet rail, phone tab bar + More sheet, request toast, Addresses tile, banners In review / Not approved / Hidden by Ýeral / Demo / **notifications** (Allow + blocked; everyone who gets notifications), "One person — several workspaces", access-level sidebars, **fixed read-only permissions table**, My profile drawers (owner can't leave), Someone leaves (owner-only toast + Team banner, 4 bookings + 1 request, "Keep it" default) |
| `B-Calendar.dc.html` | `/w/{slug}/calendar` | page · 1440×1360 | Tweaks `view` (dayAll · dayOne · weekAll · weekOne), `panel` (none · request · move-request · booking · new · slot-menu · block-time · block-error · decline · report-menu · report-noshow · report-added · reported · complaint · move), `legend`, `internal`, `role` (owner · admin · specialist), `answers` (both · each · desk), `clock` (day · evening), `banner` (none · inReview · notApproved · hidden · demo); 5 specialists (Gülnar joined, 0 bookings), Busy elsewhere, slot menu → Block time, one report per booking (round 3.1), money by role (prices for all, sums owner-only), phone-first new booking |
| `B-Bookings.dc.html` | `/w/{slug}/bookings` | page · 1440×1320 | Tabs Requests / Today / Upcoming / Past / Cancelled, filters, toolbar + bulk bar **Confirm · Decline · Export CSV**, drawers, row menu (Report…), decline modal, legend; tweaks `tab`, `panel` (none · request · move-request · booking · decline · report-menu · report-noshow · report-added · report-past · reported), `selected`, `role`, `answers`, `clock`, `banner` (incl. hidden) |
| `B-Clients.dc.html` | `/w/{slug}/clients` | page · 1440×1120 | **English (round 3).** Owner / Admin / Specialist (own clients only); tags New (first visit in 30 days) · Regular · Lapsed · Reported · Phone only (no tag before a first visit); next booking / waiting request with timer; Total column (owner); "Unnamed client"; row menu; empty and no-match states; add-client modal; delete allowed / blocked; tweaks `role`, `filter` (all · regular · new · lapsed · reported), `modal` (none · add · delete · deleteBlocked), `empty`, `banner` (incl. hidden) |
| `B-Client.dc.html` | `/w/{slug}/clients/{id}` | page · 1440×1720 | **English (round 3).** Visits · Average check (owner) · Last visit · No-shows; notes; Upcoming incl. waiting requests; history; Reports list with Remove report (7 days); Phone only switch (auto / by hand / switched off) + "Don't send reminders"; Ýeral-account read-only phone; specialist sees only her own bookings; delete blocked / allowed; specialist view + no-access state; tweaks `role`, `client` (regular · phoneOnly · request · noAccount), `edit`, `composer`, `modal`, `banner` (incl. hidden) |
| `B-Onboarding.dc.html` | `/setup/{step}` (phone · business · address · hours · services · team · rules · done) | page · 1440×1100 (team ≈ 1290) | 8 steps: SignInCodeStep (code on screen) + name · appointment categories · address with City · hours 00:00–24:00 with next day + after-midnight error · services · team (Admin / Specialist + Uses the app, phone required) · booking rules · done (In review, Link and QR, Send invites); Continue later on steps 1–7; tweaks `step`, `signIn` (14 sign-in states), `sms`, `homeBased`, `overnight` (off · on · error), `fromSwitcher` |
| `B-Settings.dc.html` | `/w/{slug}/settings/{profile,rules,hours,link}` | page · 1440×2400 | **English (round 3).** Nav Business profile · Booking rules · Hours · Services · Team · Permissions · Link and QR (chip row on phones); profile (11 launch categories + "No category fits? Contact Ýeral", text counters, about, photos ≤ 20, city + pin, Pause online booking, close via Contact Ýeral, not-approved reason on top), booking rules ("The business answers by 15:10" preview, cancel reason, fixed lateness, no-show limit, internal statuses), hours + special days (next day, after-midnight error, AffectedBookingsList on save, overlap warning), Link and QR (Live · In review · Not approved · Hidden by Ýeral, with its shell banner; Download PNG / SVG); tweaks `pane`, `dirty`, `languages`, `photos`, `overLimit`, `overnight`, `exceptionModal`, `exceptionOverlap`, `statusModal`, `affected`, `linkState`, `demo`, `role` |
| `B-Services.dc.html` | `/w/{slug}/settings/services` | page · 1440×1440 | **English (round 3).** Catalog (12 services · 4 groups) + service drawer; price types Fixed · From · Free · Price at the place (with a hidden amount); Who does it incl. invited people; "Not bookable online"; delete with bookings (modal) / without (Undo); "Doesn't use the app" tag; tweaks `drawer` (none · edit · new), `modal` (none · deleteBooked · deleteFree), `languages`, `role`, `banner` |
| `B-Team.dc.html` | `/w/{slug}/settings/team`, `/permissions` | page · 1440×1480 | **English (round 3).** Team table (Uses the app, "Doesn't use the app"), Invites section (Copy invite link, Invited · Expired · Declined · Cancelled, errors), staff drawer (profile, services, hours — business hours or own shift, breaks, yearly time off — access level), remove + reassign (AffectedBookingsList), Removed (Reactivate) / Left (Invite again), shift and time-off lists, Team banner "Aýna left…", read-only permissions; tweaks `tab` (team · permissions), `panel` (none · staff · invite · inviteError · remove · removed · reassign · shift · timeOff · usesAppOn), `aynaLeft`, `role` (owner · admin — Admin: hours and time off read-only), `banner` |
| `B-Reviews.dc.html` | `/w/{slug}/reviews` | page · 1440×4480 | **English (round 3).** Summary + distribution (no average reply time), filters, sort, 20 per page + Show more, stars-only reviews, reply composer, edit / delete reply + Undo, report modal, moderation states; specialist read-only view; tweaks `role`, `filter`, `composer`, `report`, `moderation` (none · checking · cleared · removed · noDecision), `first`, `empty`, `banner` (incl. hidden) |
| `B-Landing.dc.html` | `business.yeral.app` (signed out) | page · 1440×4020 | **English (round 3).** Header (Features · How to start · Questions · Log in · Start free) + phone menu, hero Start free + Try the business app (demo note), who it's for, features, 3 steps, free band, FAQ, Contact Ýeral, CTA band, footer; tweak `menu` |

## later/ — not in the first release (kept unchanged, Turkmen; see `later/README.md`)

| File | Was | Kind · frame | What |
|---|---|---|---|
| `B-Analytics.dc.html` | `/tk/analytics[/staff[/{id}]\|/services\|/clients]` | page · 1440×1160 | Overview, staff, one staff, services, clients, first weeks; tweaks `view`, `role` (owner · specialist — own earnings only) |
| `B-Help.dc.html` | `/tk/help[/{article}]` | page · 1440×1260 | Search, categories (incl. Profil we iş ýerleri), articles, contact band, support-chat drawer; tweaks `view` (home · article), `chat` |
| `B-Tables.dc.html` | `/tk/tables`, `/tk/settings/tables` | page · 1440×1180 | Bag kafe: timeline with status icons, cancelled chip + read-only drawer, floor plan, legend, drawers, table settings; tweaks `view` (timeline · floor · settings), `panel` (none · reservation · request · walkin · new8 = combined tables), `legend`; current slot 18:30 |
| `B-Classes.dc.html` | `/tk/classes`, `/tk/settings/classes` | page · 1440×1240 | Aýdyň ýoga: week grid with status icons, session drawer, move / cancel / add modals, catalog, legend; tweaks `view` (week · catalog), `panel` (session · cancel · add · none), `legend` |
| `B-Billing.dc.html` | settings pane (removed) | page · 1440×2120 | Plan & billing (round 5) — everything is free on MVP |
| `B-Notifications.dc.html` | `/tk/settings/notifications` | page · 1440×2060 | Browser-permission banner, 10 event rows (Haçan / Kim alýar + channel chips Brauzerde · Programmada · SMS), sound switches, quiet hours, summary times, save bar; tweaks `permission`, `dirty` — moved in round 3; the first release has only the browser-notification banner (B-Shell) |

## system/ — design system (v0.6 round 3 · English)
| File | Kind · frame | What |
|---|---|---|
| `Main.dc.html` | board · 1440×5520 | Foundations (English): colour, type, **Voice** (copy rules, do/don't, prices, brand, English first), layout, spacing; status table with icons |
| `DS-Components.dc.html` | board · 1440×5340 | v0.3 components with hover/focus/pressed/disabled (English) — the base of today's `@yeral/ui` + Storybook |
| `DS-Booking.dc.html` | board · 1440×2960 | Categories × booking types (English); tables, classes and resources marked **Later** |
| `DS-Patterns.dc.html` | board · 1440×40500 | **v0.6 · Product components** (English; + ExampleBadge, SignInCodeStep, LanguageSwitcher, Long-text check) — new domain-free components and new variants of existing ones (→ `@yeral/ui`). 8 sections: status & labels, feedback, data display, charts, inputs, navigation & layout, overlays, new variants |
| `DS-Business.dc.html` | board · 1440×86900 | **v0.6 round 3 · Business patterns** (English) — domain components (→ FSD entities / features / widgets): calendar, requests & bookings, clients (rows, header with average check, reports list, delete), team & services (invite rows, AffectedBookingsList for remove / shift / time off, service delete), settings & onboarding (photos, address with city and pin, pause / close, Link and QR states, hours list), reviews (moderation states), notifications banner + Team banner, access & accounts (read-only permissions, signed-out demo), landing hero, client site, phone. Analytics, tables and classes are Later (not drawn) |

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
