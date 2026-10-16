# Design export changelog (`docs/design/`)

Newest first. Each export replaces this folder; this file says what changed and what it means for the code.

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
