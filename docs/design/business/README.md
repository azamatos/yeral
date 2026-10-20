# Ýeral Business — business web workspace spec (business.yeral.app)

Version: business-web v4 (rounds 4–6 + v0.6 round 2) · 20.10.2026 · canvas "Ýeral Web", page *Business workspace*
**v0.6 round 2 (§27) is the current truth** for login, setup, the app shell, the calendar, bookings and phones (English, appointments only, `/w/{slug}/…` addresses, no SMS promises). **Round 6 (§25) is the truth for the rest** where sections disagree: everything is free on MVP (no billing), one Ýeral login with several workspaces, three fixed access levels, a setting for who answers requests, status icons + legend + internal statuses, full phone web. Summary and decisions: §25.
Components: every reusable piece of these screens is catalogued in `../COMPONENTS.md` and drawn on `../screens/system/DS-Patterns.dc.html` (domain-free → `@yeral/ui`) and `../screens/system/DS-Business.dc.html` (domain → FSD entities/features/widgets). Build screens from those, and extend Storybook with them.
Read with: `../README.md` (client spec — product rules, statuses, booking types, glossary), `../CLAUDE.md`, `../tokens.css`.
Reference product: Fresha (workspaces, access levels, invites, system + custom statuses). The web app ships first and must work on phones; native business and client apps come later.

Scope: round 4 (§1–13) = **daily work** (calendar, requests, bookings, clients) and **setup & settings** (sign-up + setup wizard, profile, booking rules, hours, services, team & roles, link/QR), appointment type. Round 5 (§14–23) = analytics, reviews, notification settings, help, B2B landing, tables, classes (billing was designed, then removed from the MVP in round 6). Round 6 (§25) = login & workspaces, access levels, request handling, statuses, phones, free MVP. Only checkout/POS is still out of scope (revenue = prices of completed visits). Build order stays: appointment workspace first, then tables and classes.

---

## 1. Who uses it — accounts, workspaces, access levels (round 6)
- **One Ýeral account** = phone + SMS code, the same account people use to book on yeral.app. Login page `business.yeral.app/tk/giris` (`B-Login.dc.html`): phone → 4-digit code → (new person) name + optional photo → routing:
  - a pending **invite** → invite screen first (Kabul et / Ret et). Invites are SMS links valid **7 days**; expired → "Çakylygyň möhleti geçdi".
  - **no workspace** → "Entek iş ýeriňiz ýok": "Biznesimi döret" (setup wizard from step 2) + how to ask an owner for an invite.
  - otherwise → the **last used workspace** opens.
- **Workspace** = one business at one address (own calendar, team, clients, settings). **No branches** — a second address is another workspace. One person can belong to several workspaces with a **different access level in each** (demo: Aýna is Hünärmen in Glow Studio and Eýesi of "Aýnanyň saç studiýasy").
- **The only switch is the workspace switcher** at the top of the sidebar (list of your workspaces with your level and their unanswered requests, "+ Täze biznes döret"). The block at the bottom is the person (avatar, name, phone, "…" menu: Profilim · Dil · Müşderi hökmünde aç · Çykmak) — not a switcher.
- **Access levels** (fixed, no custom roles):

| Level | Sees / can (defaults) |
|---|---|
| **Eýesi** (one per workspace; transfer via Topar → "Eýeçiligi geçir") | everything, incl. revenue, team and permissions |
| **Administrator** | all calendars, bookings, clients, reviews (reply), analytics without money, settings; Topar view-only |
| **Hünärmen** | own column, own bookings and requests, own clients (with phone), reviews about them (read), own analytics with own earnings; no Sazlamalar |
| **Programmasyz hünärmen** | no login; bookable; owner/admin handle their bookings and requests |

  The owner can change what Administrator and Hünärmen may do in **Sazlamalar → Rugsatlar** (matrix; "own" = only their own). Anything a level can't access is **hidden, not disabled** (opening it by URL → Senenama + toast). Matrix data: `business-demo.json → accessLevels`.
- **Profilim** (from the user menu): name, photo, phone change via SMS, specialization per workspace (read-only, set by the owner), switch "Beýleki iş ýerlerimdäki wagtymy «Başga ýerde» görkez" (default on), "Bu biznesden çyk" (not for the owner).
- **Busy elsewhere:** a person in 2+ workspaces — each calendar shows her bookings from the other workspace as a **"Başga ýerde"** block without details; online booking and staff can't book her then.
- **Devices:** the web app is fully usable on phones (no "download the app" banner): under 768 a bottom tab bar (Senenama · Ýazylyşlar · Müşderiler · Köp), one-staff day calendar with staff chips, drawers as bottom sheets (`B-Mobile.dc.html`). Tablets 768–1023: 72 px icon rail.

## 2. Requests and confirmation (decided 14.10.2026)
- **Manual confirmation is the default.** Each new online booking arrives as a request (*Garaşylýar*).
- A business may switch to **instant confirmation** (Settings → Ýazylyş düzgünleri). Then online bookings arrive *Tassyklandy* and the client sees "Ýazylyş tassyklandy" immediately.
- **Hold time** (manual mode): the business sets how long a request holds the slot: 15 min, 30 min (default), 1 h, 2 h, 6 h, 24 h — never past the visit start. Unanswered → auto-cancelled (`cancelledBy: system`), client gets SMS with 3 alternative times.
- Declining asks for a reason (chips + optional text); **the client sees the reason**. Decline can attach up to 3 alternative times the client can accept in one tap.
- Requests are visible everywhere they matter: sidebar badge on Ýazylyşlar, "N haýyş" chip in the calendar header, dashed blocks in the grid, top-bar toast + sound on arrival (browser notification if allowed).
- Who can answer: Eýesi, Administrator, and the specialist themself if their role allows; requests for phone-only specialists go to owner/admin.
- **Who answers requests** (round 6, Sazlamalar → Ýazylyş düzgünleri → "Haýyşlara kim jogap berýär?", only in manual mode): **Administrator we eýesi** (specialists see their requests, can't answer) · **Her hünärmen özi** (each specialist answers their own; admin only sees) · **Ikisi hem** (default — whoever answers first). Hidden for a one-person business (the owner answers). Per-person override in the staff drawer ("Öz haýyşlaryna jogap berip biler"). Requests for Programmasyz staff always go to owner/admin. Someone who can't answer sees a read-only footer ("… siz diňe görýärsiňiz") instead of Tassykla / Ret et.


## 3. Booking statuses from the business side
Same five statuses and colours as the client site.
- **Garaşylýar** (request) → Tassykla / Ret et (decline with reason).
- **Tassyklandy** → move (drag in calendar or "Başga wagta geçir"), cancel (reason; client notified), complaint.
- **Tamamlandy** — automatic after the end time. No "came" button.
- **Gelmedi** — set through **"Arz et"** (complaint): one button instead of came/didn't-come. Reasons: Gelmedi (no-show → status Gelmedi), Gijä galdy (late), Gödek gylyk (rude), Başga. The reason goes to the client card (team-only). Booking rule: after N no-shows (default 2) a client can book only by phone.
- **Ýatyryldy** — by client / by business / by system (expired request). Hidden in the calendar by default (toggle "Ýatyrylanlary görkez").
- **Manual bookings** (made by staff for phone or walk-in clients) are created *Tassyklandy* immediately with a phone icon (source: phone) or person icon (source: walk-in "Gelip ýazyldy").
- **Icons (round 6):** every status has one icon used everywhere — Garaşylýar clock · Tassyklandy check · Tamamlandy check-check · Ýatyryldy x · Gelmedi user-x. StatusBadge = icon + label (the dot is retired, client site too). Calendar blocks start with the icon; cancelled blocks are outline-only with the name struck; requests are dashed without transparency; selection is an ink ring (never violet). A **"Reňkler we nyşanlar"** legend (circle-help button in the calendar/list/timeline toolbars) explains statuses, sources and calendar layers; it opens by itself on the first visit.
- **Internal statuses** (like Fresha's custom statuses): the owner can add up to 5 team-only markers (presets **Geldi**, **Başlandy**; name + icon + colour) in Ýazylyş düzgünleri → "Ýazylyş ýagdaýlary". Set from the booking drawer ("Içerki ýagdaý"), shown as a small chip on the block; clients never see them and they never change the system status. Off by default.


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
**Day · one staff**: same grid, one wide column, room for notes and client info in blocks. A Hünärmen always gets this view of her own column (round 6); her summary shows her own planned earnings, not the business revenue. Administrator's summary has no revenue unless "Girdejini görmek" is granted.
**Layers (round 6):** outside hours flat `#f6f6f8` · break `#f0f0f3` + coffee icon "Arakesme" · blocked/closed `#f0f0f3` + lock + reason · buffer hatching · **"Başga ýerde"** dashed `#b0b0b8` + briefcase (not clickable, slots under it refuse with a toast).
**New booking is phone-first** (most clients call): phone number field first → known client fills in (visits, alert note) → services → staff → "Iň ýakyn boş wagtlar" chips → "Ýazyp goý" (SMS switch on); name search is secondary.
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
Left settings nav (240 px; chips row on phones): **Biznes profili · Ýazylyş düzgünleri · Iş wagty · Hyzmatlar** (or **Stollar** / **Sapaklar** for table / class workspaces) **· Topar · Rugsatlar · Salgy we QR** · divider · **Habarnamalar** (§16). No branches, no billing (round 6). Kömek lives in the sidebar (§17). Hidden entirely for Hünärmen.
- **Biznes profili**: logo, name, category, description per language (TK/RU/EN tabs), photos (grid, drag to reorder, first = cover, 3+ recommended), contact phone, amenities, address block with map preview → "Salgyny üýtget" opens the map modal ("Her iş ýeri — bir salgy": a new address = "Täze biznes döret"); "Sahypany gör" opens the public page.
- **Ýazylyş düzgünleri**: Onlaýn ýazylyş (switch) · Tassyklama: manual / instant (radio cards) · **Haýyşlara kim jogap berýär?** (§2, manual mode only) · Haýyş saklanýar: 15 min…24 h · Iň az öňünden · Näçe gün öňünden açyk · buffer · Wagt ädimi · Müşderi ýatyryp biler · Ýatyrylanda sebäp sora · N gelmedikden soň onlaýn ýazylyşy ýap · **Ýazylyş ýagdaýlary** (5 system statuses locked with icon + meaning; internal statuses list + "Ýagdaý goş" modal: name ≤ 20, 8 icons, 6 token colours, preview, max 5).
- **Iş wagty**: weekly table (day, open switch, from–to, optional break); **Aýratyn günler** (exceptions) with conflict handling.
- **Hyzmatlar**: catalog grouped by category, rows (name, duration, price type, buffer override, who performs, online switch), service drawer.
- **Topar**: list with **Dereje** (Eýesi / Administrator / Hünärmen / Programmasyz), services count, schedule summary, status (Işjeň / Çagyryldy · "19 oktýabra çenli" with Täzeden iber / Çakylygy ýatyr / expired / Öçürilen). **Invite (3 steps)**: phone (= their Ýeral login), name, specialization, **access level** → services → check & send (SMS link, 7 days). **Staff drawer**: profile, services, schedule, exceptions, access level + "Öz haýyşlaryna jogap berip biler", "Işgäri öçür" (reassign future bookings); for the owner: **"Eýeçiligi geçir"** (pick an active member who logs in → they become Eýesi, you become Administrator).
- **Rugsatlar**: permission matrix (rows × Administrator / Hünärmen; Eýesi locked); cells are switches or Ýok / Diňe özüniňki / Hemmesi (Topar: Ýok / Diňe görmek / Dolandyrmak); "Haýyşlara jogap bermek" is read-only here and links to Ýazylyş düzgünleri; sticky save bar.
- **Salgy we QR**: public link, QR (PNG/SVG), "Ýazylyş düwmesi" (later).

## 9. App shell (round 6)
- **Sidebar 248**: **workspace switcher** (logo, name, your level; chevrons → popover "Iş ýerleriňiz": your workspaces with level · address and unanswered-request counts, current one checked, "+ Täze biznes döret") · nav: Senenama (or Stollar / Sapaklar) · Ýazylyşlar (amber count) · Müşderiler · Teswirler (grey count; no count for Hünärmen) · Hasabatlar · Sazlamalar (hidden for Hünärmen) · bottom: Ýeral sahypaňyz · Kömek · **user block** (avatar, name, phone, "…" → Profilim · Dil · Müşderi hökmünde aç · Çykmak → login).
- **Top bar 64**: page title, global search (clients, phone, booking ID; ⌘K), one primary action, legend button on calendar-like pages.
- **Tablet 768–1023**: 72 px icon rail (logo opens the switcher, avatar opens the user menu).
- **Phone < 768**: sidebar hidden; top strip with the switcher; bottom tab bar Senenama · Ýazylyşlar · Müşderiler · Köp; "Köp" sheet holds the rest of the nav + the user menu; toasts and save bars sit above the tab bar; drawers become bottom sheets (`B-Mobile.dc.html`).
- Content padding 32 (24 tablet, 16 phone). Toasts bottom-left (ink). Drawers right 480 with scrim only below 1280.

## 10. Data model additions
```
User        id, phone, name, photo?, busyElsewhereVisible: bool            (one Ýeral account, client + business)
Workspace   = Business (one address); no branches
Membership  userId, businessId, level: owner|admin|specialist, staffId?, status: active|invited|disabled, answersOwnRequests?: bool
Invite      businessId, phone, level, invitedBy, sentAt, expiresAt (7 days), status: pending|accepted|declined|expired
LevelPermissions businessId, level: admin|specialist, permissions{key: none|own|all|view}   (owner = all, locked)
InternalStatus id, businessId, name, icon, color, order, enabled            (team-only, max 5)
Staff       id, businessId, name, specialization?, phone, avatar?, hasApp: bool, bookable: bool, order, serviceIds[],
            schedule: inherit | {day: [{from,to}]}, breaks[], exceptions[{name, from, to, yearly}]
BookingRules businessId, onlineEnabled, confirmMode: manual|instant, requestHandling: desk|each|both, holdMinutes, leadMinutes,
            windowDays, bufferMinutes, slotStep, cancelWindowMinutes, askCancelReason, blockAfterNoShows
Booking     + source: online|phone|walkin|ai, internalNote, internalStatusId?, decline{reason, alternatives[]}, complaint{type, text}, holdUntil
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
Senenama (calendar) · Ýazylyşlar · Haýyş (request) · Tassykla / Ret et · Täze ýazylyş · Ýazyp goý (save booking) · Başga wagta geçir · Arz et (complaint) · Näme boldy? · Müşderi / Müşderiler · Bellik (note) · Bellikler · Yzygiderli (regular) · Köpden bäri gelmedik · Gelşi (visit) · Ortaça çek · Hünärmen · Topar (team) · Dereje (access level) · Rugsatlar (permissions) · Eýesi · Administrator · Hünärmen · Programmasyz · Iş ýeri (workspace) · Iş ýerleriňiz · Täze biznes döret · Çakylyk (invite) · Eýeçiligi geçir · Başga ýerde (busy elsewhere) · Içerki ýagdaý (internal status) · Reňkler we nyşanlar (legend) · Çagyr (invite) · Öçür (disable) · Iş wagty · Arakesme (break) · Aýratyn günler (exceptions) · Dynç güni (day off) · Hyzmatdan soňky arakesme (buffer) · Ýazylyş düzgünleri · Onlaýn ýazylyş · Derrew tassyklama (instant) · Sazlamalar · Barlagda (in review) · Çeşme (source): Onlaýn / Telefon / Gelip ýazyldy · Ýatda saklandy (saved) · Eksport.

## 13. Open for later rounds (now covered in round 5 below, except checkout/POS)
Analytics (staff / services / clients) · Reviews & replies · Notification settings (event × role) · Help & support chat · Billing (designed in round 5, removed from the MVP in round 6) · B2B landing + pricing · Table timeline & floor plan · Class schedule & attendance · Checkout/POS (MVP: revenue = prices of completed visits).


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
- Events: Täze haýyş · Haýyşyň wagty gutarýar (5 min galanda) · Müşderi ýatyrdy · Müşderi wagtyny üýtgetdi · Telefon/gelip ýazylyş goşuldy (by colleague) · Täze teswir · Ertirki ýazylyşlar (evening summary 20:00) · Gündelik jemleme (08:00) · Topar: çakylyk kabul edildi · Ýeral: barlag we täzelikler.
- Each row: event name, one sentence "Haçan: täze haýyş gelende derrew", channel toggles **Brauzerde · Programmada · SMS** (round 6: "Programmada" appears only once the native business app ships — on MVP: Brauzerde + SMS) (SMS only for critical events: new request when no app; costs are Ýeral's), and "Kim alýar" caption derived from roles ("Siz, administrator we haýyşyň hünärmeni").
- Quiet hours: "Gijeki dymyşlyk 22:00–08:00" (no sound/push, SMS never at night).
- Browser permission banner if not granted: "Brauzer habarnamalaryny açyň" + button.

## 17. Kömek — help (`/tk/help`)
- Search "Sorag ýazyň…", category tiles (Başlamak · Senenama we ýazylyşlar · Müşderiler · Topar we rugsatlar · Sazlamalar · Profil we iş ýerleri), popular articles list, article page (title, updated date, steps with numbered list and small inline UI illustrations — drawn as simplified boxes, "Peýdaly boldumy? Hawa / Ýok"), contact block: **Goldaw çaty** (opens a right drawer chat with Ýeral support, typical reply "adatça 10 minutda", working hours), phone, Telegram link. Context help: "?" buttons in settings open the matching article in a drawer.

## 18. Töleg we tarif — NOT in the MVP (round 6)
Everything is free on MVP: no plans, prices for Ýeral, commission, invoices or payment settings anywhere. The round-5 billing design (`B-Billing.dc.html`) is kept only on the canvas page "Later · not MVP" and is not part of this export. Business revenue from visits (Girdeji) is the business's own money and stays in analytics/calendar. Clients still pay at the place (Töleg ýerinde).

## 19. B2B landing (`business.yeral.app`, logged out)
Marketing header (Ýeral Biznes lockup, Mümkinçilikler · Nähili başlamaly · Kömek, Giriş → `/tk/giris`, primary "Mugt başla" → setup wizard). Sections: hero (drawn calendar mock with round-6 status icons), Kimler üçin (10 categories incl. restaurant/café and yoga), features (6), how it starts (3 steps), **"Mugt" band** ("Ýeral Biznes mugt" · ähli mümkinçilikler · çäksiz işgär · SMS ýatlatmalar hem mugt · kart gerek däl — no "for now", no future pricing), FAQ (6, first: "Ýeral Biznes mugtmy?" → yes), final CTA band, footer. One gradient primary per view.

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
- ~~Billing: invoice + bank transfer; commission layer~~ — removed in round 6: everything is free on MVP (§18).
- Tables and classes live in the same shell; a business with several booking types sees each section in the sidebar.
- Reviews under moderation are visible but not counted (§15). Teswirler badge = unanswered count in the neutral grey count tone (not the pending amber — reviews aren't urgent).
- Analytics: Hepde/Ýyl and ‹ › change only labels in the demo (data is September only); daily revenue in the data now adds up to the tiles (46 200 / 41 250). Service shares that don't reach 100 % get a derived "Beýleki N hyzmat" row. Chart category order: `#5a3ff0`, `#c3b6fb`, `#4429d6`, `#9d88f7` (adjacent segments stay distinguishable); every chart has a legend + text alternative. A specialist sees counts only ("Girdeji diňe eýesine görünýär"); Eksport and client lists are hidden for that role. One-service drill-down page is not drawn (rows not clickable yet).
- Notifications: SMS can be switched on only for "Täze haýyş" and "Ýeral" events; "Ses bilen" switches on the first two rows; quiet-hours/summary option ranges as drawn. Denied browser permission state is not drawn (use the banner with "Brauzer sazlamalarynda açyň").
- Help: articles come from the CMS; one sample article body is drawn. Article title is the page h1, so the top-bar title must not also be an h1 on that view. Context "?" buttons in settings open the article in a drawer (not drawn).
- Tables: a confirmed booking whose start has passed counts as seated; walk-ins use the confirmed fill + person icon; online bookings are auto-assigned the smallest fitting table (staff can change it); combinable pairs and min/max party per table size live in table settings; time suffixes follow vowel harmony ("19:30-a", "21:00-e", "20:00-ä").
- Classes: no hold timer on class requests (they use the business hold time like appointments when built); "Gelmedi belle" is enabled only after the session starts; waitlist later ("garaşýanlar sanawy ýakynda"); manual add = 1 seat, source phone, confirmed; clash checks = trainer or room overlap.
- Restaurant and yoga are no longer "ýakynda" anywhere (onboarding, settings, landing).

## 23. Design system v0.5 and Storybook (16.10.2026)
- The repo already has `@yeral/ui` (38 components) + Storybook 10 built from DS v0.3.1. Rounds 4–6 added many components and variants; they are catalogued and unified on:
  - `screens/system/DS-Patterns.dc.html` (**v0.5**) — domain-free primitives: StatusBadge with icons, StatusLegend, WorkspaceSwitcher, AccountMenu, BottomTabBar + MoreSheet, AuthCard, pills, callouts, save bar, stat tiles, charts, inputs, settings layout, overlays…
  - `screens/system/DS-Business.dc.html` (**v0.5**) — domain components: calendar (BookingBlock with icons, ScheduleLayers incl. Başga ýerde, InternalStatusChip, legend, role variants), phone-first NewBookingDrawer + QuickBookingSheet, Access & accounts (LoginFlow, InviteCard, PermissionMatrix, AccessLevelField, InviteRow, TransferOwnershipModal, ProfileDrawer), RequestHandlingSetting, StatusSettings, tables, classes, client-site cards, phone section. Billing components are retired.
  - `COMPONENTS.md` — one row per component: package / FSD place, Storybook status, states, screens, code notes; "Round 6 changes" and "Retired" lists.
- Where screens drew the same thing differently, the boards hold the canonical version. Every new component gets stories for all its states before the screens use it.

## 24. Open questions (owner)
`[SUPPORT PHONE]` and Telegram link for help · SMS provider and sender name · map provider · Turkmen copy check (owner does it during coding) · table/class-specific setup wizard · businesses open past midnight · admin panel (cms.yeral.app) for business verification, review reports, help articles and support.

## 25. Round 6 (16.10.2026) — decisions
Reference: Fresha. Screens: new `B-Login`, `B-Mobile`; reworked `B-Shell`; updated every business screen.
1. **Free MVP.** No billing anywhere (plans, commission, invoices, "Töleg we tarif", prices for Ýeral). Landing pricing → "Mugt" band; help billing category → "Profil we iş ýerleri"; Ýeral notification = "barlag we täzelikler". `B-Billing` moved to the canvas page "Later · not MVP" (not exported). Demo data keeps it under `laterNotMvp` only.
2. **Login & workspaces** (§1): one Ýeral account; login → invite / empty / last used workspace; invites by SMS link valid 7 days; workspace = one address, no branches; the workspace switcher is the only switch; the bottom block is the person's menu (not a switcher); Profilim; "Başga ýerde" across workspaces.
3. **Access levels** (§1, §8): Eýesi / Administrator / Hünärmen + Programmasyz; no custom roles; Rugsatlar matrix; hidden-not-disabled; ownership transfer.
4. **Who answers requests** (§2): Administrator we eýesi · Her hünärmen özi · Ikisi hem (default); per-person override; read-only footer for those who can't answer.
5. **Statuses** (§3): one icon per status everywhere (badge dot retired), cancelled outline-only, requests dashed without transparency, ink selection ring, "Reňkler we nyşanlar" legend, optional internal statuses (Geldi, Başlandy, custom).
6. **Phones** (§1, §9): full phone web, bottom tab bar, "Köp" sheet, phone-first quick booking (clients mostly call), no app banner. Native apps come later ("Programmada" notification channel appears then).
7. **Role views drawn:** B-Calendar / B-Bookings tweak `role` (owner · admin · specialist) and `answers` (both · each · desk); B-Analytics `role` (owner · specialist; specialist sees own earnings); B-Team `tab=permissions`, `panel=transfer`; B-Settings `statusModal`; B-Onboarding `fromSwitcher`; B-Login `step`; B-Calendar `legend`, `internal`; B-Tables/B-Classes `legend`.
8. **Demo data** (`business-demo.json`): `accounts` (Maýsa, Aýna, Gülnar, new user), `accessLevels`, `statusesV2`; Aýna busy elsewhere today 19:00–20:00; Jeren blocked 16:30–17:30 "Ýapyk · Okuw".
9. Known drift left to the boards: B-Reviews still shows dot pills for review states ("Jogapsyz", "Barlanýar") → build them as Pill with icon (DS-Patterns); tab bar class names differ between screens → use the BottomTabBar on DS-Patterns.

## 26. Round 6 · part B (17.10.2026) — business side of the client logic gaps
Answers to `docs/design-requests/2026-10-16-round-6.md`; full table `../ROUND6-ANSWERS.md`.
- **A3 Move requests:** a client's move at a manual business arrives as a request of type **"Wagt üýtgetmek"** — row in Haýyşlar ("Anna 16 · 10:00 → Şenbe 17 · 11:30", Tassyklandy badge + tag, timer, ✓/✕), drawer "Wagt üýtgetmek haýyşy" (old → new with "Görkez", fit line, "Täze wagty tassykla" / "Ret et" without offered times), calendar: the original block stays (timer, "→ Şenbe 17 · 11:30?", not draggable while open) + a dashed ghost block "Täze wagt?" holding the asked slot, linked (hover/selection ring both). Same "Haýyşlara kim jogap berýär?" rule; unanswered in the hold time → dropped, booking stays. B-Calendar / B-Bookings tweak `panel=move-request`.
- **E3 Current slot, no back-dating:** staff may start a booking at the slot containing now (11:20 → 11:15; tables 18:40 → 18:30), never earlier. New-booking drawer: switch **"Telefon jaňy / Gelip ýazyldy"**; walk-in = today, current slot, SMS off ("Müşderi ýanyňyzda — ýazylyş häzirki wagtdan (11:15) başlap biler, öňe süýşürip bolmaýar."), walk-in icon.
- **D3 Combine tables while creating:** when no free single table fits the party, the new reservation / walk-in suggests combinable pairs ("Stol 3+4 birleşdir · 8 ýer"); both tables get one linked bar ("20:30–23:00 · 3+4"). B-Tables tweak `panel=new8`.
- **E1 Midnight:** end pickers include 24:00 (days, breaks, special days); starts stay 06:00–23:30.
- **E2 Overlapping special days:** warning in "Aýratyn gün goş" ("Bu seneler «{name}» bilen gabat gelýär. Şol günler üçin «{winner}» ulanylar." + the rule); warning only; full tie → the existing day. B-Settings tweak `exceptionOverlap`.
- **F1 Verification:** banner "Sahypaňyz barlagda — häzir ony diňe siz we toparyňyz görýärsiňiz. Barlagdan soň gözlegde we salgyňyzda hemmä açylar."; setup step 8 "Salgyňyz we QR kodyňyz taýýar — barlagdan soň müşderiler üçin açylar."; visitors see "Bu sahypa entek açylmady".
- **C1:** B-Login refuses landlines with the mobile-only message (`step=phoneLandline`).
- Demo drift (design only): B-Calendar / B-Bookings count 6 requests (incl. the move request), other screens 5.

## 27. v0.6 round 2 (19–20.10.2026) — business app part 1, English
**This section wins over every older one** for login, setup, the app shell, the calendar, the bookings list and phones. Screens: `B-Login`, `B-Onboarding`, `B-Shell`, `B-Calendar`, `B-Bookings`, `B-Mobile` (English) + new patterns on `DS-Business` (sections 01, 02, 04, 09, 14). Copy: `../copy/EN-GLOSSARY.md` + `../copy/en-choices-r2-*.md`. Still Turkmen until round 3: B-Clients, B-Client, B-Settings, B-Services, B-Team, B-Notifications, B-Reviews, B-Landing. Moved to `../screens/later/` (not in the first release, unchanged): B-Analytics, B-Help, B-Tables, B-Classes (with B-Billing).

**1. Everywhere**
- **Addresses** carry no language, always the workspace: `business.yeral.app/w/{slug}/calendar` · `/bookings` · `/clients` · `/reviews` · `/settings/{section}`; sign-in `/login`; setup `/setup/{step}` (step = phone · business · address · hours · services · team · rules · done). Tab title "Calendar · Glow Studio". Switching workspace keeps the section (`/w/glow-studio/calendar` → `/w/glow-nails/calendar`); opening a workspace you don't belong to → your last used one + toast "This section is closed to you".
- **First release = appointments only**, one booking type per business. **Sidebar:** Calendar · Bookings · Clients · Reviews · Settings; bottom = the user block only (no Reports, Help, Tables, Classes). **Account menu:** My profile · Language (only when the market has several) · Your Ýeral page · Open as a client · **Contact Ýeral** (submenu: Call `[SUPPORT PHONE]` · Write on Telegram `[TELEGRAM]`) · Log out. Phone tab bar Calendar · Bookings · Clients · More; **More** sheet = Reviews · Settings + the account items.
- **No SMS at the first release.** Switches stay ("Notify the client"), but copy never says an SMS was or will be sent: "the client is notified", "the client sees the reason in My bookings". A notification goes out only after the 6 s Undo toast closes.

**2. Login and setup** (`B-Login`, `B-Onboarding`)
- Phone and code steps = the shared **SignInCodeStep** (DS-Patterns) with all its states: phone Empty · Sending · Incomplete · NotMobile · TooManyCodes; code Empty · Checking (auto-check on the 4th digit **and** a visible Confirm) · WrongCode ("Wrong code. N tries left.") · Locked (60 s) · LockOver ("The old code no longer works." + "Send a new code") · ResendReady · Resent · TooManyCodes (4th request for the same number, 15 min). **First-release variant** (tweak `codeOnScreen`): no SMS, the code shows above the boxes ("Your code: 4821"), lead "To log in with …", field label "Code".
- **Routing after the code:** invite → InviteCard; member → last used workspace ("Opening Glow Studio…"); **unfinished setup → "Continue setting up Glow Studio · Step 4 of 8 · Hours" → `/setup/hours`** (never the no-workspace card); new person → name → "You don't have a workspace yet" (+ "Create a business" and "Try the business app" → the demo workspace). Play: 62 48 15 30 = unfinished setup.
- **Continue later** on steps 1–7 once signed in (not before the code check, not on Done): saves the step; signing in again reopens it. On the phone step the footer Continue is hidden until the number is verified.
- **Categories:** appointment kinds only — Beauty (Beauty salon · Barbershop · Nail studio · Brows and lashes · Spa and massage) · Health (Dentist · Medical centre · Physiotherapy · Psychologist) · Sport (Personal trainer) · Lessons (Tutor · Language lessons · Music lessons) · Auto (Car wash · Tyre service · Car service) · Other (Pet care · Home services · Something else). No restaurants, cafés or class studios, no "Later" rows.
- **Hours:** pickers 00:00–24:00 in 30-min steps. A closing time earlier than the opening time = the next day ("until 02:00, next day" pill); 24:00 = midnight the same day; the closing list has no 00:00; equal times are an error; a break may cross midnight inside an overnight day. (Replaces round 6 E1 "past midnight undesigned".)
- **Rules:** free cancel = Any time · Up to 1 h · 2 h · 6 h · 12 h · 24 h · 48 h before (same list as Settings); confirmation cards show what the client sees (Pending / Confirmed badge); hold caption adds "The time counts only while you're open."; "Who answers requests?" only with a team and manual confirmation.
- **Team:** access level **Admin · Specialist** (Owner is you). A Specialist has **"Uses the app"** (on by default). Off = bookable at once, never signs in, the owner and admins handle their requests. Admins always use the app. **A mobile phone number is required for everyone** ("They can start using the app later with this number."). The phone-only "Specialist (no app)" level is gone everywhere.
- **Invites** are created at Done ("Send invites") for admins and app-using specialists; valid **7 days**; the person sees it when they sign in with the invited number ("They'll see the invite when they sign in with +993 65 •• •• 10 · valid 7 days"). InviteCard (B-Login): workspace, who invited, level, masked number, Accept · Decline (inline confirm "Decline the invite?" → no-workspace card "You declined Glow Studio's invite."), expired state.
- From the switcher ("Create a business"): starts at step 2, step 1 shows as "Account" (done, locked), step 2 footer "Cancel" back to the calendar.

**3. App shell** (`B-Shell`)
- **My profile** drawer: no busy-elsewhere switch (busy elsewhere is automatic and never shows details). Phone change uses SignInCodeStep.
- **Leave this business** (not for the owner): "Leave Glow Studio?" → the owner (and admins who manage the team) get **"Aýna left: 4 upcoming bookings need a new specialist"** — toast with "Choose" (stays until opened) + notifications item (stays until all bookings are settled) → **"Who takes Aýna's bookings?"**: Move to another specialist (default, "To" lists only people who do these services) · Keep them (no new bookings for her) · Cancel and offer 3 other times; **AffectedBookingsList** shows each booking, its status and result; a booking nobody else can do gets its own row choice. Footer Close · Save. Team status after leaving: "Left".
- **Business status banners** (one at a time, under the top bar, no dismiss, `role="status"`): **In review** "Your page is in review — only you and your team can see it. After the review it opens in search and at your link. You can use the calendar now." · **Not approved** (danger) "Your page wasn't approved: {reason}" + "Fix and send again" (opens the settings section the reason points to; saving sends it back to review) · **Demo** "This is a demo workspace. Changes reset every night." + "Create your business"; the demo workspace carries the ExampleBadge (in the 240 px sidebar on the access-level line, in switcher lists after the name).

**4. Calendar** (`B-Calendar`, same on `B-Mobile`)
- **Busy elsewhere** = plain reserved block (#f6f6f8, 1 px #e6e6ea, label "Busy elsewhere" 12/16 n-600; no icon, never a business, service or client) covering a confirmed booking or waiting request in another workspace **plus its buffer** (demo: Aýna 19:00–20:00 + 10 min). Not clickable, nobody can book it; a click under it → toast "Aýna is busy elsewhere 19:00–20:00. Pick another time." ("You're busy elsewhere …" for the person herself). The server must refuse such bookings too.
- **Empty slot click → menu "New booking" · "Block time"** (phone: bottom sheet; the round + still opens New booking). **Block time** (modal 400): Person (column preselected; a Specialist can block only her own time, read-only), date + From–To (15-min steps, prefilled from the slot, never in the past), Reason chips Training · Break · Personal · Other (+ text), Repeat Doesn't repeat · Every day · Every week + Until (caption "Every Wednesday from 14 October to 30 November · 7 times"). Same rights as adding bookings. **A block can't cover a booking** — every repeat up to the end date is checked; error names the first hit: "This time has a booking: 15:30–16:30 Ejegyz T. · Women's haircut. Pick another time or move the booking first." + "Open the booking". Saved → closed layer "Closed · Training" (lock; Other → "Closed · {text}"), toast "Time blocked: …".
- **Internal statuses** stay (Arrived, Started; off by default).
- **Request timer counts only while the business is open.** Open: running pill ("18 min", hot ≤ 15 min). Closed: "by 09:30" on the block, "By 09:30 tomorrow" in lists, drawer "Answer by 09:30 tomorrow" + "The timer counts only while you're open, so it waits until 09:00…" (demo: Mähri G. at 20:40, closed at 20:00, hold 30 min). Tweak `clock=evening`.
- **Report** (menu on the booking drawer, "Report…" in the bookings row menu): **No-show** only from the visit's start time (also on Completed bookings); **Came late · Rude behaviour** save at once; **Other…** opens "What happened?" (text required). Report box in the drawer with **"Remove report"** for 7 days ("The client isn't told. You can remove it until 21 October."); removing a No-show returns the booking to Completed (Confirmed if the visit hasn't ended) and lifts the phone-only restriction if that report caused it.
- Staff column header: the amber request count sits on the name line.

**5. Bookings** (`B-Bookings`): bulk bar **Confirm · Decline · Export CSV** (bookings move one at a time; Export hidden for Specialists); timer and report rules as §4.

**6. Demo data** (`demo-data.json` → `v06r2`): clock Wed 14 October 11:20 (evening variant 20:45), Glow Studio 09:00–20:00 (Sun 10:00–18:00); Jeren's block 16:30–17:30 Training weekly until 30 November; Maral's block-time example 14:30–15:30; Mähri G.'s late request; Aýna leaves (b03, b05, b06, b18; Gülnar assumed accepted; Hair colouring has nobody); invite Gülnar Öwezowa, Specialist, by Maýsa Annaýewa, until 21 October, "+993 64 •• •• 90"; not-approved reason "Add at least 3 photos of your place — the current photos don't show it."; requests = 6 on every round-2 screen.
