# English choices: DS · Foundations, DS · Components, DS · Product components, DS · Categories & booking types · design pass v0.6, round 3 (20.10.2026)

Files: `screens/system/Main.dc.html` (DS · Foundations, 1440 × 5520) · `screens/system/DS-Components.dc.html` (1440 × 5340, interactive) · `screens/system/DS-Patterns.dc.html` (DS · Product components, 1440 × 40 500, generated) · `screens/system/DS-Booking.dc.html` (1440 × 2960) · the map `canvas/spec/components-ui.md` (new “v0.6 · round 3” section, updated rows, section F).
Backups of the round-1 files and generator sources: (design source) (four boards, components-ui.md, build.py, parts/, frag/).
How it is built: DS-Patterns is still (design source) over (design source) + `frag/`. Round 3 lives in (design source): `p00…p80.py` + `plt.py` patch the round-1 parts (from the backup) and `run_all.sh` rebuilds the board — run it to regenerate; `build.py` got the Lucide `moon` icon, `frag/minh.html` = 40400, `frag/qr*.html` aria “QR code”. The static boards and the map are patched by `pmain.py`, `pcomp.py`, `pbook.py`, `pmap.py` (same folder, from the backups).
Everything in `en-choices-foundations.md` and `en-choices-patterns.md` still holds unless changed below. Not repeated: wordings given by business/README.md §28 (§0, §1, §9) and the round-3 screen logs I reused as drawn there — B-Shell / B-Login (“Here’s a new code.”, AccountMenu rows, “Owner · Ashgabat”, “Turn on notifications to hear new requests”), B-Calendar (“By 09:30”, “Answer by 09:30 tomorrow”, “average check 145 TMT”), B-Settings (“until 02:00, next day”, moon icon), B-Mobile (Contact Ýeral row “[SUPPORT PHONE] · Telegram”). Format: wording · where · why, when it isn’t obvious.

## Reversed from round 1
- “New clients” / “Next visit” tiles in place of the average → **Average check** again (owner: the business keeps its money figures behind See revenue).
- `firstLaunchCode` as a variant → the code on screen is the **default**; the SMS copy is the later variant `sms`.
- “Send a new code in 0:59” → “Send a new code” → **“Get a new code in 0:59” → “Get a new code”**.
- “1 h” for 60 minutes → **“60 min”**; “spots” → **seats**; “a holiday” for a person → **time off**; “Thu 15, 14:30” / “14 Oct, 11:20” / “today 15:30” → **“ · ”** between date and time.
- “Yes, cancel” / danger-ghost “Cancel” → **“Cancel booking”**; SaveBar “Cancel” → **“Discard”**.
- Account menu / More-sheet “Language” row, AuthCard switcher, DS-Components language popover and top-nav “EN” button → gone at the first release; the variants stay only on DS-Patterns.
- ExampleBadge proposal line → the owner’s line.

## DS · Product components (DS-Patterns)

Wordings I had to choose
- “v0.6 · round 3 …” changes line in the board header; header label “… 20.10.2026 · design pass v0.6, round 3”.
- “Average check · 112 TMT · +4% · 108 TMT in August” (L row), “145 TMT · from completed visits” (client card), “121 TMT · from 12 visits” (no comparison) · 03 StatTile · the v0.5 values, in English.
- “L · row of 4 · owner (See revenue)” · “Hidden value · Admin (no See revenue)” with Bookings 412 · Returning clients 61% · No-shows 3 “0.7% of bookings” · “M · client card header (ClientHeader stats)” · 03 · the hidden-value sample is now the Admin (fixed permissions), not the Specialist’s reports.
- “Stat tile · L 32 (key figures) and M 22 (cards)” · h3 · “reports” are later.
- “Invited · 6 days left” · 01 StatusDot · invites are “Invited (days left)”, no SMS.
- “If only one specialist is away, add their time off in Team → staff member → Hours.” · 02 Callout tip.
- “Online booking is back. The no-show count starts again from zero.” · 02 Callout success (brief’s Phone-only wording) · replaces a help-centre line.
- “Booking cancelled” + “Reason: the specialist is ill. The client is notified.” · 02 Callout slate · replaces the class sample.
- “2 / 3 photos” · “1 more photo” · aria “Photos added” · 02 Progress goal · replaces the reports unlock goal.
- “The business answers by 15:10” · 02 Timeline status caption; “Your visit” + “Thursday, 15 October · 14:30” · numbered step 3 (the reminder step is gone); captions “14 Oct · 14:40”, “Today · 14:40”.
- Facts grid “Time 11:30–13:30 · Duration 2 h · Specialist Aýna · Service Hair colouring · Price from 250 TMT · Source Online” · 03 KeyValueList · an appointment instead of a class.
- Action rows “Business profile — Name, category, photos and address”, “Booking rules — Confirmation, cancellations and no-shows”, “Link and QR — yeral.app/b/glow-studio”; drill-downs “Team — 4 specialists · Aýna, Maral, Jeren, Leýli · 1 invite — Leýli doesn’t use the app.” and “Services — 12 services · Hair, Nails, Face” · 03 ListRow · first-release rows instead of help articles and report drill-downs.
- “Who does it: Aýna, Maral, Jeren, Leýli, Gülnar” · 03 AvatarStack · was “Staff with this access level” (editing permissions is later).
- “Reports and analytics come after the first release, so every chart here is Later — except Rating distribution, which B-Reviews uses from the start.” · 04 section line.
- SignInCodeStep state labels “Empty · code just shown”, “New code · it replaces the old one, timer restarts” (sample “Your code: 7305”), “Locked · 3 wrong codes · Confirm and resend hidden”, “Too many codes · 5 for one number in an hour”; “Business login · AuthCard · code step · boxes 56 · first release: the code on screen”; “Variant sms · later, when SMS is live in a market”; “One step · three places at the first release”; row “SMS link page · later — Only with SMS: …”; “F · Masked · SMS link page · later, with SMS” · 05.
- “Closes after midnight · next day”, “Error · the part after midnight runs into the next day” (aria “Monday: opens / closes”) · 05 TimeRangeField.
- “One language · first release (English) · no tabs, no main-language choice”, “Several languages · later per market (tweak languages: several) · EN · TK · RU”, row help “Business profile · write your texts in it” · 05 LocalizedField (field label “About”).
- “Not at the first release — No global search in the top bar (with its ⌘K) and no help-centre search — both come later. Lists keep their own toolbar search.” · 05 Search.
- “SMS isn’t available in this market.” · 05 ToggleChip tooltip (Later block) · the reason no longer promises SMS for “important messages”.
- “Numbers · single, solid when on · party size (tables, later)” · 05 ChoiceChips label.
- “Seats” · 05 NumberStepper aria (was “Party size” / “Spots”).
- “Search bookings” · 06 phone Bookings header icon aria · it is the list’s own search, not a global one.
- “First release: Calendar · Bookings · Clients · Reviews · Settings + the user block (Your Ýeral page moved into the account menu). A Specialist sees … — Settings is removed, not disabled (her profile is in My profile).” · 06 SideNav caption.
- “Your details” + “Businesses see your name and number when you book.”, rows Name / Phone + “Change” · 06 Settings aside (client profile) · replaces the SMS notification rows.
- “Clients see this name in search and in their bookings.” · 06 settings row caption (was “… and in SMS”).
- “Is Ýeral Business free?” · 06 Accordion · replaces “Are SMS reminders free?”.
- “Numbered instructions · how-to” · 06 label.
- “Gülälek N. will be removed from your clients.” + “Delete client” · 07 confirm modal · no reports, the button names the action.
- “Gülnar will see the invite when she signs in with +993 64 21 55 90. It works for 7 days — until 21 October. …” · 07 invite modal.
- “Booking confirmed · the client is notified” · 07 toast; “Only no-shows count towards the phone-only limit.” · 07 multi-line tooltip sample.
- “The client is notified” · “Keep them” · “Cancel and offer 3 other times” + “The client can pick a new time in one tap” · 08 OptionCard compact (owner’s words for a leaving specialist).
- “No specialist free at 15:00” (warning chip), “Hair” (touch chip), “All staff · One specialist” with users / user icons (segmented with icon) · 08 · replace table samples.
- “Nail Bar Aýna didn’t answer in time. Pick one of these free times:” · 08 TimeSlots · no “within 30 minutes” (the hold counts only while open).
- Breadcrumbs “Home / Beauty salons / Aýnanyň saç studiýasy” · 08 · replaces a help-article trail.
- On-ink set label “… · default / hover / disabled” · 08 Button.
- SoonTag samples “After a title · design-system boards — Book a table · Later”, “In a catalogue row · DS · Categories — Restaurant · Table · Later”, “Not in the product — First-release screens hide what comes later — no nav item, setting, option or action says “Later”.” · 01.
- “M · arrived while closed” + “By 09:30” · 01 TimerPill; legend lines are the brief’s.
- “Shortcut · Later” · 01 Kbd label.
- “Stacked meter · capacity · classes, later”, “seats”, “3 seats left”, aria “14 seats: …” · 02 Meter.
- Long text (09): chip “Status: Pending” / RU “Статус: ожидает подтверждения” (replaces the party-size chip); RU resend “Получить новый код через 0:59”; the account menu as a new nav sample — EN My profile · Your Ýeral page · Open as a client · Contact Ýeral · Log out, RU Мой профиль · Ваша страница на Ýeral · Открыть как клиент · Связаться с Ýeral · Выйти (aria “Аккаунт”); pills now buttons +29 %, tabs +42 %, chips +54 %, badges +25 %, nav +6 %, names +30 %, toasts +12 %, average **28 %** (was 27 %). The Russian is a stress test only.

## DS · Foundations (Main)
- Body sample “The business answers by 15:10. You’ll see it in My bookings.” (brief) · dense “… · 60 min · 40 TMT” · header “Web DS v0.6 · 20.10.2026”.
- Voice 04 “Quiet by default” gains “Later? Not drawn — no “coming soon”” and “No SMS promises — “the client is notified””.
- Voice 05 caption: “No average bill on the client site (a restaurant’s expected bill). The business keeps its money figures — visit totals and each client’s average check, from service prices — shown only with See revenue.”
- Voice 06: row “SMS sender · dev note — Yeral”, caption “Only the domain drops the Ý. Dev note: an SMS sender name, if one is set up, is “Yeral” too.” · no promise of SMS.
- Voice 07: rows “Turkmenistan, later — EN · TK · RU”, “One language — No switcher, no tabs”, “Several — Tabs + main language”; caption “The first release has one language. A business picks its main language in Business profile; missing texts show in the main language. British spelling, sentence case.”
- Format strip (now spaced items, no “ · ” separators so dates can carry one): adds “Thursday, 15 October · 14:30”, “Thu, 15 Oct · 14:30”, “12 Oct · 15:05”, “60 min”, “2 h”; caption “Digits for numbers, 24-hour time; “ · ” joins a date and a time; 60 minutes is “60 min”, longer is “1 h 30 min”. No city in client copy — “near me”, “near you”; a workspace names its city, never a district (“Glow Studio · Ashgabat”).”

## DS · Components
- “Notify the client” · checkbox sample (owner’s switch words) · replaces “Send a reminder”.
- “yeral.app/b/barber-loft” · disabled field (page address format `yeral.app/b/{slug}`).
- Top-nav caption “No language button while a market has one language (the first release: English). The several-languages variants — header segmented, menu row, phone sheet — live only on DS · Product components (LanguageSwitcher).”
- Sidebar: workspace “Glow Studio” / “Ashgabat”; items Calendar · Bookings (6) · Clients · Reviews (4) · Settings; caption “First release: five items, no Reports or Help (later). The workspace shows its city, never a district.”
- Table: “Export CSV”, rows “60 min · 40 TMT”, bulk bar Confirm · Decline · Export CSV; caption adds the bar’s actions.
- Modal: “Thursday, 15 October · 14:30”; Popover caption drops “language”. h2 “Top nav, sidebar, pagination”.

## DS · Categories & booking types (DS-Booking)
- Class: “Number of seats”, “the next session and seats left”, “Hatha yoga · Tomorrow · 08:00 · 60 min”, “3 seats left”.
- Table card: the “Menu · Price at the place” row is removed.
- “Statuses and confirmation” (was “…, reminders” — no reminders are promised); Money caption “No average bill on the client site — a table card shows no expected bill.”

## Components added, renamed, removed
DS-Patterns
- **Changed:** StatTile samples (Average check back; hidden value = Admin), SignInCodeStep (first-release copy default, 9 code states with the code callout, rate limit hides Confirm / resend and disables the boxes), SignInCodeStep `firstLaunchCode` → **`sms`** (later variant, drawn as the client modal), LocalizedField (OneLanguage default + Several with “Main language” select), TimeRangeField (**NextDay** pill with the Lucide `moon` icon + the next-day error), TimerPill (closed variant “By 09:30”), StatusLegend (two timer rows, phone header without search), AccountMenu (My profile · Your Ýeral page · Open as a client · Contact Ýeral · Log out), MoreSheet (no Reports / Help / Language; Contact Ýeral), SideNav + Rail (five items), AppTopBar (no global search), SettingsLayout (no Notifications), WorkspaceSwitcher rows (access level · city), Button / Modal / Drawer / SaveBar words, bulk bars, OptionCard compact (owner’s words; help tiles removed), ExampleBadge line, SoonTag samples, Long-text rows (account menu added).
- **Tagged “Later”** (kept for later, not first release): Charts (all but RatingDistribution), MessageThread, FeedbackPrompt, ToggleChip, Party size / NumberChips limit, Kbd.
- **Removed from the drawing:** GlobalSearch and HelpSearch samples, PeriodNavigator sample, Checklist unlock list, floor-table ring sample, support-chat drawer header, help-category tiles, composer attach, SoonTag nav-item and disabled-action samples, the AuthCard language switcher, the Language rows (first-release samples).
- `<html lang="tk">` → `lang="en"` (round-1 leftover); aria “QR kod” → “QR code” in both QR fragments (round-1 leftover).
DS-Components: language-switcher popover and the top-nav language button removed (script state `lang` / `langs` removed); sidebar redrawn (five items + city); bulk bar actions changed.
DS-Booking: table-card price row removed.
Foundations: two Voice rows added (Quiet by default), one language row added, format strip re-laid as spaced items.

## Decided while drawing
1. **Later on the design-system boards:** components that only serve later features stay on DS-Patterns with a “Later” tag in the title and caption (as DS-Booking does for tables and classes); first-release-looking samples — navs, menus, settings, bars, search, the AuthCard — lose later items entirely.
2. Rate-limited code step = like the lock: boxes disabled, code callout, Confirm and resend hidden; the message gives the wait (“42 minutes”). Same as B-Login round 3.
3. Average-check sample values are the v0.5 ones (112 / 108, 145, 121 from 12 visits = 1,450 TMT ÷ 12).
4. Danger confirms name the action (“Delete client”, “Cancel booking”) — extends round 1’s DS-Components rule to DS-Patterns. (The delete-client body and the Cancel button were then aligned with the screens in the consistency pass below.)
5. Sample counts follow the demo: 6 requests (sidebars, tab bars, page-header tab, drawer pager “1 / 6”).
6. The drawer item-actions footer: “Cancel booking” wraps to a second line, right-aligned, when the three actions don’t fit 480 (B-Calendar round 3).
7. LocalizedField’s several-languages sample keeps English as the main language (no Turkmen copy on the board); the caption says a Turkmen-only business picks Türkmençe.
8. Foundations’ “never a city name” is narrowed to client copy; a workspace shows its city (brief §1).
9. The SMS sender stays only as a dev note on Foundations; the ToggleChip (Later) keeps an SMS chip with a neutral n/a reason.
10. The phone Bookings header keeps a search icon — it opens the list’s own search (aria “Search bookings”).
11. The ActionBar summary line “Thu, 15 Oct · 14:30 · 80 TMT” may wrap to two lines (was a one-line ellipsis) — found by the long-text check.
12. Frames re-measured in a local headless render with a fallback font (Onest isn’t available offline): DS-Patterns content ≈ 40 370 → frame 40 500 (was 38 800); Foundations ≈ 5 459 → 5 520 (was 5 400); Components ≈ 5 267 → 5 340 (was 5 280; six table rows after the consistency pass); Categories ≈ 2 898 → 2 960 kept.
13. Not fixed (older than this round, outside my changes): on DS-Components the “Form layout” card pushes the page to 1 459 px when every label is 30 % longer; on DS-Patterns the CheckboxGroup “All” button and rows reach 8 px into the right page margin (round 1); the client-card “Last visit” caption ellipsis (round 1).
14. For the lead (not my files): EN-GLOSSARY §3 still lists “Send code · Send a new code in 0:59 → Send a new code” and “My profile · Language …”; `en-choices-patterns.md` round-1 lines on “1 h”, “spots”, “holiday”, firstLaunchCode and the average-bill removal are superseded by this log.

## Checks
`check_dc.py` + `dccheck.py` on all four boards: no errors (only the known html/body note); node syntax check + a `renderVals()` run of each script; DS-Patterns rebuilt twice from the sources with an identical result (`run_all.sh`); local render (expand.js + headless Chromium) of every board at 1440 — heights above, cut / overflow scan (no new issues against round 1), screenshots of every changed block; **long-text check** — every button, tab, chip, pill, badge, nav and menu item, label and table header lengthened by 30 % on all four boards: no new cuts or overflow apart from data ellipses (workspace and service names) and menu items wrapping to two lines as the rule allows; one caption fixed (item 11).

## Consistency pass (coordinator, after (design source) — the screens win)
Source changes: (design source) (DS-Patterns, last step of `run_all.sh`), `pcomp.py`, `pmain.py`, `pmap.py`. Wordings taken from the screens, not chosen by me unless marked “mine”.
- **Invite modal** (DS-Patterns 07): title “Add a team member”; rows “Mobile number · +993 65 47 30 22”, “Name · Ýazgül · Nail technician” (B-Team’s open invite), “Access level · Specialist”; note “They’ll see the invite when they sign in with +993 65 •• •• 22. It works for 7 days — until 21 October. You can also copy the invite link in Team and send it yourself.” (B-Team) — replaces the gendered, unmasked Gülnar line.
- **Notification ask** (02 Callout): “Turn on notifications to hear new requests.” — with the full stop (B-Shell, DS-Business).
- **Legends** (01 StatusBadge meaning, legend popover, phone sheet): No-show “The client didn’t come — marked with Report from the visit’s start”; “Busy elsewhere — the time is taken in another workspace; no details are shown” (the phone sheet now spans two columns with the full line).
- **Tooltip** (07): “Only no-shows count towards Phone only.”
- **Delete client** (07): “Gülälek N. is removed from your clients, with the team’s notes. Past bookings stay in the calendar without the client’s name. You can’t undo this.” + **Cancel** · Delete client (B-Clients / B-Client). Modal caption: a plain “Cancel” dismisses; “Back” only where the action itself cancels a booking.
- **In review** (02 warning page banner and the client-page owner preview): “Your page is in review — only you and your team can see it. After the review it opens in search and at your link. You can use the calendar now.”
- **OptionCard** (08) “Cancel and offer 3 other times”: “Each client picks a new time in one tap in My bookings.”
- **Demo data:** client card “Last visit · 28 Sep · Hair colouring · Aýna”; the quote sample becomes Gülälek N.’s review of that visit — “2 weeks ago”, “Aýna got the colour exactly the way I wanted. …” (mine, so it comes from a completed booking); request counts “6 requests” (01 toolbar shortcut ×3 + aria, 06 DateNavigator chip and summary line); Glow Studio “4.9 (96)” / “4.9 (96 reviews)” (ExampleBadge card and page header); “Team — 5 specialists · Aýna, Maral, Jeren, Leýli, Gülnar · 1 invite”; “Services — 12 services · Hair, Nails, Face, Massage”; “Bridal hair styling” (s12) in the Price samples and caption.
- **DS-Components table** now uses the business boards’ data: header “Bookings · This week · 12–18 October” (B-Bookings’ date filter); rows Aýjemal G. · Women’s haircut · 60 min · 80 TMT · Aýna · 14:30–15:30 Tomorrow · Pending; Arzygül H. · Facial cleansing · 60 min · 150 TMT · Jeren · 10:00–11:00 Fri, 16 Oct · Pending; Gülälek N. +993 65 44 70 19 · Hair colouring · 2 h · from 250 TMT · Aýna · 11:30–13:30 Today · Confirmed; Döwlet B. (phone) · Children’s haircut · 30 min · 40 TMT · Aýna · 17:00–17:30 Today · Confirmed; Aýgül R. · Manicure · 60 min · 70 TMT · Maral · 09:30–10:30 Today · Completed; Ogulnabat Ç. · Facial cleansing · Jeren · 10:00–11:00 Today · No-show. The Time column gets the day as a second line (as DS-Patterns’ table). No Myrat, Begenç, Serdar, Tymur A., Merdan K. or Aýdym Ş. any more; the input samples use the same staff (select Any specialist · Aýna · Maral · Jeren · Leýli, focus value “Gülälek”).
- **Short dates:** every weekday date on the four boards already reads “Fri, 16 Oct · 10:00” (checked; the date-strip tiles keep their two-letter day labels).
- **Money rule (owner):** prices are booking information everyone who sees a booking sees (Admin included); See revenue covers only sums — revenue lines, client totals, the average check, earnings. Changed: DS-Patterns Table caption (Price column for everyone, the total row only with See revenue), StatTile caption, Foundations Voice 05 caption (“Prices are booking information everyone who sees a booking sees; sums — revenue, visit totals, each client’s average check (from service prices), earnings — only with See revenue.”), the map’s Table / StatTile rows.
- Map `components-ui.md`: frame line, round-3 summary (consistency note, invite wording) and rows Modal, Table, StatTile, Callout, StatusLegend, OptionCard, Tooltip, ListRow, Price.
- Checks rerun: `check_dc.py` + `dccheck.py` on all four boards (no errors), node syntax + `renderVals()` run, local render and the long-text check on DS-Patterns, DS-Components and Foundations (no new cuts or overflow; DS-Components’ “Form layout” page overflow with +30 % labels is the older issue noted above). Frames: DS-Patterns 40 500, DS-Components 5 340.
