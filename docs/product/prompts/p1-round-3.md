# P1 · Round 3 — business app part 2, and fixes to rounds 1–2

Written by Claude Code on 20.10.2026 for the owner to paste into Claude Design (canvas "Ýeral Web") after round 2.
Source: the product book, chapters 3, 5, 6, 7b and 8 (every **Design to fix** line for these screens), and the checks of
rounds 1 and 2 below. Round 4 (client site) is split into 4a and 4b (chapter 10, P1).

## Checks of rounds 1 and 2 (20.10.2026)

The export (v0.6 round 2) matches the canvas apart from image paths and is committed. Both rounds follow their prompts:
English everywhere, statuses with icons, the Example badge, the shared code step with the on-screen code, the language
switcher, the long-text block, the Later page, addresses, the five-item sidebar, busy elsewhere, block time, the closed
request timer, reports, the leave flow and the banners. The designer's own decisions agree with the book (chapter 9,
20.10.2026). What doesn't is fixed in section 9 of the prompt:

- **Round 1 removed the business's average check** with the restaurant's average bill: the round-1 prompt said "no
  average bill anywhere". The business keeps its money figures (Q-134).
- **SMS promises** stayed on the design-system boards; the first release sends none (Q-036).
- **Words:** classes have *seats*, not spots (chapter 2); a person's absence is *Time off*, not Holiday (holidays are the
  business's special days); 60 minutes is `60 min` (chapter 2); date and time join with " · ".
- **Later features still drawn as current:** Reports and Help in sample navs, bulk move, global search (F-136),
  ownership transfer (F-092), the table card's "Menu" row (F-239).
- **Book rules the boards miss:** "Came late" only from the visit's start (Q-206, revised 20.10.2026); No-show only
  until 24 hours after the visit (Q-254); 5 codes per number an hour, not 3 (Q-267); the part of a day after midnight
  ends before the next day opens (Q-105); the switcher and invites name the city (Q-107).
- **The first release drawn as a variant:** sign-in defaults to the SMS copy, a language switcher shows with one
  language, and the demo workspace needs a sign-in and joins the switcher, where the book has it open to anyone
  without signing in (F-242).
- **Small drift:** request counts (5 vs 6), two demo clients' facts, legend wording, "1 requests".

## Prompt

```
Round 3 of the design pass (export v0.6): the business app, part 2, plus fixes to rounds 1 and 2. Everything from
round 2 still holds (business/README.md §27): English with the round-1 words and components, addresses
business.yeral.app/w/{slug}/…, the five-item sidebar, Owner · Admin · Specialist with "Uses the app", no SMS promises
at the first release. Tokens and visual style don't change.

Scope: B-Clients, B-Client, B-Team, B-Settings, B-Services, B-Reviews, B-Landing; phone frames for them on B-Mobile;
new pieces on DS · Business patterns; the fixes in section 9 on the round-1 and round-2 boards. Move B-Notifications to
the "Later · not MVP" page, unchanged (notification settings, quiet hours and summaries come later). Don't touch the
client site; it's rounds 4a and 4b.

0. Answers to your questions from rounds 1 and 2:
   - The code step's resend action says "Get a new code" everywhere, with or without SMS.
   - Locked or rate-limited code step: keep Confirm and resend hidden, as drawn; the message says when they're back.
   - The line under the Example badge on the business page: "This isn't a real business. It's here so you can try
     Ýeral: bookings are confirmed at once, and nobody waits for you."
   - Languages: a business writes its texts in any one of the market's languages and picks that one as its main
     language in Business profile (a Turkmen-only business picks Turkmen); a missing language shows the main one.
     While a market has one language (the first release: English), text fields have no language tabs and there is no
     main-language choice.
   - Contact Ýeral: keep [SUPPORT PHONE] and [TELEGRAM] for now.

1. Everywhere in this round:
   - The round-2 shell on every board: sidebar Calendar · Bookings · Clients · Reviews · Settings, the account menu
     with Your Ýeral page and Contact Ýeral, the In review / Not approved / Demo banners, the workspace "Glow Studio"
     with its city, never a district. No global search in the top bar (it comes later); lists keep their own search.
   - The business's money figures stay: visit totals and each client's average check, worked out from service prices
     (nothing is paid through Ýeral), shown only to people with "See revenue". "No average bill" in round 1 meant only
     the restaurant's expected bill on the client site.
   - No SMS promises: keep switches, but never "we'll send an SMS", "SMS sent" or "free SMS reminders"; say "the client
     is notified" or "sees it in My bookings".
   - Later, so not drawn at all (hidden, not "coming soon"): editing permissions, ownership transfer, client export,
     bulk SMS, reports and analytics, the help centre, notification settings, tables, classes, the booking button for
     the business's own site.
   - Words: a person's absence is "Time off" (holidays are the business's special days); classes have seats; 60 minutes
     is "60 min", longer is "1 h 30 min"; date and time join with " · " ("Thursday, 15 October · 14:30"); an action that
     cancels a booking says "Cancel booking", and a plain "Cancel" only closes a form.
   - Check every new button, tab, chip and table header with Russian-length text (about 30% longer), as on the
     long-text block.

2. B-Clients (/w/{slug}/clients) and B-Client (/w/{slug}/clients/{id}):
   - Specialist view: only their own clients (those with a booking with them); no Add client, no delete, no switches.
     Draw it next to the owner view.
   - Rows: tags New · Regular · Lapsed · Reported, and "Phone only" when online booking is off for that client. Remove
     the bulk bar, the row checkboxes and Export. Add the empty state ("No clients yet", Add client for owner/admin).
   - Client card header: Visits · Average check · Last visit · No-shows (money only with See revenue).
   - Upcoming list: waiting requests too (Pending, with their answer timer).
   - Reports list: every type (No-show, Came late, Rude behaviour, Other with its text), who reported and when, and
     "Remove report" for 7 days, as in the booking drawer.
   - The "Phone only" switch says why it turned on ("2 no-shows — online booking is off for this client"; 2 is the
     business's limit) and, when switched off: "Online booking is back. The no-show count starts again from zero."
   - Delete client: not possible while the client has upcoming bookings or waiting requests; the modal lists them and
     asks to cancel them first. The delete copy doesn't mention reports.
   - A client with a Ýeral account: the phone is read-only, with "The client changes this number in their Ýeral
     account; it updates here too."

3. B-Team (/w/{slug}/settings/team and /w/{slug}/settings/permissions):
   - Remove "Specialist (no app)" everywhere (selects, hints, footnotes, statuses): a Specialist with "Uses the app"
     off shows "Doesn't use the app".
   - Turning "Uses the app" on for someone who works without it sends the 7-day invite; until they accept, the row says
     "Invited · works without the app until they accept" and their bookings stay with them.
   - Invites (only the owner invites): no SMS at the first release, so each invite row has "Copy invite link" and the
     caption "They'll see the invite when they sign in with +993 65 •• •• 22". Statuses Invited (days left) ·
     Expired · Declined · Cancelled; each row stays until the owner resends or removes it. Errors: "This person is
     already on the team." · "There's already an open invite for this number." · mobile numbers only.
   - Remove a member: round 2's RemoveStaffModal with AffectedBookingsList (Move to another specialist · Keep them ·
     Cancel and offer 3 other times). No "any free specialist" fallback: a booking nobody else can do gets its own
     choice in its row. Statuses "Removed" and "Left".
   - Changing someone's shift so bookings fall outside it, or giving them time off over bookings: AffectedBookingsList
     with Keep them · Cancel and offer 3 other times; new bookings follow the new shift either way.
   - Permissions: a read-only table of what Owner, Admin and Specialist can do; no switches, no save bar, no Reports
     row.
   - No ownership transfer, and the owner can't leave: remove the transfer modal, its menu item, the owner box's
     transfer caption and "You're an admin now".

4. B-Settings (/w/{slug}/settings/{section}; nav Business profile · Booking rules · Hours · Services · Team ·
   Permissions · Link and QR; a chip row on phones):
   - Business profile: appointment categories only; description per the market's languages (see 0); photos up to 20,
     10 MB each, JPG, PNG or WebP, with uploading, too-big and wrong-type states; the address with its city (a select
     of the market's cities) and a map pin to drag. Moving: "Moved? Change the address here. Your bookings, clients
     and reviews stay; Ýeral may check the new address." A second address at the same time is a new workspace
     (Create a business).
   - No delete. "Pause online booking" (clients see a Call card; existing bookings and requests don't change) and
     "To close this workspace, contact Ýeral" with Contact Ýeral.
   - Booking rules: the free-cancel list Any time · 1 · 2 · 6 · 12 · 24 · 48 h; the hold time caption "The time counts
     only while you're open."; the client preview shows the answer deadline as a clock time ("The business answers by
     15:10"), not "within 30 min"; "Ask clients for a reason when they cancel" makes the reason optional for them;
     lateness is a fixed line "Clients may be up to 15 min late"; the no-show limit caption says that switching "Phone
     only" off starts the count again; changing confirmation mode says "Requests already waiting keep their timers;
     new bookings follow the new setting."
   - Hours and special days: pickers 00:00–24:00 in 30-minute steps, closing after midnight with the "next day" pill
     (as in the wizard); the special-day modal uses the same pickers. On save, when bookings fall outside the new
     hours: AffectedBookingsList with Keep them · Cancel and offer 3 other times. Overlapping special days keep their
     warning.
   - Link and QR: the page address yeral.app/b/{slug} (no language: it opens in each visitor's language), Copy,
     Share, Download QR; states In review ("Your page opens to clients after the check"), Not approved (the reason +
     Fix and send again), Hidden by Ýeral (the reason + Contact Ýeral), Live. Remove "Booking button · soon".
   - "Fix and send again" from the Not approved banner opens the section the reason points to, with the reason on top.
   - Remove the restaurant, café and fitness categories, the tables notice and the Tables / Classes nav variants.

5. B-Services:
   - Names and descriptions per the market's languages (see 0); price types Fixed · From · Free · Price at the place.
   - Deleting a service with upcoming bookings: "Delete Hair colouring? It has 4 upcoming bookings. They stay as they
     are; new bookings can't choose it." → Delete service. Without bookings: the undo toast, as now.
   - The staff tag "Doesn't use the app".

6. B-Reviews (/w/{slug}/reviews):
   - Reviewer = first name + initial ("Aýjemal G.", or "Aýjemal"), never "Anonymous"; every review comes from a
     completed booking and names its service and specialist. Add a stars-only review.
   - Rating summary with the count from the first review ("5.0 (1)"), and the empty state without promising a
     notification. 20 per page + "Show more".
   - Reported review: "Ýeral is checking · not counted in your rating" (not "In review", which is the business's own
     check). Outcomes the business sees: cleared (counted again, no Report any more), removed (gone, with a short
     notice), no decision in 48 hours (counted again).
   - Specialist view: reviews about them, read only: no count, no reply, no report.
   - Remove "Average reply time". Pills with icons, no dots.

7. B-Landing (business.yeral.app, signed out) and its phone frame at 390:
   - "Ýeral Business" everywhere; the language picker hidden (one language).
   - Hero: "Start free" (main) and "Try the business app" (secondary): it opens the demo workspace at once, without
     signing in, with the Demo banner ("This is a demo workspace. Changes reset every night." + Create your business).
   - Appointments only: no tables, classes, reports, help centre or data export; the FAQ promises no card payment or
     prepayment; no SMS promises. Keep the free band ("Ýeral Business is free"), no pricing.
   - Contact Ýeral ([SUPPORT PHONE], [TELEGRAM]) instead of the placeholder number; header link "How to start" scrolls
     to the 3 steps.

8. Phones (B-Mobile, keep the frames you have): add the clients list, the client card, Settings with its chip row and
   the save bar above the tab bar, a team row with its sheet, and reviews (reached from More).

9. Fixes on the round-1 and round-2 boards:
   - DS · Foundations, Product components, Business patterns: put the average check back (ClientHeader, the client
     card stats, the owner and admin tiles), behind See revenue.
   - Every board: remove SMS promises (the sent-screen line becomes "The business answers by 15:10. You'll see it in
     My bookings."; invites and client notices say "notified"); "Time off" for a person; seats for classes;
     "60 min"; " · " between date and time; "Cancel booking" for the action; Discard · Save on the save bar; "Link and
     QR" everywhere (also in the copy logs); the aria-label "QR kod" in English.
   - DS · Components and Product components: remove Reports, Help and the bulk move from sample navs and bars.
   - DS · Categories & booking types: the table card loses its "Menu · Price at the place" row.
   - B-Shell, B-Calendar, B-Bookings, B-Mobile, B-Onboarding, DS · Business patterns: remove the top-bar search, every
     "Transfer ownership" mention and "The owner changes cells" (permissions are fixed); the someone-left
     notification goes to the owner only (only the owner manages the team).
   - Report menu: before the visit starts only Rude behaviour and Other…; from the start Came late and No-show join
     them; No-show only until 24 hours after the visit ends; an earlier report doesn't hide the menu, and a No-show
     replaces it. Only No-shows count towards the phone-only limit.
   - Sign-in (B-Login, B-Onboarding, DS · Business LoginFlow): the first-release copy is the default (code on the
     screen, no "we'll send" and no "SMS code" label); the SMS copy is the variant for later. "Too many codes" comes
     after 5 codes for one number in an hour, with the wait in minutes ("Try again in 42 minutes").
   - One language at the first release: no Language row in the account menu and no EN · TK · RU on the login pages;
     the switcher stays only on the design-system board.
   - "Try the business app" opens one shared demo workspace without signing in (also from B-Login's signed-out page),
     not a membership in the visitor's switcher: drop "Owner · demo workspace" and "stays in the switcher".
   - Hours (wizard and settings): the part after midnight must end before the next day opens; error "Closes after
     Tuesday opens. Pick an earlier time."
   - Switcher rows and the invite card name the workspace's city under its name; never a district.
   - B-Shell, with B-Notifications gone: a banner "Turn on notifications to hear new requests" + Allow, and its
     blocked state ("Notifications are blocked in this browser. Allow them in the browser's settings."). There's no
     notifications list on MVP: the someone-left toast stays until opened, and Team shows a banner "Aýna left: 4
     bookings and 1 request need a new specialist · Choose" until every one is settled.
   - Demo facts the same on every board: 6 requests (with Mahym D.'s time change), Gözel A. with 1 visit and one
     phone number, Mähri G.'s request 13:00–14:00, Aýna leaves with 4 bookings and 1 waiting request. "1 request".
   - Legends say the same on every board: the running timer "counts only while you're open", the closed one "arrived
     while you were closed — answer by this time"; the staff column pill "Doesn't use the app".

10. DS · Business patterns: add each new piece with its states: the client list rows (tags, Phone only, specialist
    view), ClientHeader with the average check, the reports list, the delete-client block, the invite row (Copy
    invite link, every status, the errors), the read-only permissions table, the shift / hours AffectedBookingsList,
    the photo uploader, the address with city and pin, the Link and QR states, the service delete modal, the
    reported-review states, and the landing hero with "Try the business app".

When done, add to the CHANGELOG every board you changed or moved and every copy choice not covered here. Where a
product rule is missing, draw the simplest option and list it under "Decided while drawing", as in round 2.
```

## What to check on the canvas afterwards (Claude Code)

- B-Notifications on the Later page; every round-3 board in English with the round-2 shell, no global search, no
  Reports or Help, no SMS promises, no Later features.
- Clients: specialist view, Phone only, no bulk bar or export, empty state; card with the average check behind See
  revenue, waiting requests, every report type with Remove report, the switch captions, the blocked delete.
- Team: no "no app" level; the invite-pending state; Copy invite link, statuses and errors; RemoveStaffModal and the
  shift AffectedBookingsList; read-only permissions; no transfer.
- Settings: categories, languages, photos, city and pin, pause and close; booking-rule captions; hours 00:00–24:00
  with next day and the hours AffectedBookingsList; Link and QR address and states.
- Services: the delete modal with a count. Reviews: names, stars-only, "5.0 (1)", reported outcomes, specialist view.
- Landing: Try the business app without signing in, no Later features, Contact Ýeral, phone frame.
- Section 9 fixes on the round-1 and round-2 boards; new pieces on DS · Business patterns.
