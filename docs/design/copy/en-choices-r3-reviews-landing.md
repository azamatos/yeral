# English choices: B-Reviews + B-Landing · design pass v0.6, round 3 (20.10.2026)

Files: `screens/business/B-Reviews.dc.html` (page, **1440 × 4480**, was 1440 × 1980; interactive) · `screens/business/B-Landing.dc.html` (page, 1440 × 4020, unchanged; interactive). Both were Turkmen; both are English now.
B-Reviews is built by (design source) (+ `reviews_logic.js`): it lifts the English shell (sidebar, switcher, account menu + Contact Ýeral, banners, tab bar, More sheet) from the current `B-Bookings.dc.html`, so rerun it if that shell changes (`python3 build_reviews.py`). B-Landing is hand-edited. Backups of the round-2 (Turkmen) files: (design source), (design source). Render / long-text helper: (design source); logic play-through: `_play.js`.
Not repeated here: wordings from the glossary, the round-1/2/3 logs (DS-Business section 06 and 10 words, “Show more”, “Clear filters”, “Which businesses is it for?”, “How do clients book?”) and the brief (“Ýeral is checking · not counted in your rating”, “Start free”, “Try the business app”, the Demo banner, “How to start”, “Ýeral Business is free”, Contact Ýeral `[SUPPORT PHONE]` / `[TELEGRAM]`).

## Tweaks
- **B-Reviews:** `role` owner · admin · specialist (Access) · `filter` all · unanswered · `composer` (on) · `report` (off — opens the report modal on Merdan K.’s review, which is then not reported yet) · **`moderation`** none · checking (default) · cleared · removed · noDecision · **`first`** (one review: 5.0, 1 review) · **`empty`** (no reviews) · `banner` none · inReview · notApproved · demo · `font`.
- **B-Landing:** **`menu`** (phone menu open; new) · `font`.

## Wordings I had to choose
### B-Reviews (`business.yeral.app/w/glow-studio/reviews`)
- “Ýeral Business — reviews” · document title.
- “1 more isn’t counted while Ýeral checks it” (“N more aren’t counted while Ýeral checks them”) · under “96 reviews” in the rating summary while a reported review is being checked · says why 97 visible reviews show as 96.
- “Show 4 not answered” · aria of the “Not answered · 4” pill-button.
- “Reviews about you, from clients after their visits. The owner and admins reply to them.” · specialist view, instead of the summary.
- “Ýeral removed a review you reported.” + “Merdan K.’s review no longer shows on your page or counts in your rating.” · removed notice (+ Close).
- “Ýeral kept this review” + “It counts in your rating again and can’t be reported again.” · moderation outcome *cleared* (neutral pill, shield-check icon).
- “No decision in 48 hours” + “It counts in your rating again.” · moderation outcome *no decision* (neutral pill, clock icon).
- “Filter reviews” (chip group aria) · “5 stars” / “1 star” (star chip arias) · “Specialist” chip, “Specialists · 2” when two are picked · popover title “Specialists”, aria “Filter by specialist”, buttons “Clear” · “Done”.
- “Sort” (aria) · options “Newest first · Oldest first · Lowest rating first · Highest rating first”.
- “Review by Merdan K.: actions” · review menu aria.
- “Reply to Döwran S.” · “Change the reply to Gülälek N.” · “Delete the reply to Gülälek N.” · arias.
- “For example: Thank you, Mähri! See you again soon.” (4–5 stars) · “For example: We’d like to understand what happened — please call us on +993 12 45 67 89.” (the reported review) · composer placeholders; the low-rating one is DS-Business’s.
- “Save” · composer button when changing a reply (“Post reply” for a new one).
- “Just now” · time of a reply just posted.
- “Reply posted” · “Reply updated” · “Reply deleted” + Undo · “Report sent · Ýeral checks it within 48 hours” · toasts.
- “Explanation (optional)” / “Explanation” (required with “Another reason”) · report modal text field; placeholder “For example: the review is about another salon” (the old “this person never booked with us” contradicts “every review comes from a completed booking”).
- “The Ýeral team checks it within 48 hours. Until then the review stays visible but isn’t counted in your rating.” · report modal caption (adds the counting rule).
- “Cancel” · report modal (was “Back”: a plain Cancel closes a form, brief §1).
- Empty states: “No reviews yet” + “Clients can leave a review after a completed visit. Their reviews show here and on your page.” + link “See your page” · specialist “No reviews about you yet” + “Clients can leave a review after a completed visit with you. Their reviews show here.” · all answered “You’ve answered every review” + “New reviews show up here.” + “Show all reviews” (replaces “we’ll let you know”) · filters “No reviews match these filters” + “Try another rating or specialist.” (specialist: “Try another rating.”).
- “Showing 20 of 97” · caption under “Show more”.
- “You can’t delete reviews. Report one only if it’s false, abusive or an ad.” · footnote.
- “Reviews about you” · list aria in the specialist view.
- Sample reviews: superseded by the B9 list at the end of this file (every reviewer fits the client data).

### B-Landing (`business.yeral.app`, signed out)
- “Ýeral Business — free online booking” · document title; “Ýeral Business home” · logo link aria; “Business” · lockup tag (was “Biznes”).
- Header nav “Features · How to start · Questions” (“Questions” → `#faq` replaces “Kömek”/Help: no help centre); nav aria “Main”; phone menu adds “Try the business app” (flask icon) above “Log in”.
- Hero: eyebrow “For businesses that work by appointment” · H1 “Let your clients book online” · lead “Your calendar, requests and client list in one place. Salon, dentist, tutor or car service: start in 5 minutes.” · caption “Free · No card needed” · demo note (flask icon) “The business app opens a demo workspace at once, without signing in. Changes reset every night.”
- Hero mock (aria-hidden): “Wed, 14 Oct” · “1 request” · Stylist / Nail technician / Beautician · “Break” · “18 min” · toast “New request” / “Ejegyz T. · Today · 15:30” / “Women’s haircut · Aýna” / “Confirm” · phone “Booking sent” / “Pending” / “Glow Studio answers by 11:38. You’ll see it in My bookings.” / “Aýna · Today · 15:30” / “Go to my bookings”. Screen-reader line “An example of the Ýeral Business calendar: three specialists’ day, a new request waiting for an answer, and the client’s phone showing “Booking sent”.”
- “Who it’s for” + “For any business that works by appointment — from one specialist to a big team.”; tiles Beauty salon (Hair, face, make-up) · Barbershop (Haircuts, beards) · Nail studio (Manicure, pedicure) · Spa and massage (Massage, body care) · Dentist (Check-ups, cleaning) · Physiotherapy (Treatment, rehab) · Personal trainer (One-to-one workouts) · Tutor (Languages, music, school subjects) · Car service (Repairs, tyres, car wash) · Pet care (Grooming, vet visits).
- Features sub “From bookings to reviews — all your work in one place, on a computer or a phone.”; new items “Reviews — After a visit, clients leave a review. You reply, and everyone sees your answer.” and “Link and QR — Your own page with services, prices and free times. Share the link and put the QR code by your door.” (the other four are DS-Business’s).
- How to start: pill “In 5 minutes” · “Sign up — Enter your phone number — we’ll show you a 4-digit code. No password needed.” (the brief’s sign-in lead) · “Add your services and hours — There’s a ready list of services for your category: just set your prices and durations.” · “Share your link — Put your page’s link on Instagram and the QR code by your door — clients book from there.” + chips “yeral.app/b/glow-studio” · “QR code” · caption “The Ýeral team checks every new business within 24 hours. You can use the calendar at once; your page shows in search after the check.”
- Free band: sub “Every feature is free — for one specialist or a big team.” · “Every feature — Calendar, online booking, client list and reviews” · “On a computer or a phone — Works in the browser — nothing to install” (replaces SMS reminders) · “No card needed — Start with just your phone number” · button “Create a business”.
- FAQ: “Common questions” · “Didn’t find your answer? Contact Ýeral — we’ll help.” · rows “Call [SUPPORT PHONE]” · “Write on Telegram [TELEGRAM]” (account-menu words) · Q “Is Ýeral Business free?” A “Yes. Every feature — calendar, online booking, client list and reviews — is free. There’s no limit on staff, and you don’t need a card.” · A (which businesses) “… beauty salons, barbers, nail studios, dentists, physiotherapy, tutors, car services, pet care. It works for one specialist or a big team. If you work at more than one address, each address is its own workspace — you open them all with one login.” · A (how clients book) “Clients find you in Ýeral search, or open your page from your link or QR code. They choose a service, a specialist and a free time, and send the booking with their phone number. They don’t need to install an app.” · Q “How do I confirm a booking?” A “A new request shows in your calendar and bookings list. Press Confirm or Decline — when you decline, you can give a reason and offer other times. A request nobody answers within the time you choose (15 min to 24 h, counted only while you’re open) is cancelled, and the client is offered 3 other times. You can also turn on instant confirmation.” · Q “Can clients pay online?” A “No. Clients pay at the place, as they do now. Ýeral doesn’t take card payments or prepayments.” · Q “Is my data safe?” A “Only you and your team see your client list. Each person on the team has an access level — Admin or Specialist; a specialist sees only their own bookings and clients. Everyone logs in with their phone number and a one-time code.”
- CTA band: “Take your first online booking today” · “Signing up takes 5 minutes, and you can use the calendar at once.” · “Free · No card needed”.
- Footer: “Online booking, a calendar and a client list for businesses that work by appointment.” · “Book on Ýeral as a client: yeral.app” · columns “Product” (Features · How to start · Try the business app · Log in) and “Contact Ýeral” (Common questions · Call [SUPPORT PHONE] · Write on Telegram [TELEGRAM]) · “Privacy policy” · “Terms of use”.

## Components added, renamed, removed
- **B-Reviews shell:** the round-2/3 English shell copied from B-Bookings (WorkspaceSwitcher “access level · Ashgabat”, DemoSidebar + “Log in”, AccountMenu without Language + ContactMenu, BusinessStatusBanner In review / Not approved / Demo, BottomTabBar with More active, MoreSheet with Reviews active). Removed: top-bar global search (+ ⌘K), Reports, Help and “Your Ýeral page” from the sidebar, “Glow Studio · Parahat”, the Language row. Reviews badge = unanswered count (4), hidden for the Specialist; Bookings badge 6 (Specialist 2).
- **RatingSummary:** “Average reply time” removed; dotted badges → **Pill L with icons** (“Not answered · 4” warning + reply icon, a button that applies the filter; “All reviews answered” success + check); new uncounted line; shows from the first review (`first`); hidden for the Specialist.
- **ReviewItem:** Anonymous variant removed; new **StarsOnly** (no text); every item names service · specialist; the “…” menu (Report only) is hidden once there’s nothing to do; new **ModerationLine** Checking (warning, wraps to two lines) · Cleared · NoDecision; **ReadOnly** for the Specialist (no menu, no Reply, no Change / Delete).
- **ReviewRemovedNotice** (neutral callout, trash icon, Close) — new.
- **ReportReviewModal:** Back → Cancel, quote shows service · specialist (no quote line for a stars-only review), caption adds “isn’t counted in your rating”.
- **ReviewsPager** — “Show more” + “Showing 20 of 97” — new. Empty states NoReviews (+ specialist), AllAnswered (no notification promise), NoMatch.
- Specialist filter popover: a bottom sheet under 768 (it ran off the screen at 390).
- **B-Landing:** language picker removed (header TK button, phone-menu row, footer Language column); hero secondary “How it works” → **“Try the business app”** + **DemoNote** caption; category tiles Restaurant and Yoga → Spa and massage, Personal trainer; features SMS reminders and Reports → Reviews, Link and QR; free band SMS item → “On a computer or a phone”; **FAQ contact rows** (Call / Write on Telegram) replace “+993 12 00 00 00”; footer Help centre, the number and Language removed, “Contact Ýeral” column; anchors `#features #how-to-start #free #faq`; mock toast 284 → 304 wide, mock header date compact.

## Decided while drawing
- **Counting:** the demo’s 96 counted reviews (88 / 6 / 1 / 1 / 0, 4.9) don’t include Merdan K.’s reported 1-star review. `none`, `cleared` and `noDecision` count it (97 · 4.8 · 1 star: 1); `checking` and `removed` don’t (96 · 4.9). A review Ýeral is checking still shows in the list, the filters and “Showing 20 of 97”.
- **No decision in 48 hours** counts again and **can’t be reported again** (same as cleared): one report per review, otherwise a business could keep a review out of its rating by reporting it again.
- **Hidden, not greyed:** after a report the “…” menu disappears (it held only Report). Replying stays possible during and after moderation (spec §15).
- **Removed:** the review leaves the list (unanswered 4 → 3, “Showing 20 of 96”); a neutral notice sits above the filters until closed, for the owner and admins.
- **Reported review** = Merdan K. · Back massage · Leýli (was “Anonymous” with no service). Stars-only reviews: Aýjemal Gurbanowa (not answered; “Aýjemal G.” until round 3.2) and Jemal S. (answered). First-name-only reviewer: Gyzylgül (a client saved without a surname). Reviewers fit the client data — see B9 below.
- **20 per page:** the board draws page 1 (20 of 21 drawn reviews). The caption “Showing N of M” shows only when the total is known (owner / admin, All or a star filter, no specialist filter); the Specialist gets “Show more” without a count; the Not answered filter shows all 4. “Show more” doesn’t load anything on the board.
- **Specialist (Aýna Myradowa):** only reviews about her (6 on page 1), read only; no summary or count, no Not answered chip, no Specialist filter, no footnote, no Reviews badge, no Settings; star chips and sort stay; business replies show without Change / Delete.
- **Admin = owner on this page** (reply, report, change / delete any business reply). New replies are signed “Glow Studio · Selbi” for the admin, “Glow Studio · Maýsa” for the owner, “Glow Studio” in the demo; changing a reply keeps its author and time.
- **Empty:** no summary and no filters; owner / admin get a “See your page” link; nothing promises a notification.
- **“Not answered · 4”** is a Pill L (28 px) used as a button; hover = border #dc8b0b (token audit).
- **Landing “Try the business app”** links to `B-Calendar.dc.html` (its `banner: demo` state is the demo workspace, as on B-Login and B-Onboarding); the demo is explained in a caption under the hero buttons, not a preview, so the hero keeps one main action.
- **Landing third nav link “Questions”** → `#faq` (replaces Help: no help centre). “How to start” → `#how-to-start` (the 3 steps).
- **Categories:** 10 tiles taken from the round-2 appointment list.
- **Free band:** the SMS item became “On a computer or a phone” (no SMS promise, no pricing).
- **FAQ:** no data export; the hold time uses the Settings list (15 min to 24 h, counted only while open) and the Settings outcome (“the client is offered 3 other times”).
- **Mock phone line** “Glow Studio answers by 11:38” (18 min left at 11:20), following the brief’s sent-screen line.
- **No city names** in landing copy (and none in the mock).
- **Frame heights:** B-Reviews 1440 × 1980 → **1440 × 4480** (20 reviews on page 1; measured 4 476 with Inter after B9); B-Landing stays 1440 × 4020 (measured 3 964). The canvas position of B-Reviews needs the taller frame.
- For B-Mobile (landing at 390, reviews from More): the first three reviews are unchanged by B9 (Döwran S. · Today, Mähri G. · Yesterday, Merdan K. · Yesterday, reported); the fourth is now Gözel A. · Yesterday · Back massage · Leýli (answered), then Aýjemal Gurbanowa · 2 days ago (stars only, not answered). Phone rules kept — landing hero buttons fill the width, mock without the phone, menu via tweak `menu`; Reviews summary stacks, chips wrap, sort full width, composer and modal as bottom sheet, specialist filter as bottom sheet.

## Checks
`check_dc.py` + `dccheck.py` clean on both (only the known html/body note; the landing script now returns every hole explicitly, so the old “missing holes” report is gone); `node --check` of both scripts; node play-through of the Reviews logic (23 checks: counts per moderation state, reply / change / delete + Undo, report with “Another reason”, filters, page of 20, specialist read-only, admin author, first, empty, demo); local render (expand.js + Chromium) of 23 Reviews states and 4 Landing states at 1440, 900 and 390 — no cuts or overflow except the known false positives (min-height menu rows and tab-bar items) and the landing mock’s by-design ellipses (the same as on the Turkmen board); **long-text check** (every button, chip, pill, tab, label, link and header lengthened by ~30 %) at 1440 and 390 on both pages: labels wrap or buttons grow, nothing new is cut; only the shared account-menu row “Open as a client · yeral.app” wraps to two lines (shell markup from B-Bookings).

## B9 · round-3 consistency fix (reviewers fit the client data)
Asked by the coordinator ((design source) item B9): every review must come from a completed booking that fits the client data on B-Clients / B-Client / B-Calendar — the visit is before the review, its service and price fit the client’s visits and average check, and its specialist fits the “has a booking with Aýna” flag. Names not drawn on B-Clients are other clients of the workspace’s 148. ~~Reviews show the first name + initial~~ — replaced in round 3.2: B-Reviews is a staff screen, so each reviewer shows as the saved client name (see the Round 3.2 line below).

**Removed / changed reviewers**
- Ejegyz T. and Arzygül H. — 0 visits (New, only a pending request) → removed.
- Gözel A. — her only visit is 13 Oct (90 TMT) → review now **Yesterday · Back massage · Leýli** (the service she’s booking again today), new text.
- Läle O. — 2 visits, 220 TMT, no booking with Aýna → **Gel manicure · Maral** (110 TMT × 2), 3 weeks ago (visit 20 Sep), new text and reply.
- Also fixed: Gülälek N. reviewed a Women’s haircut “2 days ago” but her last visit is 28 Sep Hair colouring → **Hair colouring · Aýna · 2 weeks ago**, new text (mentions the ammonia-free / allergy note) · Mahym D. (last visit 3 Jul, lapsed) and Ogulgerek (Ogulgerek M., last visit 21 Jun) → removed · Aýgözel → **Aýgözel S.** (saved surname) · Women’s haircut · Aýna (80 TMT average, visit 11 Sep) · Jemal S. (last visit 9 Sep on B-Calendar) → 1 month ago · Sona P. → 2 weeks ago (visit 1 Oct) · Aýsoltan R. → 3 weeks ago (visit 23 Sep) · Jahan M. → 3 weeks ago (visit 25 Sep; 2 visits = Pedicure 90 + Brows and lashes 50) · Bahar A. → 1 week ago (visit 6 Oct).
- `first` state: Ogulşat M. · Today · Women’s haircut · Aýna (her 09:00 visit today, booked online) “Quick, neat and right on time.” (was Gülälek N.).
- Unanswered stays 4 (Döwran S., Mähri G., Merdan K., Aýjemal Gurbanowa); totals unchanged (96 counted · 97 visible · 4.9). The first three reviews (B-Mobile frame 12) are unchanged.
- New names checked against every board: Sähra T., Annagül R., Gyzylgül, Gülşat N. are not used elsewhere (Ýazgül, Bägül and Täzegül are taken on B-Team); Myrat B. appears only on the later B-Tables; Döwran S. and Enejan B. as before / as on B-Clients.

**New list, page 1 (newest first) + the 21st on page 2** — name · service · specialist · age · stars (· reply)
1. Döwran S. · Hair styling · Aýna · Today · 2★ · not answered (composer open)
2. Mähri G. · Manicure · Maral · Yesterday · 5★ · not answered (visit 2 Oct)
3. Gözel A. · Back massage · Leýli · Yesterday · 5★ · “Leýli found exactly where it hurt. My back feels so much better.” → “Thank you, Gözel! Come again soon.” (visit 13 Oct)
4. Merdan K. · Back massage · Leýli · Yesterday · 1★ · reported, not answered (visit 5 Oct)
5. Aýjemal Gurbanowa · Women’s haircut · Aýna · 2 days ago · 5★ · stars only, not answered (visit 18 Sep)
6. Sähra T. · Brows and lashes · Jeren · 3 days ago · 5★ · “Neat brows in half an hour, right on time.” → “Thank you, Sähra! See you next time.” (Selbi)
7. Myrat B. · Full body massage · Leýli · 5 days ago · 5★ · “Good massage in a calm room.” → “Thank you, Myrat!”
8. Bahar A. · Facial cleansing · Jeren · 1 week ago · 4★ (visit 6 Oct)
9. Ogulşat M. · Gel manicure · Maral · 1 week ago · 5★ (7 visits, last today)
10. Annagül R. · Pedicure · Maral · 1 week ago · 4★ · “A good pedicure, but the room was a bit cold.” → “Thank you, Annagül — the heating is fixed now.” (Selbi)
11. Sona P. · Brows and lashes · Jeren · 2 weeks ago · 5★ (visit 1 Oct)
12. Nurjahan A. · Full body massage · Leýli · 2 weeks ago · 5★ (visit 30 Sep)
13. Gülälek N. · Hair colouring · Aýna · 2 weeks ago · 5★ · “Aýna got the colour exactly right and remembered my allergy. The salon is clean and calm.” → “Thank you, Gülälek! See you again soon.” (visit 28 Sep)
14. Gyzylgül · Manicure · Maral · 2 weeks ago · 5★ · “Quick and neat.” → “Thank you, Gyzylgül!” (Selbi)
15. Jahan M. · Brows and lashes · Jeren · 3 weeks ago · 4★ (visit 25 Sep)
16. Aýsoltan R. · Hair styling · Aýna · 3 weeks ago · 5★ (visit 23 Sep)
17. Läle O. · Gel manicure · Maral · 3 weeks ago · 3★ · “The gel polish chipped after a week. Maral fixed it for free.” → “Läle, we’re sorry it chipped so soon. We’re glad Maral could put it right.” (visit 20 Sep)
18. Aýgözel S. · Women’s haircut · Aýna · 1 month ago · 5★ · “Aýna always listens before she cuts.” → “Thank you, Aýgözel!” (visit 11 Sep)
19. Jemal S. · Pedicure · Maral · 1 month ago · 5★ · stars only → “Thank you, Jemal!” (Selbi; visit 9 Sep)
20. Enejan B. · Hair styling · Aýna · 1 month ago · 5★ · “My hair looked great all day.” → “Thank you, Enejan!” (visit 4 Sep; 3 visits, 70 TMT average)
21. (page 2) Gülşat N. · Facial cleansing · Jeren · 1 month ago · 5★ · “Clean, calm and on time.” → “Thank you, Gülşat!”
Aýna’s specialist view (page 1): Döwran S., Aýjemal Gurbanowa, Gülälek N., Aýsoltan R., Aýgözel S., Enejan B.

**Note for DS-Business 06 (not my file):** its round-1 sample “Gülälek N. · 2 days ago · Women’s haircut · Aýna” no longer matches; B-Reviews now has her Hair colouring review 2 weeks ago.

**Checks after B9:** rebuilt from the regenerated B-Bookings (14:39; shell identical to the previous build); `check_dc.py` + `dccheck.py` clean; `node --check`; play-through 23/23; renders of all 23 states at 1440 (no issues) and the long-text pass at 1440 and 390 (no new cuts); frame 1440 × 4480 (measured 4 476).

## Round 3.2 · saved client names on staff screens (owner rule)
- B-Reviews is a staff screen, so each reviewer shows as the **saved client name**: “Aýjemal G.” → **“Aýjemal Gurbanowa”** (her saved name on B-Clients / B-Client). Clients saved with an initial (Döwran S., Mähri G., Gülälek N., Aýgözel S., …) or a first name only (Gyzylgül) stay as saved. First name + initial is only what clients see on the client site. This replaces the round-3 decision “reviewer = first name + initial” on this board (and in the B-Mobile note above). Rebuilt from the current B-Bookings; `check_dc.py` + `dccheck.py` clean, `node --check`, play-through 23/23, 1440 / 390 renders and the long-text pass without new cuts; frame stays 1440 × 4480.
- Same rebuild: the current B-Bookings shell adds the **Hidden by Ýeral** banner (“Ýeral has hidden your page: …” + Contact Ýeral; not shown to a Specialist), so the B-Reviews `banner` tweak gains **`hidden`** (none · inReview · notApproved · hidden · demo) with the same `bnHidden` logic as B-Bookings.

## Round 3.4 · request hold never runs past the visit’s start (owner)
- B-Landing FAQ “How do I confirm a booking?”: the hold-time sentence now reads “A request nobody answers within the time you choose (15 min to 24 h, counted only while you’re open, and never past the visit’s start) is cancelled, and the client is offered 3 other times.” Only this clause changed. `check_dc.py` + `dccheck.py` clean, `node --check`, FAQ-open renders at 1440 and 390 (normal and long text) without new cuts; frame stays 1440 × 4020.
