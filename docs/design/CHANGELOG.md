# Design export changelog (`docs/design/`)

Newest first. Each export replaces this folder; this file says what changed and what it means for the code.

---

## v0.5 — 17.10.2026 · design round 6: A · business (free MVP, login & workspaces, access levels, statuses, phones) + B · client logic gaps

Round 6 has two parts. **Part A** (business, reference product Fresha) — `business/README.md` **§25** lists every decision; it wins where older sections disagree. **Part B** answers the code's request `docs/design-requests/2026-10-16-round-6.md` item by item — see **`ROUND6-ANSWERS.md`** (decision · drawn where · to do in the repo), client `README.md` §14 and `business/README.md` §26. Copy stays Turkmen only (RU/EN come from code).

### Part B · client logic gaps (17.10.2026)
**New:** `screens/client/Booking-Link.dc.html` (`/b/{code}`, SMS link page: declined / expired with offered times → inline login with the booking's masked phone → success; confirmed, pending, offers expired, not found).
**Changed (client):** `Account-Bookings` (declined + offered times, expired + free times, three canceller labels, waiting move + withdraw, move declined/unanswered/accepted, table/class: Ýatyr + Gaýtadan ýazyl, undo failed — tweaks `view`, `undo`) · `Booking` (move mode `mode`, `confirmMode`, hidden/mixed price `price`, phone-only `restricted`, sent-screen sentence, mobile-only login error) · `Booking-Table` (`maxParty`) · `Booking-Class` and `Auth` (mobile-only error) · `Venue` (hidden price `selection`, moderated review, `hoursCase=midnight`, `restricted`, `ownerPreview`) · `Search` (`party` filter) · `States` (tile 11 unverified business) · `Mobile` (tile 6 copy + frames 7–17).
**Changed (business):** `B-Calendar` / `B-Bookings` (`panel=move-request`, walk-in switch, current-slot start) · `B-Tables` (`panel=new8` combined tables, current slot) · `B-Settings` (24:00 end, `exceptionOverlap`) · `B-Onboarding` (step 8 copy) · `B-Shell` (verification banner copy) · `B-Login` (`step=phoneLandline`).
**DS:** both boards gained the part-B states (canceller sub-lines, offered times, Price, ChangeSummary, move-mode stepper, phone-only card, owner banner, unverified page, undo-failed toast, party chips with a limit, MoveRequest, CombinedTableSuggestions, SpecialDayOverlapWarning, BookingLinkCard…); `COMPONENTS.md` rebuilt.
**Data:** `demo-data.json` — YR-48230 / YR-48241 / YR-48190, Glow s12 (hidden price), `priceExamples`, `hoursMidnightExample`, `reviewUnderModeration`, Bag kafe `partyMaxOnline`, `restrictions`, `unverifiedBusiness`, `mobileOnlyLogin`.

**To do in the repo (part B)** — one line per request item:
- A1 — client declined state + offered-time confirm (one booking per declined request; taken / past chips); SMS link page `/b/{code}` with inline login limited to the booking's phone.
- A2 — canceller label from `cancelledBy` (+ declined) with the hourglass for system; free-time chips → new request; sent-screen sentence with the business hold time.
- A3 — business "Wagt üýtgetmek" request (row, drawer, calendar ghost block) under the request-handling rule; client waiting-move state, withdraw, outcomes.
- A4 — hide "Başga wagta geçir" for table/class bookings; "Gaýtadan ýazyl" prefill.
- A5 — **rule change**: move availability follows the chosen specialist (no silent swap); move mode UI.
- A6 — map undo failures to the four reasons; 5-minute window.
- A7 — restricted call card on the business page and in the flow; keep the offered-time exception.
- B1 — hidden-price formatter and totals ("-den", hidden-only without amount).
- C1 — show the mobile-only message for the server's landline refusal (client + business login).
- D1 — party chips from `partyMaxOnline`. D2 — search party filter for restaurants. D3 — combine tables when creating (API + UI).
- E1 — hour pickers to 24:00. E2 — overlap warning in the special-day modal. E3 — calendar offers the current slot; no back-dating.
- F1 — friendly not-found for unverified businesses + owner preview banner. F2 — review moderation pipeline (report → not counted → cleared / removed) with the CMS.
- G1 — done (part A). H — maps decided (MapLibre + OpenFreeMap); font sizes 28/24/80 keep the code's mapping.

### Part A · business (16.10.2026)

### 1. Screens
**New:** `screens/business/B-Login.dc.html` (`/tk/giris`: phone → code → name → invite / invite expired / no workspace / last used workspace) · `screens/business/B-Mobile.dc.html` (phone layouts 390: login, calendar day, requests, booking sheet, quick phone booking, workspace switcher, Köp, legend).

**Changed — every business screen:**
- **Shell:** workspace switcher (your workspaces with your access level and request counts, "+ Täze biznes döret") is the only switch; the bottom block is the person's menu (Profilim · Dil · Müşderi hökmünde aç · Çykmak), not a switcher; branches removed; phone shell (top strip + bottom tab bar Senenama · Ýazylyşlar · Müşderiler · Köp + "Köp" sheet) instead of the "use the app" banner.
- **Statuses:** StatusBadge = icon + label everywhere (clock · check · check-check · x · user-x; the dot is retired — client screens too); calendar/timeline blocks start with the icon; requests dashed without transparency; cancelled outline-only with struck name; selection = ink ring; legend button "Reňkler we nyşanlar"; optional team-only internal statuses (Geldi, Başlandy, custom).
- `B-Shell`: switcher/menu popovers, Aýna in two workspaces, sidebars per access level, default Rugsatlar matrix, Profilim drawers.
- `B-Calendar` / `B-Bookings`: tweaks `role` (owner · admin · specialist) and `answers` (who answers requests); "Başga ýerde" block; phone-first new booking; `legend`, `internal`.
- `B-Settings`: "Haýyşlara kim jogap berýär?", "Ýazylyş ýagdaýlary" (system + internal statuses, add modal); no Şahamçalar. `B-Team`: Dereje (access levels), Rugsatlar matrix, invite states (7 days, resend, expired), "Öz haýyşlaryna jogap berip biler", ownership transfer. `B-Onboarding`: same login step, `fromSwitcher`, who-answers step. `B-Analytics`: specialist sees own earnings.
- **Free MVP:** `B-Landing` pricing → "Mugt" band + FAQ; `B-Help` billing category → "Profil we iş ýerleri"; `B-Notifications` "Ýeral: barlag we täzelikler"; "Töleg we tarif" removed from all settings navs. **`B-Billing` is no longer exported** (kept on the canvas page "Later · not MVP").

### 2. Design system v0.5
- `DS-Patterns` v0.5: StatusBadge icons, StatusLegend, WorkspaceSwitcher, AccountMenu, BottomTabBar + MoreSheet, FAB, AuthCard, CodeInput states, SwatchPicker / IconPicker, selection ring; billing examples and the app banner removed.
- `DS-Business` v0.5: BookingBlock / ScheduleLayers (Başga ýerde, coffee break, lock), CalendarLegend, InternalStatusChip, role toolbars, phone-first NewBookingDrawer, QuickBookingSheet, new section **Access & accounts** (LoginFlow, InviteCard, PermissionMatrix, AccessLevelField, InviteRow, TransferOwnershipModal, ProfileDrawer), RequestHandlingSetting, StatusSettings, FreeBand, phone section; **billing section removed**, RoleEditor / BranchCard / BusinessSwitcher retired.
- `COMPONENTS.md` rebuilt (Round 6 changes + Retired lists). `tokens.css` **v0.5** adds `--ring-selected`.

### 3. Data
`business/demo-data.json`: new `accounts` (Maýsa, Aýna in two workspaces, Gülnar invited, new user), `accessLevels` (matrix + request handling), `statusesV2` (icons, meanings, internal presets); `roles` marked superseded; billing moved under `laterNotMvp`; help categories and Ýeral notification text updated; `business.branches` removed.

### 4. To do in the repo (Claude Code owns these)
1. Map `--ring-selected` (and anything still missing from v0.4) in `theme.css`.
2. Storybook: StatusBadge icons (breaking visual change for the client site too), then the new shell, login, access and status components per `COMPONENTS.md`.
3. Auth/domain: one account across client and business; `Membership.level` per workspace; `Invite` (7 days); `LevelPermissions`; `BookingRules.requestHandling`; `InternalStatus` + `Booking.internalStatusId`; busy-elsewhere across workspaces; no branches. Update ADR 0017 / write an ADR for accounts & access levels.
4. Remove any billing/plan work from the roadmap/memory bank for the MVP.

---

## v0.4 — 14.10.2026 · business workspace complete + design system v0.4

### 1. Screens
**New** (`screens/business/`):

| Screen | Route | What it adds |
|---|---|---|
| `B-Analytics` | `/tk/analytics` | Hasabatlar: overview tiles + revenue chart, staff / one staff / services / clients views, first-weeks state, specialist view without money |
| `B-Reviews` | `/tk/reviews` | Teswirler: summary + distribution, filters, reply composer, edit/delete reply, report → moderation |
| `B-Notifications` | `/tk/settings/notifications` | Habarnamalar: one sentence per event + channel chips (Brauzerde · Programmada · SMS), quiet hours, summaries |
| `B-Help` | `/tk/help` | Kömek: search, categories, articles, support-chat drawer |
| `B-Billing` | `/tk/settings/billing` | Töleg we tarif: plan card, commission statement, invoices (overdue + "Töle"), bank transfer, company details, plan compare |
| `B-Tables` | `/tk/tables` | Restaurant (Bag kafe): timeline, floor plan, reservation / request / walk-in drawers, table settings |
| `B-Classes` | `/tk/classes` | Studio (Aýdyň ýoga): week schedule, session drawer with attendees, move / cancel / add-class modals, class catalog |
| `B-Landing` | `business.yeral.app` | B2B landing + pricing (logged out) |

**Changed**:
- All business screens: sidebar now Senenama · Ýazylyşlar · Müşderiler · **Teswirler** (grey count) · **Hasabatlar** (live) · Sazlamalar · Ýeral sahypaňyz · **Kömek → B-Help**; settings nav gained live **Habarnamalar** and **Töleg we tarif**, Kömek left the settings nav. `B-Shell` rail shows the two new items.
- `B-Onboarding`, `B-Settings`: restaurant/café and yoga are no longer "ýakynda"; categories show their booking type ("Stol bronlamak", "Topar sapaklary") and point to Sazlamalar → Stollar / Sapaklar.
- `B-Analytics` daily revenue now adds up to the tiles (46 200 / 41 250 TMT).
- `screens/client/Venue` + `B-Reviews`: rating breakdown 88 / 6 / 1 / 1 / 0 (= 96 reviews, average 4,9).

### 2. Design system v0.4 (new)
- `screens/system/DS-Patterns.dc.html` — **Product components**: new domain-free components and new variants of existing `@yeral/ui` components, each with all states and a caption `Name · package · Storybook: … · from: …`.
- `screens/system/DS-Business.dc.html` — **Business patterns**: domain components (calendar grid & booking blocks, requests, booking drawers, clients, team, services, settings, reviews, notifications, analytics, billing, tables, classes, client-site cards).
- `COMPONENTS.md` — the map from design to code: all 38 existing components (34 to **extend**, 4 unchanged), ~52 **new** domain-free components for `@yeral/ui`, ~70 **new** domain components with their FSD place, Storybook titles, states, code notes, and the drift each board resolved.
- `tokens.css` **v0.4** — v0.3.1 + aliases for values the screens already used (no new colours): `--fs-small 14/20`, `--fs-micro 12/16`, `--r-xs 4`, `--r-sm 6`, `--modal-ml 560`, `--shadow-control`, `--switch-off-ring`, `--focus-ring-inset`, `--input-warning`, `--chart-1…4`, `--chart-area/compare/grid/axis`.
- `token-audit.md` — every non-token value found in the screens and the token it maps to.

### 3. Product decisions in this export
- **Pricing:** two plans — **Ýeke** (free, 1 specialist) and **Topar** (`[PRICE] TMT / aý` per business, unlimited staff, tag "Toparlar üçin"). **Commission is not a plan**: a layer on every plan, `[X]%` of the first completed visit of a new client who came from Ýeral search; own link/QR, phone bookings and returning clients are always free; no-shows/cancellations never charged. Payment = invoice + bank transfer. (`business/README.md` §18)
- **Reviews** under moderation are visible but not counted in average / count / bars until cleared (§15; client README §4).
- **Tables:** confirmed booking past its start = seated; online bookings auto-assigned the smallest fitting table; walk-ins = confirmed + person icon (§20, §22).
- **Classes:** "Gelmedi belle" only after the session starts; waitlist later (§21, §22).
- **Analytics:** money only with `Girdejini görmek`; chart category colours from the accent ramp (§14, §22).
- Full lists: `business/README.md` §22 (decisions round 5), §23 (DS v0.4), §24 (open questions).

### 4. Data
- `business/demo-data.json`: `plans` (2 plans), new `commission`, `billing.commissionRows` (3 rows, first visits only), invoice `YB-2026-0007` overdue, `categoriesForSignup[].bookingType`, `analytics.revenueByDay[Prev]` rescaled, `reviews.breakdown` + `countingRule`.
- `demo-data.json`: Glow Studio `ratingBreakdown` 88 / 6 / 1 / 1 / 0.

### 5. To do in the repo (Claude Code owns these files — the export only flags them)
1. **Tokens:** map the v0.4 additions in `packages/ui/src/styles/theme.css`; `pnpm --filter @yeral/ui test` (tokens.test.ts) lists exactly what's missing.
2. **Storybook / `@yeral/ui`:** work through `COMPONENTS.md` in its suggested order — extend the existing components, add the new primitives, then the domain components in their FSD slices, each with stories for every state on its board. Screens are built only from components that have stories.
3. **ADR 0017 (booking model) is out of date.** It says "every booking is confirmed by hand, no instant-confirmation setting" and "a pending request expires at its start time". The owner decided (14.10.2026, `business/README.md` §2, client README): **manual confirmation by default + optional instant confirmation per business**; a **hold time set by the business** (15 min, 30 min default, 1 h, 2 h, 6 h, 24 h; never past the visit start); an unanswered request → cancelled by system + SMS with 3 alternative times; decline with a reason the client sees + up to 3 alternative times. Revise ADR 0017 (or supersede it), then `@yeral/domain` (M2a), the contract (M2c) and the seed (M2d): `BookingRules.confirmMode`, `holdMinutes`, `Booking.holdUntil`, `decline{reason, alternatives[]}`.
4. **`AGENTS.md`** says "web design v0.3" and "Business and CMS screens aren't designed yet" → design export v0.4; the business workspace is designed (`docs/design/screens/business/`, `docs/design/business/README.md`); CMS still isn't.
5. **`.claude/skills/design-system`**: add `COMPONENTS.md`, `screens/system/DS-Patterns.dc.html` and `DS-Business.dc.html` to its sources, and the rule "check COMPONENTS.md before building a screen".
6. **Memory bank** (`activeContext.md`, `productContext.md`): instant confirmation + hold time decided; pricing model (2 plans + commission layer); business workspace designed; DS v0.4.
7. **Seeds / fixtures:** Glow Studio rating breakdown; business demo data changes above.

### 6. Open questions (owner)
`[PRICE]` Topar · commission `[X]%` · Topar trial behind "Synap gör" · `[AMOUNT]`, `[BANK]`, `[ACCOUNT]`, `[TAX ID]`, `[SUPPORT PHONE]`, Telegram link · SMS provider · map provider · native Turkmen review of all new copy (incl. `-da/-de` after times) · font sizes 28 / 24 / 80 as tokens or mapped to h2 / h3 / display · table/class setup wizard · businesses open past midnight.

---

## v0.3.1 — 14.10.2026 · client site + business round 4
Client site (all screens), business daily work + setup & settings (`B-Shell`, `B-Calendar`, `B-Bookings`, `B-Clients`, `B-Client`, `B-Onboarding`, `B-Settings`, `B-Services`, `B-Team`), tokens v0.3.1 (danger-solid `#b42318`, switch-off ring), assets (Unsplash photos + brand).
