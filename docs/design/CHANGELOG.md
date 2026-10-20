# Design export changelog (`docs/design/`)

Newest first. Each export replaces this folder; this file says what changed and what it means for the code.

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
