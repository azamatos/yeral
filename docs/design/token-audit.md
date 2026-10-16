# Token audit — screens vs `tokens.css` v0.3.1

Collected by script (regex over the source), 14.10.2026. Scope: all 35 `.dc.html` in `screens/` — client screens, business `B-*` screens, `Home-A/B/C`, `Client-Map`, and the v0.3 boards (`Main`, `DS-Components`, `DS-Booking`). Not counted: the two v0.4 boards — `DS-Patterns` (this work: drawings use tokens only; the non-token hexes below appear in it only as caption text) and `DS-Business` (still being built by another agent).

What is collected: hex colours (`#rgb` / `#rrggbb`, lower-cased, `#fff` = `#ffffff`), `rgba()`, `font-size` in px, `border-radius` in px, `box-shadow` and `drop-shadow()`. A value is reported only when it is not a token value. Not reported: radius 0, SVG `rx` on icon geometry, `{{…}}` holes. Token font sizes include the ≤767 overrides (40, 32→26, 22→19, 17→16).
**files** = how many files contain the value (names listed) · **uses** = occurrences.

Summary: 10 non-token hex colours, 10 non-token rgba values, 24 non-token shadows, 15 font sizes, 13 radii. Every colour has a token within a small step; only these additions are proposed: `--fs-small`, `--fs-micro`, `--r-xs`, `--r-sm`, `--shadow-control`, `--focus-ring-inset`, `--input-warning`, `--modal-ml`, and chart aliases `--chart-*` (aliases of existing values, no new colours).

---

## 1. Hex colours

| Value | Files (count) · uses | Used for | Nearest token | Recommendation |
|---|---|---|---|---|
| `#e1eadf` | Account-Bookings, B-Onboarding, B-Settings, Mobile, Search, Venue (6) · 16 | map illustration — parks (`<rect>`) | `--n-200` #e6e6ea (no green in tokens) | Placeholder map uses n-100 ground, n-200 blocks, white roads (MapFrame on DS-Patterns). Real colours come from the map provider tiles. If the static illustration ships, add aliases `--map-*` in the map package, not in the core palette. |
| `#eceef2` | Account-Bookings, B-Onboarding, B-Settings, Mobile, Search, Venue (6) · 12 | map ground (`.dmap`, `.map`, `<rect>`) | `--n-100` #f0f0f3 | Map to n-100. |
| `#d6e0ec` | Account-Bookings, B-Onboarding, B-Settings, Mobile, Search, Venue (6) · 7 | map water / river (`<path>`) | `--st-cancelled-line` #d3dbe6 (closest) / `--n-300` #d8d8de | Drop from the placeholder (water only from tiles); if kept, n-300. |
| `#8a8a94` | Account-Bookings (`.star` empty), B-Bookings + B-Clients (`.bulk .b:disabled` text) (3) · 3 | empty rating star; disabled text on the ink bulk bar | `--n-500` #6e6e78 | Map to n-500 (Rating, Button inverse-disabled). |
| `#3a3a42` | B-Bookings, B-Clients (`.bulk .b:disabled` border) (2) · 2 | disabled outline button on ink | `--n-600` #5a5a64 | Map to n-600. |
| `#c0331f` | Account-Bookings, Account-Profile (`.b-red:hover`) (2) · 2 | danger-solid hover | `--danger-solid-hover` #912018 | Map — the token exists. |
| `#ececf0` | B-Reviews (`.lb:hover`), Booking-Class (`.bar` track) (2) · 2 | link-button hover fill; seats meter track | `--n-100` #f0f0f3 | Track → n-100 (Meter). Link hover → LinkButton (a-700 + underline) or ghost hover `--bg-group` #f4f4f6. |
| `#fbfbfc` | B-Tables (`.fcv`) (1) · 1 | floor-plan canvas behind the dot grid | `--n-50` #f6f6f8 | Map to n-50 (domain component — DS-Business). |
| `#fcecc9` | B-Reviews (`button.badge.st-p:hover`) (1) · 1 | hover of the clickable “Jogapsyz · 4” badge | `--st-pending-line` #f2ddb0 | Hover = border in the dot colour #dc8b0b, fill unchanged (B-Calendar `.rqc` wins). |
| `#fdf0d5` | B-Team (`.rr:hover`) (1) · 1 | hover of radio rows inside the warning conflict box | `--st-pending-bg` #fef6e7 | On tinted surfaces hover goes to `--n-0` #ffffff (same rule as meters on tint). |

## 2. rgba colours

| Value | Files (count) · uses | Used for | Nearest token | Recommendation |
|---|---|---|---|---|
| `rgba(16,16,20,.2)` | Account-Profile, B-Bookings, B-Calendar, B-Classes, B-Client, B-Notifications, B-Onboarding, B-Services, B-Settings, B-Tables, B-Team, DS-Components, Venue (13) · 15 | switch knob shadow `0 1px 2px`, photo controls, pin label | none (tokens have .16 raised and .4 scrim) | **New token** `--shadow-control: 0 1px 2px rgba(16,16,20,.2)` — already drawn on the DS v0.3 board; use for knobs, photo controls, map pins and controls. |
| `rgba(16,16,20,.12)` | Account-Bookings, Account-Profile, B-Settings, Mobile, Search, Venue (6) · 6 | map pins, favourite button on photos (`0 2px 6px`) | `--shadow-control` | Map. |
| `rgba(16,16,20,.24)` | Account-Bookings, B-Settings, Mobile, Search, Venue (5) · 5 | hot map pin (`0 8px 24px`) | `--shadow-raised` (.16) | Map. |
| `rgba(16,16,20,.22)` | B-Onboarding (`.pdot`) (1) · 1 | ground shadow under the draggable pin | `--shadow-control` colour | Drop the ellipse; the pin gets `--shadow-control`. |
| `rgba(16,16,20,.64)` | Mobile (inline label on a photo) (1) · 1 | translucent pill on an image | `--n-900` #101014 | Pill tone `ink` (solid). |
| `rgba(239,236,254,.75)` | B-Tables (`.fband`) (1) · 1 | floor-plan band | `--a-50` #efecfe | Solid a-50 (DS-Business). |
| `rgba(246,246,248,.75)` | B-Tables (`.pas`) (1) · 1 | past-time shading on the table timeline | `--n-50` #f6f6f8 | Solid n-50, same as calendar past (DS-Business). |
| `rgba(255,255,255,.5)` | B-Onboarding (`.mapov`) (1) · 1 | veil over the disabled map | `--n-0` | MapFrame disabled = prompt pill on the placeholder, no veil. |
| `rgba(90,63,240,.14)` | B-Onboarding (`.area`) (1) · 1 | service-area circle fill | `--a-50` #efecfe | Solid a-50 at the circle, or `opacity` on an a-500 fill if the map must show through (MapFrame prop). |
| `rgba(90,63,240,.45)` | B-Onboarding (`.area`) (1) · 1 | service-area circle line | `--a-300` #9d88f7 | Map to a-300 1.5 px. |

## 3. Shadows

| Value | Files (count) · uses | Used for | Nearest token | Recommendation |
|---|---|---|---|---|
| `0 1px 2px rgba(16,16,20,.2)` | 12 (Account-Profile, B-Bookings, B-Calendar, B-Classes, B-Client, B-Notifications, B-Onboarding, B-Services, B-Settings, B-Tables, B-Team, DS-Components) · 12 | switch knob | — | **New** `--shadow-control`. |
| `inset 0 0 0 1.5px #6e6e78` | 11 (same set minus DS-Components) · 11 | switch-off track ring | `--switch-off` (ring only in a comment) | Make the comment a token: `--switch-off-ring: inset 0 0 0 1.5px #6e6e78`. |
| `0 0 0 1px #e6e6ea` | B-Analytics, B-Calendar, B-Onboarding, B-Services, B-Settings, B-Tables, DS-Components, Home-C, Search (9) · 9 | active segmented item ring, current wizard step | `--n-200` | Composition (1 px n-200 ring) — no token; Tailwind `ring-1 ring-n-200`. |
| `inset 0 0 0 2px #7a5ff4` | B-Bookings, B-Classes, B-Clients, B-Help, B-Onboarding, B-Services, B-Team, Booking, Venue (9) · 14 | focus inside clipped containers (menu items, table row links, list rows) | `--focus-ring` (outer, 2 + 2) | **New** `--focus-ring-inset: inset 0 0 0 2px #7a5ff4`. |
| `0 2px 6px rgba(16,16,20,.12)` | Account-Bookings, Account-Profile, B-Settings, Mobile, Search, Venue (6) · 6 | map pins, favourite button | `--shadow-control` | Map. |
| `0 8px 24px rgba(16,16,20,.24)` | Account-Bookings, B-Settings, Mobile, Search, Venue (5) · 5 | hot map pin | `--shadow-raised` | Map. |
| `inset 0 1px 0 rgba(255,255,255,.22), 0 0 0 2px #fff, 0 0 0 4px #7a5ff4` | B-Onboarding, Booking, Booking-Class, Booking-Table, DS-Components (5) · 5 | focused primary button | `--primary-shadow` + `--focus-ring` | Composition of tokens — keep. |
| `0 0 0 2px #fff` | B-Analytics, B-Classes, B-Services, B-Team (4) · 4 | white ring around stacked avatars and chart hover dots | `--n-0` | Composition (`ring-2 ring-white`). |
| `0 0 0 2px #5a3ff0, 0 8px 24px rgba(16,16,20,.16)` | B-Calendar, B-Classes, B-Tables (3) · 3 | highlighted calendar / class / table block | a-500 + `--shadow-raised` | Composition (DS-Business). |
| `0 0 0 2px #7a5ff4` | B-Bookings, B-Clients, B-Help (3) · 3 | focus on clear buttons inside search fields (no white gap) | `--focus-ring` | Use `--focus-ring` (or `--focus-ring-inset` when clipped). |
| `inset 0 0 0 1px #d5cbfb` | B-Billing, B-Calendar, B-Classes (3) · 3 | add-avatar ring, recommended plan column | `--a-line` | Composition. |
| `0 0 0 2px #5a3ff0` | B-Calendar, B-Classes (2) · 2 | selected calendar block | a-500 | Composition (DS-Business). |
| `inset 0 0 0 1px #101014` | B-Calendar, DS-Components (2) · 2 | today ring in the calendar | n-900 | Composition. |
| `0 0 0 2px #101014, 0 8px 24px rgba(16,16,20,.16)` | Mobile (1) · 1 | selected map result card | n-900 + raised | Composition. |
| `0 0 0 2px #efecfe` | B-Help (1) · 1 | composer focus halo | `--input-focus` (3 px) | Map to `--input-focus`. |
| `0 0 0 2px #fff, 0 0 0 4px #5a3ff0` | Main (1) · 1 | focus demo with a-500 | `--focus-ring` (a-400) | Map. |
| `0 0 0 2px #fff, 0 0 0 3px #101014` | B-Analytics (1) · 1 | hovered stacked-bar segment | — | Keep inside Charts/StackedBar (composition). |
| `0 0 0 2px #fff, 0 0 0 4px #5a3ff0, 0 8px 24px …` | B-Tables (1) · 1 | selected table on the floor plan | — | DS-Business. |
| `0 0 0 3px #fef6e7` | B-Clients (1) · 1 | warning input halo (+ border #dc8b0b) | `--input-focus` / `--input-error` pattern | **New** `--input-warning: 0 0 0 3px #fef6e7` (border `--st-pending-dot`). |
| `0 0 0 3px #fff, 0 0 0 5px #5a3ff0` | B-Tables (1) · 1 | highlighted floor table | — | DS-Business. |
| `0 0 0 4px #f0f0f3` | B-Tables (1) · 1 | floor table hover | n-100 | DS-Business. |
| `0 1px 3px rgba(16,16,20,.2)` | B-Settings (`.phb .phm`) (1) · 2 | photo controls | `--shadow-control` | Map. |
| `0 2px 6px rgba(16,16,20,.2)` | Venue (1) · 1 | label on a photo/map | `--shadow-control` | Map. |
| `drop-shadow(0 4px 6px rgba(16,16,20,.28))` | B-Onboarding (`.pin`) (1) · 1 | draggable SVG pin | `--shadow-raised` | `filter: drop-shadow(0 8px 24px rgba(16,16,20,.16))` while dragging, control shadow at rest. |

## 4. Font sizes

| Value | Files (count) · uses | Used for | Nearest token | Recommendation |
|---|---|---|---|---|
| 14 | all 35 · 480 | S buttons, menu items, table cells, secondary UI text, links | 13 dense / 15 body | **New** `--fs-small: 14px; --lh-small: 20px` — de-facto standard already in DS v0.3 (`.b-sm`). |
| 12 | 30 · 157 | count badges, tab counts, Kbd, tooltips, chart axes, micro captions | 11 label | **New** `--fs-micro: 12px; --lh-micro: 16px`. |
| 24 | Auth, B-Analytics, B-Billing, B-Help, B-Onboarding, Booking, Booking-Class, Booking-Table, Mobile, States, Venue (11) · 13 | phone stat values (24/30), OTP digits, plan price, help article H1 | 22 h3 / 26 h2 (xs) | Headings → 22 (desktop h3) or 26 (phone h2); StatTile phone value 24/30 stays a component size (open question). |
| 28 | Auth, B-Billing, B-Client, B-Help, Booking, Booking-Class, Booking-Table, Main, Search, States, Venue (11) · 14 | page H1 in auth / booking flow / help, plan price | 32 h2 / 26 h2 (xs) | Map to h2 32 (desktop) and 26 (phone). If the booking flow must keep 28, add `--fs-h2-s` — open question. |
| 18 | Account-Bookings, Booking, Booking-Table, Client-Map, Search, Venue (6) · 7 | drawer title with image, avatar initials, small headings, arrows | 17 body-l / 19 h3 (xs) | Drawer and card titles → 19/24 600 (as drawn); initials follow Avatar size table. |
| 48 | B-Landing, B-Reviews, Home, Home-B, Mobile (5) · 5 | rating average, landing display on phone | 44 h1 / 40 display (xs) | Rating average → 44/48 (drawn); marketing display → `--fs-display` (40 on phones). |
| 10 | B-Help, B-Landing, B-Tables (3) · 6 | tiny labels inside product mock-ups and the floor plan | 11 label | → 11; mock-ups that are scaled screenshots may keep their scale. |
| 20 | Booking, Booking-Class, Booking-Table (3) · 7 | business name and date numbers in the booking flow | 19 / 22 | → 22 (h3) for names, DateStrip number size stays a component size. |
| 30 | B-Landing, Home-C, Venue (3) · 3 | section title, venue H1 | 32 h2 | → 32. |
| 56 | B-Landing, Client-Map, Venue (3) · 3 | display heading, rating figure | 64 display / 44 h1 | → 64 or 44 by role. |
| 80 | B-Landing, Home, Home-B (3) · 3 | marketing hero on xl | 64 display | → 64; or `--fs-hero: 80px` for marketing only — open question. |
| 168, 34 | Main (1) · 1 / 3 | type specimen on the foundations board | — | Not product UI — ignore. |
| 36 | B-Landing (`.pr`) (1) · 1 | plan price | 32 h2 | → 32. |
| 9 | B-Landing (`.mk-nowt`) (1) · 1 | “now” label inside a mock-up | 11 | → 11 (illustration only). |

## 5. Radii

| Value | Files (count) · uses | Used for | Nearest token | Recommendation |
|---|---|---|---|---|
| 6 | 20 · 33 | Kbd, language code tile, sortable header button, skeleton, small focus outlines | 8 input | **New** `--r-sm: 6px` (small elements inside controls). |
| 4 | B-Analytics, B-Billing, B-Bookings, B-Calendar, B-Classes, B-Clients, B-Help, B-Landing, B-Onboarding, B-Services, B-Tables, B-Team, Booking (13) · 25 | checkbox, bar ends (0 4 4 0), legend swatches, link focus outline, calendar block accents | 8 | **New** `--r-xs: 4px`. |
| 2 | Account-Bookings, Booking, Booking-Class, Booking-Table, Main (5) · 20 | timeline connectors, drop line | — | Hairline elements — use `--r-pill` (fully rounded); no token. |
| 9 | B-Classes, B-Settings, B-Tables (3) · 3 | stepper inner buttons (10 − 1 px border) | 10 btn-s | Derived (`calc(var(--r-btn-s) - 1px)`) — no token. |
| 15 | B-Bookings, B-Clients (2) · 4 | bulk bar bottom corners inside a 16 card (16 − 1) | 16 card | Derived (`calc(var(--r-card) - 1px)`). |
| 3 | B-Analytics, B-Calendar (2) · 2 | 10 px legend swatch, calendar block accent | 4 | → `--r-xs`. |
| 7 | B-Calendar, B-Tables (2) · 2 | pending accent bar inside a block | 8 | → 8 (`--r-input`) — DS-Business. |
| 1 | Auth (`.caret`) (1) · 1 | text caret in the OTP cell | — | Keep (decorative). |
| 20 | Mobile (1) · 2 | bottom sheet top corners | 16 card | → 16 (sheet radius 16 16 0 0 everywhere). |
| 24 | B-Landing (`.mk`) (1) · 1 | product mock-up frame | 16 | Illustration — keep or 16. |
| 28 | Mobile (`.ph`) (1) · 1 | phone frame on the board | — | Presentation only (device frame), not product UI. |
| 30 | B-Landing (`.mk-ph`) (1) · 1 | phone mock-up | — | Illustration only. |
| 5 | B-Landing (`.mk-buf`) (1) · 3 | mock-up detail | 4 | → `--r-xs`. |

## 6. Other values seen while unifying (not colours)

| Value | Where | Recommendation |
|---|---|---|
| Modal width 560 (`.mdl-m`) | Account-Bookings (review), B-Classes, B-Clients (new client), B-Settings (special day, address), B-Team (invite) (5 screens) | **New** `--modal-ml: 560px` (between `--modal-m` 480 and `--modal-l` 640). |
| Chart series #5a3ff0 / #c3b6fb / #4429d6 / #9d88f7, area #efecfe, compare #b0b0b8, grid #f0f0f3, axis #6e6e78 | B-Analytics | Aliases only (values are tokens): `--chart-1 … --chart-4`, `--chart-area`, `--chart-compare`, `--chart-grid`, `--chart-axis` in `theme.css`. |

## 7. Proposed additions to `tokens.css` (all values already used; no new colours)

```css
--fs-small: 14px;  --lh-small: 20px;
--fs-micro: 12px;  --lh-micro: 16px;
--r-xs: 4px;       --r-sm: 6px;
--shadow-control: 0 1px 2px rgba(16,16,20,.2);
--switch-off-ring: inset 0 0 0 1.5px #6e6e78;
--focus-ring-inset: inset 0 0 0 2px #7a5ff4;
--input-warning: 0 0 0 3px #fef6e7;   /* + border #dc8b0b */
--modal-ml: 560px;
--chart-1: #5a3ff0; --chart-2: #c3b6fb; --chart-3: #4429d6; --chart-4: #9d88f7;
--chart-area: #efecfe; --chart-compare: #b0b0b8; --chart-grid: #f0f0f3; --chart-axis: #6e6e78;
```
`tokens.test.ts` must be updated with them (theme.css is checked 1:1).
