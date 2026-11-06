# Ýeral — client site (yeral.app) design spec

Version: client-site v1 · 14.10.2026 · design canvas "Ýeral Web" (claude.ai artifact Hkq5oyUnRVrRV3XSs7EAtt)
Audience: whoever builds yeral.app (Claude Code included). Read this file first, then `CLAUDE.md`, then the screens.

This spec is the source of intent. The `.dc.html` screens are the source of look. When they disagree, the screen wins on visuals and this file wins on behaviour. Anything not drawn follows the closest drawn pattern — never invent a new visual language.

---

## 1. Product in one page

**Ýeral** = "ýer al", Turkmen for *take a place*. A booking marketplace for anyone who sells their time: barbers and beauty salons, dentists (including home practices), physio, restaurants and cafés, gyms and yoga studios, tutors, mechanics, groomers, home services.

Three web surfaces share one design system:

| Domain | What | Status |
|---|---|---|
| **yeral.app** | Client marketplace: home, search, business page, booking, account | **this spec** |
| business.yeral.app | Business workspace (desktop-first) + B2B pricing page | later |
| cms.yeral.app | Platform admin (6 modules) | later |

Native mobile apps (client + business) already exist as designs; the web follows the same product rules.

**Reference product:** Fresha. Copy its logic and flows; never its visuals. When undecided, do what Fresha does.

**Launch market:** Turkmenistan (Ashgabat first). **But the UI never names a city.** Everything is relative to the user's location ("near you").

**Languages:** Turkmen (TK, default), Russian (RU), English (EN).

**Money:** manat, shown as `40 TMT`. No online payment yet: clients pay at the place. Card deposits will come later — keep a reserved row in booking summaries (hidden for now).

### Product rules that must never break
1. **By default the business confirms every booking by hand.** A client never sees "booked" until the business confirms: first state *Garaşylýar* (Pending), copy says "sent", not "booked". A business may switch on **instant confirmation**; then the booking is *Tassyklandy* at once and the sent screen says "Ýazylyş tassyklandy". Unanswered requests expire after the business's hold time (15 min–24 h, default 30 min, never past the start) and the client gets 3 alternative times.
2. **Five statuses, one meaning everywhere** (client web, apps, business, CMS): Pending · Confirmed · Completed · Cancelled · No-show. See §6.
3. A visit counts as **Completed by default** after its end time unless the business marks No-show.
4. A phone booking (entered by the business) is *Confirmed* + a phone icon — not a separate status.
5. "Cancelled by client" and "Cancelled by business" share one colour; an icon + label tell them apart.
6. **Category decides how a business is found and booked** (booking type, search filters, suggested services).
7. One gradient primary button per view.

---

## 2. Booking types

One engine, four types. Each business has one or more; the category sets the default.

| Type | TK name | Client steps | Card / list shows | Examples |
|---|---|---|---|---|
| **Appointment** | Wagt bellemek | Service(s) → Specialist (or "Islendik hünärmen") → Date & time → Your details → Send | next free slots | barber, salon, nails, dentist, physio, tutor, mechanic, groomer, home services |
| **Table** | Stol bronlamak | Party size → Date & time → Seating area → Your details → Send | times for party size (default 2) | restaurant, café, tea house |
| **Class** | Topar sapagy | Session (from schedule) → Seats → Your details → Send | next session + seats left | yoga, group fitness, courses, workshops |
| **Resource** *(later)* | Ýer kärendesi | Resource → Time range → Your details → Send | free hours strip | pitches, saunas, studios, rooms |

Rules
- **Where it happens:** at the business (default), at the client's address (home services), or online (tutors, psychologists). Home-based businesses can hide the exact address until the booking is confirmed; the map then shows only an approximate circle.
- **Specialist naming:** generic "hünärmen"; categories rename it: *lukman* (doctors), *mugallym* (tutors), *tälimçi* (trainers), *ussa* (mechanics, home services), *stilist / dellek / dyrnak ussasy* (beauty roles). A solo business skips the specialist step.
- **Multiple services** (appointment): allowed; they run back to back with one specialist if possible; "Islendik hünärmen" lets the system pick per service.
- **Prices:** fixed (`80 TMT`), from (`250 TMT-den`), free (`Mugt`), or hidden (restaurants show average bill `≈ 150 TMT`).
- **Durations:** shown on every service (`60 min`, `1 sag 30 min`).

---

## 3. Site map and routes

All routes carry a language prefix: `/tk/…` (default), `/ru/…`, `/en/…`. `/` redirects to the saved language, else TK. Language is also saved to the user profile when logged in.

| Route | Screen (artboard) | Status |
|---|---|---|
| `/tk` | Home (`Home.dc.html`) | designed |
| `/tk/search?what=&cat=&near=&r=&date=&sort=` | Search results (`Search.dc.html`) | designed |
| `/tk/c/{category}` | Category landing = Search pre-filtered by category, with category title + SEO intro text | pattern of Search |
| `/tk/b/{slug}` | Business page (`Venue.dc.html`) — anchors `#hyzmatlar #hunarmenler #teswirler #barada` | designed |
| `/tk/b/{slug}/photos` | Photo gallery (full-screen viewer over the business page) | pattern |
| `/tk/b/{slug}/book?services=&staff=&date=&time=&step=` | Appointment booking flow (`Booking.dc.html`) | designed |
| `/tk/b/{slug}/book` (table type) | Table booking (`Booking-Table.dc.html`) | designed |
| `/tk/b/{slug}/book` (class type) | Class booking (`Booking-Class.dc.html`) | designed |
| `/tk/login` | Login (modal over the current page; route is the fallback) (`Auth.dc.html`) | designed |
| `/tk/account/bookings` | My bookings, tabs Upcoming / Past (`Account-Bookings.dc.html`) | designed |
| `/tk/account/bookings/{id}` | Booking detail (right drawer on desktop, bottom sheet on phone; the deep link opens it over the list) | designed (in Account-Bookings) |
| `/tk/account/bookings/{id}/review` | Leave a review (modal) | designed (in Account-Bookings) |
| `/b/{code}` | SMS link page for one booking (`Booking-Link.dc.html`): summary, status, offered times, inline login with the booking's phone (round 6) | designed |
| `/tk/b/{slug}/book?move={id}` | Move mode of the appointment booking flow (`Booking.dc.html`, tweak `mode=move`; round 6) | designed |
| `/tk/account/favorites` | Favourites (grid of business cards) | designed (in Account-Profile) |
| `/tk/account/profile` | Profile + settings (language, notifications), log out, delete account | designed (`Account-Profile.dc.html`) |
| `/tk/about`, `/tk/help`, `/tk/privacy`, `/tk/terms` | Static pages: header + narrow text column (max 720) + footer | pattern |
| 404, no results, location states, errors | `States.dc.html` | designed |
| Phone layouts of key screens | `Mobile.dc.html` | designed |
| "Biznes üçin" | → business.yeral.app (separate site) | — |

### Page chrome
- **Marketing header** (Home, static pages): logo · Biznes üçin · language · Giriş (or avatar menu when logged in).
- **Search header** (Search, Category, Business page, Account): logo · compact query bar (Näme? / Nirede? / Haçan? + search button) · Biznes üçin · language · Giriş/avatar. On Search the header also holds the filter chip row.
- **Focused header** (booking flows): back · step indicator · close (×). No nav, no footer. Leaving mid-flow asks nothing; state is kept in the URL.
- **Footer** on Home, Business page, Account and static pages. Not on Search or booking flows.
- **Logged-in avatar menu:** Ýazylyşlarym (my bookings) · Halanlarym (favourites) · Profil · Dil · Çykmak (log out).

---

## 4. Screen-by-screen behaviour

### 4.1 Home — `/tk`
Hero explains the name ("Ýeriňi al.") + search card (Näme? / Nirede? = "Ýakynymda" / Haçan?) + photo mosaic of categories. Then: "Golaýyňyzda şu gün boş" (4 cards, nearest first, each with 3 next slots), category grid (13 categories, icon tiles), how it works (3 steps), Ýeral Biznes block, app links, footer.
- Search submit → `/tk/search`. Category tile → `/tk/c/{category}`. Card → business page. Slot chip on a card → booking flow with that time preselected.
- If location is unknown: a banner "Ýakynyňyzdaky ýerleri görkezeliň" (primary "Ýerleşişimi görkez", ghost "Salgy ýazaýyn") sits above a "Meşhur ýerler" list (see States tile 2).

### 4.2 Search — `/tk/search`
List + map (Fresha pattern). Category chips, day toggle (Şu gün / Ertir / Şu hepde), Süzgüçler (filters drawer: price range, rating, open now, booking type, specialist gender for beauty, "Diňe aýallar üçin"), Bahasy, Reýting 4,5+. Sort: Ýakynlygy boýunça (default) / Reýting / Baha.
- Results are sorted nearest first by default. Never show a slot earlier than now + the business's lead time.
- Row hover highlights its map pin; pin click scrolls to and highlights its row.
- "Bu ýerde gözle" appears after the map moves; it re-runs the search for the visible area.
- Paging: "Ýene görkez" loads 12 more.
- Phone/tablet (<1024): list only; floating "Karta" button opens a full-screen map with a horizontal card carousel.
- Row content per type: appointment → service line + next 3–4 slots + "+N"; table → "Stol · 2 adam" + times; class → session line + seats-left tag.

### 4.3 Business page — `/tk/b/{slug}`
Gallery (1 large + 4 small, "Ähli suratlar"), name, rating, category, address + distance, open-now state, favourite (heart) and share. Sticky right card: next free time, "Ýazylmak" primary, hours today, address, phone; it becomes the **selection summary** once services are chosen. Tabs (sticky under header): Hyzmatlar · Hünärmenler · Teswirler · Barada.
- **Services:** grouped by service category with a chip row that **filters** the list (Ählisi = all); each row = name, duration, price, optional description, a select toggle (Saýla / Saýlandy ✓). Selecting adds to the summary card; "Dowam et" → booking flow at the specialist step. "Ýazylmak" with nothing selected → booking flow at the services step.
- **Specialists:** avatar, name, role, rating; click → booking flow with that specialist preselected.
- **Reviews:** average, count, 5→1 distribution bars, list (name, stars, date, service · specialist, text, business reply). "Ähli teswirler" opens more. Only clients with a Completed booking can review. Reviews reported by the business and under Ýeral moderation stay visible but are not counted in the average, count or bars until cleared (business spec §15).
- **About:** description, hours table (today highlighted), map + address + "Ýol görkez" (directions), amenities, booking rules (cancellation window, lateness), payment at the place, "Adatça 15 minudyň dowamynda tassyklaýar" (typical confirmation time, computed).
- **Golaýdaky ýerler:** 4 similar businesses.
- Phone: gallery becomes a swipeable full-width carousel; sticky bottom bar with price summary + "Ýazylmak".
- Table/class businesses use the same page; their sticky card holds the table widget (party size + date + time) or "Indiki sapaklar" (next sessions) instead of the service list CTA, and the Services tab becomes "Menýu" (optional PDF/photos) or "Tertip" (schedule).

### 4.4 Appointment booking — `/tk/b/{slug}/book`
Focused layout: main column (max 720) + sticky summary card (360). Steps:
1. **Hyzmatlar** — same grouped list as the business page; multi-select; at least one required.
2. **Hünärmen** — "Islendik hünärmen" (first, default: earliest availability) + specialists who do all selected services; each shows rating and "Indiki boş wagt: ertir 10:00".
3. **Wagt** — horizontal date strip (14 days, today first, closed days disabled), slots grouped Irden (morning) / Günortan (afternoon) / Agşam (evening); empty day → "Bu gün boş wagt ýok" + "Indiki boş gün: Anna, 16 oktýabr" button. Slot step = service duration, start every 15 or 30 min (business setting).
4. **Tassyklama** — if logged out: phone (+993 prefix, 8 digits) → "Kod iber" → 4-digit SMS code (auto-advance, resend timer 0:59) → name (first time only). Then: optional note to the business, booking rules (cancellation window), payment at the place, consent line. Primary: **"Ýazylyşy ugrat"** (Send booking).
5. **Ugradyldy** (sent) — success state: status badge Garaşylýar, "Biznes tassyklanda SMS bilen habar bereris", summary, "Senenama goş" (add to calendar .ics), "Ýazylyşlaryma geç", "Baş sahypa". For instant-confirm businesses the same screen shows title "Ýazylyş tassyklandy", badge Tassyklandy and no "waiting" timeline step. When the business has a hold time, the pending explanation adds "Jogap bermese, {N} minutdan soň size başga wagtlary hödürläris."

Errors: slot taken meanwhile → inline banner on step 4 "Bu wagt ýaňy alyndy. Golaý boş wagtlar:" + 3 nearest slots, and "Ýazylyşy ugrat" stays disabled until a new time is picked; SMS code wrong → "Kod nädogry. Ýene N synanyşyk galdy." (3 tries then 60 s lock); network → toast with retry.

SMS code input: 4 boxes, `inputmode="numeric"`, `autocomplete="one-time-code"`, paste fills all, auto-submits on the 4th digit; the "Tassykla" button stays visible as a fallback. Closing the flow (× or "Yza" on step 1) returns to `/b/{slug}`. Scroll to top on each step change; keep step, services, specialist, date, time in the URL.

### 4.5 Table booking
Single page with business header strip + one form panel: Adam sany (chips 1–8 and "9+"; 9+ disables sending and shows "9 we ondan köp adam bolsa, jaň ediň" + call link; VIP areas need ≥ 6) · Sene (date strip) · Wagt (slot chips; table held 15 min) · Ýer (Zal / Terrasa / VIP otag with availability) · Bellik (special request chips: Doglan gün, Çaga oturgyjy, Penjiräniň ýanynda) · contact (same phone login) · "Stoly bronla" (sends request). Sent state as in 4.4.

### 4.6 Class booking
Week schedule (day tabs) of sessions: time, name, tälimçi, level, duration, price, seats left ("3 ýer galdy", "Doly" → disabled with "Sanawa ýazyl" waitlist *later*). Select session → seats stepper (1 – min(2, seats left)) → contact → "Ýer al". Sent state as in 4.4. When the free-cancellation window has already passed (e.g. a same-day class), replace the rule line with "Mugt ýatyrmak wagty geçdi — ýatyrsaňyz, studiýa habar beriler."

### 4.7 Login
Phone-only (no passwords): phone → SMS code → name (new users). Opens as a 400 px modal from the header "Giriş" (bottom sheet on phones) or inline inside booking. Language and favourites carry over. Logged-out taps on favourite hearts open this modal first (States tile 10).

### 4.8 Account
- **Ýazylyşlarym:** tabs Gelýän (upcoming) / Geçen (past). Upcoming sorted soonest first; past newest first. Card: photo, business, services, specialist, date + time, status badge, quick actions (Ýol görkez, Jaň et).
- **Detail drawer:** full summary, status timeline (sent → confirmed …), address + map, actions by status (table below), business contact, booking id.
- **Review modal:** stars (required) + quick tags + text (optional, 500 chars) → "Teswiri ugrat"; one review per booking; editable for 7 days.
- **Halanlarym:** grid of saved businesses; heart toggles.
- **Profil:** name, phone (change via SMS), language (TK/RU/EN), notifications (SMS: tassyklama, ýatlatma 1 gün öň, ýatlatma 2 sagat öň, teswir haýyşy), log out, delete account (danger, confirm modal).

Client actions by status:

| Status | Client can | Shown text |
|---|---|---|
| Garaşylýar (Pending) | Cancel (no fee), edit note | "Biznesiň tassyklamagyna garaşylýar" |
| Tassyklandy (Confirmed) | Reschedule, cancel — only until the business's cancellation window (default 2 h before); after it: "Jaň et" only | "Tassyklandy · ertir 14:30" |
| Tamamlandy (Completed) | Leave review (if none), "Gaýtadan ýazyl" (book again) | — |
| Ýatyryldy (Cancelled) | Book again | "Siz ýatyrdyňyz" / "Biznes ýatyrdy: {reason}" |
| Gelmedi (No-show) | Book again; see business note | "Gelmediňiz diýlip bellendi" |

Reschedule = a new request for the new time; the old time stays held until the business answers; if declined, the original stays Confirmed.

A booking cancelled from Gelýän stays in that tab (greyed, Ýatyryldy badge, toast with "Yzyna al") until the next page load, then moves to Geçen.

---

## 5. Search, geo and location
- Default location = browser geolocation ("Ýakynymda"), radius 5 km (chip lets 1 / 3 / 5 / 10 / 25 km).
- If permission denied or unavailable → IP city, shown **only inside the Nirede? field** (e.g. "Aşgabat") with the note "Ýerleşiş ýapyk — şäher boýunça görkezilýär"; never in headlines, titles or footer. Distances are hidden and lists sort by rating × review count. "Sazlamalary aç" opens a short help sheet explaining how to allow location in the browser (pattern: modal).
- Users can type an address, district or landmark in Nirede?; suggestions list (max 6).
- Distances: `1,2 km` (comma decimal), under 1 km → `850 m`.
- Cards show `category · distance`; rows on Search show `category · street · distance`; full address on the business page.

---

**Status icons (round 6, 16.10.2026):** every status badge is icon + label (the dot is retired): Garaşylýar clock · Tassyklandy check · Tamamlandy check-check · Ýatyryldy x · Gelmedi user-x — same on the client site and in the business app. Cancelled-by-client / by-business keep their extra icon + label.

## 6. Booking lifecycle

```
            client sends
                │
                ▼
        ┌── Garaşylýar (Pending) ──┐          (skipped when the business uses instant confirmation)
  business confirms        business declines (reason shown to client) / client cancels / hold time expires
        │                          │
        ▼                          ▼
  Tassyklandy (Confirmed)      Ýatyryldy (Cancelled)  ← cancelledBy: client | business | system
        │
   slot ends ── default ──► Tamamlandy (Completed) ──► review request (SMS + in-app)
        │
   business marks ───────► Gelmedi (No-show)
        │
   client/business cancels ► Ýatyryldy (Cancelled)
```

SMS (TK templates; RU/EN by user language):
- Sent: — (no SMS; on-screen only)
- Confirmed: "Ýeral: {business} ýazylyşyňyzy tassyklady. {weekday}, {date}, {time}. Üýtgetmek: yeral.app/b/{id}"
- Declined: "Ýeral: {business} {date} {time} ýazylyşyny kabul edip bilmedi: {reason}. Başga wagt saýlaň: {link}"
- Expired (no answer within hold time): "Ýeral: {business} wagtynda jogap bermedi. Şu boş wagtlar bar: {t1}, {t2}, {t3} — {link}"
- Reminder −1 day / −2 h: "Ýatlatma: ertir {time} {business}, {address}."
- Review ask (2 h after end): "{business}-da bolşuňyz nähili boldy? Baha beriň: {link}"

---

## 7. Data model (client-facing fields)

```
Category    id, icon, name{tk,ru,en}, bookingTypes[], specialistWord{tk,ru,en}
Business    id, slug, name, categoryIds[], bookingTypes[], photos[], rating, reviewsCount,
            address, geo{lat,lng}, hideExactAddress, phone, hours[{day,open,close}], exceptions[],
            about{tk,ru,en}, amenities[], rules{cancelWindowMin, lateToleranceMin, note},
            typicalConfirmMin, priceLevel, avgBill?, onlineBookingPaused (bool), confirmMode: manual|instant, holdMinutes,
            exceptions[{date, label, closed: bool, hours?}]   // e.g. {label: 'Baýramçylyk', closed: true}
ServiceGroup id, businessId, name, order
Service     id, groupId, name, description?, durationMin, price{type: fixed|from|free|hidden, amount}, specialistIds[]
Specialist  id, businessId, name, role, photo?, rating, serviceIds[]
Session     id, businessId, name, start, durationMin, trainerId, level, capacity, booked, price   (class type)
TableArea   id, businessId, name, capacityRanges                                         (table type)
Slot        start, end, specialistId?|areaId?|sessionId?, available
Booking     id, businessId, type, items[{serviceId, specialistId, start, end}] | partySize+areaId | sessionId+seats,
            start, end, status, cancelledBy?, cancelReason?, clientNote?, source: web|app|phone|ai,
            price{total, currency:'TMT'}, createdAt, confirmedAt?
Review      id, bookingId, businessId, rating 1–5, tags[], text?, createdAt, reply?{text, createdAt}, moderation?{status: pending|cleared|removed, reason}
User        id, phone, name, lang, favorites[businessId], notificationPrefs
```

---

## 8. Language and formats
- Default TK; switcher in header (icon + code) and footer (full names). Strings run ~30% longer in RU — buttons hug content, never fixed width; let labels wrap to 2 lines before truncating.
- Turkmen letters must render: ä ç ž ň ö ş ü ý (font: Onest, latin-ext + cyrillic subsets).
- Dates TK: `Penşenbe, 15 oktýabr` (weekday capitalised, month lower-case), short `15 okt.`; relative `Şu gün`, `Ertir`. Time 24 h `14:30`. Weekdays short: Du Si Ça Pe An Şe Ýe (Monday first).
- Numbers: decimal comma `4,9`; `40 TMT`; phones `+993 65 12 34 56`.
- Plurals: TK and EN simple; RU needs 3 forms (1 место / 2 места / 5 мест) — use ICU plural rules.
- Never use a city name in UI copy.

---

## 9. Turkmen UI glossary (use these exact words)

| EN | TK |
|---|---|
| Book (verb, CTA) | Ýazylmak |
| Booking | Ýazylyş |
| Send booking request | Ýazylyşy ugrat |
| Book a table / Take a seat | Stoly bronla / Ýer al |
| Service(s) | Hyzmat(lar) |
| Specialist / Any specialist | Hünärmen / Islendik hünärmen |
| Free time / slot | Boş wagt |
| Select / Selected | Saýla / Saýlandy |
| Continue / Back / Close | Dowam et / Yza / Ýap |
| Confirm / Confirmation | Tassykla / Tassyklama |
| Cancel booking / Reschedule | Ýazylyşy ýatyr / Başga wagta geçir |
| Directions / Call | Ýol görkez / Jaň et |
| Reviews / Write a review / Rate | Teswirler / Teswir ýaz / Baha ber |
| About / Opening hours / Open now / Closed | Barada / Iş wagty / Häzir açyk / Ýapyk |
| Near me / Near you | Ýakynymda / Golaýyňyzda |
| Today / Tomorrow / This week | Şu gün / Ertir / Şu hepde |
| Morning / Afternoon / Evening | Irden / Günortan / Agşam |
| Party size / people | Adam sany / adam |
| Seats left / Full | … ýer galdy / Doly |
| My bookings / Favourites / Profile / Settings / Log out | Ýazylyşlarym / Halanlarym / Profil / Sazlamalar / Çykmak |
| Log in / Phone number / Send code / Code / Resend | Giriş / Telefon belgisi / Kod iber / SMS kod / Täzeden iber |
| Upcoming / Past | Gelýän / Geçen |
| Pay at the place | Töleg ýerinde |
| Add to calendar | Senenama goş |
| Search this area | Bu ýerde gözle |
| Show more / See all | Ýene görkez / Ählisini gör |
| Statuses | Garaşylýar · Tassyklandy · Tamamlandy · Ýatyryldy · Gelmedi |

All Turkmen copy needs a native review before launch.

---

## 10. Design system essentials (full spec on the canvas, tokens in `tokens.css`)
- White base, 1px `#e6e6ea` dividers instead of boxes; one violet accent (`#5a3ff0`) for selection and status only; ink `#101014` text.
- Font **Geist** 400–800 (v0.7; was Onest). Figures proportional; `tabular-nums` only in numeric table columns, the calendar time grid and running timers. Phones always `+993 69 90 11 22`. Desktop scale: display 64/68 · h1 44/48 · h2 32/38 · h3 22/28 · body-l 17/26 · body 15/22 · dense 13/18 · label 11 caps +0.07em.
- Controls (v0.7): one height scale S 32 r8 / M 40 r10 / L 48 r12 for Input, Select, Segmented, Button, IconButton, Chip — client forms and every 390 field L, toolbars M. Variants Primary · Secondary · Tertiary · Danger quiet · Danger solid · Link (navigation only) · IconButton; the ghost button is retired. Our own Select everywhere (never the native one). See `screens/system/DS-Controls.dc.html`, `DS-Lists.dc.html`, `DS-Type.dc.html`; they win over the lines below. Older: buttons S 36 r10 / M 44 r12 / L 52 r14. Primary = gradient `#8265ff→#5a3ff0` + inset highlight, one per view. Secondary white + 1px `#d8d8de`. Ghost, Tint, Danger (outline: text `#a3251b`, border `#f6c7c2`; solid for the final confirm: `#b42318`, hover `#912018`, white text 6.6:1). Ink (`#101014`) for the round search button in the header query bar and for app-store buttons.
- Switch: on = track `#5a3ff0`; off = track `#e6e6ea` with a 1.5px `#6e6e78` inset border (≥ 3:1 against white); knob white 20 px.
- Selection: tint (`#efecfe` + `#d5cbfb` line + `#4429d6` text) for chips/rows/tabs; solid `#5a3ff0` for the chosen date and time slot.
- Focus: `0 0 0 2px #fff, 0 0 0 4px #7a5ff4` on :focus-visible. Inputs focus: border `#5a3ff0` + 3px `#efecfe` halo.
- Flat: shadow only on raised layers (popover, drawer, modal, toast) `0 8px 24px rgba(16,16,20,.16)`; phone sheets `0 -8px 24px`.
- Overlays: modal 480/640 (confirmations, login, review, danger) · right drawer 480 (details) · popover 280–360 (pickers, menus) · all become bottom sheets under 768.
- Breakpoints: ≥1440 · 1280 · 1024 · 768 · ≤767 (design at 390). Marketplace container 1200 (+40 side padding). Grids collapse with `auto-fit/minmax`.
- Icons: Lucide, stroke 1.75, 16/20/24.
- Touch targets ≥ 44 px; text contrast ≥ 4.5:1; real `<button>`, `<a>`, `<input>` + `<label>`.

## 11. Decisions log (round 3, 14.10.2026)
- Header query-bar search button is ink on every page; the gradient is reserved for the page's primary action.
- Service group chips filter (business page + booking step 1).
- Slot conflict copy: "Bu wagt ýaňy alyndy. Golaý boş wagtlar:".
- Table party size chips 1–8 + 9+ (call).
- SMS code: auto-submit on 4th digit + visible "Tassykla" fallback.
- Login modal 400 px.
- Closing any booking flow returns to `/b/{slug}`.
- Booking detail on phones = bottom sheet.
- Location unknown → banner + popular places; denied → IP city only in the field, no distances, sort by rating × reviews.
- Solid danger `#b42318`.
- Cancelled upcoming booking stays in Gelýän until reload.
- Search sorts nearest first; past slots never shown.
- A business's first photo is its card image everywhere.

## 12. Out of scope now (designed later)
Online payment and deposits · Resource booking type · Waitlist for full classes · Gift cards · Loyalty · Business replies in-app chat · AI-assistant bookings · Paid promotion in search.

## 13. Open questions
Real average bills · Official store badges · SMS provider and sender name · font sizes 28 / 24 / 80 (code maps them to h2 / h3 / display — keep) · open past midnight. **Closed:** maps = MapLibre + OpenFreeMap tiles (owner, 14.10.2026); Turkmen copy is checked by the owner during coding; RU/EN are added in code from the TK strings.


## 14. Decisions log (round 6 · client logic gaps, 17.10.2026)
Answers to `docs/design-requests/2026-10-16-round-6.md`; the item-by-item table with screens, tweaks and repo to-dos is `../ROUND6-ANSWERS.md` (next to this file). Copy is Turkmen only (RU/EN come from code).
- **A1 Declined request:** the client sees "Biznes ret etdi", the reason (+ the business's note) and up to 3 offered times as chips ("Bir basyşda ýazylyň — biznes bu wagtlary özi teklip etdi."). Tapping one asks once ("… — şu wagta ýazylmalymy?" Ýazyl / Yza) and creates a **confirmed** booking at once; the other chips go; the declined row moves to Geçen ("Teklip edilen wagt kabul edildi → YR-…"). A chip taken meanwhile: "Eýýäm eýelendi". All offered times past: "Teklip edilen wagtlaryň möhleti geçdi" + "Başga wagt saýla". One booking per declined request.
- **SMS link page `/b/{code}`:** works signed out; shows the booking card and, for a declined/expired request, the chips. Taking a time logs in inline with the **booking's own phone, masked and not editable** ("Kod diňe ýazylyşdaky belgä iberilýär."). Other states: confirmed / pending (read-only + Ýol görkez / Jaň et), offers expired, "Bu salgy işlemeýär".
- **A2 Unanswered request:** three canceller labels everywhere — "Siz ýatyrdyňyz" (user icon), "Biznes ýatyrdy" / "Biznes ret etdi" (building; "ret etdi" when it was never confirmed), "Wagtynda jogap gelmedi" (hourglass). The expired request offers 3 free times; tapping one sends a **new request** (pending, or confirmed at an instant business). The sent screen of a manual business adds: "Biznes adatça {N1} içinde jogap berýär. Jogap bermese, {N2} minutdan soň size başga wagtlary hödürläris." (N2 = the business's hold time).
- **A3 Waiting move:** the booking stays Tassyklandy with "Täze wagt soraldy: … · jogap garaşylýar"; the drawer shows old → new and "Haýyşy yzyna al". Declined or unanswered → "Täze wagt kabul edilmedi — ýazylyşyňyz öňki wagtynda galýar."; a second move replaces the first; cancelling the booking also withdraws its waiting move; an instant business moves it at once ("Wagt üýtgedildi").
- **A4:** only appointments can be moved. Table and class bookings offer "Ýazylyşy ýatyr" + "Gaýtadan ýazyl".
- **A5 Move mode** (`/tk/b/{slug}/book?move={id}`): "Wagty üýtget", steps Hünärmen · Wagt · Tassykla, services locked, current specialist preselected + "Islendik hünärmen", "Öňki wagt → Täze wagt", manual → "Täze wagty sora", instant → "Wagty üýtget"; same free-change window as cancelling. **Rule change:** the time grid follows the chosen specialist — no silent swap to another specialist.
- **A6 Undo:** 5 minutes. Failure: "Yzyna alyp bolmady — {sebäbi}." + "Başga wagt saýla" (time taken · no seats left · visit started · request's answer time ran out).
- **A7 Phone-only client:** calm card "Bu biznese telefon arkaly ýazylyp bilersiňiz" / "Biznes siziň bilen ýazylyşlary jaň arkaly ylalaşmagy haýyş etdi." + "Jaň et"; no blame; offered times after a decline can still be taken online.
- **B1 Hidden price:** "Baha ýerinde aýdylýar" in rows, flow, summary and detail; mixed total "{sum} TMT-den"; hidden-only total without an amount.
- **C1:** codes only to mobile numbers: "Kod diňe mobil belgä iberilýär. +993 6… ýa-da 7… bilen başlaýan belgi ýazyň."
- **D1:** the party chips follow the business's online limit (1…max + "{max+1}+" → call note). **D2:** search gets "Adam sany: 2 ▾" for restaurants (1–7 + 8+).
- **E1:** hours may end at 24:00 ("09:00–24:00", "Häzir açyk · 24:00-a çenli").
- **F1:** an unverified business's link shows "Bu sahypa entek açylmady" (States tile 11) to visitors; the owner sees a preview banner. **F2:** reviews under moderation are listed with "Ýeral barlaýar · ortaça baha hasaplanmaýar" and not counted.
- **Status badges** are icon + label (round 6 part A) on every client screen.

## 15. Decisions log (round 7 · v0.7, from the owner's review of the live apps)
One line per rule set or changed. Part 7.1 = foundations (boards `screens/system/DS-Type`, `DS-Controls`, `DS-Lists`); 7.2 business screens and 7.3 client site follow.

**7.1 Foundations (06.11.2026)**
- A1 · **Geist replaces Onest** as the only UI face (`--font-sans`). Onest's tabular cell is 0.67 em with a 0.36 em "1" (the gaps the owner saw); Geist's is 0.60 em with a balanced "1", same cap height and x-height as Onest, ~2 % narrower, full Turkmen Latin and Cyrillic. No digit companion: one family is simpler.
- A1 · Figures are proportional by default; `tabular-nums` only in numeric table columns, the calendar time grid and running timers/countdowns.
- A1 · Phone numbers are always grouped `+993 69 90 11 22`; money `1,170 TMT`.
- A1 · Heading tracking eases for Geist: h1 −0.025 em, h2 −0.02, h3 −0.01 (display −0.03).
- A3 · One control height scale S 32 / M 40 / L 48 with radii 8 / 10 / 12 for Input, Select, Segmented, Button, IconButton, Chip. Business desktop toolbars and forms = M; client-site forms and every 390 field/main button = L; S for table actions, active-filter chips and inside menus. Toolbars never mix sizes; underline tabs are their own row.
- A3 · Retired: buttons 36/44/52, input 48, radii 8 (input) and 10/12/14 (buttons).
- A4 · New Tertiary button (#f0f0f3 at rest) and Danger quiet button (white + #f6c7c2 border + #a3251b text); the ghost button is retired; Link is for navigation only; IconButton outline (standalone) or plain (in rows/toolbars), always with a tooltip.
- A4 · Call and Book again are two equal Secondary buttons; the client's name is the link to the card ("Open the client's card" removed).
- A2 · Ýeral Select replaces every native select: popover list (max 320 high), check on the selected row, search inside when > 8 options, group headers, multi-select with counts for filters ("Services · 3"), long lists open scrolled to the value, bottom sheet on 390.
- A2 · Time field HH:MM: typed or picked (15-min steps), "9" → "09:00", "930" → "09:30".
- A5 · One filter bar for every list: Search · filter menus · Sort at the right · active-filter chips + Clear all + result count on a second row; 390: Search + "Filters · N" sheet + Sort.
- A6 · Tables: sortable headers (natural order first), whole row opens the item, a single row action is an icon button, tags in their own column with "+N", one line per row, truncation with a tooltip, numbers right-aligned.
- A7 · Status = StatusPill (Open until / Closes at / Closed · opens …); facts are labelled, one per line; " · " only joins two short items that never wrap. Breadcrumbs: links look like links, current page ink 600, chevron separators; 390 shows only the parent as a back link.
- A8 · Tags are edited in place: Enter saves at once, Undo toast after removing, suggestions from the business's tags; automatic tags (New, Regular, Lapsed, Reported) are outlined with an icon and can't be removed.
- A9 · Hint lines under fields become an ⓘ next to the label with a click/tap popover.
- A10 · Callout tones: Info (violet), Success, Warning, Danger, Neutral; the icon always takes its callout's tone. "Bookings are confirmed at once" is Info with a zap icon. Toasts are ink with a tinted icon and an "Undo" action.
- A11 · Focus ring wraps the element's own box: tabs get 12/6 px padding and stop above the underline; links get a 2 px outline offset; rows use the inset ring.
- B10 · Sign-in codes go to the phone number's Telegram; the on-screen code is removed everywhere; resend after a 60 s countdown; "No Telegram on this number?" help; wrong / expired / too-many states.
- Demo · No demo, Example badge, demo banner or demo workspace anywhere; "Try the business app" is removed from B-Landing and B-Login.

**Decided while drawing (7.1)**
- A1 · Durations: minutes up to an hour (45 min, 60 min), then hours + minutes (1 h 30 min, 2 h) — never 90 min, 1.5 h or 1:30. Times are 24-hour with two-digit hours (09:00). Dates "Wed, 14 Oct" short, "Wednesday, 14 October" long. Money never "1170 TMT", "1 170 TMT" or "TMT 1,170". A time range in text is "09:00–13:00"; the spaced dash is only between two time fields.
- A1 · Geist draws the acute of ý / Ý over the right arm (font design; reads fine in Maýsa, Ýeral).
- A3 · Chips come in S 32 and M 40 only (no L chip; 390 uses M). Segmented L text 15/20; unselected 500 #5a5a64, selected 600 ink with a 1px #e6e6ea ring.
- A4 · Danger quiet = today's danger outline renamed (+ #f6c7c2 active); danger-ghost retired with ghost. A disabled plain IconButton has no fill. A button without a leading icon gets a min-width equal to its loading width.
- A11 · Tab focus box sits at y 4–36 in the 44 px tab row, so the ring ends 2 px clear of the underline and 8 px from the text. Text fields show the soft focus (border + #efecfe halo) for mouse and keyboard; buttons and chips show the ring for keyboard only.
- A2 · Every option row keeps a 16 px check slot so meta columns line up; the search field sits above the 320 list area (not inside it); popover width = trigger, min 200, except narrow triggers (FilterButton, TimeField: content width, time list 128). 390 sheets grow to 85 % of the screen, then scroll; their search is L 48.
- A2 · Time typing: one or two digits = hours, three or four = hours + minutes; invalid text stays and shows the error. Copy: "Choose a specialist." (Select error), "Ends before it starts. Pick a later time." (range error).
- A5 · A filter with one value reads its name ("Tag · Regular"); two or more read a count ("Services · 3"). Search alone shows only the count on row 2 (the field has its own ×). Menu counts are tabular (a right-aligned column).
- A5 · 390: Search L on its own row, then an M row with Filters · N, "24 of 100" and the Sort IconButton; segments become underline tabs that scroll sideways; in the Filters sheet a filter with more than 8 options opens its own list with search and Back.
- A6 · On numeric columns the sort arrow sits before the label. On 390 the right-hand fact of a list item is the sorted column; no row action on 390.
- A7 · The business hero meta line drops the category (it's in the breadcrumb): rating + reviews, the StatusPill, then the address line. Callouts have no close button; their actions are Secondary S under the body.
- A8 · After Enter the tag field stays open for the next tag; "Already added" makes the existing chip glow; Backspace in an empty field selects the whole last chip; tags in table cells are read-only; on 390 adding a tag opens a sheet. The Tag filter groups "Automatic" and "Your tags".
- A10 · NoteRow replaces the amber note box: warning icon + text + a 12/16 meta line; each note has a "…" menu (Edit · Don't show when booking · Delete). Desktop toasts sit 24 px from the content edge (right of the sidebar); error toasts with an action stay until closed.
- B10 · The code checks itself on the 4th digit (Confirm stays on the business screens for keyboard users); the countdown is plain #6e6e78 text; Expired swaps Open Telegram for Primary "Send a new code"; Too many codes leaves only Change number and the help; the help is a popover on desktop and a sheet on 390 (Call Ýeral, Write on Telegram); success shows "Signed in" then moves on. Phone step button "Get the code"; resend "Send a new code" everywhere.
- Demo sweep · A person without a workspace can only "Create a business" (no "look around first"). The `sms` tweak on B-Login stays as the later SMS copy.
- Data · Jahan Berdiýewa's first visit is 9 Oct (New = first visit within 30 days).
