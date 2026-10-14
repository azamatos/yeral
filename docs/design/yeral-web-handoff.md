# Ýeral Web — handoff v2

> **Client site is fully designed (14.10.2026).** For building, start with `CLAUDE.md` and `README.md` in this folder; screens are in `screens/`. This file is the decision history.

Updated 14.10.2026. Replaces the open-questions part of the first handoff (from the mobile project).
Design canvas: **Ýeral Web** — https://claude.ai/artifact/Hkq5oyUnRVrRV3XSs7EAtt
(pages: *Design system* → Foundations, Components, Categories & booking types; *Client site* → Homepage A / B / C)

## Decisions made in this round
| Question | Decision |
|---|---|
| Primary button | **Gradient** #8265ff → #5a3ff0, inset highlight, tight shadow. Radius 10 / 12 / 14 (S / M / L). One per view. |
| Font | **Onest** (Google Fonts, variable 400–800). Covers Turkmen Latin ä ç ž ň ö ş ü ý + Cyrillic. Runners-up shown on the canvas: Golos Text, Manrope (switch in Tweaks). |
| Default language | **Turkmen (TK)** on first visit; RU and EN in header + footer switcher; choice remembered. |
| Photography | 18 Unsplash photos across categories in `assets/photos/` (credits in CREDITS.md). Fresha photos not used — they belong to the venues. |
| Online card payment | Not available now. Pay at the place. Booking summary keeps a reserved row for deposits later. |
| Scope | **Not only beauty.** Ýeral is booking for anyone who sells their time: salons, dentists (incl. home practices), restaurants, gyms, tutors, mechanics, groomers, home services. |

## Multi-category model (new)
"Ýer al" = take a place. Every booking is a place: a chair, a table, a mat, a court.

Four booking types, one engine:
1. **Appointment — Wagt bellemek**: service → specialist (or any) → date & time → confirm. Barbers, salons, dentists, physio, tutors, mechanics, groomers.
2. **Table — Stol bronlamak**: party size → date & time → seating (hall/terrace) → confirm. Restaurants, cafés, tea houses.
3. **Class — Topar sapagy**: class → date → seats → confirm. Yoga, group fitness, courses, workshops.
4. **Resource — Ýer kärendesi** (later): room/court/pitch → time range → confirm.

Rules:
- The category decides booking type(s), search filters and suggested services. A business may combine types (gym = classes + personal training).
- Where: at the business, at the client's address, or online. Home-based specialists can hide the exact address until confirmed (map shows district).
- "Hünärmen" (specialist) is the generic word; categories rename it: lukman, mugallym, tälimçi, ussa.
- Statuses, manual confirmation and reminders are identical for every type.
- Prices: fixed, "from", or none (restaurants show average bill).
- Categories live in the CMS (catalog module): icon, TK/RU/EN names, booking types, starter services.

Launch categories: Gözellik, Dellekhana, Dyrnak, Spa we massaž, Diş lukmany, Saglyk, Restoran, Kafe we çaýhana, Sport, Okuw, Awtoulag, Öý haýwanlary, Öý hyzmatlary.

## Web design system v0.3 (summary — full spec on canvas, tokens in tokens.css)
- Breakpoints: xl ≥1440 · lg 1280 · md 1024 · sm 768 · xs ≤767 (390). Grid 12 / 8 / 4. Marketplace container 1200; app shell full width, sidebar 248 → 72 rail → drawer.
- Desktop type: display 64/68 · h1 44/48 · h2 32/38 · h3 22/28 · body-l 17/26 · body 15/22 · dense 13/18 · label 11 caps.
- States: hover n-50 rows / darker gradient; focus = 2px white + 2px a-400 (:focus-visible); pressed 1px down; selected = a-50 tint + a-line (filters, rows, sidebar) or solid a-500 (date, time slot); disabled = n-100 fill + n-500 text.
- Overlays: modal 480/640 (confirm, short forms, all danger actions) · drawer right 480 (details without leaving the page) · popover 280–360 (pickers, menus, language) · all → bottom sheet on xs. Toast: ink, bottom-left, 4–6 s, one action.
- Client sees "sent — waiting for confirmation", never "booked", until the business confirms.

## Client site structure (round 2, 14.10.2026)
- **Homepage (`Home`)** = B's hero + A's body. Hero explains the name: "Ýeriňi al." — the barber's chair, the restaurant table, the seat in a yoga class — with a photo mosaic of categories. Below it only light blocks: "free today near you" cards, icon category grid, how it works, business block, app, footer. No other photo-led sections.
- **Search results (`Search`)** = what option C became: a separate app-like page you land on after searching (Fresha pattern). Query bar in the header (what / where / when), category chips + filters, result list with type-specific lines (slots, party size, seats left), map on the right with time pins that highlight on row hover; on tablet/phone the map is behind a "Karta" button.
- Explorations A / B / C kept on the canvas page "Explorations" for reference.

## Geo
- No city in page copy. Location defaults to the user's position: "Nirede?" = "Ýakynymda" (near me) from browser geolocation; lists say "golaýyňyzda" (near you) and show distance.
- If geolocation is denied: fall back to the city found by IP, shown only inside the location field. Launch market is Turkmenistan / Ashgabat, but nothing in the UI depends on it.
- Venue cards show category · distance; full street address on the business page and search rows.

## Still open
- Manat pricing: subscription + commission (placeholders on the canvas).
- Average bill for restaurant cards — real value per venue.
- Official App Store / Google Play badges replace the placeholder buttons.
- Map provider (canvas shows a drawn placeholder).
- Turkmen copy review by a native editor before build.

## Next
1. Business page (services / specialists / reviews / about), booking flow for all three types, my bookings / account — desktop, tablet, mobile.
2. business.yeral.app: multi-staff calendar (all staff ↔ one), bookings table, clients, analytics, B2B pricing page.
3. cms.yeral.app: six modules.

## Files here
- `tokens.css` — tokens as CSS variables
- `assets/brand/` — Ýeral icon, mark, lockups (ink/white), old salon photos from the mobile prototype
- `assets/photos/` — 18 Unsplash photos + CREDITS.md
