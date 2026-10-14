# Ýeral Biznes — business web workspace spec (business.yeral.app)

Version: business-web v1 (round 4) · 14.10.2026 · canvas "Ýeral Web", page *Business*
Read with: `../README.md` (client spec — product rules, statuses, booking types, glossary), `../CLAUDE.md`, `../tokens.css`.
Source logic: the native Ýeral Business mobile app (12 flows). The web keeps its rules and adds desktop power: multi-staff calendar, tables, bulk actions.

Scope of this round: **daily work** (calendar, requests, bookings, clients) and **setup & settings** (sign-up + setup wizard, profile, booking rules, hours, services, team & roles, link/QR). Appointment type only. Not yet: analytics, reviews, notifications settings, help, billing, B2B landing, table/class management (next round).

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
1 Telefon + SMS · 2 Biznes: name, category (searchable grouped list; category sets booking type — table/class categories show "Stol/sapak dolandyryşy ýakynda goşular; häzir wagt bellemek görnüşinde başlap bilersiňiz") · 3 Salgy: address search + **map pin** + "Girelge nirede?" note + switch "Öýde işleýärin — takyk salgyny diňe tassyklanandan soň görkez" · 4 Iş wagty (weekly; "Iş günleri birmeňzeş" shortcut) · 5 Hyzmatlar: starter list from the category (checkbox, editable name/duration/price) + "Hyzmat goş" · 6 Topar: "Ýeke işleýärin" / "Toparym bar" (add name + phone + role; invites by SMS) · 7 Ýazylyş düzgünleri: manual vs instant, hold time, cancellation window · 8 Taýýar: business page preview card, link `yeral.app/tk/b/{slug}` + QR, status **"Barlagda"** — the Ýeral team verifies new businesses within 24 h (CMS moderation) before they appear in search; checklist (logo, 3+ photos, description) to raise quality. Progress: left step list + "Soňra dowam et" (save and exit). Business can use the calendar immediately; it's just not public until verified.

## 8. Settings (`/tk/settings/{section}`)
Left settings nav (inside the content area, 240 px): **Biznes profili · Ýazylyş düzgünleri · Iş wagty · Hyzmatlar · Topar · Roller · Salgy we QR · Şahamçalar** (branches) · *(later: Habarnamalar, Töleg we tarif, Kömek)*.
- **Biznes profili**: logo, name, category, description per language (TK/RU/EN tabs), photos (grid, drag to reorder, first = cover, 3+ recommended), contact phone, amenities (checkbox list), address block with map preview → "Salgyny üýtget" opens the map modal; "Sahypany gör" opens the public page.
- **Ýazylyş düzgünleri**: Onlaýn ýazylyş (switch) · Tassyklama: manual / instant (radio cards) · Haýyş saklanýar: 15 min…24 h · Iň az öňünden: 0/30 min/1/2/4/24 h · Näçe gün öňünden açyk: 7/14/30/60/90 · Hyzmatdan soňky arakesme (buffer): 0/5/10/15/20/30/custom · Wagt ädimi: 15/30 min · Müşderi ýatyryp biler: … sagat öň · Ýatyrylanda sebäp sora (switch) · N gelmedikden soň onlaýn ýazylyşy ýap (0=off, 1–5).
- **Iş wagty**: weekly table (day, open switch, from–to with 30-min time pickers, + break "Arakesme" optional); **Aýratyn günler** (exceptions): list with name, dates, "Her ýyl" repeat; "Aýratyn gün goş" modal (name shown to clients when a booking must be cancelled; single date or range; yearly repeat; closed or special hours). Conflicts: if an exception overlaps bookings → warning with the count and options (keep / cancel and notify with alternatives).
- **Hyzmatlar**: catalog grouped by service category (reorder by drag), rows: name, duration, price (fixed/from/free/hidden), buffer override, who performs (avatars), onlaýn (switch); "Hyzmat goş" + "Topar goş"; service drawer: name per language, description, category, duration (5-min steps), buffer override, price type + amount, specialists (checkboxes), "Onlaýn ýazylmak bolýar" switch, delete.
- **Topar**: list (avatar, name, role, services count, schedule summary "Biznes wagty bilen" / "Öz smenasy", status Işjeň / Çagyryldy / Öçürilen); order shown to clients (drag). **Invite (3 steps modal)**: 1 Kim: phone (= login), name as shown to clients, specialization (optional), role · 2 Hyzmatlar: what this person does (group checkboxes) · 3 Barla we tassykla. **Staff drawer**: profile, services, schedule (as business / own shift per day within business hours), personal exceptions (vacation, birthday — "Diňe biznesiň içinde görünýär"), conflicts with bookings, role, "Işgäri öçür" → modal with N future bookings: **Başga hünärmene geçir** (default; pick who) / Bolşy ýaly galdyr (no new bookings) / Ýatyr we müşderilere habar ber (3 alternatives).
- **Roller**: roles list + role editor: name, visibility (own / whole calendar), permission switches (§1). Eýesi is locked.
- **Salgy we QR**: public link `yeral.app/tk/b/glow-studio` (copy, share), QR (download PNG/SVG for the front desk), "Ýazylyş düwmesi" (button code for Instagram/website — later).
- **Şahamçalar**: list of the owner's businesses/branches with pending-request badges; "Şahamça goş" → wizard.

## 9. App shell
- **Sidebar 248** (white, right 1px divider): business switcher (logo, name, branch, chevron → popover with other branches + request badges + "Şahamça goş"), nav: Senenama · Ýazylyşlar (badge = pending count, pending colours) · Müşderiler · Hasabatlar (later, disabled with "ýakynda") · Sazlamalar; bottom: Kömek, user (avatar, name, role) with menu (Profil, Dil, Müşderi hökmünde aç → yeral.app, Çykmak).
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

## 13. Open for later rounds
Analytics (staff / services / clients) · Reviews & replies · Notification settings (event × role) · Help & support chat · Billing (plans in manat, commission) · B2B landing + pricing · Table timeline & floor plan · Class schedule & attendance · Checkout/POS (MVP: revenue = prices of completed visits).
