# Design export changelog (`docs/design/`)

Newest first. Each export replaces this folder; this file says what changed and what it means for the code.

---

## v0.6 · round 3 — 20.10.2026 · business app part 2 in English + fixes to rounds 1–2

**Scope:** the rest of the business app is now **English** — clients, client card, team & permissions, settings, services, reviews and the B2B landing — on the round-2 shell, plus the owner's fixes on the round-1 and round-2 boards. Everything from round 2 still holds. Every decision is written up in `business/README.md` **§28** (it wins over §27 and older sections where they disagree). Tokens stay v0.5, no new colours. The client site is untouched (rounds 4a / 4b).
**Owner's answers to the round-1/2 questions:** resend = **"Get a new code"** everywhere · locked / rate-limited code step keeps Confirm and resend hidden · Example badge line "This isn't a real business. It's here so you can try Ýeral: bookings are confirmed at once, and nobody waits for you." · **one language at the first release** (English): no language tabs, no main-language choice, no Language row, no EN · TK · RU on login pages; later a business picks its main language in Business profile and missing texts show in it · Contact Ýeral keeps `[SUPPORT PHONE]` / `[TELEGRAM]`.
**Copy sources:** `copy/EN-GLOSSARY.md` (§6 = round-3 updates) and the full logs `copy/en-choices-r3-login-shell.md`, `-calendar.md`, `-onboarding-settings.md`, `-clients.md`, `-team-services.md`, `-reviews-landing.md`, `-ds.md`, `-mobile.md`, `-ds-business.md` (every wording with where and why, aria labels, sample data, and each board's "Consistency pass").

### Boards changed
| Board | Frame | What changed |
|---|---|---|
| `business/B-Clients` · `/w/{slug}/clients` | page 1440 × 1120 | **English (new this round).** Owner / Admin / Specialist views (`role`), tags New · Regular · Lapsed · Reported · Phone only, Average check column (owner), no bulk bar / checkboxes / Export, empty state, add-client modal, delete allowed / blocked. Tweaks `role`, `filter`, `modal` (none · add · delete · deleteBlocked), `empty`, `banner` |
| `business/B-Client` · `/w/{slug}/clients/{id}` | page 1440 × 1720 (was 1680) | **English.** Visits · Average check · Last visit · No-shows, Upcoming with waiting requests + timer, Reports list with Remove report, Phone only switch states, Ýeral-account read-only phone, delete blocked / allowed, specialist view + no-access state. Tweaks `role`, `client` (regular · phoneOnly · request · noAccount), `edit`, `composer`, `modal`, `banner` |
| `business/B-Team` · `/w/{slug}/settings/team`, `/permissions` | page 1440 × 1440 (was 1400) | **English.** Uses the app ("Doesn't use the app", invite on switch-on), Invites section (Copy invite link, Invited · Expired · Declined · Cancelled, errors), remove member + AffectedBookingsList, Left / Removed, shift and time-off over bookings, Team banner "Aýna left…", **read-only permissions table**, no transfer. Tweaks `tab`, `panel` (none · staff · invite · inviteError · remove · reassign · shift · timeOff · usesAppOn), `aynaLeft`, `role` (owner · admin), `banner` |
| `business/B-Services` · `/w/{slug}/settings/services` | page 1440 × 1440 | **English.** Price types Fixed · From · Free · Price at the place, one-language fields + `languages` variant, delete with bookings (modal) / without (Undo), "Doesn't use the app" tag, s12 Bridal hair styling. Tweaks `drawer`, `modal`, `languages`, `role`, `banner` |
| `business/B-Settings` · `/w/{slug}/settings/{section}` | page 1440 × 2320 (was 2720) | **English.** Nav Business profile · Booking rules · Hours · Services · Team · Permissions · Link and QR (chip row on phones); photos, city + pin, Pause online booking, close via Contact Ýeral, booking rules with "The business answers by 15:10" preview, hours 00:00–24:00 + next day + after-midnight error + AffectedBookingsList on save, Link and QR states. Tweaks `pane`, `dirty`, `languages`, `photos`, `overnight`, `exceptionModal`, `exceptionOverlap`, `statusModal`, `affected`, `linkState`, `demo`, `role` |
| `business/B-Reviews` · `/w/{slug}/reviews` | page 1440 × 4480 (was 1980) | **English.** Names = first name + initial, service · specialist on every review, stars-only reviews, "5.0 (1)" summary, 20 per page + Show more, "Ýeral is checking · not counted in your rating" + cleared / removed / no decision, specialist read-only view, no "Average reply time". Tweaks `role`, `filter`, `composer`, `report`, `moderation` (none · checking · cleared · removed · noDecision), `first`, `empty`, `banner` |
| `business/B-Landing` · `business.yeral.app` | page 1440 × 4020 | **English.** "Ýeral Business", no language picker, hero **Start free** + **Try the business app** (demo note), appointments only, FAQ without card payment / prepayment / SMS, free band, Contact Ýeral, "How to start" link. Tweak `menu` |
| `business/B-Login` | page 1440 × 1160 | Code on screen is the default (tweak **`sms`** replaces `codeOnScreen`), "Get a new code", 5 codes / hour → "Too many codes. Try again in 42 minutes.", no EN · TK · RU, invite card with the city, "Back · Decline invite", "Try the business app" also on the signed-out page |
| `business/B-Onboarding` | page 1440 × 1100 | Same sign-in fixes (`sms`), no language switcher, City select on the address step, after-midnight error (`overnight` = off · on · error), "Link and QR", "60 min", "sign in" captions |
| `business/B-Shell` | board 1600 × 8840 (was 8300) | No top-bar search, no Language row, "access level · city" rows, signed-out demo sidebar, **notification-permission banner** (+ blocked), read-only permissions table (13 rows), no transfer (owner can't leave), someone-left = owner only, 4 bookings + 1 request, toast + Team banner (no notifications list), "Keep it" default |
| `business/B-Calendar`, `B-Bookings` | pages 1440 × 1360 / 1320 | Round-3 report rules (`panel` + `report-added`, B-Bookings `report-past`), money rule, Gülnar as a 5th column, s12, shell fixes, legends, "60 min", " · ", "Cancel booking", demo facts, "6 requests · most urgent first", "Export CSV"; bug fixes (empty Answer column on list tabs, break/closed icons, banner class) |
| `business/B-Mobile` | board 1696 × 7397 (was 5260) | 23 phone frames: the 15 old ones on round-3 copy + **9 clients list · 9b / 9c client card · 10 Settings (chip row + save bar) · 11 Team · 11b member sheet · 12 Reviews · 13 landing at 390**; sheets max 92 %, radius 16 |
| `system/DS-Business` | board 1440 × 80 700 (was 79 200) | §9 fixes + new patterns (§10): client rows and header with average check, reports list, delete-client, invite row, read-only permissions table, shift / time-off / hours AffectedBookingsList, photo uploader, address with city and pin, Link and QR states, service delete, reported-review states, notification banner, Team "Aýna left" banner, landing hero; sections 08 Analytics, 11 Tables, 12 Classes removed (Later) |
| `system/DS-Patterns` | board 1440 × 40 500 (was 38 800) | Average check back (owner; admin = hidden value), no SMS promises, SignInCodeStep first-release default + `sms` variant, ExampleBadge line, LocalizedField one / several languages, first-release shell samples, legends, words; later-only primitives tagged "Later" |
| `system/Main` (Foundations), `DS-Components`, `DS-Booking` | 1440 × 5520 (5400) · 5340 (5280) · 2960 | Voice: no average bill = only the restaurant's expected bill, "Later? Not drawn", "No SMS promises", one language; Components: five-item sidebar + city, Confirm · Decline · Export CSV, no language popover, table sample on the business data; Categories: seats, table card without "Menu · Price at the place" |

### Boards moved (unchanged, Turkmen)
`B-Notifications` → canvas page **"Later · not MVP"** and `screens/later/` (notification settings, quiet hours and summaries come later). The first release has the browser-notification banner on the shell instead.

### Components added
- **ClientsEmptyState** — B-Clients, DS-Business 03 — Owner / Admin (+ secondary "Add client") · Specialist (text only).
- **ReportsList** (replaces ComplaintRow) — B-Client, B-Mobile 9c, DS-Business 03 — No-show · Came late · Rude behaviour · Other (+ text); booking line, "Reported … · who", "Remove report" + "until …" for 7 days; empty.
- **DeleteClientModal** — B-Clients, B-Client, DS-Business 03 — allowed · blocked by bookings · by a request · by both (rows link to the booking or request).
- **ClientPhoneField** read-only + "Ýeral account" pill — B-Client, DS-Business 03 — read-only (lock + caption) · editable (incomplete-number error).
- **ClientSettingsAside** — B-Client, B-Mobile 9c, DS-Business 03 — Phone only switch, How they found you, Birthday, Delete client; Specialist variant "Details".
- **Client no-access state** — B-Client — Specialist opening another specialist's client.
- **InviteRow + InviteMenu** (own "Invites" section) — B-Team, DS-Business 04 — Invited (days left) · Expired · Declined · Cancelled; Copy invite link; Resend / Cancel / Remove; the three errors.
- **FormerMemberRow** — B-Team, DS-Business 04 — Left · Removed.
- **StaffTimeOffRow / TimeOffList** + add-time-off form — B-Team, DS-Business 04 — list · empty · form · date error.
- **ShiftAffectedBookings / TimeOffAffectedBookings** (AffectedBookingsList modal) — B-Team, DS-Business 04 — Keep them · Cancel and offer 3 other times.
- **HoursAffectedBookings** — B-Settings, DS-Business 05 — Keep them (default) · Cancel and offer 3 other times; requests with timers.
- **UsesAppSwitch pending-invite box** — B-Team (Access level tab), DS-Business — on · just turned on · invited · turning off.
- **ServiceDeleteConfirm** — B-Services, DS-Business 04 — with upcoming bookings (modal, toast without Undo) · without (Undo toast).
- **PhotoManager states** — B-Settings, DS-Business 05 — uploading · too big · wrong type.
- **BusinessAddressField** (City select + draggable pin) — B-Settings, DS-Business 05; City select also on B-Onboarding's address step.
- **PauseOnlineBooking** + paused preview card — B-Settings, DS-Business 05 — off · on.
- **CloseWorkspaceRow** (Contact Ýeral) — B-Settings (owner only), DS-Business 05.
- **Not-approved reason box** — B-Settings (top of Business profile) — reason + "Send again" + "Go to photos".
- **LinkStateBox** + **PageLinkField** + **QrCard** (replace QrPoster / VerificationStatus) — B-Settings, DS-Business 05 — Live · In review · Not approved · Hidden by Ýeral.
- **Lateness "Fixed" row** — B-Settings Booking rules.
- **`languages` variant** (Main language select + EN · TK · RU tabs) — B-Settings (About), B-Services (drawer), DS-Patterns LocalizedField — one (default) · several.
- **ModerationLine** — B-Reviews, DS-Business 06 — Checking · Cleared · No decision.
- **ReviewRemovedNotice** — B-Reviews, DS-Business 06.
- **ReviewItem StarsOnly · ReadOnly** — B-Reviews, DS-Business 06.
- **ReviewsPager** ("Show more" + "Showing 20 of 97") and empty states NoReviews (+ Specialist) · AllAnswered · NoMatch — B-Reviews.
- **NotificationPermissionBanner** — B-Shell, DS-Business 07 — ask ("Allow") · blocked (closable).
- **StaffLeftTeamBanner** — B-Shell, B-Team, DS-Business 07 — owner only, until settled.
- **PermissionsTable** (fixed, read-only, 13 rows; replaces PermissionMatrix) — B-Shell, B-Team (stacked under 768), DS-Business 09.
- **DemoSidebar** (signed-out demo: logo, "Glow Studio", ExampleBadge, "Ashgabat", "Log in") — B-Shell, every business board via `banner: demo`, DS-Business 09.
- **LandingHero · LandingHeader · DemoNote** — B-Landing, B-Mobile 13, DS-Business 10 — desktop · phone · phone menu (`menu`).
- **TimeRangeField NextDay** pill (moon icon) + after-midnight error — DS-Patterns 05; used by B-Onboarding, B-Settings (hours + special-day modal), DS-Business 05.
- **B-Mobile phone pieces:** page header, ClientRow, client card, Settings chip row, floating save bar, TeamRow, member sheet, Reviews frame, landing at 390 (frames 9, 9b, 9c, 10, 11, 11b, 12, 13).
- **Smaller:** keyboard reorder on drag handles + Settings save bar (B-Team, B-Services); toast with a second action "Copy invite link" (B-Team); specialist-filter bottom sheet under 768 (B-Reviews).

### Changed
- **Now English:** B-Clients, B-Client, B-Team, B-Services, B-Settings, B-Reviews, B-Landing (the six app boards on the round-2/3 shell).
- **Shell on every business board:** no top-bar search (lists keep theirs; phone Bookings header icon = the list's search), no Language row, switcher rows "access level · city", demo = signed out (DemoSidebar, "Log in", Demo banner).
- **SignInCodeStep / LoginFlow** (B-Login, B-Onboarding, B-Mobile, DS-Business, DS-Patterns): first-release copy is the default; tweak `sms` replaces `codeOnScreen` / `firstLaunchCode`; rate-limited step works like the lock (boxes off, code, Confirm and resend hidden); LanguageSwitcher removed from B-Login, the wizard and AuthCard.
- **ReportMenu** (B-Calendar, B-Bookings incl. row menu, B-Mobile, DS-Business): round-3 rules; types already reported aren't offered again (Other can repeat). **ReportBox** → a list, one "Remove report" per row. **ReportBookingModal → ReportOtherForm** (reason chips gone; Other only, text required).
- **StaffColumnHeader:** name + "Doesn't use the app" pill on line 1, "6 bookings · 1 request" on line 2; speciality moves to the one-specialist header (round-2 count next to the name undone).
- **Money by role** (every board): prices are booking information — everyone who sees a booking sees its price (Admin included; Specialist her own bookings); **See revenue** covers only sums (revenue lines, client totals, average check) — Owner; the Specialist keeps her own earnings line.
- **ClientRow:** no checkboxes, bulk bar or Total; "Average check" column (Owner only, removed for others); system tags first, then custom; tags wrap; next booking + RequestHoldTimer; row menu + Delete client; pager follows the page count.
- **ClientHeader / ClientStats:** Visits · Average check · Last visit · No-shows (4 tiles Owner, 3 without See revenue); Change hidden for the Specialist. **UpcomingBookingRow:** Pending + timer for requests; booking price for everyone who sees it, totals only with See revenue.
- **Phone only switch** (ClientBookingRestrictions): idle · on by itself · on by hand · switched off; Delete client moves to the aside.
- **StaffStatus:** + Declined, Cancelled, Left, Removed; − Turned off. "Turn off" / "Reactivate" → **Remove from the team**.
- **RemoveStaffModal + AffectedBookingsList** (B-Shell, B-Team, DS-Business): one-line rows ("Today · 11:30–13:30" + "client · service"), StatusBadge + timer, "To" lists only people who do the service, own row choice for a booking nobody else can do; the brief's 4 bookings + 1 request; modes remove · someone left.
- **AccessLevelField:** owner box without transfer; select lists Admin · Specialist only. **InviteStaffModal** → "Add a team member" (3 steps, mobile numbers only).
- **Services:** price type "Hidden" → "Price at the place" (no amount); durations "60 min", "1 h 30 min", "2 h"; staff tag "Doesn't use the app".
- **OpeningHoursRow:** next-day pill + "Closes after Tuesday opens. Pick an earlier time."; B-Onboarding `overnight` = off · on · error; B-Settings pickers 00:00–24:00 (were 06:00–24:00).
- **SettingsNav:** Business profile · Booking rules · Hours · Services · Team · Permissions · Link and QR (chip row on phones); Booking rules' Online booking switch → Pause in Business profile; client preview with a clock-time deadline.
- **RatingSummary:** no "Average reply time"; Pill L with icons ("Not answered · 4" as a filter button, "All reviews answered"); uncounted line; shown from the first review; hidden for the Specialist. **ReviewItem** names service · specialist; "…" menu hidden when empty. **ReportReviewModal:** Back → Cancel, quote with service · specialist, caption adds "isn't counted in your rating".
- **B-Landing:** language picker gone; hero secondary → "Try the business app" + DemoNote; tiles Restaurant, Yoga → Spa and massage, Personal trainer; features SMS reminders, Reports → Reviews, Link and QR; free-band SMS item → "On a computer or a phone"; FAQ contact rows; footer "Contact Ýeral" column; nav "Questions" replaces Help.
- **B-Onboarding:** City select on the address step; Done "Your page link" → "Link and QR"; team-step caption on fixed access levels; "Try the business app" line on the signed-out phone step.
- **B-Mobile:** 8 new frames; old frames on round-3 copy (login, code, top bar, requests, report sheet, No-show sheet, switcher, More, legend); More tab current on Reviews / Settings; sheets max 92 % with radius 16; DS select chevron; tags with a border.
- **DS-Patterns:** StatTile average check back (Admin = hidden value); TimerPill closed "By 09:30"; StatusLegend timer rows; first-release AccountMenu, MoreSheet, SideNav / Rail, AppTopBar, SettingsLayout samples; "Cancel booking", "Discard", "Delete client"; bulk bar Confirm · Decline · Export CSV; OptionCard in the owner's words; ExampleBadge line; "Later" tag on Charts (except RatingDistribution), MessageThread, FeedbackPrompt, ToggleChip, NumberChips limit, Kbd; `lang="en"`, aria "QR code".
- **DS-Components:** sidebar = five items + city; bulk-bar actions; language popover and top-nav language button removed. **DS-Booking:** seats; "Statuses and confirmation". **Foundations (Main):** two Voice rows, average-bill caption narrowed to the client site, one-language row, format strip.
- **Calendar & bookings data:** Gülnar Öwezowa is a 5th specialist (Stylist, today 12:00–20:00, 0 bookings; day view 5 × 226 px columns, week view, filters, Block time, New booking); service s12 **Bridal hair styling** (Hair, 2 h, Price at the place, Aýna — the client site's s12) → 12 services in 4 groups everywhere.

### Retired
- DS-Business sections **08 Analytics, 11 Tables, 12 Classes** (rows kept in `components-domain.md` as Later).
- **Notification settings** (NotificationEventRow, ChannelToggle, ChannelLegend, QuietHoursWarning), the StaffLeftNotification list item and the Settings nav "Notifications"; B-Notifications moves to "Later · not MVP".
- **PermissionMatrix · PermissionCell · PermissionsSaveBar** ("The owner changes cells").
- **TransferOwnershipModal** (+ menu item, owner-box caption, "You're an admin now").
- **BookingConflictBox** (inline, with a money sum) · **DisableStaffOptions** ("Any free specialist") · StaffStatus "Turned off" · reactivate.
- The **"Specialist (no app)"** leftovers on B-Team (select option, hints, statuses, footnote).
- **ComplaintRow** (→ ReportsList); client **bulk bar** (Send SMS, Export), row checkboxes, Total column; the **"Don't send reminder SMS"** switch.
- **WorkspaceSwitcher demo row** ("Owner · demo workspace"); **Language** rows (AccountMenu, MoreSheet); **top-bar global search** (+ ⌘K) and the phone header search; LanguageSwitcher on B-Login, the wizard, AuthCard, DS-Components and B-Landing.
- Reports, Help and "Your Ýeral page" in the sidebars of the redrawn boards.
- Roles editor block · QrPoster "Download SVG" · VerificationStatus · CategoryInfo (tables notice) · restaurant, café, fitness and yoga categories · "Per person → Team" link · "Booking button · soon" · Share by SMS · `yeral.app/tk/…` link · the address modal · the Online booking switch in Booking rules.
- ReportBookingModal reason radios · ReviewItem Anonymous · RatingSummary "Average reply time" · dotted review badges.
- Personal yearly special days (StaffExceptionRow → **StaffTimeOffRow**).
- From the DS-Patterns drawing: GlobalSearch, HelpSearch, PeriodNavigator sample, Checklist Unlocks, floor-table ring, support-chat drawer header, help-category tiles, composer attach, SoonTag nav-item and disabled-action samples.
- DS-Booking table card's "Menu · Price at the place" row.
- Tweaks `codeOnScreen` / `firstLaunchCode`; "Send a new code"; "SMS code" as the default label.

### English choices the brief didn't cover
aria labels and sample data: see `copy/en-choices-r3-*.md`.
- **Login & setup:** "No business yet? Start free or try the business app" · "Here's a new code." · invite card line "Beauty salon · Ashgabat" · "Owner · Ashgabat" / "Specialist · Ashgabat" (Opening… line, switcher rows) · "Want to look around first? Try the business app — a demo workspace, no sign-in needed." · hours caption "The part after midnight must end before the next day opens." · team step "Access levels are fixed at the first release. See what each one can do in Settings → Permissions." · "City" · from home "Beauty salon · Ashgabat · approximate area shown".
- **Shell:** toast "New request: {client} · {specialist} · today · 15:30" · owner box "You're the owner of Glow Studio, so you can't leave it. To close this workspace, contact Ýeral." + "Contact Ýeral" · leave "Your 4 bookings and 1 request stay with the business — the owner will choose who takes them." · remove lead "She has 4 bookings and 1 request." · list label "4 bookings · 1 request" · permissions header "What".
- **Calendar & bookings:** client line "12 visits · average check 145 TMT" · legend "The client didn't come — marked with Report from the visit's start" · report captions "The booking becomes No-show · counts towards Phone only" · "The booking doesn't change" · Other form "Saved to the client's card; only the team sees it. Only no-shows count towards Phone only." · report box "Report" / "Reports" · row "Came late · today · 11:15 · {who}" · "The client isn't told. You can remove it until 21 October." / "The client isn't told. You can remove each report for 7 days." · "Sent · Today · 20:40" · pill "By 09:30" · "Massage therapist · doesn't use the app" · staff header "6 bookings · 1 request", one-specialist "Stylist · 6 bookings · 1 request" · Block time "+ 60 min" · phone Report sheet footnote "No-show and Came late appear here from 11:30, when the visit starts." (B-Mobile) · requests caption "6 requests · most urgent first" · empty requests "Every request is answered. New requests show up here." · toolbar "Export CSV" · New booking total "2 h · Price at the place" / "… from 250 TMT + price at the place".
- **Clients · list:** "148 clients · 9 new this month" / "41 clients · everyone who has a booking with you" · last-visit sub-line "No-show" · "Name or phone number" · row menu "Open the client's card · New booking · Copy number · Delete client" · "No clients found" + "Type the full number or add a new client." · "No clients with this tag yet." · "You see only clients who have a booking with you." · "1–12 of 148" · "Regular · 38 clients" · "3 clients found" / "1 client found" · "Clients show up here after their first booking — online or one you add." / "Clients show up here after their first booking with you." · toast "Number copied · {number}".
- **Clients · new and delete:** "New client" · "For example: Aýgözel" · sources "Instagram · A friend recommended · Ýeral · Walked past · Other" · tags "VIP · Child · + Tag" · "For example: Student" + "Add" · "New, Regular, Lapsed and Reported are set by themselves." · "Note for the team" · "For example: can only come in the evening" · "Allergies, habits, a favourite specialist — the whole team sees it, the client doesn't." · "Save" · "Save and book" · "This number belongs to {client} — open the card" · "Client added · {name}" · "{client} is removed from your clients, with the team's notes. Past bookings stay in the calendar without the client's name. You can't undo this." · "Delete client" · "Client deleted · {client}" · "Can't delete this client yet" · "{client} has 2 upcoming bookings. Cancel them first — then you can delete the client." · "… has 1 waiting request. Decline it first — …" · "… has 1 upcoming booking and 1 waiting request. Cancel the booking and decline the request first — …" · "Close".
- **Clients · card:** back link "Clients" · pill "Ýeral account" · "Change" · "Client details" · "Changes saved" · stats "total 1,740 TMT" · "From completed visits" · "28 Sep" + "Hair colouring · Aýna" / "No-show · Jeren" · "Today and 21 Sep" · "Notes" · "Add note" · "No notes yet. Only the team sees notes." · "Note added" · "Upcoming" · "2 h · 250 TMT · Online" · "No upcoming bookings." · "History" + "13 bookings" · "Show less" · "Other · "{text}"" · "Reported today · 10:25 · {who}" · "until 21 October" · "The client isn't told. You can remove each report for 7 days." · "No reports." · "Report removed" · "Report removed · the booking is Completed again · online booking is back" · Phone only "The client can book only by calling you. Turns on by itself after 2 no-shows." · "Turned on by hand — online booking is off for this client" · "Phone only is on · online booking is off for this client" / "Phone only is off · online booking is back" · "Client settings" / "Details" · "This client isn't in your list" + "Back to clients" · h1 "Client" · titles "Clients · Glow Studio" / "Client · Glow Studio".
- **Team · list:** "Clients see specialists in this order." · "Name · Access level · Services · Hours · Status" · "Invites" + "Each invite works for 7 days. They join when they accept it." · "No longer on the team" + "Their past bookings and reviews stay" · "Active · Invited · Expired · Declined · Cancelled · Left · Removed" · "5 days left" / "1 day left" · "ended on 13 October" · "on 12 October" · "today" · "works without the app until they accept" · "Resend invite" · "Cancel invite" · "Remove" · "Edit · Hours and time off · Access level · Remove from the team" · "Drag a specialist by the handle, or use the arrow keys on it, to change the order clients see." / "The owner sets the order clients see." · "You can change people's services, hours and time off. Only the owner adds and removes people and changes access levels."
- **Team · member drawer:** "Profile · Services · Hours · Access level" · "Name clients see" · "Clients see: Jeren · Beautician" · "Full name (optional)" · "Only your team sees it." · "Specialization (optional)" · "For example: stylist, colourist" · "This is their Ýeral login. They change it themselves in My profile." / "Required. They can start using the app later with this number." / "The invite is for this number." · "Only the owner changes names, phone numbers and access levels." · "What does {name} do?" · "Clients see {name} only for these services." · "{Name} doesn't take bookings now. Pick services and clients can book {Name} too." · "All" · "Working hours" · "Business hours — Works whenever the business is open" · "Own shift — Set hours for each day" · "Day off" · "The business hours come first: when the business is closed, a shift doesn't open bookings." · "Clients can't book {name} on these days." · "No time off planned." · "Add time off" · "To (optional)" · "Note (optional)" · "For example: family trip" · "Only your team sees the note." · "The end date can't be before the start date." · "4 days" · "Owner — every permission, including the team. One owner per workspace; the owner can't leave it."
- **Team · Uses the app and invites:** "Signs in with {masked}." · "Saving creates an invite. They'll see it when they sign in with {masked} · valid 7 days. Until they accept, they work without the app." · "The invite is waiting for {name}. Turn this off to cancel it." · "Saving cancels the invite. {name} keeps working without the app." · "Saving turns this off: {name} stays bookable but can't sign in." · "Works without the app until they accept. Their bookings stay with them." · "… · until 21 October · 7 days left" · "{name}'s requests go to you and the admins. The permissions don't apply — {name} never signs in." · "Admins always use the app." · "Mobile number" · "Required for everyone — it's how they sign in." · "Optional for an admin — pick services and clients can book them too." · "No services selected yet" · review rows "Mobile number · Name · Specialization · Access level · Uses the app (Yes / No) · Services (None)" · "They'll see the invite when they sign in with {masked}. It works for 7 days — until 21 October. You can also copy the invite link in Team and send it yourself." / "{name} can be booked at once and never signs in. You and the admins handle their requests." · "Send invite" / "Add to the team".
- **Team · modals and toasts:** "Remove {name} from the team?" · "{name} loses access to Glow Studio, and clients can't book {name} any more. Past bookings and reviews stay." · "Remove {name}" · "{person} doesn't do {service}" · "3 bookings and 1 request fall outside Jeren's new shift" · "New shift: Mon–Sat 12:00–19:00, Sun day off. These were booked before the change." · "Jeren has 3 bookings during this time off" · "Time off · 9–13 November. These were booked before." · "They stay in the calendar as they are — Jeren comes in for them." · "Clients can't book Jeren on these days either way." · "Permissions work by access level — give each person a level in Team." · "Specialists who don't use the app never sign in, so the table doesn't apply to them." · toasts "Invite link copied — send it to {name} in any messenger" · "Invite sent again · valid until 21 October" · "Invite sent to {name} · valid until 21 October" · "Invite cancelled · {name} can't accept it any more" · "Invite removed" · "{name} added to the team · clients can book {name} now" · "{name}: changes saved" · "Invite created for {name} · valid until 21 October · {name} works without the app until they accept" · "Invite cancelled · {name} keeps working without the app" · "{name} no longer uses the app · you and the admins handle {name}'s requests" · "Aýna removed from the team · 4 moved to Gülnar Öwezowa, 1 kept as it is · the clients are notified" · "Aýna's bookings are settled · …" · "{name}'s shift saved · 4 bookings kept as they are" / "… cancelled — each client picks a new time in My bookings" · "Time off added: 9–13 November · 3 bookings kept as they are" · "Time off removed · 28–31 December" · "Order saved · clients see the specialists in this order".
- **Services:** "12 services · 4 groups. Clients see them in this order." · "Add group" · "Add service" · "New group name" · "For example: Beard, Waxing" · "Clients see the group as a section on your page. A new group goes to the end of the list." · "Add a service here" · "Delete group" · "Move or delete its services first" · "Edit" · "Hide from online booking" / "Open for online booking" · "Delete service" · "no buffer" · "Drag a service or a group by its handle, or use the arrow keys on it, to change the order. Services with online booking off don't show on your page — you add their bookings yourself." · "Edit service" / "New service" · "Goes to Hair" · "Description (optional)" · "What's included and how to get ready" · "Group" · "Duration" · "Buffer after the service" · "As in Booking rules · 10 min" · "No buffer" · "The specialist stays free for this long after the service — to clean up and get ready. The general rule is in Booking rules." · "Price" · "Lowest price" · "Tell the client the price at the visit." · "Enter the service name." · "Enter the price." · "Clients see free times only for the people you tick." · "Online booking" · "Clients can book it themselves on your Ýeral page." / "Hidden from your page — you add its bookings yourself (phone only)." · "Empty — clients see "{main-language name}"." · "Name in Turkmen" / "Name in Russian" · toasts "{service} saved" · "New service added: {name}" · "{service} deleted" + Undo · "Hair colouring deleted · its 4 upcoming bookings stay as they are" · "{service} is open for online booking" / "{service}: phone only — it's hidden from your page" · "Group added: {name}" / "Group deleted: {name}" · "Order saved · clients see your services in this order".
- **Settings · frame and Business profile:** "Settings · Glow Studio" · "Save your changes?" · "This is how clients see you in search and on your page." · "View your page" · "Your page wasn't approved" · "Fix it on this page, then send your page again. Until then only you and your team can see it." · "Send again" · "Go to photos" · "Sent again — your page is in review" · "Main details · About · Photos · Contact and amenities · Address · Pause or close" (admin: "Online booking") · "Shows in search and on your page. A square picture, at least 400 × 400 px." · "Change logo" · "Business name" · "Clients see this name in search and when they book." · "Enter the business name." · "Helps clients find you in search." · "What you do and why clients should come to you — 2–3 sentences are enough." · "Write a few words about your business" · "Clients read this in "About" on your page." · "Main language" · "Empty — clients who use Русский see the English text." · "Clients who use Türkmençe see this text." · "Write the Русский text here" · "5 of 20" · "The first photo is your cover: it shows in search and at the top of your page. Drag to change the order." · "Up to 20 photos, 10 MB each · JPG, PNG or WebP" · "Uploading…" · "Too big · 14 MB" · "{file} is 14 MB. Photos can be up to 10 MB." · "Not a photo" · "{file} isn't a photo. Use JPG, PNG or WebP." · "Phone for clients" · "The Call button on your page rings this number." · "The number is incomplete — it needs 8 digits." · "Amenities" · "Ticked ones show in "About" on your page." · "Wi-Fi · Air conditioning · Parking · Card payment at the place · Kids' corner · Free tea" · "Clients see it on the map and in their booking." · "Street and building" · "Enter the street and building number." · "Drag the pin onto your entrance — clients follow it to your door" · "Clients see only this area until their booking is confirmed — you can drag the circle" · "Another address at the same time is a new workspace: Create a business" · "Online booking is paused. Your page stays open and clients can call you; you can still add bookings in the calendar." · "Close this workspace".
- **Settings · Booking rules:** "Choose when and how clients can book you online. The rules apply to every specialist." · "Online booking is paused — clients see a Call card. Resume it in Business profile." · "How online bookings arrive" · "Bookings you add yourself (by phone or walk-in) are always confirmed at once." · "Hold requests for" · "If no one answers in this time, the request is cancelled and the client is offered 3 other times." · "… Requests for specialists who don't use the app always go to the owner and admins." · "When clients can book" · "Minimum notice" · "Clients can't book a time closer than this, so you have time to get ready." · "No limit" · "How far ahead clients can book" · "Your calendar opens this many days ahead." · "Buffer" · "Free time kept after each service to get ready for the next client. Clients don't see it, but can't book into it. You can set it per service." · "Set per service: Hair colouring — 15 min · Services" · "None" · "Other…" · "Enter 1 to 120 minutes." · "Time step" · "Clients see free times like this: 10:00, 10:15, 10:30…" · "Cancelling, lateness and no-shows" · "The reason is optional for the client. You see it in the booking's history." · "The same rule for every business on Ýeral. Clients see it when they book." · "Fixed" · "Turn off online booking after no-shows" · "After 2 no-shows the client can only book by phone ("Phone only"). Switching Phone only off on the client's card starts the count again." · "Off: clients who didn't come can still book online." · "Off · 1 time · 2 times …" · colours "Violet · Green · Brown · Red · Grey · Black" · ""{status}" added · only the team sees it" · ""{status}" deleted" · preview "What the client sees" · "Booking sent" · "You'll see the answer in My bookings." · "Booking confirmed" · "Your time is set. You'll find it in My bookings." · "Book by phone" · "Glow Studio isn't taking online bookings right now. Call to book a time." · "Call {phone}" · "You can cancel or change the booking for free up to 2 hours before." / "… at any time." · "Example: a request sent today at 14:40. It updates as you change the rules."
- **Settings · Hours:** "Clients can book online only within these hours." · "Opening hours" · "Specialists' shifts stay within these hours." · "Special days" · "Holidays and unusual days — days you're closed or open at other times." · "Add a special day" · "One-off" / "Every year" · "Edit · Delete" · "{day} deleted" + Undo · "No special days yet. Add holidays ahead, so clients can't book those days." · "Edit special day" · "For example: Holiday" · "Clients see this name if their booking has to be cancelled." · "How many days?" · "One day · Several days" · "You can't pick a day in the past." · "The end can't be before the start." · "Repeat every year (holiday)" · "That day" / "On those days" · "Closed · Different hours" · "3 bookings on this day — Aýna 2, Maral 1" / "3 bookings fall outside these hours — …" · "They stay in the calendar as they are. No new online bookings on those days." · "Each client picks a new time in one tap in My bookings." · "Cancel · Add" (Save when editing) · "3 bookings fall outside the new hours" / "6 bookings and 3 requests fall outside the new hours" · "Today, Wednesday · 09:00–18:00. These were booked before the change." · "New bookings follow the new hours either way." · "Hours saved · 3 bookings kept as they are" / "Hours saved · 3 bookings cancelled — each client picks a new time in My bookings".
- **Settings · Link and QR:** "Send clients straight to your booking page." · Live "Your page shows in search and opens at your link." · In review "… Until then only you and your team can see it." · Hidden "Clients can't find your page or open your link. Your calendar and bookings work as usual." · "Your page link" · "Put it in your Instagram profile, WhatsApp status or on your business card — clients book straight from it." · "Link copied" · "WhatsApp · Telegram · IMO" · "The link has no language in it: the page opens in each visitor's language." · "Put it by the till — clients open it on their phone and book." · "Download QR" · "A PNG file, ready to print." · "QR code downloaded · PNG".
- **Reviews:** "Ýeral Business — reviews" (tab title) · "1 more isn't counted while Ýeral checks it" / "N more aren't counted while Ýeral checks them" · "Reviews about you, from clients after their visits. The owner and admins reply to them." · "Ýeral removed a review you reported." + "{client}'s review no longer shows on your page or counts in your rating." · "Ýeral kept this review" + "It counts in your rating again and can't be reported again." · "No decision in 48 hours" + "It counts in your rating again." · "Specialist" / "Specialists · 2" · "Clear" · "Done" · "Newest first · Oldest first · Lowest rating first · Highest rating first" · "For example: Thank you, {client}! See you again soon." · "For example: We'd like to understand what happened — please call us on {phone}." · "Save" (changing a reply) · "Just now" · signature "Glow Studio · {first name}" · "Reply posted" · "Reply updated" · "Reply deleted" · "Report sent · Ýeral checks it within 48 hours" · "Explanation (optional)" / "Explanation" · "For example: the review is about another salon" · "The Ýeral team checks it within 48 hours. Until then the review stays visible but isn't counted in your rating." · "No reviews yet" + "Clients can leave a review after a completed visit. Their reviews show here and on your page." + "See your page" · "No reviews about you yet" + "Clients can leave a review after a completed visit with you. Their reviews show here." · "You've answered every review" + "New reviews show up here." + "Show all reviews" · "No reviews match these filters" + "Try another rating or specialist." / "Try another rating." · "Showing 20 of 97" · "You can't delete reviews. Report one only if it's false, abusive or an ad."
- **Landing:** "Ýeral Business — free online booking" (tab title) · lockup tag "Business" · nav "Features · How to start · Questions" · phone menu "Try the business app" above "Log in" · "For businesses that work by appointment" · "Let your clients book online" · "Your calendar, requests and client list in one place. Salon, dentist, tutor or car service: start in 5 minutes." · "Free · No card needed" · "The business app opens a demo workspace at once, without signing in. Changes reset every night." · "Who it's for" + "For any business that works by appointment — from one specialist to a big team." · tiles "Beauty salon (Hair, face, make-up) · Barbershop (Haircuts, beards) · Nail studio (Manicure, pedicure) · Spa and massage (Massage, body care) · Dentist (Check-ups, cleaning) · Physiotherapy (Treatment, rehab) · Personal trainer (One-to-one workouts) · Tutor (Languages, music, school subjects) · Car service (Repairs, tyres, car wash) · Pet care (Grooming, vet visits)" · "From bookings to reviews — all your work in one place, on a computer or a phone." · "Reviews — After a visit, clients leave a review. You reply, and everyone sees your answer." · "Link and QR — Your own page with services, prices and free times. Share the link and put the QR code by your door." · "In 5 minutes" · "Sign up" · "Add your services and hours — There's a ready list of services for your category: just set your prices and durations." · "Share your link — Put your page's link on Instagram and the QR code by your door — clients book from there." · "The Ýeral team checks every new business within 24 hours. You can use the calendar at once; your page shows in search after the check." · "Every feature is free — for one specialist or a big team." · "Every feature — Calendar, online booking, client list and reviews" · "On a computer or a phone — Works in the browser — nothing to install" · "No card needed — Start with just your phone number" · "Create a business" · "Common questions" · "Didn't find your answer? Contact Ýeral — we'll help." · Qs "Is Ýeral Business free?" · "How do I confirm a booking?" · "Can clients pay online?" ("No. Clients pay at the place, as they do now. Ýeral doesn't take card payments or prepayments.") · "Is my data safe?" (all five FAQ answers rewritten — full text in the log) · "Take your first online booking today" · "Signing up takes 5 minutes, and you can use the calendar at once." · footer "Online booking, a calendar and a client list for businesses that work by appointment." · "Book on Ýeral as a client: yeral.app" · "Product" · "Contact Ýeral" · "Privacy policy" · "Terms of use".
- **Phones:** client row "Last visit today" / "Last visit 13 Oct" · "{number} · 5 visits" / "1 visit" · "Next" · Report sheet subtitle "{client} · today · 11:30" · footnote "No-show and Came late appear here from 11:30, when the visit starts."
- **Design system:** StatusDot "Invited · 6 days left" · Callout "If only one specialist is away, add their time off in Team → staff member → Hours." · "Booking cancelled" + "Reason: the specialist is ill. The client is notified." · Progress "2 / 3 photos" · "1 more photo" · Timeline "Your visit" · KeyValueList "Time · Duration · Specialist · Service · Price · Source" · ListRow "Business profile — Name, category, photos and address" · "Booking rules — Confirmation, cancellations and no-shows" · "Link and QR — yeral.app/b/glow-studio" · "Team — 5 specialists · … · 1 invite" · "Services — 12 services · Hair, Nails, Face, Massage" · AvatarStack "Who does it: …" · client aside "Your details" + "Businesses see your name and number when you book." · "Clients see this name in search and in their bookings." · Accordion "Is Ýeral Business free?" · invite modal "Add a team member" + "They'll see the invite when they sign in with +993 65 •• •• 22. It works for 7 days — until 21 October. You can also copy the invite link in Team and send it yourself." · OptionCard "The client is notified" · chip "No specialist free at 15:00" · segmented "All staff · One specialist" · TimeSlots "{business} didn't answer in time. Pick one of these free times:" · ToggleChip (Later) "SMS isn't available in this market." · Meter "3 seats left" · DS-Booking "Number of seats" · "the next session and seats left" · Voice rows "Later? Not drawn — no "coming soon"" · "No SMS promises — "the client is notified"" · DS-Business "Time off added: 9–13 November · 3 bookings cancelled — each client picks a new time in My bookings" · "Left · today".

### Decided while drawing
**Login & setup**
1. A locked or rate-limited code step also hides the on-screen code; rate-limited = like the lock (boxes off, Confirm and resend hidden); static wait "42 minutes", Play triggers it on the 6th code (B-Login, B-Onboarding, DS-Patterns).
2. "Try the business app" links to B-Calendar.dc.html with `banner: demo` (no demo artboard) — B-Login, B-Onboarding, B-Landing; in the wizard only on the signed-out phone step, and the wizard never mentions the demo.
3. After-midnight check compares only with the next open day; a closed next day doesn't limit it; closing exactly at the next opening is allowed; wraps Sunday → Monday; special-day hours may cross midnight but aren't checked (B-Onboarding, B-Settings).
4. The free-cancel list keeps "Up to 1 h before" (the brief lists 1 h); the switcher-created workspace keeps its round-2 copy (B-Onboarding).

**Shell & access**
5. Notification banner: accent tone for the ask (no dismiss — requests expire), neutral for blocked (closable, stays closed in this browser); only for people who may answer requests; under a business status banner when both show (B-Shell, DS-Business).
6. Counts: Bookings 6 for Owner and Admin, 2 for Aýna (Ejegyz T. today, Aýjemal G. tomorrow); switcher Glow Studio 6, Glow Nails 2, Aýnanyň saç studiýasy 1; Reviews badge 4, hidden for the Specialist.
7. The closed switcher keeps the access level under the name; open rows show "access level · city"; workspace names ellipsize on one line.
8. Demo (signed out) = the owner view on every board (role tweak ignored); the demo hides Close workspace (B-Settings) and shows the owner's Team page (B-Team).
9. Banners follow `linkState` on B-Settings: In review and Not approved show theirs; Live and Hidden by Ýeral none (Hidden shows only in Link and QR — the brief lists three banners).
10. Remove-staff "Cancel" closes without changes; the Team banner stays until every booking and the request are settled; banner and "Choose" are owner only.
11. **Money (resolved in the consistency pass):** prices are booking information — everyone who sees a booking sees its price (Admin included, B-Services lets the Admin edit prices; a Specialist sees her own bookings' prices); **See revenue** covers only sums — revenue lines, client totals, the average check — Owner only, plus the Specialist's own earnings line.
12. Admin header stats on the client card stay 3 tiles (no Average check); past-visit amounts in the drawer show to Owner and Admin, not to a Specialist (B-Calendar).

**Calendar & bookings**
13. Report types already on a booking aren't offered again; Other can repeat; each report keeps its own 7 days; removing a No-show puts the booking back to Completed (Confirmed if not ended); removing other reports changes nothing (B-Calendar, B-Bookings, B-Client).
14. The 24-hour No-show window counts from the visit's end at the demo clock.
15. A Specialist's New booking lists only her own clients; a full number still finds any saved client.
16. "Cancel booking" wraps to a second line, right-aligned, when three drawer actions don't fit 480 (B-Calendar, B-Mobile, DS-Patterns).
17. Closed timer pill "By 09:30" on both pages; title and drawer keep "Answer by 09:30 tomorrow".
18. B-Bookings list tabs hide the empty Answer column.
19. Last visit = the last booking that took place (Completed or No-show); a visit in progress doesn't count (B-Clients; B-Calendar aligned in its follow-up).
20. Mähri G. has two clocks: at 11:20 a request today 16:00 (24 min); at 20:45 tomorrow 13:00–14:00, sent 20:40 (DS-Business, B-Clients, B-Mobile).
21. A No-show booking has no footer — the report box is the last block (B-Mobile, DS-Business).
22. Bookings export stays ("Export CSV" in the toolbar and the bulk bar); only client export is Later (B-Bookings, DS-Business).

**Clients**
23. A Specialist's clients = anyone with any booking with her (past, upcoming or a request) = 41; same row data, full card minus money; she may add notes and remove reports on her own bookings within 7 days; no Add client, Change, Phone only or Delete; another specialist's client by URL → no-access state.
24. Tags: Reported = at least one report; system tags first, then custom; counts Owner 148 · 38 · 9 · 27 · 3, Specialist 41 · 14 · 3 · 6 · 2.
25. Default sort Last visit, newest first; a client just added stays on top, highlighted.
26. Next booking = the earliest upcoming booking or request; in the row a waiting request shows only its timer pill.
27. Delete: Owner and Admin, from the row menu and the card; blocked by any upcoming booking or waiting request (a time change counts with its booking); rows link to the booking or the request.
28. Delete-client confirm on every board: "{client} is removed from your clients, with the team's notes. Past bookings stay in the calendar without the client's name. You can't undo this." · Cancel · Delete client.
29. Ýeral account = booked online at least once; the pill sits next to the read-only number.
30. Phone only can be switched on by hand; removing the No-show that caused it lifts it (count back to 1, no reset line); removing a No-show recalculates visits, total and average check.
31. A client saved without a name shows the number as the name; one gradient button per view.
32. Phone clients list = B-Mobile frame 9 (stacked rows, no money; average check only on the Owner's card); B-Clients' scrolling table under 768 is a leftover (see drift).
33. The reminder-SMS switch is removed, no reminder settings drawn.

**Team**
34. Invites are their own section (not members until they accept); four demo rows show every status; Resend makes a fresh 7-day invite; adding a number with a closed invite replaces that row.
35. Gülnar Öwezowa is Active (accepted the invite drawn on B-Login), does Women's haircut, Hair styling and Children's haircut, works today 12:00–20:00 with 0 bookings — a 5th column on B-Calendar / B-Bookings and in their selects; DS-Business' day grid stays a 4-column excerpt (caption says so). Nazik Rejepowa is the invite-modal name; open invite rows: Ýazgül Orazowa (5 days left), Arslan Gurbanow (Expired), Enejan Nazarowa (Declined), Dilber Saparowa (Cancelled).
36. Left / Removed people have no drawer and no actions; DS-Business draws only Aýna "Left · today".
37. Remove: owner only, never the owner row; final button danger "Remove {name}"; remove and someone-left share one demo (`panel` remove = before she leaves, `aynaLeft` / reassign = after).
38. A booking nobody else can do defaults to **"Keep it"** (listed first; "Cancel and offer 3 other times" second) on remove and someone-left; shift, time-off and hours lists default to "Keep them".
39. Admin on Team: view-only for people, invites, order and Permissions, but may change a person's Services, Hours and time off (fixed rows "Shifts and time off", "Change services and prices") — B-Team, B-Mobile.
40. Time off saves at once (Undo); a shift change saves with the drawer's Save; both open the AffectedBookingsList when bookings are hit.
41. "Uses the app": on for a no-app Specialist creates the invite on Save, off again cancels it; off for an app user stops sign-in (stays bookable); making a no-app Specialist an Admin creates an invite.
42. Phone number read-only for app users; the owner edits it for people without the app.
43. "Can answer own requests" stays for app-using Specialists and isn't linked from Settings.
44. The add-a-member modal keeps 3 steps; a no-app Specialist is added at once ("Add to the team"), no invite row.
45. Reorder by drag or ↑ ↓ on the handles; a changed order shows Discard · Save (B-Team, B-Services).
46. Masked numbers use non-breaking spaces.
47. Jeren's shift / time-off demo uses invented clients not drawn on B-Clients (Bägül A., Nurana K., Dürdäne B., Täzegül S.) + Arzygül H.'s real request (Fri, 16 Oct · 10:00–11:00, Pending · 12 min); time off 9–13 November (2 November is the Stocktake closed day); the 6 requests stay 6.

**Services**
48. s12 = **Bridal hair styling** (Hair, 2 h, Price at the place, Aýna, "With a trial styling; the price is agreed", no upcoming bookings) — the client site's existing s12 — shows the fourth price type and is the no-bookings delete demo (Undo).
49. Price at the place has no amount field.
50. Upcoming bookings per service: Women's haircut 9 · Hair styling 5 · Hair colouring 4 · Children's haircut 2 · Bridal hair styling 0 · Manicure 6 · Gel manicure 4 · Pedicure 3 · Facial cleansing 8 · Brows and lashes 4 · Back massage 3 · Full body massage 2; pending requests count as upcoming.
51. Who does it lists only active specialists; invited people appear after they accept.
52. `languages` = several: EN is main and required, TK filled, RU empty; the list shows the main language.
53. No Specialist view on B-Services, B-Team or B-Settings (she has no Settings); the owner and the admin see the same Services page.
54. The offline-service caption "Phone only" in the services table stays (DS-Business).

**Settings**
55. "Fix and send again" opens Business profile with the reason box on top; "Send again" is always enabled and moves the page to In review.
56. Pause lives only in Business profile next to the close line; Booking rules links there; the preview shows the Call card.
57. Closing is owner-only; an admin sees "Online booking" with Pause only; the admin view = owner view with Selbi, one workspace, no Close.
58. Lateness is a fixed row with a "Fixed" pill.
59. Preview deadline from an example request sent Wednesday 14:40, counted only within the draft hours (15:10 for 30 min, "09:40 tomorrow" for 6 h), never past the visit start (24 h → "14:30 tomorrow").
60. Hours AffectedBookingsList: today's not-yet-started bookings; affected = outside the new hours, in the new break or on a now-closed day; Keep them default; opens on Save only when the week changed.
61. Photos are part of the draft (save bar); uploading ~1.4 s; error tiles can only be dismissed; the add tile hides at 20.
62. Changing the city keeps the street; the pin is part of the draft (drag or arrow keys).
63. One language by default; the link-language caption shows only with `languages` = several.
64. "Phone for clients" may be a landline; only the length is checked.

**Reviews**
65. 96 counted reviews (88 / 6 / 1 / 1 / 0, 4.9) exclude Merdan K.'s reported 1★; none, cleared and no decision count it (97 · 4.8); checking and removed don't; a review being checked still shows in the list, filters and "Showing 20 of 97".
66. No decision in 48 hours counts again and can't be reported again (one report per review).
67. After a report the "…" menu disappears (it held only Report); replying stays possible during and after the check.
68. Removed: the review leaves the list (unanswered 4 → 3, "Showing 20 of 96"); a neutral notice above the filters until closed (owner, admin).
69. Reported review = Merdan K. · Back massage · Leýli; stars-only: Aýjemal G. (not answered), Jemal S. (answered); first-name-only: Aýgözel, Ogulgerek.
70. 20 per page; "Showing N of M" only when the total is known; the Specialist gets "Show more" without a count; Not answered shows all 4.
71. Specialist (Aýna): reviews about her only, read only — no summary, count, Not answered chip, Specialist filter, footnote or badge.
72. Admin = owner on Reviews; replies signed "Glow Studio · Selbi" / "Glow Studio · Maýsa" / "Glow Studio" (demo); a changed reply keeps author and time.
73. Empty state: no summary, no filters, "See your page" for owner and admin, no notification promise.
74. "Not answered · 4" is a Pill L used as a button and also a filter chip.
74b. Every reviewer has a completed visit that fits the client data (first name + initial; saved full names elsewhere: "Aýjemal Gurbanowa" in requests and lists, "Aýjemal G." only in reviews).

**Landing**
75. The demo is explained in a caption under the hero buttons (one main action); "Questions" → #faq, "How to start" → #how-to-start.
76. 10 category tiles from the round-2 appointment list; FAQ without data export, hold "15 min to 24 h, counted only while you're open", "the client is offered 3 other times".
77. Mock phone line "Glow Studio answers by 11:38"; no city names in landing copy.
78. At 390 the hero buttons stack full width, the header keeps a small Start free + menu, the mock shrinks to a request card + 4 blocks (B-Landing, B-Mobile).

**Phones**
79. Settings and Reviews are reached from More; the More tab is drawn current.
80. The phone Report menu is a second bottom sheet; the from-the-start case is described, not drawn; the legend's "Show cancelled" sits in the sheet footer.
81. Team frame shows the chip row scrolled to Team; the member sheet opens from a row tap or "…" → Access level.
82. Reviews filter chips scroll in one line; Sort is full width.
83. Sheets max 92 %, radius 16 (DS-Patterns wins over B-Mobile's 20), round-2 frames included.
84. Client rows = B-Clients' first 8 rows; team rows = B-Team's five specialists.

**Design system**
85. Later content: DS-Patterns keeps later-only primitives tagged "Later" (as DS-Booking does for tables and classes); DS-Business removes the later sections 08 Analytics, 11 Tables, 12 Classes (rows kept under "Later" in `components-domain.md`; the screens are in `screens/later/`).
86. "Owner and admin tiles" = the client-card stats (Owner 4 tiles with Average check, Admin and Specialist 3) and DS-Patterns' StatTile row (Average check for the Owner; the Admin row shows the hidden value).
87. Danger confirms name the action ("Delete client", "Cancel booking") on DS-Patterns too.
88. Average-check samples keep the v0.5 values (112 / 108, 145, 121 from 12 visits).
89. LocalizedField's several-languages sample keeps English as the main language.
90. Foundations' "never a city name" applies to client copy only; a workspace shows its city.
91. The SMS sender stays only as a dev note; the ToggleChip (Later) keeps an SMS chip with a neutral reason.
92. The phone Bookings header keeps a search icon — the list's own search.
93. The ActionBar summary line may wrap to two lines.
94. DS-Business: invite rows move from 09 to the team table in 04; 07 Notifications stays for the banner, toasts and Team banner; client site 13 / 13b gets §9 word fixes only; non-token `#fff8f7` → white; DemoSidebar drawn as a full sidebar.
95. Long-text fixes on DS-Business: segmented labels wrap, history badge column grows, photo-tile chips wrap, reviews menu column 280, team status column 184, "Who does it" 176, hours editor sample 780 wide.

**Consistency pass (all boards)**
96. Short dates in running text: "Fri, 16 Oct · 10:00"; the compact "Fri 16" only in week headers and date strips.
97. Team and invite captions say "sign in"; login screens keep "Log in".
98. Danger confirms name the action: "Back · Decline invite" (B-Login, DS-Business), "Cancel · Delete client", "Cancel booking".
99. Banners and callouts are sentences with a full stop ("Turn on notifications to hear new requests.").
100. Non-token tints found on the boards were swapped for tokens (`#fff8f7` → white, `#eceef2` → n-100, two hover tints → n-100 / pending line).

### Known drift left on the boards
- B-Clients under 768 keeps a sideways-scrolling table (the phone design is B-Mobile frame 9); a row menu opened inside it is clipped under 1360 px, as on B-Bookings.
- Shell copies: B-Clients, B-Client and B-Reviews copy the shell from B-Bookings; B-Team and B-Services from frozen B-Settings CSS — build from the shared shell, not from these copies.
- The account-menu row "Open as a client · yeral.app" wraps to two lines with 30 %-longer labels; a long saved client name ("Aýjemal Gurbanowa") is cut in B-Client's top bar at 390 with longer labels; workspace names ellipsize in switcher rows (data).
- DS-Components "Form layout" card pushes the page to 1,459 px with 30 %-longer labels; DS-Patterns CheckboxGroup reaches 8 px into the margin (both round 1).
- DS-Business client-site sections 13 / 13b: §9 word fixes only; the "SMS link page card" heading and its Storybook names wait for round 4.
- B-Mobile draws the before-the-start Report sheet; the from-the-start case (four rows) is described in the caption.
- DS-Business' calendar day grid is a 4-column excerpt (Gülnar is in the week matrix and the selects).

### Open questions for the owner
1. **Admin and money:** the fixed table gives the Admin no "See revenue", so the Admin sees booking prices but no sums (revenue lines, client totals, average check). Should the Admin see revenue too?
2. **Bookings export:** "Export CSV" stays on Bookings (toolbar and bulk bar) while client export is later. Keep it at the first release?

### To do in the repo
- **Clients:** list by role (Specialist = clients with a booking with her), tags incl. Phone only, no bulk actions / export; card stats with the average check (owner); reports list with 7-day removal (reverting No-show, recalculating stats); Phone only switch (auto after the business's no-show limit, manual, reset of the count); delete blocked by upcoming bookings or waiting requests; read-only phone for clients with a Ýeral account (synced from the account).
- **Team:** `usesApp` flow (switch-on creates a 7-day invite; works without the app until accepted); invites owned by the owner with copyable links, statuses Invited / Expired / Declined / Cancelled, duplicate checks, mobile only; remove member + affected bookings (move / keep / cancel + offer 3 times); shift and time-off changes with the affected list; fixed permissions (no editing, no ownership transfer, the owner can't leave); owner-only someone-left toast + Team banner until settled.
- **Settings:** Business profile (photos ≤ 20 × 10 MB JPG/PNG/WebP, city + pin, pause online booking → Call card, close via support), booking rules (answer deadline as a clock time, optional cancel reason, fixed 15-min lateness, no-show limit), hours 00:00–24:00 with the next-day rule and the after-midnight check, affected bookings on save, Link and QR states incl. "Hidden by Ýeral".
- **Services:** price types incl. Price at the place; delete with upcoming bookings keeps them; one-language fields now, main language later.
- **Reviews:** reviewer display name, service and specialist from the booking; stars-only; moderation states (checking → cleared / removed / no decision in 48 h); specialist read-only; paging 20.
- **Shell / sign-in:** browser notification permission banner; signed-out shared demo workspace (nightly reset); code-on-screen first-release mode with "Get a new code" and the 5-codes-per-hour limit; no language switching at the first release; switcher shows the city.
- **Report rules:** No-show only from the start until 24 h after the end; several reports per booking; only no-shows count towards Phone only.
- **Copy:** English source strings from the boards; "Time off", seats, "60 min", " · " between date and time, "Cancel booking" vs "Cancel", Discard · Save; demo facts in `business/demo-data.json` → `v06r3`.

---

## v0.6 · round 2 — 20.10.2026 · business app part 1 in English

**Scope:** login, setup wizard, app shell, calendar, bookings and phone layouts of business.yeral.app, now **English** and following the owner's round-2 decisions; new patterns on DS · Business patterns. Every decision is written up in `business/README.md` **§27** (it wins over older sections). **First release = appointments only**, addresses `business.yeral.app/w/{slug}/…`, `/login`, `/setup/{step}`, **no SMS promises** in copy. Tokens stay v0.5; DS-Patterns, Foundations, Components and Categories boards are unchanged.
**Copy sources:** `copy/EN-GLOSSARY.md` (§5 = round-2 updates) and the full logs `copy/en-choices-r2-login-shell.md`, `copy/en-choices-r2-onboarding.md`, `copy/en-choices-r2-calendar.md`, `copy/en-choices-r2-mobile.md`, `copy/en-choices-r2-ds-business.md` (every wording with where and why, incl. aria labels and sample data).

### Boards changed
| Board | Frame | What changed |
|---|---|---|
| `business/B-Login` · `/login` | page 1440 × 1160 | English; phone + code = **SignInCodeStep** with every state (+ visible Confirm) and the first-release **code on screen** (tweak `codeOnScreen`); LanguageSwitcher EN · TK · RU instead of the globe; **invite accept / decline** (inline confirm) + expired; routing card **"Continue setting up Glow Studio · Step 4 of 8 · Hours"** → `/setup/hours`; no-workspace card + "Try the business app". Tweak `step`: phone · phoneSending · phoneIncomplete · phoneLandline · phoneLimit · code · codeChecking · codeWrong · codeLocked · codeLockOver · codeResendReady · codeResent · codeLimit · name · invite · inviteDecline · inviteExpired · setup · empty · routing. Play: 65 10 20 30 = Maýsa, 64 21 55 90 = Gülnar (invite), 62 48 15 30 = unfinished setup, 0000 = wrong code |
| `business/B-Onboarding` · `/setup/{step}` | page 1440 × 1100 (team ≈ 1290) | English; step 1 = SignInCodeStep + name; **Continue later** on steps 1–7 (caption + saved toast); appointment categories only; hours 00:00–24:00 in 30 min with **overnight days** ("until 02:00, next day"); free-cancel list Any time · 1/2/6/12/24/48 h; "Client sees" badges on the confirmation cards; team = Admin · Specialist + **Uses the app** switch, phone required, 7-day invite caption; Done = In review banner, link + QR, "Send invites". Tweaks `step`, `signIn` (14 sign-in states), `codeOnScreen`, `homeBased`, `overnight`, `fromSwitcher` |
| `business/B-Shell` | board 1600 × 8300 (was 6000) | English; addresses; sidebar Calendar · Bookings · Clients · Reviews · Settings + user block; account menu + **Contact Ýeral** submenu; tablet rail, phone tab bar + More sheet; **banners** In review · Not approved · Demo (+ ExampleBadge in the switcher); new Addresses tile; access-level sidebars and permissions matrix (Reports row dropped); My profile without the busy-elsewhere switch; new **"Someone leaves"** section (leave confirm → owner toast + notification item → "Who takes Aýna's bookings?" with AffectedBookingsList) |
| `business/B-Calendar` · `/w/glow-studio/calendar` | page 1440 × 1360 | English; **plain "Busy elsewhere" block**; **slot menu** New booking · Block time + **Block time** form, overlap error, saved "Closed · Training" (also weekly repeats); **request timer** closed state; **report menu** (No-show from the start) + report box with "Remove report"; banners, account menu, More sheet. Tweaks `view`, `panel` (none · request · move-request · booking · new · slot-menu · block-time · block-error · decline · report-menu · report-noshow · reported · complaint · move), `legend`, `internal`, `role`, `answers`, `clock` (day · evening), `banner` (none · inReview · notApproved · demo) |
| `business/B-Bookings` · `/w/glow-studio/bookings` | page 1440 × 1320 | English; bulk bar **Confirm · Decline · Export CSV**; row menu "Report…"; closed-state timer "By 09:30 tomorrow"; banners. Tweaks `tab`, `panel` (none · request · move-request · booking · decline · report-menu · report-noshow · reported), `selected`, `role`, `answers`, `clock`, `banner` |
| `business/B-Mobile` | board 1696 × 5260 (was 3480) | English, 15 phone frames (5 new): 1 log in · **1b code on screen** · 2 calendar (plain busy elsewhere) · **2b slot sheet** · **2c Block time sheet** with overlap error · 3 requests · **3b arrived while closed** · 4 booking sheet + report sheet · **4b reported booking** · 5a–c phone-first new booking ("Notify the client") · 6 workspace switcher · 7 More · 8 legend; notes panel |
| `system/DS-Business` | board 1440 × 79 200 (was 69 400) | New patterns with states: busy-elsewhere block + refusal toast · SlotMenu + BlockTimeModal (default, repeat, other, specialist-self, overlap) + phone sheets · RequestHoldTimer closed · ReportMenu (before start, from start, completed, row menu) + ReportBox (+ expired) · Uses-the-app switch on the access-level field · BusinessStatusBanner ×3 · ContactMenu · ContinueSetupCard · LeaveWorkspaceConfirm · StaffLeftNotification · RemoveStaffModal + **AffectedBookingsList** · Addresses table; aligned with the screens (staff header count on the name line, bulk bar, no-SMS copy, In review wording, `lang="en"`) |

### Boards moved (unchanged, still Turkmen)
`B-Analytics`, `B-Help`, `B-Tables`, `B-Classes` → canvas page **"Later · not MVP"** and `screens/later/` (next to `B-Billing`). Not in the first release: no Reports, no help centre/chat (Contact Ýeral replaces it), no restaurants/cafés or class studios.
**Still Turkmen until round 3:** B-Clients, B-Client, B-Settings, B-Services, B-Team, B-Notifications, B-Reviews, B-Landing (they still show `/tk/` routes, Reports/Help in the nav and the no-app level — §27 wins).

### Components added (DS-Business unless noted)
- **BusyElsewhereBlock** (plain reserved block, covers time + buffer, not clickable) + **RefusalToast** ("Aýna is busy elsewhere 19:00–20:00. Pick another time.").
- **SlotMenu** (+ SlotActionSheet on phones) · **BlockTimeModal** (+ BlockTimeSheet) — Person · Date and time · Reason chips · Repeat + Until · overlap error with "Open the booking".
- **RequestHoldTimer · Closed** (Pill "by 09:30", Inline "By 09:30 tomorrow", drawer note) + RequestCard Closed.
- **ReportMenu** (BeforeStart without No-show · FromStart · Completed · RowMenu) and **ReportBox** (NoShow · Other · Expired, "Remove report").
- **UsesAppSwitch** on AccessLevelField (on · off · phone missing).
- **BusinessStatusBanner** (InReview · NotApproved · Demo); **ExampleBadge** in WorkspaceSwitcher.
- **ContactMenu** (Call · Write on Telegram) in AccountMenu; **MoreSheet** rows.
- **ContinueSetupCard** (LoginFlow routing), **InviteCard** decline confirm.
- **LeaveWorkspaceConfirm**, **StaffLeftNotification** (toast + list item), **RemoveStaffModal** + **AffectedBookingsList** (rows Move · Keep · Cancel · Nobody else; round 3 reuses it when hours or a shift change).
- Wizard: overnight **"next day" pill** on the hours row; "Client sees" StatusBadge on confirmation cards; TeamMemberRow wizard variant with Uses the app.

### Changed
- AppSidebar → Calendar · Bookings · Clients · Reviews · Settings + user block; AccountMenu adds Your Ýeral page (moved from the sidebar) and Contact Ýeral; phone More sheet = Reviews · Settings + account items.
- StaffColumnHeader: the amber request count moves to the name line (English didn't fit). Week cell: "6 bookings" never breaks.
- BookingDrawer footer "Report ▾" (was straight to the complaint modal); "What happened?" opens from "Other…".
- B-Login / B-Onboarding / profile phone change use SignInCodeStep (DS-Patterns) instead of their own fields.
- Hours pickers 00:00–24:00 in 30-min steps (was starts 06:00–23:30, ends up to 24:00).
- InviteCard and invite rows: 7 days, 21 October, masked number, no SMS link.

### Retired
- The v0.5 **dashed briefcase** busy-elsewhere drawing (grid, week strip, legend, phone).
- **BusyElsewhereSwitch** in My profile.
- The **"Specialist (no app)" / "No app" access level** (AccessLevelField PhoneOnly, StaffRow / StaffStatus / InviteStaffModal PhoneOnly) → Specialist + Uses the app off.
- **Reports** and **Help** in the sidebar and the More sheet; the permissions row "Reports".
- Bulk **"Move to another time"** (bookings move one at a time).
- The round-6 verification banner tile (→ BusinessStatusBanner); the wizard's restaurant/café and class-studio categories and type tags.

### English choices the brief and glossary didn't cover (all of them are in `copy/en-choices-r2-*.md`; the UI strings here)
- **Login:** first-release lead "Enter your phone number — we'll show you a 4-digit code. No password needed." · "Enter your first name." · invite "The invite works until 21 October" / expired "Each invite works for 7 days. The invite Glow Studio sent on 14 October ended on 21 October." · decline "Decline the invite?" (Back · Yes, decline) → "You declined Glow Studio's invite." · routing card "Step 4 of 8 · Hours", "You stopped at your hours. Everything you entered so far is saved.", "3 of 8 steps done", Continue · "Try the business app" · "Book on Ýeral as a client → yeral.app" · phones: "No business yet? Start free".
- **Setup:** "Set up your business" (from the switcher "Create a business") · "8 steps · about 5 minutes · free" · steps Phone (Account) · Business · Address · Hours · Services · Team · Booking rules · Done · "Step 2 of 8" · "Saves this step. Log in again and setup reopens right here." + toast "Saved. Log in again with +993 65 10 20 30 and setup reopens at "Hours"." · "Questions? Contact Ýeral: [SUPPORT PHONE]" · footer Back · Continue · Cancel · Create business · Go to the calendar · "About your business", "Business name", "No category found", "Something else — I'll add my services" · category names (business/README.md §27) · "Where will clients find you?", "I work from home", "Floor, room", "Where is the entrance?" · "Your hours", "Same hours Monday to Friday", "Same as Monday", "until 02:00, next day", errors "Opening and closing can't be at the same time." / "The break must end after it starts." / "The break must be within your hours." · services group "Face", "Select all / Clear", "from 250 TMT" prefix · "Who do you work with?", "Add a team member", "A phone number is required — they log in with it.", "Mobile numbers only — enter a number starting with 6 or 7.", uses-app-off caption "Bookable at once, never signs in — you and admins handle their requests. They can start using the app later with this number." · "How should bookings arrive?", "Client sees", "Clients can cancel for free" with "Up to N h before", hold caption "… The time counts only while you're open.", buffer "None" · "Glow Studio is ready!", "Your page link", Copy / Copied, "Download QR", "0 / 3 done", "Send invites" → "5 invites sent — each person sees theirs when they sign in with their number. Valid 7 days, until 21 October."
- **Shell:** search "Client, phone or booking code" · toast action "Open" · demo switcher caption "Owner · demo workspace" · "One person — several workspaces" · "See revenue" = "Money totals in the calendar and client cards" · profile phone hint "You log in to Ýeral Business and yeral.app with this number. To change it, confirm the new number with a code." · "Phone number changed" · leave button "Leave Glow Studio" (danger) · owner toast action "Choose" · "Who takes Aýna's bookings?" / "Aýna left Glow Studio. She has 4 upcoming bookings." · option captions "The time and service stay the same. The client sees the new specialist in My bookings." / "They stay in the calendar as they are. No new bookings for Aýna." / "Each client picks a new time in one tap in My bookings." · field "To" + "Only specialists who do these services are listed." · row results "→ Gülnar Öwezowa", "Nobody else does Hair colouring", "Stays as it is · no new bookings for Aýna", "Cancelled · the client picks 1 of 3 other times" · footer **Close · Save** (not Cancel, so it can't be confused with "Cancel and offer 3 other times") · team status "Left".
- **No-SMS rewrites:** "Booking confirmed · the client is notified" (same tail on moved / saved / cancelled toasts) · "Request declined · the client sees the reason (and N other times)" · "New time declined · the booking stays at its time · the client sees the reason" · cancel lead "The client is notified and sees the reason in My bookings." · "Notify the client" + "They see the date, time and address in My bookings" · new-number hint "This number isn't saved yet — it will be added as a new client." · transfer ownership "The new owner is notified in the app."
- **Calendar & bookings:** self toast "You're busy elsewhere 19:00–20:00. Pick another time." · legend "Busy elsewhere — the time is taken in another workspace; no details are shown" · slot menu "14:30 · Maral" + "Wednesday, 14 October" · Block time "Date and time", "For example: Doctor's appointment", "Every Wednesday from 14 October to 30 November · 7 times", errors "The end must be after the start." / "This time has passed — pick a time from 11:15." / "Pick an end date after the first day.", repeat hit adds the day ("Wed, 21 October · …"), toast "Time blocked: Maral · 14:30–15:30 · Training · every week until 30 November", Specialist "You can block only your own time." · timer "18 min left to answer", "Sent · Today, 20:40", drawer "The timer counts only while you're open, so it waits until 09:00. If no one answers by 09:30, the request is cancelled and the client is offered 3 other times.", legend "Time left to answer — counts only while you're open" / "Arrived while you were closed — answer by this time" · report captions "The booking becomes No-show" / "The booking doesn't change" / "Write what happened", toasts "Marked as No-show · saved to the client's card", "Report saved to the client's card", "Report removed · the booking is Completed again" (… "Confirmed again"), footnote "No-show appears here from 11:30, when the visit starts.", after 7 days "A report can be removed for 7 days. This one can't be removed any more." · bookings "Export" / "Export CSV", "CSV ready · 16 rows", "N selected", "Specialist: Maral", "All specialists", "Nothing found / Try changing the search or the filters. / Clear filters", footers "least time left first · by time · soonest first · newest first", "Note to the client (optional)", "You can pick up to 3 times", "Only the team sees reports.", drawer **"Cancel"** (dialog button stays "Cancel booking"), "Booking code", "12 visits" (no average).
- **Phones:** "Client's phone", "Usual services first", "Another service", "Pick a service first", "Add an internal note", "Tomorrow · Aýna", legend "Closed · reason", More row caption "[SUPPORT PHONE] · Telegram".
- **DS · Business:** "Phone number · required", uses-app-off box "Leýli's requests go to you and the admins. The "Can answer own requests" switch and the permissions don't apply to her.", "You are the owner. Owner can't be picked here — use Transfer ownership.", status "Active · Doesn't use the app", invite note "They'll see the invite when they sign in with +993 64 •• •• 90. It works for 7 days — until 21 October. …".
- **Formats:** weekdays Wednesday / Wed / We (grids only); full months in the calendar, "Fri, 16 Oct" in tables; English plurals ("1 booking / 6 bookings", "1 request").

### Decided while drawing (simplest Fresha-like — change if you disagree)
1. Busy elsewhere covers the other booking **plus its buffer** (Aýna 19:00–20:10); the toast names only the booking time.
2. No-show is offered from the visit's start, also on Completed bookings. Removing it returns the booking to Completed, or Confirmed if the visit hasn't ended, and lifts the phone-only restriction when that report caused it.
3. Came late and Rude behaviour save straight from the menu; Other… needs text. On phones the report menu is a second bottom sheet.
4. Block time: 15-min steps, never in the past, every repeat up to the end date is checked; a Specialist blocks only her own time, Owner and Admin anyone.
5. Export / Export CSV are hidden for a Specialist.
6. A notification reaches the client only after the 6 s Undo toast closes.
7. Admins always use the app; turning "Uses the app" on later starts the 7-day invite. Team numbers must be mobile (6 or 7).
8. Invites are created at Done ("Send invites"); Specialists who don't use the app are active at once.
9. Continue later is hidden before the code check and on Done; the phone step shows only Send code / Confirm as the primary button.
10. Overnight hours: closing < opening = next day; 24:00 = same-day midnight; no 00:00 in the closing list; equal times are an error.
11. The language switcher sits in the desktop wizard panel only.
12. Switching workspace keeps the section; a workspace you're not in → last used + "This section is closed to you".
13. Leave: the owner's toast stays until opened, the list item until every booking is settled; the owner and admins who manage the team get it. Demo assumes Gülnar accepted her invite.
14. "Try the business app" lives on the no-workspace card; "Fix and send again" opens the settings section the reason points to.
15. Banners use `role="status"`, not alert. ExampleBadge: in the 240 px sidebar on the access-level line, in switcher lists after the name.
16. Requests = 6 on every round-2 screen (incl. Mahym D.'s time change request); Gözel A. has 1 visit.

### Open questions for the owner
1. **Contact Ýeral:** the support phone number and the Telegram handle (drawn as `[SUPPORT PHONE]`, `[TELEGRAM]`).
2. Still open from round 1: first-release "Send a new code" or "Show a new code"? · locked code step: hide Confirm / resend (drawn) or show them disabled? · ExampleBadge line on the business page · may a Turkmen-only business make Turkmen its main language?

### Known drift left on the boards (the code follows the winner)
- ExampleBadge in the closed switcher: B-Calendar / B-Bookings (level line) win over B-Shell / DS-Business (after the name, which cuts "Glow Studio" at 240 px).
- DS-Business keeps its own LoginFlow drawing (now without SMS wording); build SignInCodeStep from DS-Patterns.
- B-Bookings Today tab: 16 rows run past the 1,320 frame (since round 6) — the list scrolls.
- Round-3 screens still Turkmen (see above).

### To do in the repo
- **Routes:** `/w/{slug}/calendar|bookings|clients|reviews|settings/{section}`, `/login`, `/setup/{step}`; no locale prefix on business.yeral.app; switching workspace keeps the section; tab titles "Calendar · Glow Studio".
- **Navigation:** remove Reports, Help, Tables, Classes (and billing) from the first release; AccountMenu + Contact Ýeral; More sheet.
- **Sign-in:** SignInCodeStep everywhere; a per-market **code-on-screen mode** while SMS isn't live (the server returns the code to show); rate limits (3 tries → 60 s lock; 4th code request → 15 min).
- **Setup:** persist the current step ("Continue later"), login routing to `/setup/{step}`; appointment categories only; overnight opening hours in the **availability engine** (slots after midnight belong to the previous day's schedule); free-cancel list.
- **Access:** replace the phone-only level with `usesApp` on Specialist memberships; phone required; invites valid 7 days, shown on sign-in with the invited number; accept / decline; leave workspace.
- **Busy elsewhere:** derive from other workspaces' confirmed bookings and pending requests + buffer; expose no details; refuse bookings there server-side.
- **Time blocks:** new entity (person, range, reason, repeat daily/weekly, until) with the overlap check against bookings; render as the closed layer.
- **Request hold time** counts only during open hours; compute and show the "answer by" deadline.
- **Reports:** No-show only after the start; Late / Rude / Other; remove within 7 days with the status revert.
- **Remove staff:** affected-bookings flow (move / keep / cancel + offer 3 times), owner notification.
- **Business status:** in review / not approved (reason, resubmit) / demo workspace (nightly reset, ExampleBadge, "Try the business app").
- **Bookings bulk:** Confirm · Decline · Export CSV; drop bulk move.
- **Copy:** English source strings from the boards; no SMS promises; demo facts in `business/demo-data.json` → `v06r2`.

---

## v0.6 · round 1 — 19.10.2026 · the design-system boards in English

**Why:** Ýeral is now built **English first** and isn't bound to one country; each market adds its own languages when Ýeral launches there (Turkmenistan: Turkmen and Russian). The Turkmen drawn so far stays the reference for the Turkmen translation. Tokens, colours, type, spacing, radii and icons don't change (tokens stay v0.5).
**Scope of round 1:** only the five boards on the *Design system* page. Client and business screens are still Turkmen; they follow in rounds 2–4.
**Copy sources:** `copy/EN-GLOSSARY.md` (owner's words + the house choices every board follows) and the full per-board logs `copy/en-choices-foundations.md`, `copy/en-choices-patterns.md`, `copy/en-choices-business.md` (every Turkmen → English pair, with where and why).

### Boards
| Board | Frame | What changed |
|---|---|---|
| DS · Foundations (`Main`) | 1440 × 5400 (was 3260) | English; status table with icons (dots gone); language rows EN first; **new Voice section** (do/don't pairs, price forms, brand, English first) |
| DS · Components | 1440 × 5280 (was 3900) | English; StatusBadge icons; who-cancelled sub-line; language switcher EN first + hidden for one language; "District" select → "Specialist" select |
| DS · Categories & booking types (`DS-Booking`) | 1440 × 2960 (was 2500) | English names and hints; **"Later"** pill on table and class (and resource) rows; "Ships …" lines; average bill removed; TK/RU columns removed |
| DS · Product components (`DS-Patterns`) | 1440 × 38800 (was 34800) | English; new ExampleBadge, SignInCodeStep (+ first-launch code), LanguageSwitcher variants, Long-text section; average-bill tiles removed |
| DS · Business patterns (`DS-Business`) | 1440 × 69400 (was 69600) | **Text only**, English; average bill removed; no pattern changes (busy elsewhere as a reserved gap, block time and the "uses the app" switch come in round 2) |

### Components added
- **ExampleBadge** (`Status/ExampleBadge`, DS-Patterns 01): neutral Pill tone (n-100 fill, n-200 line, n-600 text) + Lucide **flask-conical**; sizes S (rows, pins) / M (cards, page header); drawn on a business card, a search row, the business page header (with a neutral line under it) and a map pin.
- **SignInCodeStep** (`Inputs/SignInCodeStep`, DS-Patterns 05) — the one shared sign-in step for the login modal, booking flows, business login and the SMS link page. Phone step: empty · sending · incomplete number · not a mobile number · too many codes · masked number (SMS link page). Code step: empty · typing · checking (auto-check on the 4th digit **and** a visible Confirm) · "Wrong code. N tries left." · "Too many tries. Try again in 60 seconds." · lock over → "The old code no longer works." + "Send a new code" · "Send a new code in 0:59" → "Send a new code" · new code sent · "Too many codes. Try again in N minutes."
- **SignInCodeStep · first launch** (`firstLaunchCode`): no SMS is sent, the code is shown in a quiet neutral callout "Your code: 4821" above the boxes (only while SMS isn't live in a market).
- **LanguageSwitcher variants** (`Navigation/LanguageSwitcher`: OneLanguage = no switcher · Segmented EN · TK · RU · MenuRow "Language" + current value · PhoneSheet). English first everywhere the language list appears (AccountMenu, MoreSheet, LocalizedField tabs, Segmented/Tabs samples, business login header).
- **Long-text check** (`Docs/LongText`, new DS-Patterns section 09): buttons, tabs, chips, status badges, nav items, service names and toasts in English next to real Russian (measured ~27% longer): buttons grow (never fixed width), labels wrap to two lines before truncating, toasts cap at 480.
- **Voice section** on DS · Foundations; **Later pill** (`.later`) on DS · Categories & booking types; **who-cancelled sub-line** on DS · Components (You cancelled · The business cancelled · The business declined · No answer in time).

### Renamed
- Board titles → v0.6 ("DS · Product components · v0.6", "DS · Business patterns · v0.6", Foundations "design system v0.6").
- CodeInput → composed into **SignInCodeStep** (CodeInput keeps its bare primitive stories); login block → "Sign-in · SignInCodeStep".
- Story names RoleHunarmen → RoleSpecialist; MoreSheet stories Owner · Specialist · Admin.
- Localized text "TK / RU / EN" → "EN / TK / RU"; menu row "Language: Türkmençe (TK)" → "Language" + value.
- Foundations status table columns "Badge · TK" / "RU · EN" → "Badge" / "Icon · Lucide".
- Settings item "Salgy we QR" → **"Link and QR"** on both DS-Patterns and DS-Business (the page is about the public link).
- Sample workspace "Glow Studio · Parahat" → "Glow Nails" (no district names).

### Removed
- Every **average bill** (StatTile samples, setup-checklist row, ClientHeader stat → stats are Visits · Last visit · No-shows, owner/admin KPI tiles → "New clients", StaffPerformanceRow column, table card row → "Menu · Price at the place", known-client card).
- The old dot status badges and the v0.5 CodeInput state grid; the B-Login globe + code language button; the TK/RU columns of the category table and the Turkmen/Russian status names on Foundations (the v0.5 export stays the translation reference).
- District/city names in samples; the `/tk/` locale prefix in sample URLs ("yeral.app/b/glow-studio", "/login"); payments in the Ýeral notification line.

### English choices the owner's list didn't cover (summary — full lists in `copy/`)
- **House style:** British English, sentence case, digits, 24-hour times; the house table in `copy/EN-GLOSSARY.md` §3 (Calendar · Bookings · Clients · Reviews · Reports · Settings · Help; New booking · Save booking; Specialist (no app); Your workspaces · Create a business; My profile · Language · Open as a client · Log out; Who answers requests? — Owner and admins · Each specialist · Both; Arrived · Started; Hold requests for; Got it; New · Regular · Lapsed · Reported; Offered times · Already taken; Time change request · Withdraw request…).
- **Formats:** compact dates "Thu, 15 Oct · 18:00", timestamps "12 Oct, 15:05", weekday letters Mo–Su; durations in hours from 60 min ("1 h 15 min"); "1,450 TMT", "4.9", "2.6 km", "5.2%"; English plurals ("1 person / 2 people", "2 no-shows"); "until 20:30", "from Fri 16 · 10:00"; DeltaPill unit "pts".
- **Words:** "Rugsat" (a person's leave) → **Holiday**, but "Rugsatlar" → Permissions; empty select "Ýok" → None; classes sell **spots**, tables have **seats**; "Jogap: administrator" → "Answers: admins"; review filter "Not answered"; team toast "Booking saved" (the client keeps "Booking sent / confirmed"); "Ghost block", "Just changed"; redirect toast "This section is closed to you"; "Largest party online"; "Bes" → Busy; "Booking code", "Code step"; "Reports are getting ready", "First weeks"; chart category "Back after a break" (counts visits, not the client tag "Lapsed"); booking-type titles Book a time / Book a table / Book a class / Book a space; "Find a place"; "Cancel bookings" (bulk); the intro "ýer al" → "from the Turkmen for 'take a place'".
- **Kept on purpose:** people and business names, streets in British order ("247 Bitarap Türkmenistan Avenue, 2nd floor"), the Russian long-text blocks, language names in their own language (Türkmençe, Русский), the glyph samples on Foundations.

### Open questions for the owner
1. First-launch variant: keep "Send a new code" or say **"Show a new code"** when no SMS is sent?
2. Locked / rate-limited code step: Confirm and resend are **hidden** (hidden-not-greyed rule) — OK for a form, or show them disabled?
3. ExampleBadge line on the business page header: "This is an example business. It shows how a page on Ýeral looks." — final wording?
4. LocalizedField: the business's main language defaults to English (empty languages fall back to it) — should a Turkmen-only business be able to make Turkmen the main language?

### To do in the repo
- i18n: English becomes the source locale; keys keep the Turkmen strings from the v0.5 screens as the `tk` reference; Russian strings must fit (long-text rules).
- Build SignInCodeStep once and use it in every sign-in place; add the first-launch code mode; LanguageSwitcher hidden for one-language markets, EN first.
- ExampleBadge for sample businesses (data flag on the business).
- Remove the average bill from the data model/UI if it exists.

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
