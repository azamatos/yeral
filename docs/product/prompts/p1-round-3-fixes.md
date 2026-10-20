# P1 · Rounds 3.1–3.4 — fixes after the round-3 check

Written by Claude Code on 20.10.2026. Round 3 (seven boards and the fixes to rounds 1–2 in one prompt) took about three
hours, so from here every prompt is a small iteration (chapter 10, P1). The fixes the round-3 check found are split by
boards into four short prompts. They touch different boards: paste them one after another; Claude checks each while the
next one is drawn.

## Check of round 3 (20.10.2026)

The export (v0.6 round 3) is committed. Round 3 drew every section of its prompt: the English clients, client card,
team, settings, services, reviews and landing on the round-2 shell, B-Notifications on the Later page, and almost all
of the fixes to rounds 1–2. Most of the designer's ~100 decisions agree with the book or fill gaps reasonably
(chapter 9, 20.10.2026). What doesn't:

- **Must fix:** a No-show is added next to earlier reports instead of replacing them, and isn't offered after "Came
  late" (Q-206); Admins can change shifts and time off, where the book gives them the team read-only (chapter 3, B-47).
- **Book rules dropped:** the per-client "no reminders" switch (F-143, MVP); Reactivate for removed people (F-114); the
  amount behind "Price at the place" (B-38); last visit = last completed visit (F-140); "Unnamed client" (B-33); a
  Specialist sees only their own bookings on a client card (chapter 3); special days checked past midnight (Q-105); the
  book's launch categories (chapter 4, as seeded) and text limits (chapter 5); a client record links to an account by phone at sign-in
  (Q-171, Q-270).
- **Weak spots:** a page hidden by Ýeral shows the owner no banner; the notifications banner only for people who
  answer requests; "Access levels are fixed at the first release." hints at a Later feature.
- **The designer's questions:** the Admin doesn't see revenue (chapter 3: Owner only); bookings Export CSV stays at the
  first release, hidden for a Specialist (F-135, B-31).

## Prompt 3.1 — calendar, bookings, shell

```
Round 3.1 of the design pass (export v0.6): a small fix pass on B-Calendar, B-Bookings, B-Shell, B-Mobile and their
pieces on DS · Business patterns. Change only what's listed; everything else stays as drawn.

1. Report menu: one report per booking. A No-show takes the place of an earlier report of any other type, so it stays
   in the menu after Came late, Rude behaviour or Other; the other types aren't offered once a report exists (remove
   it first). No-show from the visit's start until 24 hours after it ends; Came late from the start; Rude behaviour and
   Other any time. Fix B-Calendar and B-Bookings, the phone sheet on B-Mobile, the ReportMenu notes on DS · Business
   patterns and §28.9.
2. The notifications banner ("Turn on notifications to hear new requests" + Allow, and its blocked state) shows to
   everyone who gets notifications in the workspace, not only to people who answer requests: a Specialist hears about
   requests and time changes for them too. Adjust its caption.
3. Hidden by Ýeral: the owner and admins see a banner in the shell, like Not approved: "Ýeral has hidden your page:
   {reason}. Clients can't find or book you." + Contact Ýeral. Add it to BusinessStatusBanner.
4. The permissions table on B-Shell: an Admin views the team, shifts and time off but doesn't change them (only the
   owner does). Fix the "Shifts and time off" row.
5. DS · Business patterns: "Total 1 h · 80 TMT" becomes "60 min"; "1 request · Wednesday, 20:45" joins with " · ".
6. Your questions: the Admin doesn't see revenue (the owner only, as drawn); bookings Export CSV stays at the first
   release, hidden for a Specialist.

When done, add a short "v0.6 · round 3.1" entry to the CHANGELOG.
```

## Prompt 3.2 — clients

```
Round 3.2 of the design pass (export v0.6): a small fix pass on B-Clients, B-Client, their phone frames on B-Mobile and
their pieces on DS · Business patterns. Change only what's listed; everything else stays as drawn.

1. Specialist view: the list and the client card show only bookings and requests with that specialist (history,
   upcoming, next booking), never other specialists' bookings or prices.
2. Client settings: put back the switch "Don't send reminders" (the client asked not to get them), next to Phone only,
   with the caption "No reminders go to this client."
3. Last visit = the last completed visit; a No-show doesn't count. Lapsed follows it.
4. A client saved without a name shows "Unnamed client", with the number below.
5. Ýeral account: a client record links to an account when someone signs in to Ýeral with that phone number, whether
   they booked online or by phone. Fix the definition on DS · Business patterns, in §28.3 and in the copy log; the
   read-only phone stays.
6. Switching Phone only off says "The no-show count starts again from zero." only when the no-show count turned it on;
   when it was turned on by hand, just "Online booking is back."
7. Tags: New = first visit in the last 30 days; a client with no visit yet has no tag (Ejegyz T., Arzygül H.).
8. The list's money column is "Total" (completed visits), behind See revenue; the average check stays on the card.
9. Demo: Mähri G.'s request is the one from the demo data everywhere (sent 20:40, for tomorrow 13:00–14:00, answer by
   09:30 tomorrow); staff screens show full names ("Aýjemal Gurbanowa"); first name + initial is only what clients
   see.

When done, add a short "v0.6 · round 3.2" entry to the CHANGELOG.
```

## Prompt 3.3 — team and services

```
Round 3.3 of the design pass (export v0.6): a small fix pass on B-Team, B-Services, their phone frames on B-Mobile and
their pieces on DS · Business patterns. Change only what's listed; everything else stays as drawn.

1. Admins see people, shifts and time off read-only; only the owner changes them. Admins still change which services a
   person does, as in the service drawer. Fix "You can change people's services, hours and time off…" and the
   permissions row "Shifts and time off" (Admin: view).
2. A removed person's row keeps "Reactivate" for the owner: it restores their access and makes them bookable again. A
   person who left comes back with a new invite.
3. Staff drawer, Hours tab: a break per day, whether the person follows the business hours or their own shift, and time
   off that can repeat every year.
4. Remove "Access levels are fixed at the first release."; the table needs no caption about releases.
5. Invite modal, phone caption: "Required for everyone. With the app on, it's how they sign in."
6. B-Services drawer: "Price at the place" keeps an amount field that clients don't see: "Clients see 'Price at the
   place'. The amount counts in your totals."
7. "Who does it" lists every team row that isn't removed, invited people too (marked Invited).
8. A service that can't be booked online is captioned "Not bookable online", not "Phone only" (that's the client tag).

When done, add a short "v0.6 · round 3.3" entry to the CHANGELOG.
```

## Prompt 3.4 — settings and setup

```
Round 3.4 of the design pass (export v0.6): a small fix pass on B-Settings, B-Onboarding, their phone frames on
B-Mobile and their pieces on DS · Business patterns. Change only what's listed; everything else stays as drawn.

1. Categories, in settings and in the setup wizard: the launch categories that take appointments, with these names:
   Beauty · Barbershop · Nails · Spa & massage · Dentist · Health · Fitness · Lessons · Auto · Pets · Home services.
   Restaurant and Café & tea house come later. No "Something else": when nothing fits, "No category fits? Contact
   Ýeral."
2. Text limits: business name up to 80 characters, description up to 1,000, street line up to 120, entrance note up
   to 200 (counter "128 / 1,000").
3. Special days: hours past midnight are checked against the next day's opening, as in the weekly hours.
4. The special-day "Keep them" caption fits each kind: Closed: "No new online bookings on those days."; Different
   hours: "New bookings follow the new hours."
5. Changing hours: AffectedBookingsList covers every upcoming booking on a changed day, not only today's.
6. The hold time caption and the landing FAQ add that a request's hold never runs past the visit's start.
7. The no-show limit: "A new limit applies to every client right away."
8. Link and QR: Download QR as PNG or SVG.
9. B-Onboarding: "special days (holidays, time off)" becomes "special days (holidays, closures)".

When done, add a short "v0.6 · round 3.4" entry to the CHANGELOG.
```

## What to check on the canvas afterwards (Claude Code)

- 3.1: one report per booking with No-show replacing; the banner for everyone; the Hidden by Ýeral banner; Admin view
  only on shifts; "60 min" and " · ".
- 3.2: the specialist's own bookings only; the reminders switch; last visit; Unnamed client; the account definition;
  the switch-off captions; tags; Total; demo facts.
- 3.3: Admin read-only; Reactivate; breaks and yearly time off; no release caption; the invite caption; the hidden
  price amount; invited people in "Who does it"; "Not bookable online".
- 3.4: the eleven categories and no catch-all; text limits; special days past midnight; the captions; every affected
  booking; PNG or SVG.

## Check of rounds 3.1–3.4 (20.10.2026)

Every instruction of the four is on the boards it names, and 3.1 and 3.3 need nothing. What's left goes into one short
prompt, 3.5:

- **3.2, demo facts and names:** Mähri G.'s evening request also shows at the 11:20 day clock, before it's sent; her old
  16:00 Manicure request survives on B-Team and B-Settings; one client record shows a full name on its card and "Gülälek
  N." everywhere else; Jemal S. is missing from page 1 of the client list; business/README.md §28.7 still gives
  reviewers as first name + initial.
- **3.4, against the book:** a yearly special day past midnight is checked only against this year's weekday (chapter
  9, "Q-211, B-40, B-24 (how)"); three notes cap the hours list at a week, where the book asks about every booking ahead
  ("B-39, B-40, Q-211 (how)"); the save toast cancels a waiting request that the book declines.
- **Small ones from 3.1:** one DS caption ("Replaces the Came late report"), the `hidden` banner tweak missing on B-Team
  and B-Services, BusinessStatusBanner's Hidden story in COMPONENTS.md.
- **Noted, not drawn again:** the designer's choices beyond the lists agree with the book (chapter 9, 20.10.2026,
  "Design rounds 3.1–3.4"). Category search by hidden words (tutor → Lessons) needs keywords the seed doesn't have; it
  waits for the CMS catalogue (F-181). The address form has Street (120) and Floor, room (40); the contract's endpoint
  follows the design when it's built.

## Prompt 3.5 — demo facts, names and the hours list

```
Round 3.5 of the design pass (export v0.6): the last small fix pass on the business app, from the check of rounds
3.1–3.4. Text and demo-data fixes only; change only what's listed, everything else stays as drawn.

1. Mähri G.'s request (sent 20:40 for tomorrow 13:00–14:00, answer by 09:30) exists only at the evening clock. At the
   11:20 day clock it isn't sent yet: on B-Clients, B-Mobile 9a and DS · Business patterns (section 03) her Next
   booking is "—", with no timer.
2. "Today 16:00–17:00 · Manicure · Maral" is Şemşat K.'s request on B-Team too (Maral's upcoming list) and in
   B-Settings' AffectedBookingsList.
3. One client, one name on every staff screen: Gülälek Nurmuhammedowa, Ogulnabat Çaryýewa and Döwlet Berdiýew as
   B-Client saves them, also on B-Clients, B-Calendar, B-Bookings, B-Mobile and DS · Business patterns ("belongs to
   …"); B-Settings' "Aýjemal G." becomes "Aýjemal Gurbanowa". Other clients keep their saved names as drawn. First
   name + initial is only for the client site: say so in business/README.md §28.7, which still gives reviewers as
   first name + initial.
4. Page 1 of the client list (B-Clients, B-Mobile 9a, DS section 03) includes Jemal S. (3 visits, last visit 12 Oct,
   Total 270 TMT, today 13:00 Pedicure · Maral), between Gözel A. and Şemşat K. Ogulşat M.'s Friday 19:00 request in
   B-Settings has a timer within the 30-min hold and shows as her Next booking on B-Clients.
5. B-Settings: a special day that repeats every year, with hours past midnight, is checked against every weekday it
   may fall on (the earliest next-day opening among them), not only this year's.
6. The hours AffectedBookingsList looks as far ahead as bookings go (the demo shows the coming week): fix the notes
   that say "the next 7 days" or "the coming week" on DS · Business patterns, in
   copy/en-choices-r3-onboarding-settings.md and in the 3.4 CHANGELOG entry. Above the rows it gives the count per
   specialist, and it lists up to 50 bookings.
7. Cancelling over new hours: a waiting request outside them is declined, not cancelled ("This time isn't free", with
   the offered times). Toast: "Hours saved · 5 bookings cancelled and 1 request declined — each client picks a new
   time in My bookings." (B-Settings, DS · Business patterns).
8. Small ones: DS · Business patterns' "Replaces the Came late report" becomes "Replaces the earlier report"; the
   `banner` tweak on B-Team and B-Services gains `hidden`; COMPONENTS.md lists BusinessStatusBanner's Hidden story.

When done, add a short "v0.6 · round 3.5" entry to the CHANGELOG.
```

What to check afterwards: no Mähri request at the day clock; Şemşat K. on B-Team and B-Settings; one name per client
on every staff screen and §28.7; Jemal S. on page 1; the yearly past-midnight check; no week cap in the notes, the
count per specialist; "declined" for the request; the three small ones.
