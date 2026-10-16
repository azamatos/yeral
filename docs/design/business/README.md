# Ýeral Biznes — business web workspace spec (business.yeral.app)

Version: business-web v2 (rounds 4 + 5) · 14.10.2026 · canvas "Ýeral Web", page *Business workspace*
Components: every reusable piece of these screens is catalogued in `../COMPONENTS.md` and drawn on `../screens/system/DS-Patterns.dc.html` (domain-free → `@yeral/ui`) and `../screens/system/DS-Business.dc.html` (domain → FSD entities/features/widgets). Build screens from those, and extend Storybook with them.
Read with: `../README.md` (client spec — product rules, statuses, booking types, glossary), `../CLAUDE.md`, `../tokens.css`.
Source logic: the native Ýeral Business mobile app (12 flows). The web keeps its rules and adds desktop power: multi-staff calendar, tables, bulk actions.

Scope: round 4 (§1–13) = **daily work** (calendar, requests, bookings, clients) and **setup & settings** (sign-up + setup wizard, profile, booking rules, hours, services, team & roles, link/QR), appointment type. Round 5 (§14–23) = analytics, reviews, notification settings, help, billing, B2B landing + pricing, tables, classes. Only checkout/POS is still out of scope (revenue = prices of completed visits). Build order stays: appointment workspace first, then tables and classes.

---

## 1. Who uses it
| Role (TK) | EN | Sees | Can |
|---|---|---|---|
| **Eýesi** | Owner (system role, one per business, can't be removed) | everything, all branches | everything incl. revenue, billing, roles |
| **Administrator** | Admin / reception | whole calendar, all clients | confirm/decline, create/move/cancel bookings, mark no-show, edit clients; no revenue, no roles/billing |
| **Hünärmen** | Specialist | own bookings only; others' slots show as "Bes" (busy) without details | depends on role switches (default: confirm own requests, move own bookings, mark no-show) |
| **Programmasyz hünärmen** | Phone-only specialist (no login) | — | nothing; clients can book them online; owner/admin handle their requests |

Roles are editable templates (except Eýesi). Permission switches (role = ceiling; a person can't exceed it):
`Ähli senenamany görmek` (whole calendar) · `Ýazylyşlary tassyklamak` (confirm/decline) · `Geçirmek we ýatyrmak` (move/cancel) · `Gelmedi bellemek` (mark no-show/complaint) · `Müşderileri görmek we üýtgetmek` · `Hyzmatlary we bahalary üýtgetmek` · `Işgär çagyrmak` · `Girdejini görmek` (revenue) · `Sazlamalary üýtgetmek`.

Login = phone + SMS code (same as clients; one Ýeral account can be a client and a business member). One person can belong to several businesses/branches → business switcher at the top of the sidebar.

Devices: desktop-first (≥1024), works on tablets (768–1023: sidebar → 72 px icon rail, calendar shows up to 3 staff columns with horizontal scroll). Under 768: calendar one-staff day view + banner "Telefonda Ýeral Biznes programmasy has amatly" with store links.

---

## 2. Requests and confirmation (decided 14.10.2026)
- **Manual confirmation is the default.** Each new online booking arrives as a request (*Garaşylýar*).
- A business may switch to **instant confirmation** (Settings → Ýazylyş düzgünleri). Then online bookings arrive *Tassyklandy* and the client sees "Ýazylyş tassyklandy" immediately.
- **Hold time** (manual mode): the business sets how long a request holds the slot: 15 min, 30 min (default), 1 h, 2 h, 6 h, 24 h — never past the visit start. Unanswered → auto-cancelled (`cancelledBy: system`), client gets SMS with 3 alternative times.
- Declining asks for a reason (chips + optional text); **the client sees the reason**. Decline can attach up to 3 alternative times the client can accept in one tap.
- Requests are visible everywhere they matter: sidebar badge on Ýazylyşlar, "N haýyş" chip in the calendar header, dashed blocks in the grid, top-bar toast + sound on arrival (browser notification if allowed).
- Who can answer: Eýesi, Administrator, and the specialist themself if their role allows; requests for phone-only specialists go to owner/admin.

## 3. Booking statuses from the business side
Same five statuses and colours as the client site.
- **Garaşylýar** (request) → Tassykla / Ret et (decline with reason).
- **Tassyklandy** → move (drag in calendar or "Başga wagta geçir"), cancel (reason; client notified), complaint.
- **Tamamlandy** — automatic after the end time. No "came" button.
- **Gelmedi** — set through **"Arz et"** (complaint): one button instead of came/didn't-come. Reasons: Gelmedi (no-show → status Gelmedi), Gijä galdy (late), Gödek gylyk (rude), Başga. The reason goes to the client card (team-only). Booking rule: after N no-shows (default 2) a client can book only by phone.
- **Ýatyryldy** — by client / by business / by system (expired request). Hidden in the calendar by default (toggle "Ýatyrylanlary görkez").
- **Manual bookings** (made by staff for phone or walk-in clients) are created *Tassyklandy* immediately with a phone icon (source: phone) or person icon (source: walk-in "Gelip ýazyldy").

## 4. Calendar (`/tk/calendar`)
Header: date navigation (Şu gün · ‹ › · date picker popover), view segmented **Gün / Hepde**, staff segmented **Ähli işgärler / Bir işgär** (+ staff picker when "Bir işgär"), chip "N haýyş" (opens requests panel), toggle "Ýatyrylanlary görkez", primary **"Täze ýazylyş"**.
Day summary line: "16 ýazylyş · 3 haýyş · Girdeji (meýilleşdirilen): 1 410 TMT". Count = all non-cancelled bookings incl. requests and no-shows; planned revenue = confirmed + pending + completed prices (no cancelled, no no-show) and is shown only to roles with `Girdejini görmek`.

**Day · all staff** (default for owner/admin): time gutter 64 px + one column per bookable specialist (min 200 px, horizontal scroll beyond fit). Column head: avatar, name, role, "5 ýazylyş"; phone-only staff marked "programmasyz". Grid 08:00–21:00 visible window (scroll to the rest), 15-min rows, **1 hour = 80 px**.
- Booking block: fill = status tint (`--st-*-bg`), 1 px status line, text ink: time, client name, service(s); phone/walk-in icon; note icon if client has an alert note. Short blocks (<30 min) show one line.
- **Request** = dashed status line, 70 % opacity fill, small timer "18 min".
- **Buffer** after a service (business rule, demo 10 min; per-service override, e.g. Saç reňklemek 15 min) = diagonal hatching (`repeating-linear-gradient(135deg, #f0f0f3 0 4px, #ffffff 4px 8px)`) — not bookable, not a block.
- **Breaks / blocked time** ("Arakesme", "Ýapyk") = `#f0f0f3` block with label, part of the staff schedule.
- **Outside working hours** = `#f6f6f8` shading; staff day off = whole column shaded + "Dynç güni".
- **Now line** = 2 px `#5a3ff0` with a dot and time label in the gutter.
- Click empty slot → New booking drawer prefilled (staff + time). Click block → Booking drawer (or Request drawer). Drag a block → move: drop shows a ghost; on release a confirm popover "14:30 → 16:00, Aýna · Müşderä SMS iberilsin" (checkbox on) + Tassykla / Yza. Conflicts (overlap, outside hours, staff doesn't do the service) → drop refused with a toast reason.
**Day · one staff**: same grid, one wide column, room for notes and client info in blocks.
**Week · all staff**: matrix rows = staff, columns = 7 days; each cell = load bar (booked / working minutes) + "5 ýazylyş · 1 haýyş"; click → that day. (Mobile rule: week shows load, not details.)
**Week · one staff**: 7 day columns time grid with **textless** blocks (status colour only); click → that day.

Panels (right drawer 480, the calendar stays visible; one at a time; Esc closes):
- **Request drawer**: timer "Jogap bermäge 18 min galdy"; client (name, phone, "3-nji gelşi", no-show count if any, alert notes), services + duration + price total, staff, date/time, client note; primary **Tassykla**, secondary **Ret et** → decline modal (reason chips: "Bu wagt boş däl", "Hünärmen ýok", "Bu hyzmaty edip bilmeýäris", "Başga sebäp" + text; optional "Başga wagt teklip et" with 3 slot chips); link "Müşderiniň kartyna geç".
- **Booking drawer**: status badge + source; client block (as above) with "Jaň et"; services, staff, time, price; client note; **internal note** (team only, autosave "ýatda saklandy"); history mini (last 3 visits); actions: Başga wagta geçir · Ýatyr (reason modal, client notified) · Arz et (complaint modal "Näme boldy?") · Gaýtadan ýaz (book again for this client).
- **New booking drawer**: client field with search (name or phone) → results with visit counts; "Täze müşderi" inline (phone required, name); services multi-select (grouped, durations, prices; shows total); staff (only those who do all chosen services; "Islendik" not offered — staff chooses); date + time (prefilled; time list respects hours, breaks, buffers); internal note; toggle "Müşderä SMS bilen habar ber" (on); primary **"Ýazyp goý"** → created Tassyklandy.

## 5. Bookings & requests list (`/tk/bookings`)
Tabs: **Haýyşlar** (pending, count) · Şu gün · Gelýän · Geçen · Ýatyrylan. Data table (DS table): checkbox · Müşderi (+ phone) · Hyzmat · Hünärmen · Wagt · Çeşme (Onlaýn / Telefon / Gelip) · Ýagdaý · row menu. Requests tab adds "Jogap" column with timer and inline ✓ / ✕ icon buttons. Filters: search (client/phone/ID), hünärmen, hyzmat, date range. Bulk (ink bar): Tassykla · Ret et · Başga wagta geçir · Eksport (CSV). Row click → the same drawers as the calendar. Empty requests tab: "Täze haýyş ýok — hemme zat jogaplandy".

## 6. Clients (`/tk/clients`, `/tk/clients/{id}`)
List: search (name/phone), filter chips **Ählisi · Yzygiderli** (≥3 visits in 6 months) **· Täze** (first visit ≤30 days) **· Köpden bäri gelmedik** (no visit 60+ days) **· Arz edilen** (has complaints); columns: name + tags, phone, gelşi (visits), soňky gelşi, jemi (sum of completed visit prices, only with revenue permission), indiki ýazylyş; bulk: SMS iber (template, later), Eksport. "Täze müşderi" modal: **only phone required** (+ name, birthday, source "Nireden geldi": Instagram / Tanyş maslahat berdi / Ýeral / Köçeden / Başga, tags, team note), "Ýatda sakla" or "Ýatda sakla we ýazyl".
Client card (page): header (name, phone, tags, since), stats (gelşi, ortaça çek, soňky gelşi, gelmedik sany), **Bellikler** (team notes with author + date; alert notes flagged "Ýazylanda görkez" show in booking blocks/drawers), upcoming bookings, history (date, service · staff, price, status), complaints list, settings: "Ýatlatma SMS-lerini iberme" (client asked), "Diňe jaň arkaly ýazylyp biler" (blocked from online), edit, delete ("Ýazylyş taryhy hasabatlarda atsyz galar").

## 7. Setup wizard (sign-up) (`/tk/signup` → `/tk/setup/{step}`)
1 Telefon + SMS · 2 Biznes: name, category (searchable grouped list; category sets booking type — `business-demo.json → categoriesForSignup.bookingType`; table categories (Restoran, Kafe we çaýhana) carry a neutral tag "Stol bronlamak", class categories (Fitnes studiýasy, Ýoga we stretçing) "Topar sapaklary"; choosing one shows an info line that tables / classes are set up after the wizard in Sazlamalar → Stollar / Sapaklar. The appointment-only steps 4–5 stay as they are for MVP; a table/class-specific wizard is not designed) · 3 Salgy: address search + **map pin** + "Girelge nirede?" note + switch "Öýde işleýärin — takyk salgyny diňe tassyklanandan soň görkez" · 4 Iş wagty (weekly; "Iş günleri birmeňzeş" shortcut) · 5 Hyzmatlar: starter list from the category (checkbox, editable name/duration/price) + "Hyzmat goş" · 6 Topar: "Ýeke işleýärin" / "Toparym bar" (add name + phone + role; invites by SMS) · 7 Ýazylyş düzgünleri: manual vs instant, hold time, cancellation window · 8 Taýýar: business page preview card, link `yeral.app/tk/b/{slug}` + QR, status **"Barlagda"** — the Ýeral team verifies new businesses within 24 h (CMS moderation) before they appear in search; checklist (logo, 3+ photos, description) to raise quality. Progress: left step list + "Soňra dowam et" (save and exit). Business can use the calendar immediately; it's just not public until verified.

## 8. Settings (`/tk/settings/{section}`)
Left settings nav (inside the content area, 240 px): **Biznes profili · Ýazylyş düzgünleri · Iş wagty · Hyzmatlar · Topar · Roller · Salgy we QR · Şahamçalar** (branches) · divider · **Habarnamalar** (§16) · **Töleg we tarif** (§18, owner only). Table businesses get **Stollar** (§20) and class businesses **Sapaklar** (§21) in place of / next to Hyzmatlar. Kömek is not a settings item — it lives in the sidebar (§17).
- **Biznes profili**: logo, name, category, description per language (TK/RU/EN tabs), photos (grid, drag to reorder, first = cover, 3+ recommended), contact phone, amenities (checkbox list), address block with map preview → "Salgyny üýtget" opens the map modal; "Sahypany gör" opens the public page.
- **Ýazylyş düzgünleri**: Onlaýn ýazylyş (switch) · Tassyklama: manual / instant (radio cards) · Haýyş saklanýar: 15 min…24 h · Iň az öňünden: 0/30 min/1/2/4/24 h · Näçe gün öňünden açyk: 7/14/30/60/90 · Hyzmatdan soňky arakesme (buffer): 0/5/10/15/20/30/custom · Wagt ädimi: 15/30 min · Müşderi ýatyryp biler: … sagat öň · Ýatyrylanda sebäp sora (switch) · N gelmedikden soň onlaýn ýazylyşy ýap (0=off, 1–5).
- **Iş wagty**: weekly table (day, open switch, from–to with 30-min time pickers, + break "Arakesme" optional); **Aýratyn günler** (exceptions): list with name, dates, "Her ýyl" repeat; "Aýratyn gün goş" modal (name shown to clients when a booking must be cancelled; single date or range; yearly repeat; closed or special hours). Conflicts: if an exception overlaps bookings → warning with the count and options (keep / cancel and notify with alternatives).
- **Hyzmatlar**: catalog grouped by service category (reorder by drag), rows: name, duration, price (fixed/from/free/hidden), buffer override, who performs (avatars), onlaýn (switch); "Hyzmat goş" + "Topar goş"; service drawer: name per language, description, category, duration (5-min steps), buffer override, price type + amount, specialists (checkboxes), "Onlaýn ýazylmak bolýar" switch, delete.
- **Topar**: list (avatar, name, role, services count, schedule summary "Biznes wagty bilen" / "Öz smenasy", status Işjeň / Çagyryldy / Öçürilen); order shown to clients (drag). **Invite (3 steps modal)**: 1 Kim: phone (= login), name as shown to clients, specialization (optional), role · 2 Hyzmatlar: what this person does (group checkboxes) · 3 Barla we tassykla. **Staff drawer**: profile, services, schedule (as business / own shift per day within business hours), personal exceptions (vacation, birthday — "Diňe biznesiň içinde görünýär"), conflicts with bookings, role, "Işgäri öçür" → modal with N future bookings: **Başga hünärmene geçir** (default; pick who) / Bolşy ýaly galdyr (no new bookings) / Ýatyr we müşderilere habar ber (3 alternatives).
- **Roller**: roles list + role editor: name, visibility (own / whole calendar), permission switches (§1). Eýesi is locked.
- **Salgy we QR**: public link `yeral.app/tk/b/glow-studio` (copy, share), QR (download PNG/SVG for the front desk), "Ýazylyş düwmesi" (button code for Instagram/website — later).
- **Şahamçalar**: list of the owner's businesses/branches with pending-request badges; "Şahamça goş" → wizard.

## 9. App shell
- **Sidebar 248** (white, right 1px divider): business switcher (logo, name, branch, chevron → popover with other branches + request badges + "Şahamça goş"), nav: Senenama (or Stollar / Sapaklar for table / class businesses) · Ýazylyşlar (badge = pending count, pending colours) · Müşderiler · Teswirler (neutral grey badge = unanswered reviews) · Hasabatlar · Sazlamalar; bottom: Ýeral sahypaňyz (public page), Kömek (→ `/tk/help`), user (avatar, name, role) with menu (Profil, Dil, Müşderi hökmünde aç → yeral.app, Çykmak).
- **Top bar 64** (inside content, bottom divider): page title, global search (clients, phone, booking ID; ⌘K), "Täze ýazylyş" primary (only on pages without their own primary), notifications bell (later), help.
- Content padding 32 (24 tablet). Tables and calendar fill the width; forms max 720.
- Toasts bottom-left (ink). Drawers right 480 with scrim only on <1280 (on wide screens the drawer pushes nothing and has no scrim for the calendar so staff can keep context).

## 10. Data model additions
```
Membership  userId, businessId, roleId, staffId?, status: active|invited|disabled
Role        id, businessId, name, system: bool, visibility: own|all, permissions[]
Staff       id, businessId, name, specialization?, phone, avatar?, hasApp: bool, bookable: bool, order, serviceIds[],
            schedule: inherit | {day: [{from,to}]}, breaks[], exceptions[{name, from, to, yearly}]
BookingRules businessId, onlineEnabled, confirmMode: manual|instant, holdMinutes, leadMinutes,
            windowDays, bufferMinutes, slotStep, cancelWindowMinutes, askCancelReason, blockAfterNoShows
Booking     + source: online|phone|walkin|ai, internalNote, decline{reason, alternatives[]}, complaint{type, text}, holdUntil
Client      id, businessId, phone, name?, birthday?, source?, tags[], notes[{text, alert, authorId, at}],
            noRemindersSms, onlineBlocked, stats{visits, avgCheck, lastVisit, noShows}
BusinessVerification businessId, status: pending|verified|rejected, reason?
```

## 11. Decisions log (round 4)
- Drawers: no scrim at ≥1280 (calendar stays usable), scrim below. Toasts sit at left 272 px (clear of the sidebar).
- Requests drawer opens the most urgent request first (smallest time left); a pager "1 / 5" steps through them; after confirm/decline an "Indiki haýyş" button.
- Decline alternatives are computed from free slots (screens show fixed demo times). Decline reason text box appears for "Başga sebäp".
- Moves are validated: specialist must do the service; booking + buffer must fit hours, breaks and other bookings; otherwise a toast says why.
- Empty grid slots are not tab stops; keyboard users create bookings with "Täze ýazylyş".
- Team table splits "Hünärmenler" (bookable, shown to clients, draggable order) and "Dolandyryş" (owner/admin).
- Phone-only (Programmasyz) staff are added without SMS and are active immediately.
- Disable-staff "Kime" list shows only specialists who do the affected services; otherwise each booking falls back to "Islendik boş hünärmen".
- Special days save directly from their modal (no page save bar); other settings use the sticky save bar.
- Settings option lists: cancel window Islendik wagt / 1 / 2 / 6 / 12 / 24 / 48 sagat; lead time 0 = "Çäk ýok"; buffer 0–30 + custom (1–120 min); no-show block 0–5 (0 = Ýok); time pickers 06:00–23:30 in 30-min steps; one break per day.
- Wizard: owner's name is asked after the SMS code; "Iş günleri birmeňzeş" copies Monday to Tue–Fri; invites are sent from the final step (not for Programmasyz).
- Hold time never runs past the visit start (server-enforced).
- Breaks can differ per day (demo: Aýna Wednesday 14:00–14:40, Thursday 13:30–14:10).
- Not designed yet: businesses open past midnight, role deletion, multi-booking move, real QR generation, photo upload preview.

## 12. Business glossary (TK)
Senenama (calendar) · Ýazylyşlar · Haýyş (request) · Tassykla / Ret et · Täze ýazylyş · Ýazyp goý (save booking) · Başga wagta geçir · Arz et (complaint) · Näme boldy? · Müşderi / Müşderiler · Bellik (note) · Bellikler · Yzygiderli (regular) · Köpden bäri gelmedik · Gelşi (visit) · Ortaça çek · Hünärmen · Topar (team) · Rol / Roller · Eýesi · Administrator · Programmasyz · Çagyr (invite) · Öçür (disable) · Iş wagty · Arakesme (break) · Aýratyn günler (exceptions) · Dynç güni (day off) · Hyzmatdan soňky arakesme (buffer) · Ýazylyş düzgünleri · Onlaýn ýazylyş · Derrew tassyklama (instant) · Sazlamalar · Şahamça (branch) · Barlagda (in review) · Çeşme (source): Onlaýn / Telefon / Gelip ýazyldy · Ýatda saklandy (saved) · Eksport.

## 13. Open for later rounds (now covered in round 5 below, except checkout/POS)
Analytics (staff / services / clients) · Reviews & replies · Notification settings (event × role) · Help & support chat · Billing (plans in manat, commission) · B2B landing + pricing · Table timeline & floor plan · Class schedule & attendance · Checkout/POS (MVP: revenue = prices of completed visits).


---

# Round 5 (14.10.2026) — the rest of the business workspace

Scope added: Hasabatlar (analytics), Teswirler (reviews), Habarnamalar (notification settings), Kömek (help), Töleg we tarif (billing), B2B landing + pricing (business.yeral.app before login), Stol dolandyryşy (tables), Topar sapaklary (classes). Still no checkout: revenue = prices of completed visits.

## 14. Hasabatlar — analytics (`/tk/analytics`)
Mobile rule kept: analytics answers three questions — **staff, services, clients** — two levels deep (section → one staff / one service), every drill-down is a row with a chevron, not a chart click. MVP metrics: revenue (completed visits), bookings, average check, returning clients, no-shows.
- Header: period segmented **Hepde · Aý · Ýyl** + period picker ("Sentýabr 2026 ‹ ›"), comparison caption "awgust bilen deňeşdirilende", secondary S "Eksport (CSV)". Visible only to roles with `Girdejini görmek` (others see bookings counts only, no money).
- **Overview**: 4 stat tiles (Girdeji, Ýazylyşlar, Ortaça çek, Gaýdyp gelýänler) with delta pills (completed colours for growth, no-show colours for decline — always with an arrow icon and the sign, not colour alone); one revenue line/area chart by day (accent `#5a3ff0` line, `#efecfe` area, previous period dashed `#b0b0b8`); then three section rows: **Hünärmenler** (who earns, who keeps clients), **Hyzmatlar** (top 3 by revenue), **Müşderiler** (new vs regular vs returning after a break, "Köpden bäri gelmedik · 27" with "Ýatlatma iber (ýakynda)").
- **Insight sentences** (one per section, generated): plain-language observations, e.g. "Leýli-niň müşderileriniň 72%-i gaýdyp gelýär — iň ýokary görkeziji." Never more than one per section.
- **Section pages**: Hünärmenler = table (name, girdeji, ýazylyş, ortaça çek, gaýdyp gelýän %, gelmedik) + horizontal bars of revenue share; one staff = their tiles + services they sell + "Senenamasyny aç". Hyzmatlar = table (service, girdeji, sany, sagadyna girdeji, paý) sortable; one service = tiles + who performs it. Müşderiler = new/regular/returning stacked bar per week, retention %, visits per client, sources of new clients (Ýeral / Instagram / Tanyş / Köçeden / Başga) as a bar list.
- **First weeks** (business < 30 bookings): "Hasabatlar taýýarlanýar" state with progress ("12 / 30 ýazylyş") and what unlocks when.
- Charts: no chart junk; axis labels 12 px `#6e6e78`; gridlines `#f0f0f3`; categorical colours from the accent ramp (`#5a3ff0`, `#9d88f7`, `#c3b6fb`, `#4429d6`) — never status colours for categories; tooltips = small raised popover; every chart has a text alternative (the table beneath or an aria summary).

## 15. Teswirler — reviews (`/tk/reviews`)
- Summary: average (4,9), count, distribution bars, "Jogapsyz · 4" chip. Filters: Ählisi · Jogapsyz · 5★ … 1★ · Hünärmen ▾. Sort newest first.
- Review item: stars, client display name ("Gülälek N."), date, service · specialist, text, photos (later), business reply block (#f6f6f8, author "Glow Studio · Maýsa") or "Jogap ber" button → inline composer (textarea 500 chars, "Jogaby çap et" primary S, caption "Jogabyňyz hemmä görüner"). Edit/delete own reply.
- "Arz et" (report) on a review → modal: reasons (Ýalan / bu müşderi gelmedi · Kemsidiji sözler · Başga biznes barada · Mahabat / spam · Başga) + text; goes to Ýeral moderation (CMS); review stays visible until moderated; status line "Barlanýar" on the item.
- Rules: only clients with a Completed booking can review; one per booking; reviews can't be deleted by the business.
- **Counting rule:** a reported review under moderation ("Barlanýar") stays visible on both sides but is **not counted** in the average, the count or the star breakdown until Ýeral clears it; if Ýeral removes it, it disappears. Demo: the Anonim 1★ review is under moderation, so the breakdown is 88 / 6 / 1 / 1 / 0 = 96 reviews, average 4,9 (same numbers on the client page).
- The business can reply to a review under moderation. "Ýene görkez" (load more, 20 per page) after the list.

## 16. Habarnamalar — notification settings (`/tk/settings/notifications`)
Mobile rule kept: **each line says when a message arrives and where**, not a matrix of switches. Per person (the signed-in user), with role defaults.
- Events: Täze haýyş · Haýyşyň wagty gutarýar (5 min galanda) · Müşderi ýatyrdy · Müşderi wagtyny üýtgetdi · Telefon/gelip ýazylyş goşuldy (by colleague) · Täze teswir · Ertirki ýazylyşlar (evening summary 20:00) · Gündelik jemleme (08:00) · Topar: çakylyk kabul edildi · Ýeral: tölegler, barlag, täzelikler.
- Each row: event name, one sentence "Haçan: täze haýyş gelende derrew", channel toggles **Brauzerde · Programmada · SMS** (SMS only for critical events: new request when no app; costs are Ýeral's), and "Kim alýar" caption derived from roles ("Siz, administrator we haýyşyň hünärmeni").
- Quiet hours: "Gijeki dymyşlyk 22:00–08:00" (no sound/push, SMS never at night).
- Browser permission banner if not granted: "Brauzer habarnamalaryny açyň" + button.

## 17. Kömek — help (`/tk/help`)
- Search "Sorag ýazyň…", category tiles (Başlamak · Senenama we ýazylyşlar · Müşderiler · Topar we roller · Sazlamalar · Töleg we tarif), popular articles list, article page (title, updated date, steps with numbered list and small inline UI illustrations — drawn as simplified boxes, "Peýdaly boldumy? Hawa / Ýok"), contact block: **Goldaw çaty** (opens a right drawer chat with Ýeral support, typical reply "adatça 10 minutda", working hours), phone, Telegram link. Context help: "?" buttons in settings open the matching article in a drawer.

## 18. Töleg we tarif — billing (`/tk/settings/billing`) — owner only
**Two plans + one commission layer** (decided 14.10.2026; prices are open questions → placeholders `[PRICE]`, `[X]%`):
1. **Ýeke** — mugt; one specialist; online booking, calendar, clients, SMS reminders, link & QR.
2. **Topar** — `[PRICE] TMT / aý` per business (not per staff; "Bir biznes üçin · çäksiz işgär"); unlimited staff, roles, analytics, support chat; each branch is billed separately. Tag **"Toparlar üçin"** (neutral, not a popularity claim). CTA "Synap gör" = a trial whose length and terms are **not defined yet** (open question).
- **Komissiýa is not a plan.** It applies on **every plan**, only to the **first completed visit of a new client who found the business through Ýeral search**: `[X]%` of that visit (below the market's 20–30 %). Always free: clients from the business's own link or QR, phone bookings, returning clients. Never charged: no-shows and cancelled bookings.
- SMS reminders to clients are included on every plan (Ýeral pays the SMS).
- Plan changes take effect at the next invoice; switching a multi-specialist business to Ýeke is blocked until only one specialist is active.
- Later: card payments and deposits; paid promotion in search; "Tor" for chains (contact us).
Billing page: current plan card (name, price, next invoice date, line "+ komissiýa: täze müşderilerden [X]% (aşakda)", "Tarifi üýtget" → compare modal with two plan columns and a full-width commission row), this month's commission statement (table: client, first visit date, service, visit price, commission; total; caption "Diňe Ýeral gözleginden gelen täze müşderiler"), invoices list (number, period, amount, status Tölendi / Garaşylýar / Möhleti geçdi in no-show colours with a "Töle" button that shows Ýeral's bank details and the invoice number to quote, "PDF"), payment method: **bank transfer by invoice** (bank details block, "Hasap-faktura ýükle"), company details (Kärhananyň ady, Salgyt belgisi/STIR? → "Salgyt belgisi", Bank, Hasap) editable. Change plan modal compares plans.

## 19. B2B landing + pricing (`business.yeral.app`, logged out)
Marketing header (Ýeral Biznes lockup, Mümkinçilikler · Bahalar · Kömek · Giriş, primary "Mugt başla" → setup wizard). Sections: hero ("Müşderileriňiz onlaýn ýazylsyn" + sub + CTA + product visual = a simplified drawn calendar mock, not a screenshot), who it's for (10 category tiles incl. restaurant/café and yoga — no "ýakynda"; subtitle mentions table booking and group classes), features (6: Onlaýn ýazylyş 24/7 · Senenama we topar · Haýyşlar we tassyklama · Müşderi bazasy · SMS ýatlatmalar · Hasabatlar), how it starts (3 steps, "5 minutda"), pricing (**2 plan cards** Ýeke / Topar + a full-width commission box "Komissiýa — diňe Ýeral-dan gelen täze müşderiden" with `[X]%` and the 4 free/never rules + "Tor" contact line + invoice caption), FAQ (6 questions, accordion), final CTA band, footer (TK/RU/EN). One gradient primary per view (header CTA counts; repeat CTAs below are the same action). No city names; "Türkmenistanda" may appear in legal/footer only? → No: keep "Ýeral" generic.

## 20. Stol dolandyryşy — tables (`/tk/tables`) — Bag kafe workspace
- Business type table: sidebar shows **Stollar** instead of Senenama (or both for mixed businesses).
- **Timeline view** (default): rows = tables grouped by area (Zal: 1–8, Terrasa: T1–T6, VIP otag: V1), columns = time 10:00–23:00 (1 h = 96 px, 15-min snapping), reservation bars (status fill, party size icon + number, client name, time); requests dashed with timer; walk-ins = confirmed fill + person icon (source "Gelip oturdy"); turn time default 2 h (bar length); hold 15 min after the start (hatched tail "15 min saklanýar"); now line. Header: date nav, area filter chips (Ählisi · Zal · Terrasa · VIP), party-size quick filter "2 adam üçin boş stollar", "Täze bron" primary, "Gelip oturdy" secondary (walk-in).
- **Floor plan view**: simple top-down layout per area (round/square table shapes with seat counts), each table coloured by its current state: Boş (white, n-300 line) · Bronlandy soňrak (tint) · Häzir oturan (accent solid, white text, time left) · Haýyş (pending dashed); click → table panel with today's reservations.
- Reservation drawer: party size stepper, date/time, table (auto-suggest by capacity, "birleşdir" combine two tables), area, client, special requests chips, internal note; actions: Tassykla/Ret et (requests), "Geldi" (seat now), Başga stola geçir, Ýatyr, Arz et.
- Table settings (in Sazlamalar → Stollar): areas (name, open hours), tables (name, seats min–max, area, combinable with), default turn time per party size (1–2 adam 1 sag 30 min, 3–4 adam 2 sag, 5+ 2 sag 30 min), hold time 15 min, max party online (8).

## 21. Topar sapaklary — classes (`/tk/classes`) — Aýdyň ýoga workspace
- **Week schedule** (default): 7 day columns time grid; session blocks (class name, time, trainer, seats "11/14" with a mini fill bar; full = "Doly" no-show-free neutral; cancelled session = cancelled tint strike). Header: week nav, trainer filter, "Sapak goş" primary.
- Session drawer: details (class, trainer, time, room, price, level), **attendees list** (name, seats, status badge, source; menu: Gelmedi bellemek, Ýatyr), capacity bar, "Müşderi goş" (manual add, confirmed), waitlist (later), actions: "Sapagy ýatyr" (danger: all attendees notified with reason + alternative sessions), "Başga wagta geçir" (notify), message all (later).
- Class catalog (Sazlamalar → Sapaklar): class types (name, description TK/RU/EN, duration, capacity, price, level, trainer(s), online on/off), recurring schedule editor ("Her hepde Duşenbe, Çarşenbe · 18:30 · Aýgözel", start/end dates, exceptions).
- Attendance: Completed by default after the session; trainer/admin marks individual no-shows.

## 22. Decisions log (round 5)
- Analytics is visible with money only to `Girdejini görmek`; others see counts.
- Delta pills always carry an arrow and sign (not colour alone).
- Charts use the accent ramp for categories; status colours only for statuses.
- Notification settings: one sentence per event + channel toggles, no event × role matrix (mobile decision).
- SMS to business staff only for critical events (new request when the person has no app); never at night.
- Billing: invoice + bank transfer; commission only on the first visit of clients from Ýeral search — a layer on every plan, not a plan (§18).
- Tables and classes live in the same shell; a business with several booking types sees each section in the sidebar.
- Reviews under moderation are visible but not counted (§15). Teswirler badge = unanswered count in the neutral grey count tone (not the pending amber — reviews aren't urgent).
- Analytics: Hepde/Ýyl and ‹ › change only labels in the demo (data is September only); daily revenue in the data now adds up to the tiles (46 200 / 41 250). Service shares that don't reach 100 % get a derived "Beýleki N hyzmat" row. Chart category order: `#5a3ff0`, `#c3b6fb`, `#4429d6`, `#9d88f7` (adjacent segments stay distinguishable); every chart has a legend + text alternative. A specialist sees counts only ("Girdeji diňe eýesine görünýär"); Eksport and client lists are hidden for that role. One-service drill-down page is not drawn (rows not clickable yet).
- Notifications: SMS can be switched on only for "Täze haýyş" and "Ýeral" events; "Ses bilen" switches on the first two rows; quiet-hours/summary option ranges as drawn. Denied browser permission state is not drawn (use the banner with "Brauzer sazlamalarynda açyň").
- Help: articles come from the CMS; one sample article body is drawn. Article title is the page h1, so the top-bar title must not also be an h1 on that view. Context "?" buttons in settings open the article in a drawer (not drawn).
- Tables: a confirmed booking whose start has passed counts as seated; walk-ins use the confirmed fill + person icon; online bookings are auto-assigned the smallest fitting table (staff can change it); combinable pairs and min/max party per table size live in table settings; time suffixes follow vowel harmony ("19:30-a", "21:00-e", "20:00-ä").
- Classes: no hold timer on class requests (they use the business hold time like appointments when built); "Gelmedi belle" is enabled only after the session starts; waitlist later ("garaşýanlar sanawy ýakynda"); manual add = 1 seat, source phone, confirmed; clash checks = trainer or room overlap.
- Restaurant and yoga are no longer "ýakynda" anywhere (onboarding, settings, landing).

## 23. Design system v0.4 and Storybook (14.10.2026)
- The repo already has `@yeral/ui` (38 components) + Storybook 10 built from DS v0.3.1. Round 4–5 screens introduced many new components and variants. They are now unified and catalogued:
  - `screens/system/DS-Patterns.dc.html` — domain-free primitives (pills/tags, timer & delta pills, callouts, save bar, progress/meter, checklist, timeline, stat tiles, charts, inputs with addons, copy field, number stepper, time range, combobox, tag input, photo manager, settings layout/rows, app top bar, side-nav rail & switcher, accordion, map frame, QR block, overlay sizes) + the new variants of existing components.
  - `screens/system/DS-Business.dc.html` — domain components (calendar grid & booking blocks, request/booking drawers, client header & tags, staff/role rows, service rows, rules & hours editors, review item, notification rows, KPI rows, plan card, commission & invoice rows, floor plan & table timeline, class session & roster, client-site cards).
  - `COMPONENTS.md` — one row per component: package / FSD place, Storybook status (exists / extend / new + title), variants & states, screens, code notes.
- Where screens drew the same thing differently, the DS boards hold the canonical version (drift list in `COMPONENTS.md`). Build from the boards, not from the older drift.
- Every new component gets stories for all its states before the screens use it (repo skill `design-system`).

## 24. Open questions (owner)
`[PRICE]` for Topar · commission `[X]%` · the Topar trial behind "Synap gör" (length, card needed?) · `[AMOUNT]`, `[BANK]`, `[ACCOUNT]`, `[TAX ID]`, `[SUPPORT PHONE]`, Telegram link · SMS provider · map provider · native Turkmen review of all new copy (incl. `-da/-de` after times) · whether modal width 560 becomes a token (`--modal-ml`) or those forms move to 640 · new type tokens 14/12 and radii 4/6 proposed by the DS audit (`COMPONENTS.md` → Tokens) · table/class-specific setup wizard · businesses open past midnight.
