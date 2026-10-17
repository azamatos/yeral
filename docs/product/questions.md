# Questions

Every question the owner has to answer before design and code, by number. Answer them on the product book page; Claude records the answers here (`status: decided`, `answer: …`) and in chapter 9. Format and numbering: see README.md.

## Q-001 · Launch order of the two apps
chapter: 01 · status: open · priority: high

The current roadmap builds the client site first (M3), then the business workspace (M5). Online bookings are requests by default, and only the workspace can answer them, so a client site without the workspace can't take a real booking: it would only be a demo.

- A · One launch with both apps, built in pieces: accounts → business setup → the booking loop (business page, booking, answering, my bookings) → discovery (home, search, map) → the Ýeral team's verification tool → launch. (recommended)
- B · Client site first, as planned; the workspace follows. Until then no real bookings.
- C · Workspace first: businesses use it for phone bookings and their own link; the marketplace opens once enough businesses are on it.

answer: —

## Q-002 · How the first businesses get onto Ýeral
chapter: 01 · status: open · priority: high

Sign-up is self-service (setup wizard) and the Ýeral team verifies each new business within 24 hours. Nothing says how the first businesses are found, and a marketplace needs businesses before clients come.

- A · Both: sign-up is open to anyone, and the Ýeral team personally sets up the first businesses with their owners. (recommended)
- B · Self sign-up only.
- C · Invite-only at first: the Ýeral team creates the first businesses; open sign-up later.

answer: —

## Q-003 · The name and domain at launch
chapter: 01 · status: open

"Ýeral" on yeral.app is a working title (open question 7 in the memory bank before this book). The code keeps the name and domain in configuration, so this doesn't block design, but it blocks the launch.

- A · Launch as Ýeral on yeral.app. (recommended)
- B · Move to another domain (for example yeral.com) before launch.
- C · Rename before launch.

answer: —

## Q-010 · What the Ýeral team can do at launch, and with which tool
chapter: 03 · status: open · priority: high

Verifying businesses, handling reported reviews, managing categories, writing help articles and answering the support chat all need the Ýeral team, but the CMS (six modules) isn't designed. Without at least verification, no business can become public.

- A · Design a small admin tool for launch: verify businesses and handle reported reviews. Categories, help articles and support chat come later. (recommended)
- B · Design the full CMS before launch.
- C · No tool at launch: developers verify businesses and handle reports by hand in the database.
- D · No verification at launch: every new business is public at once until the tool exists.

answer: —

## Q-011 · Roles inside the Ýeral team
chapter: 03 · status: open

Nothing describes who in the Ýeral team may do what.

- A · One role at launch: every team member can do everything in the admin tool. (recommended)
- B · Separate roles from the start, for example moderator, support and admin.

answer: —

## Q-012 · Hiding a business or blocking a client across Ýeral
chapter: 03 · status: open

Nothing is designed for a business that turns out to be fake or abusive after verification, or for a client who doesn't come at many businesses. Today only one business at a time can limit a client to phone bookings.

- A · The team can hide a business (from search and its page, with a reason to the owner); no Ýeral-wide client blocks at launch. (recommended)
- B · Both: hide businesses and block clients across Ýeral.
- C · Neither at launch.

answer: —

## Q-020 · Services at the client's address and online
chapter: 04 · status: open · priority: high

The client spec lists three places a service can happen: at the business, at the client's address (home services) and online (tutors). The booking flows have no address step for home visits and no online-meeting details. Setup only has "I work from home" (hide the exact address until confirmed).

- A · MVP: at the business only, plus the hidden exact address for home-based businesses. At the client's address and online come later. (recommended)
- B · Add "at the client's address" to the MVP (needs an address step in booking and in the workspace).
- C · Add both to the MVP.

answer: —

## Q-022 · Several booking types in one business
chapter: 04 · status: open

The design allows a business with more than one booking type (a gym with classes and personal training); its sidebar then shows each section. The setup wizard handles one type, set by the category, and a table or class setup wizard isn't designed.

- A · One booking type per business at launch; several types later. (recommended)
- B · Allow several types at launch.

answer: —

## Q-030 · Which booking types at launch
chapter: 06 · status: open · priority: high

All three types are designed (appointments, tables, classes). The business spec says to build the appointment workspace first, then tables and classes. Tables and classes each bring their own workspace (floor plan and timeline, week schedule), and their setup wizard isn't designed.

- A · Appointments at launch; tables and classes in the first update after it. (recommended)
- B · All three at launch.
- C · Appointments and tables at launch (restaurants are a big category); classes later.

answer: —

## Q-031 · "Başga ýerde" and internal statuses at launch
chapter: 06 · status: open · priority: high

Design v0.5 added two extras: "Başga ýerde" (a person in two workspaces is blocked in each calendar while busy in the other) and internal statuses (team-only markers like *Geldi*, *Başlandy*, off by default). Both are drawn; neither is needed for the booking loop.

- A · Both after launch. (recommended)
- B · Both at launch.
- C · "Başga ýerde" at launch (people working in two salons may be common), internal statuses later.

answer: —

## Q-032 · Can people in Turkmenistan open the site, and where do we host at launch?
chapter: 06 · status: open · priority: high

Cloudflare is reported to be filtered in Turkmenistan (projectbrief, ADR 0007). The plan is Cloudflare now and the team's own server later (milestone M8). If clients in Ashgabat can't open yeral.app without a VPN, the launch fails, and nobody has tested it yet. The old site already runs on Cloudflare at yeral.app, so it can be tested today.

- A · Test now from Ashgabat (home and mobile internet, several providers). If Cloudflare is blocked, the own server becomes part of the MVP. (recommended)
- B · Launch on Cloudflare as planned and move later.
- C · Launch on the own server from day one, whatever the test says.

answer: —

## Q-033 · Privacy policy and terms
chapter: 06 · status: open

The design has pages for privacy and terms, but no texts exist. Ýeral stores phone numbers, names and booking history, sends SMS, and businesses keep their own client records.

- A · Claude drafts both in Turkmen, Russian and English from this book's rules; the owner has them checked by a local lawyer before launch. (recommended)
- B · The owner provides the texts.

answer: —

## Q-036 · Which SMS provider at launch
chapter: 08 · status: open · priority: high

Every login and every booking message is an SMS, and today no SMS reaches a phone: every environment, production included, writes them to a log (chapter 8). Without a provider nobody can sign in on the live site. The provider also sets the price per SMS part, the sender name (Q-109) and delivery reports (Q-284). Turkmen letters make most booking messages two parts (Q-295).

- A · Claude researches providers that deliver to Turkmen mobile numbers (local operators and international gateways): price per part, Turkmen letters, sender names, delivery reports. The owner picks one. (recommended)
- B · The owner already has a provider in mind and shares it.

answer: —

## Q-100 · Language in business workspace links
chapter: 02 · status: open

ADR 0016 (14.10.2026) says the business workspace and the CMS carry no language in their links and use each person's own language setting. The business spec draws every workspace link with one: `business.yeral.app/tk/giris`, `/tk/calendar`, `/tk/settings/…` (business spec §1, §4). The workspace isn't built yet.

- A · No language in workspace links; each person sees their own language, so a link shared between staff opens in the reader's language. (recommended)
- B · A language in every link, like the client site (`/tk/`, `/ru/`, `/en/`).

answer: —

## Q-101 · Who checks the Russian and English text
chapter: 02 · status: open

The design is Turkmen only; Russian and English are written in code from the Turkmen (owner, ROUND6-ANSWERS). The owner checks the Turkmen while coding, and all Turkmen gets a native review before launch (client spec §9). Nobody is named for the Russian and English drafts (Q-101).

- A · A native speaker checks the Russian before public launch; English launches as a draft the owner reads. (recommended)
- B · Native speakers check both Russian and English before launch.
- C · The owner checks all three languages.

answer: —

## Q-102 · Which language a business must fill in
chapter: 02 · status: open

Texts a business writes (description, service names and descriptions) have TK, RU and EN tabs (business spec §8). Nothing says which are required. The code requires the Turkmen text and shows it whenever another language is missing. Many businesses may write in Russian only.

- A · Any one language is required; a missing language shows the one that was written. (recommended)
- B · Turkmen is required, the others are optional (code today).
- C · All three are required.

answer: —

## Q-103 · Who sets a restaurant's average bill
chapter: 02 · status: open

Restaurants and cafés show *Ortaça hasap* `≈ 150 TMT` on cards and in the table flow (client spec §2, Booking-Table screen). With no online payment Ýeral can't work it out, and no screen lets a business enter it. The demo values are placeholders (Q-103).

- A · The restaurant types it in its profile, optionally; without it no amount shows. (recommended)
- B · The Ýeral team sets it during verification.
- C · Drop the average bill.

answer: —

## Q-104 · Number format in English
chapter: 02 · status: open

The design uses a decimal comma and a space between thousands: `4,9`, `1 410 TMT` (client spec §8), and describes only Turkmen. The code writes Russian like Turkmen and English the English way: `4.9`, `1,410 TMT`.

- A · English uses `4.9` and `1,410` (code today). (recommended)
- B · Every language uses `4,9` and `1 410`.

answer: —

## Q-105 · Businesses open past midnight
chapter: 02 · status: open

A business day may end at 24:00 (ROUND6-ANSWERS E1). Opening past midnight, such as a café open until 02:00, isn't designed (client spec §13, Q-105). The code ends every day by midnight, and no visit can run past 24:00.

- A · Not on MVP: late places close at 24:00 in Ýeral and take later guests by phone. (recommended)
- B · Design it now: hours like 18:00–02:00 and bookings that cross midnight.

answer: —

## Q-106 · Whole kilometres: 3,0 km or 3 km
chapter: 02 · status: open

The screens and the demo data show `3,0 km` (Glow Studio). The code drops a trailing ",0" and shows `3 km`, and from 10 km it shows whole numbers (`12 km`). The spec gives only `1,2 km` and `850 m` (client spec §5).

- A · `3 km` (code today). (recommended)
- B · Always one decimal under 10 km: `3,0 km`.

answer: —

## Q-107 · The city in a business address
chapter: 02 · status: open

No text names a city (client spec §1, §8). Addresses in the demo have no city ("Andalyp köçesi 8"). That works while Ýeral is in one city; once a second city opens, a street name alone can be unclear on the business page and in SMS reminders.

- A · No city while Ýeral works in one city; add it to the full address on the business page when a second city opens. (recommended)
- B · Store and show the city in the full address from the start.

answer: —

## Q-108 · Which map app "Ýol görkez" opens
chapter: 02 · status: open

*Ýol görkez* (directions) opens a map link (screens README); the app isn't named. Maps on the site are MapLibre with OpenFreeMap tiles (owner 14.10.2026), which show the place but don't give directions.

- A · The phone's own choice (Apple Maps on iPhone, the app chooser on Android); Google Maps on a computer. (recommended)
- B · Always Google Maps.
- C · Always Yandex Maps.

answer: —

## Q-109 · SMS sender name
chapter: 02 · status: open

Every SMS starts with "Ýeral:" in its text (client spec §6). The sender name shown on the phone isn't chosen and depends on the SMS provider (Q-036, Q-109). Sender names are usually plain Latin letters, up to 11 characters.

- A · "Yeral" in plain Latin, which every provider accepts. (recommended)
- B · "Ýeral", if the provider allows the Turkmen letter.
- C · A number without a name.

answer: —

## Q-112 · Party size in search and each restaurant's limit
chapter: 05 · status: open

Search offers 1–7 and "8+", where "8+" shows times for 8 (ROUND6-ANSWERS D2, Search screen). Each restaurant sets its own online limit, 2–12, default 8 (ROUND6-ANSWERS D1). Nothing says what a restaurant with a limit of 6 shows for a party of 7, or how a party of 10 finds a restaurant that takes 12. The code fixes the limit at 8 for every restaurant.

- A · Restaurants whose limit is below the party stay in the list with *Jaň et* instead of times; chips stay 1–7 and 8+. (recommended)
- B · Hide restaurants whose limit is below the party.
- C · Chips go up to 12, the highest limit a restaurant can set.

answer: —

## Q-113 · How the typical answer time is worked out
chapter: 05 · status: open

The business page shows "*Adatça 15 minudyň dowamynda tassyklaýar*" (usually confirms within 15 minutes) and the sent screen "*Biznes adatça {N} içinde jogap berýär*"; the spec calls it computed (client spec §4.3, ROUND6-ANSWERS A2). Nothing says how, or what a new business shows. The code stores a number per business that nothing updates.

- A · The median answer time over the last 30 days, rounded (15 min, 1 sagat …); hidden until the business has answered 5 requests. (recommended)
- B · The average over every answer ever.
- C · The business types it in.

answer: —

## Q-114 · Rating with very few reviews
chapter: 05 · status: open

The code shows the average from the first review: one 5-star review shows `5,0`, and that business passes the "4,5 and up" filter. Lists without a location sort by rating × number of reviews. The design doesn't say.

- A · Show the average from the first review, always with the count, for example `5,0 (1)`. (recommended)
- B · Show *Täze* (new) instead of a rating until 3 reviews.

answer: —

## Q-115 · Photo limits for a business
chapter: 05 · status: open

The design recommends 3 or more photos, makes the first one the cover and lets the owner reorder them (business spec §7, §8). No maximum count or file size is set, and photo upload isn't built.

- A · Up to 20 photos, each up to 10 MB (JPG, PNG or WebP), made smaller on upload. (recommended)
- B · Up to 10 photos, each up to 5 MB.

answer: —

## Q-116 · Most services in one booking
chapter: 05 · status: open

The design says at least one service and gives no maximum (client spec §4.4). The code accepts at most 10 (code: packages/contract/src/bookings.ts).

- A · Keep 10. (recommended)
- B · Lower it to 5.
- C · No maximum.

answer: —

## Q-117 · Last table reservation of the day
chapter: 05 · status: open

The code lets an online table start only if the whole sitting fits before closing: a café closing at 23:00 with a 2-hour sitting takes its last online table at 21:00. The B-Tables screen lets staff reserve until 1 hour before closing (22:00) and holds the table until closing. No spec says which.

- A · The last start is 1 hour before closing, online and by staff; the table is held until closing. (recommended)
- B · The last start is closing time minus the sitting time (code today).
- C · Each restaurant sets its own last reservation time.

answer: —

## Q-118 · Lateness rule for appointments
chapter: 05 · status: open

Business pages show "*15 minutdan köp gijä galsaňyz, ýazylyş ýatyrylyp bilner*" (late by more than 15 minutes, the booking may be cancelled) (demo rules; client spec §7 data model). No setting for it is drawn. The code keeps one number per business (0–120 min, default 15) and also uses it as the table hold, which has its own setting on the B-Tables screen.

- A · Add a setting next to the cancel window: none, 5, 10, 15, 20 or 30 min, default 15; tables keep their own hold. (recommended)
- B · Fixed 15 min for every business.
- C · No number: a business writes it in its rules note if it wants.

answer: —

## Q-119 · Free-cancel choices: setup wizard vs settings
chapter: 05 · status: open

The settings screen and the business spec offer: any time, 1, 2, 6, 12, 24 or 48 hours before (business spec §11). The setup wizard, step 7, offers: any time, 1, 2, 4, 12 or 24 hours (B-Onboarding screen). The code accepts only the settings list, so picking 4 hours in setup would fail.

- A · The settings list in both places. (recommended)
- B · The setup list in both places.

answer: —

## Q-120 · Hold time while the business is closed
chapter: 05 · status: open · priority: high

A request holds its time for the business's hold time, never past the start (business spec §2). The code counts clock time. A request sent at 23:00 to a salon with a 30-minute hold runs out at 23:30 with nobody there, and the client gets 3 other times around midnight.

- A · The hold runs only during the business's opening hours, still never past the start. (recommended)
- B · Clock time, day and night (code today).

answer: —

## Q-124 · Waiting requests per client
chapter: 05 · status: open

Each request blocks a time for up to 24 hours. Nothing limits how many requests one client can send, to one business or across Ýeral (code: no limit anywhere).

- A · At most 3 waiting requests at one business and 10 in total. (recommended)
- B · No limit.

answer: —

## Q-125 · Cancelling a class after the free window
chapter: 05 · status: open

After the free window, a confirmed booking can't be cancelled online, only by calling (client spec §4.8). But the class flow says "*Mugt ýatyrmak wagty geçdi — ýatyrsaňyz, studiýa habar beriler*" (the free window has passed; if you cancel, the studio is told), which suggests a late online cancel (client spec §4.6). The code refuses every late cancel.

- A · Same as appointments: after the window only *Jaň et*, and the class line changes to say so. (recommended)
- B · Classes can still be cancelled online after the window; the studio is told.

answer: —

## Q-126 · Deadline to write a review
chapter: 05 · status: open

One review per completed booking, editable for 7 days; the review ask SMS goes 2 hours after the visit (client spec §4.8, §6). The code lets a client write a review any time later, even a year after the visit.

- A · Up to 30 days after the visit. (recommended)
- B · No deadline (code today).
- C · Up to 14 days.

answer: —

## Q-127 · No-shows: what counts and how the limit ends
chapter: 05 · status: open · priority: high

After N no-shows at one business (default 2) the client can book there only by phone (business spec §3, §8). The client card also has a switch "*Diňe jaň arkaly ýazylyp biler*" (may book only by phone) (business spec §6). The code counts every no-show ever, and turning the switch off doesn't lift a limit that came from the count, so such a client can never book that business online again.

- A · Reaching N turns the switch on; the business can turn it off, and counting starts again from zero. (recommended)
- B · Count only no-shows from the last 12 months; the switch stays separate.
- C · Count every no-show ever (code today).

answer: —

## Q-128 · How early and late hours and classes can start
chapter: 05 · status: open

Opening pickers start at 06:00 and step by 30 minutes (business spec §11). Class sessions start between 07:00 and 21:00 (B-Classes screen). A gym opening at 05:30 or a class at 21:30 can't be entered.

- A · Hours from 00:00 to 24:00 in 30-minute steps; classes any time inside the hours, in 15-minute steps. (recommended)
- B · Keep the drawn ranges.

answer: —

## Q-150 · Places without free time in search
chapter: 07 · status: open

Search lists only places that have a free time on the chosen day: the count line says "{N} ýer · şu gün boş wagty bar" and the empty state says "Bu ýerde boş wagt ýok" (Search, States tile 01). The code does the same, so a fully booked place, a place that paused online booking and a place a client may only call never appear in search or on category pages (code: `apps/api/src/modules/catalog/search.ts`). They stay reachable by link, favourites and "Golaýdaky ýerler". Nothing says whether category pages, which are also landing pages for search engines, follow the same rule.

- A · Search and category pages list only places with a free time on the chosen day, as drawn and built. (recommended)
- B · Search keeps that rule, but category pages list every place in the category, those without free time last.
- C · Both list every matching place; places without free time show "Jaň et" or a "no free time" line instead of time chips.

answer: —

## Q-153 · Booking on a page that is still in review
chapter: 07 · status: open

Until Ýeral verifies a new business, only its owner and team see its page, with the banner "Sahypaňyz barlagda — häzir ony diňe siz we toparyňyz görýärsiňiz…" (F1; Venue · `ownerPreview`). Nothing says whether they can make a test booking from that preview. The code refuses any booking at an unverified business (not found).

- A · No bookings before verification; the preview shows the booking buttons disabled. (recommended)
- B · The team may send test bookings from the preview; they land in their own calendar like real ones.

answer: —

## Q-154 · Moves and free times for a client who must call
chapter: 07 · status: open

A7 refuses online booking for a client who may book a business only by phone, with one exception: times the business offered after a decline. Moving a booking and taking a free time after an unanswered request are also new online requests. The code refuses both for a phone-only client and when the business paused online booking (code: `bookings/actions.ts`, `assertOnlineBooking`), but the screens still draw "Başga wagta geçir" and the free-time chips with no such case.

- A · For that client, or while the business is paused, hide "Başga wagta geçir" and the free-time chips and show the "Jaň et" card; only decline offers stay bookable online. (recommended)
- B · Existing bookings may still move online and expired-request times may still be taken, even by a phone-only client or at a paused business.

answer: —

## Q-155 · Two bookings at the same time
chapter: 07 · status: open

Nothing in the design or the code stops a client from holding overlapping bookings at different businesses, for example two requests at two salons for the same hour. If both are confirmed, one of them becomes a no-show.

- A · Allow it, as today; businesses handle no-shows with "Arz et". (recommended)
- B · Allow it, but warn on the confirm step that the client already has a booking at that time (copy and state to be designed).
- C · Refuse a booking that overlaps one of the client's active bookings.

answer: —

## Q-156 · Asking for a surname
chapter: 07 · status: open

The login modal asks a new user for "Adyňyz" and "Familiýaňyz (hökman däl)" (Auth), and the profile has both fields (Account-Profile), but the inline login in every booking flow asks only "Adyňyz" (Booking, Booking-Table, Booking-Class). Reviews are signed with the first name and the surname's initial, "Aýjemal G." (client spec §4.8). The api keeps one name field and splits it at the first space (code: `auth/routes.ts`, `bookings/actions.ts`).

- A · Ask for both everywhere, surname optional, and store them as two fields; a review shows "Aýjemal G.", or "Aýjemal" without a surname. (recommended)
- B · Ask only for the name everywhere and drop the surname from the login modal and the profile.

answer: —

## Q-157 · The code step: after the lock, and the "Tassykla" button
chapter: 07 · status: open

The drawings differ. The lock message is "Köp synanyşyk. 60 sekuntdan soň gaýtadan synanyşyň." in Auth, "Synanyşyklar gutardy. 60 sekuntdan soň täzeden synanyşyň." in Booking and Booking-Link, and "Synanyşyk köp boldy. {N} sekuntdan soň gaýtalaň." in the code. The code also spends the code at the lock, so after 60 seconds the client must ask for a new one ("Koduň wagty geçdi. Täze kod alyň."), which no screen shows (code: `auth/codes.ts`). The spec wants a visible "Tassykla" fallback (client spec §4.4, §11), while the Auth board says the modal has no button.

- A · One shared code step everywhere: a visible "Tassykla", one lock message, and after the lock the client asks for a new code, as the code does now. (recommended)
- B · One shared code step, but after the lock the same code works again for the rest of its 5 minutes.

answer: —

## Q-159 · Which specialist an offered or free time is for
chapter: 07 · status: open

A5 forbids a silent change of specialist when a client moves a booking, but says nothing about the times offered after a decline or after an unanswered request. The code finds the free times after an expiry with any specialist, and when the client takes an offered time it keeps the original specialist if free, else gives the booking to anyone free (code: `jobs/run.ts`, `bookings/create.ts` `rebook`). The confirm question names a person: "{time} · {service} · {staff} — şu wagta ýazylmalymy?" (A1).

- A · Each offered or free time belongs to one named specialist and is booked with that person only; if they're no longer free the chip shows "Eýýäm eýelendi". (recommended)
- B · Keep the code: any free specialist who does the services may take it.

answer: —

## Q-161 · The studio cancels a whole class session
chapter: 07 · status: open

In the business workspace "Sapagy ýatyr" tells every attendee the reason and offers alternative sessions (business spec §21). The client side isn't drawn: how the client sees those sessions, takes one, and whether taking one gives a confirmed seat at once like a decline offer.

- A · Treat it like a decline with offered times: "Biznes ýatyrdy", the reason, up to 3 sessions as chips, and one tap books a confirmed seat. (recommended)
- B · Cancel with the reason only; the client books again from the schedule.

answer: —

## Q-162 · Cancelling a booking made after the free-cancel deadline
chapter: 07 · status: open

Client spec §4.8: after the business's cancel window only "Jaň et" is offered. Client spec §4.6 (classes): when the window has already passed at booking time, the rule line becomes "Mugt ýatyrmak wagty geçdi — ýatyrsaňyz, studiýa habar beriler." ("if you cancel, the studio will be told"), which reads as if cancelling stays possible. The code lets a pending request be cancelled any time but refuses a confirmed booking after the deadline, so a same-day booking at an instant business can never be cancelled online (code: `packages/domain/src/lifecycle.ts`).

- A · Past the deadline only "Jaň et", for every booking type; the class line is reworded to say so. (recommended)
- B · Past the deadline the client can still cancel online; the business is told and the line warns that the cancel is late.

answer: —

## Q-163 · What "Ýatyrylanda sebäp sora" changes for the client
chapter: 07 · status: open

A business can switch "Ýatyrylanda sebäp sora" (ask for a reason when cancelling) in its booking rules (business spec §8; ADR 0017 `askCancelReason`, on by default). The client's cancel modal always shows the reason as optional, "Sebäbi (hökman däl)" (Account-Bookings · `view=cancel`), and no source says what the switch does. The code ignores it.

- A · Switch on: the modal shows the reason chips, still optional; switch off: no reason section. (recommended)
- B · Switch on: a reason is required before "Hawa, ýatyr"; switch off: no reason section.

answer: —

## Q-165 · Moving to a time that overlaps the current one
chapter: 07 · status: open

In move mode the current time is marked "öňki wagtyňyz" (Booking · `mode=move`). With the same specialist, a new time that overlaps the old one (for example 14:30 → 15:00 for a 60-minute service) is never free in the code, because the old booking holds its time until the business answers (code: `bookings/actions.ts`). The code refuses it even at an instant business, where the move happens at once.

- A · Allow it: the booking's own time doesn't count as busy for its move. (recommended)
- B · Keep it: only times that don't overlap the current one can be asked for.

answer: —

## Q-166 · Disputing a no-show
chapter: 07 · status: open

A client marked *Gelmedi* sees "Gelmediňiz diýlip bellendi" and the business's note (client spec §4.8), and after 2 no-shows (default) can book that business only by phone (business spec §3). Nothing lets the client say the mark is wrong.

- A · No dispute in the MVP: the client calls the business, or writes to Ýeral support from the help pages. (recommended)
- B · Add a "this is wrong" action that sends the case to the business or to Ýeral moderation (needs design and the CMS).

answer: —

## Q-167 · What "Gaýtadan ýazyl" fills in for an appointment
chapter: 07 · status: open

For tables and classes "Gaýtadan ýazyl" opens the flow filled in: party and area, or the same class (Mobile 6). For appointments the screens link to the booking flow without saying what is filled in.

- A · The same services and specialist, opening at the time step; services or people no longer offered are dropped and the flow opens at the first step that needs a choice. (recommended)
- B · The business page with nothing selected.

answer: —

## Q-168 · Can a stranger open someone's booking from its code?
chapter: 07 · status: open · priority: high

The SMS link is `yeral.app/b/{code}` with the booking code, e.g. `YR-48213` (ROUND6-ANSWERS notes; code: `notify.ts`). Codes have 5 random digits, so there are only 90 000 of them (code: `packages/domain/src/id.ts`). The link page works signed out and shows the business, service, specialist, time and price (Booking-Link), so anyone trying codes could see other people's visits, a dentist or a psychologist included. The same `/b/` path also carries business links `yeral.app/b/{slug}` (ADR 0015), so slugs must never start with "yr-".

- A · SMS links carry a long random token on their own path; the YR code is still shown and read out on the phone, but never opens anything by itself. (recommended)
- B · Keep `/b/{code}`, but show only the business name and the status until the client logs in with the masked phone.
- C · Keep `/b/{code}` and the page as designed.

answer: —

## Q-169 · Opening an SMS link while signed in
chapter: 07 · status: open

The link page is drawn for a signed-out visitor only (Booking-Link). A comment in the code says the site sends booking codes to the booking detail (code: `notify.ts`). Not defined: what the booking's owner sees when already signed in, and what someone signed in with another account sees (a shared phone or computer).

- A · Signed in as the booking's owner: open "Ýazylyşlarym" with that booking's detail; signed in as someone else: show the signed-out link page with the masked-phone login. (recommended)
- B · Always show the link page, signed in or not.

answer: —

## Q-170 · The link page for completed, cancelled and no-show bookings
chapter: 07 · status: open

The review SMS links to the same page ("Baha beriň: {link}", client spec §6), and the confirmed SMS link stays in the client's phone after the visit, but the link page draws only declined, expired, confirmed, pending, offers expired and not found (Booking-Link · `state`). Nothing says what a completed, a cancelled-without-offers or a no-show booking shows there.

- A · The booking card with its status; a completed booking adds "Teswir ýaz", which logs in with the masked phone and opens the review; the others add "Gaýtadan ýazyl". (recommended)
- B · Send these links to "Ýazylyşlarym", with login first.

answer: —

## Q-171 · Changing the phone number and the businesses' client records
chapter: 07 · status: open

Each business keeps its own record of a client, found by phone number (ADR 0018). After a client changes their phone (Account-Profile), their next booking creates a new record at a business they already visited: the business loses their history and no-show count, and a phone-only client can book online again (code: `bookings/create.ts`, `clientFor`). The design shows only the SMS check of the new number.

- A · Client records follow the Ýeral account: a phone change updates the phone on every business's record of that person. (recommended)
- B · Records stay tied to the phone: the new number is a new client for every business.

answer: —

## Q-172 · What deleting an account removes
chapter: 07 · status: open · priority: high

The design says "Gelýän 3 ýazylyşyňyz ýatyrylar we bizneslere habar bereris. Ähli ýazylyşlaryňyz, teswirleriňiz we halanlaryňyz pozular." (Account-Profile). The code cancels upcoming bookings and deletes the account and favourites, but keeps past bookings, with name and phone, in the businesses' records and keeps the reviews, signed "Aýjemal G." (code: `me/routes.ts`, database schema). Businesses rely on visit history, and reviews count in their ratings.

- A · Cancel upcoming bookings; delete the account, favourites and reviews; businesses keep their own visit records without a link to a Ýeral account; the modal copy is adjusted to say so. (recommended)
- B · Delete everything as the copy says, past bookings in the businesses' records included.
- C · Delete the account and favourites; keep reviews signed "Anonim" and the businesses' records.

answer: —

## Q-200 · Where a half-finished setup continues
chapter: 07 · status: open

The wizard has "Soňra dowam et" with the toast "Ýatda saklandy. Şu belgi bilen girip, galan ýerinden dowam edersiňiz." (log in with this number to continue) (B-Onboarding). Login routing knows three cases only: a pending invite, no workspace ("Entek iş ýeriňiz ýok"), or the last used workspace (business spec §1). It doesn't say what a person with a half-finished business sees at login, or whether that business already exists as a workspace.

- A · The business exists as a draft from step 2; at login the wizard reopens at the saved step instead of the no-workspace card; the draft joins the switcher only when finished. (recommended)
- B · The draft is a normal workspace "Barlagda"; login opens its calendar with a "finish setup" checklist.
- C · The draft lives only in the browser; logging in on another device starts again.

answer: —

## Q-201 · Setup for table and class businesses
chapter: 07 · status: open

A restaurant or a yoga studio picks its category in step 2 and sees a note that tables or classes are set up later in Stollar or Sapaklar. Then it goes through the appointment steps "as they are for MVP": hours, services, a team of specialists with their own calendars (business spec §7). A table or class wizard is not designed (§24; ROUND6-ANSWERS H). For a restaurant the services and specialist steps don't fit, and the business may finish the wizard with nothing clients can book. If tables and classes come after launch (Q-030), this can be decided with them.

- A · For table and class categories, skip the services step and the specialist part of the team step; step 8 ends with a checklist pointing to Stollar or Sapaklar, and online booking opens once at least one table or class exists. (recommended)
- B · Keep the wizard exactly as drawn; owners delete the services they don't need later.
- C · Design a table and class wizard (areas and tables, or class types and timetable) before building these workspaces.

answer: —

## Q-202 · Does the page address name the workspace?
chapter: 07 · status: open

Business pages are drawn without the workspace in the address (`/tk/calendar`, `/tk/clients/{id}`), and switching changes "the whole workspace" (B-Shell). A person in two workspaces who opens two tabs, follows a colleague's link to a client, or clicks a browser notification could land in the wrong workspace. The design doesn't say how this works.

- A · Put the workspace in the address (for example `/tk/w/{slug}/calendar`), so links, tabs and notifications always open the right workspace; the switcher just changes the address. (recommended)
- B · Keep addresses without the workspace; the server remembers the current workspace for the session, and every link opens in it.

answer: —

## Q-203 · What happens to bookings when a specialist leaves
chapter: 07 · status: open

When a specialist uses "Bu biznesden çyk", "her future bookings stay; the owner reassigns them (same flow as «Işgäri öçür»)" (B-Shell). But "Işgäri öçür" is the owner's flow, where the owner picks move, keep or cancel at once. When she leaves by herself nobody has chosen yet. It isn't said whether she stays bookable online, whether her bookings still show in her column, who the clients will meet, or how the owner finds out.

- A · Leaving works like "Işgäri öçür" with "Bolşy ýaly galdyr": she's no longer bookable, her bookings stay in her column, and the owner gets a notification that opens the remove flow to move or cancel them. (recommended)
- B · She can't leave while she has future bookings ("ask the owner to move them first").
- C · Her future bookings are cancelled at once and clients get 3 other times.

answer: —

## Q-204 · How to block time in the calendar
chapter: 07 · status: open · priority: high

The calendar draws blocked time ("Ýapyk · Okuw", a lock and a reason) as part of a staff schedule (business spec §4), and the setup wizard tells instant-confirmation businesses to "block your busy times in the calendar". No screen shows how to create, change or remove a block, who may do it, or what happens when it covers bookings. Only whole personal days off are designed.

- A · Clicking an empty slot offers "Täze ýazylyş" or "Wagty ýap" (block time: person, from–to, reason, optional repeat), with the same rights as adding bookings; a block can't cover existing bookings. (recommended)
- B · Only whole personal days off on MVP; no part-day blocks.
- C · Blocks only in the staff schedule (like an extra break), not from the calendar.

answer: —

## Q-205 · Changing confirmation settings while requests wait
chapter: 07 · status: open

A business can switch from manual to instant confirmation, change the hold time, or turn online booking off (business spec §8). For "online off" the screen says "Öňki ýazylyşlar üýtgemeýär" (existing bookings don't change). Nothing says what happens to requests already waiting when the business switches to instant confirmation or changes the hold time.

- A · Waiting requests stay requests with their original timers; only new bookings follow the new setting. (recommended)
- B · Switching to instant confirms all waiting requests at once, and a new hold time also applies to waiting requests.

answer: —

## Q-206 · When "Arz et" is allowed on an appointment
chapter: 07 · status: open

The calendar's booking drawer shows "Arz et" on every confirmed or completed booking, including ones that haven't started yet (B-Calendar). ADR 0017 and the code allow a complaint only from the visit's start; earlier, the code refuses with "not started". Classes enable "Gelmedi belle" only after the session starts (business spec §22). A no-show before the visit makes no sense, but a client can be rude on the phone before it.

- A · "Gelmedi" only from the start time; "Gijä galdy", "Gödek gylyk" and "Başga" any time on a confirmed or completed booking. (recommended)
- B · All of "Arz et" only from the start time, as the code does today.
- C · Any time, as drawn.

answer: —

## Q-207 · Undo a mistaken no-show on an appointment
chapter: 07 · status: open

In the class drawer a "Gelmedi" mark can be removed ("«Gelmedi» belgisini aýyr", B-Classes). The appointment calendar has no way to remove a complaint or a no-show, and the code allows one complaint per booking with no undo. A mistaken no-show counts towards the phone-only block (2 by default), and the client sees "Gelmediňiz diýlip bellendi".

- A · Let the team remove a complaint from the booking drawer within 7 days: the status goes back to Tamamlandy, the no-show count drops, and the client gets no message. (recommended)
- B · Only the undo in the toast right after marking; after that it can't change.
- C · No undo; Ýeral support fixes mistakes.

answer: —

## Q-208 · Deleting a client with upcoming bookings
chapter: 07 · status: open

"Müşderini poz" deletes the client and their notes; their booking history stays in reports without a name (business spec §6, ADR 0018). Upcoming bookings aren't mentioned. They would stay in the calendar with no name or phone and no reminders. A client with a Ýeral account would still see them in "Ýazylyşlarym".

- A · Don't allow deleting while the client has upcoming bookings or waiting requests; the modal asks to cancel them first. (recommended)
- B · Deleting cancels upcoming bookings and sends the client an SMS.
- C · Delete anyway; upcoming bookings stay without a name.

answer: —

## Q-209 · Bulk move in the bookings list
chapter: 07 · status: open

The bulk bar in Ýazylyşlar offers "Başga wagta geçir" (business spec §5), but moving several bookings at once is listed as "not designed yet" (§11), and the screen's button only links to the calendar.

- A · Drop "Başga wagta geçir" from the bulk bar on MVP; bookings move one at a time. (recommended)
- B · Keep the button; it opens the calendar in move mode for each selected booking in turn.
- C · Design a real bulk move (for example shift all by N minutes, or to another specialist).

answer: —

## Q-210 · Deleting a service with future bookings
chapter: 07 · status: open

"Hyzmaty poz" deletes a service with an undo toast (B-Services). In code a deleted service is archived, and bookings keep a copy of its name and price. Nothing says what happens to future bookings and waiting requests for that service, or whether the business is warned first.

- A · Allowed: future bookings stay as they are with the copied name and price, the modal warns how many there are, and the service disappears from new bookings. (recommended)
- B · Not allowed until its future bookings are moved or cancelled.
- C · Deleting cancels the future bookings and offers clients 3 other times.

answer: —

## Q-211 · Changing hours or a shift with bookings outside
chapter: 07 · status: open

Special days and personal days off ask what to do with bookings on those days: keep them, or cancel or move them with 3 offered times (B-Settings, B-Team). Changing the weekly business hours or a staff member's shift or break can also leave bookings outside working time, but no screen covers it.

- A · Same pattern as special days: on save, list the affected bookings with "Ýazylyşlary galdyr" or "Ýatyr we müşderilere 3 başga wagt hödürle"; new bookings follow the new hours either way. (recommended)
- B · Save without asking; affected bookings stay and get a warning mark in the calendar.
- C · Refuse to save while bookings fall outside the new hours.

answer: —

## Q-212 · Turning a phone-only specialist into a login user
chapter: 07 · status: open

The access level select in the staff drawer offers Administrator, Hünärmen and Programmasyz hünärmen (COMPONENTS AccessLevelField). Changing a phone-only specialist to a level that logs in isn't drawn. It's not said whether an SMS invite goes out, whether the 7-day limit applies, or what happens to their bookings and requests in between.

- A · Changing the level sends the normal 7-day SMS invite; until they accept they stay phone-only (bookable, requests go to the owner and administrators), and their bookings stay with them. (recommended)
- B · Not allowed: remove them and invite them as a new person.

answer: —

## Q-213 · Closing or deleting a workspace
chapter: 07 · status: open

An owner can switch online booking off and transfer ownership, but nothing lets them close or delete a workspace, for example a second location that shut down. It's unclear what would happen to the public page, future bookings, the client list, reviews and the team.

- A · No self-service delete on MVP: switching online booking off pauses the business, and closing a workspace goes through Ýeral support (future bookings cancelled with SMS, page hidden, data kept). (recommended)
- B · Add "close workspace" for the owner in Biznes profili: cancels future bookings with SMS, hides the page, removes the team's access, keeps data for reports.
- C · Full delete of all data after a waiting period.

answer: —

## Q-214 · Access levels in table and class workspaces
chapter: 07 · status: open

Access levels, "own" permissions and "who answers requests" are built around specialists who have their own calendar column (business spec §1, §2). Tables have no specialists: it isn't said what a Hünärmen (a host or waiter) sees and does in Stollar, or who besides the owner and administrators answers table requests. In classes the trainers are staff, but "own" isn't defined (own sessions? own attendees?); §21 only says the trainer marks no-shows. Like Q-201, this matters only once tables and classes are in scope (Q-030).

- A · Tables: the owner and administrators answer requests (the setting is hidden); a Hünärmen sees the whole timeline and can seat, free tables and add walk-ins, but can't answer requests or change settings. Classes: "own" means sessions they teach; they mark attendance and answer requests for those. (recommended)
- B · On MVP, table and class workspaces have only Owner and Administrator, no Hünärmen.
- C · Use the appointment matrix unchanged; "own" means bookings the person created.

answer: —

## Q-215 · A business moves to a new address
chapter: 07 · status: open

Each workspace is one address. "Salgyny üýtget" opens the map with "Her iş ýeri — bir salgy", and a new address means "Täze biznes döret" (business spec §8). It's unclear whether a business that relocates (same team, same clients, same reviews) may change its address, or must open a new workspace and lose its reviews, clients and history.

- A · A relocation may change the address and keeps everything, perhaps with a new Ýeral check; only a second, simultaneous location needs a new workspace. (recommended)
- B · Any new address means a new workspace, and the old one is closed.

answer: —

## Q-250 · How often the system checks the clock
chapter: 07 · status: open

The system makes one pass every minute. It ends unanswered requests, completes visits and sends queued SMS (code: `modules/jobs`). The operations notes ask for the pace to be set before the production api goes live, because a pass every minute keeps the database awake and that costs compute hours on a free product (`operations.md`). Screens show the right status from the exact deadline either way. Only SMS and the saved status can arrive late.

- A · Every minute, as built, accepting the database cost. (recommended)
- B · Every 5 minutes, so expiry SMS and reminders may come up to 5 minutes late.
- C · Every minute from 07:00 to 23:00, every 15 minutes at night.

answer: —

## Q-252 · What an expired table or class request offers
chapter: 07 · status: open

The rule says the client gets 3 alternative times after an expiry. The code finds them only for appointments. Table and class requests get none, and their SMS then reads "Şu boş wagtlar bar: —" with an empty list. The same broken text goes out when no free appointment time exists.

- A · Tables get the 3 nearest times for the same party size and area, classes get the next 3 sessions of the same class with seats, and if nothing is free the SMS drops the times and says "Başga wagt saýlaň". (recommended)
- B · Tables and classes get no times, only a short SMS with the link.

answer: —

## Q-253 · The answer time the client is shown
chapter: 07 · status: open

At a manual business, the sent screen says "Jogap bermese, {N} minutdan soň size başga wagtlary hödürläris.", with N = the business's hold time (ROUND6 A2). But the deadline never runs past the visit start (business spec §2), so for a visit soon after sending, the real wait is shorter than N. Long holds also read badly: "360 minutdan", "1440 minutdan".

- A · Show the real deadline as a clock time, worded by the owner during the Turkmen check. (recommended)
- B · Show the real minutes left, in hours when 60 or more.
- C · Keep the hold time as drawn.

answer: —

## Q-254 · How long after a visit a no-show can be marked
chapter: 07 · status: open

A visit completes by itself at its end, and staff can still mark "Arz et → Gelmedi" afterwards (business spec §3). No time limit is set, and the code allows it at any time after the start, with no end. The review ask goes out 2 hours after the end, so a client may review a visit that is later marked as not having happened. That review is left as it is.

- A · Until 24 hours after the end; a review written before stays. (recommended)
- B · Until the end of the next day; marking a no-show removes the review.
- C · Any time, as the code does.

answer: —

## Q-257 · Reminders for bookings made at short notice
chapter: 07 · status: open

Reminders go out 1 day and 2 hours before a visit (client spec §6). The code skips a reminder whose time has already passed. A booking made 10 hours ahead gets only the 2-hour reminder, and one made 1 hour ahead gets none. The design doesn't say.

- A · Skip, as the code does, since the confirmed SMS has just told them. (recommended)
- B · If the 2-hour reminder is missed but the visit is more than 30 minutes away, send it at once.

answer: —

## Q-258 · Review ask when a review already exists
chapter: 07 · status: open

The review ask goes out 2 hours after the end (client spec §6). A client may write the review on screen before that. The code sends the ask anyway.

- A · Skip the SMS when a review already exists. (recommended)
- B · Send it anyway.

answer: —

## Q-259 · Where the review-ask link lands
chapter: 07 · status: open

The review-ask SMS carries the booking link `yeral.app/b/{code}`. The link page (Booking-Link) is drawn for declined, expired, confirmed, pending, offers expired and not found, but not for a finished visit. A client who isn't signed in, or who booked by phone, can't leave the review from the link.

- A · Add a finished-visit state to the link page: stars first, then the login with the booking's own phone, then the review form. (recommended)
- B · Send the link to the login page, then on to the booking in Ýazylyşlarym.

answer: —

## Q-260 · Review asks for bookings made by staff
chapter: 07 · status: open

Only clients with a completed booking can review (client spec §4.3). Phone and walk-in bookings are completed bookings too, but the client may have no Ýeral account. The spec doesn't say whether they get a review ask, and every SMS costs Ýeral.

- A · Yes, the same ask as for online bookings, unless the business stopped SMS for that client. (recommended)
- B · Only for bookings made online.
- C · Each business chooses in its settings.

answer: —

## Q-261 · How long a reported review may stay uncounted
chapter: 07 · status: open

A reported review stops counting at once, and counts again only when Ýeral clears it (business spec §15). Ýeral has no deadline and there's no limit on reports. A business could therefore report every low rating and keep a perfect average while the reports wait. It also isn't said whether a cleared review can be reported again.

- A · Ýeral decides within 48 hours, otherwise the review counts again; a cleared review can't be reported again. (recommended)
- B · No deadline; the review stays uncounted until Ýeral decides.
- C · No deadline, but a business may have at most 3 reports open at once.

answer: —

## Q-262 · Who hears the moderation result
chapter: 07 · status: open

Nothing says who is told when Ýeral clears or removes a reported review. The author isn't told about the report either.

- A · The business gets a "Ýeral" notification with the result; the author is told on screen only if the review is removed. (recommended)
- B · Only the business is told.
- C · Nobody is told; only the review's status changes.

answer: —

## Q-263 · A waiting move that outlives the original time
chapter: 07 · status: open

A move request waits for the business up to the hold time, and never past the new time's start (code). If the business allows cancelling at any time ("Islendik wagt"), a client can ask to move 10 minutes before the visit. The original visit then starts while the move is still waiting, and the business could still accept it afterwards.

- A · A move's deadline also never runs past the original visit's start. (recommended)
- B · Keep the code's rule, where only the new time's start limits it.

answer: —

## Q-264 · When an offered time counts as past
chapter: 07 · status: open

Offered chips turn into "Teklip edilen wagtlaryň möhleti geçdi" once all of them are past (ROUND6 A1). Normal booking never shows a time earlier than now plus the business's lead time (client spec §4.2). Nothing says which rule applies to offered times.

- A · An offered time is past once it's earlier than now plus the lead time, like any other booking. (recommended)
- B · An offered time is past only at its start, since the business offered it itself.

answer: —

## Q-265 · One booking from the times offered after an expiry
chapter: 07 · status: open

After a decline, a declined request can turn into only one booking (ROUND6 A1). After an expiry, the design shows 3 free-time chips (ROUND6 A2) but doesn't say whether the client may take more than one. The code allows one booking per original request for both kinds.

- A · One booking, as for declines and in the code; the other chips go. (recommended)
- B · Each chip can be taken once, so one expired request can become several bookings.

answer: —

## Q-266 · Undo after a cancel that withdrew a waiting move
chapter: 07 · status: open

Cancelling a booking also withdraws its waiting move (ROUND6 A3). If the client taps "Yzyna al" within 5 minutes, the code brings back only the booking. The move request stays withdrawn and its time is free. This isn't designed.

- A · Bring back the booking only; the client asks for the move again if they still want it. (recommended)
- B · Bring back the move request too, if its time is still free and its deadline hasn't passed.

answer: —

## Q-267 · Login code limits that only the code sets
chapter: 07 · status: open

The design sets 3 tries, a 60-second lock and a 59-second resend. The code adds three numbers that no design shows (ADR 0019). A code is valid 5 minutes, a phone can ask for 5 codes an hour, and one internet address can ask for 20 codes an hour. Mobile operators often put many phones behind one internet address, so the last limit could stop real people.

The message for that limit ("Haýyş köp boldy. Biraz garaşyň.") isn't drawn. It also doesn't say the wait can be up to an hour.

- A · Keep 5 minutes and 5 codes per phone, raise the address limit to 100 an hour, and show the wait in minutes. (recommended)
- B · Keep all three numbers as built.
- C · Drop the address limit and rely on the per-phone limit.

answer: —

## Q-268 · After the 60-second lock, a new code or the same one
chapter: 07 · status: open

After 3 wrong tries the design locks for 60 seconds, with "Köp synanyşyk. 60 sekuntdan soň gaýtadan synanyşyň." (Auth). It doesn't say whether the same code works after the lock. The code uses the code up, so the person must ask for a new one. Its lock message also differs from both drawn texts.

- A · A new code is needed, and after the lock the screen offers to send one. (recommended)
- B · The same code works again, with 3 more tries.

answer: —

## Q-269 · How long a sign-in lasts, and signing out everywhere
chapter: 07 · status: open

The design doesn't say how long a sign-in lasts. The code keeps a sign-in for 60 days and extends it whenever less than 30 days are left, so active people never have to sign in again. Claude chose this, and the owner can reverse it (ADR 0019). "Çykmak" signs out only the current browser. Changing the phone signs out all other devices. There's no "sign out on all devices" button.

- A · Keep 60 days with renewal, and no "all devices" button on MVP. (recommended)
- B · Keep 60 days and add a "sign out on all devices" button to the profile and Profilim.
- C · 30 days for everyone, with no renewal.

answer: —

## Q-270 · Linking bookings made under the same phone
chapter: 07 · status: open

Every time a phone signs in, the code links all bookings and business client records made with that phone to the account, and activates waiting team invites. No design shows this. It lets clients see their phone bookings online. But if a mobile number passes to a new person, they would see the previous owner's bookings.

- A · Link automatically, as the code does. (recommended)
- B · Link only upcoming bookings and those from the last 6 months.
- C · Ask the person at their first sign-in before linking.

answer: —

## Q-271 · What the "Başga ýerde" switch controls
chapter: 07 · status: open

In Profilim, the switch "Beýleki iş ýerlerimdäki wagtymy «Başga ýerde» görkez" is on by default (business spec §1). While it's on, the other workspace sees the block and can't book her then. Nothing says what happens when it's off.

- A · When it's off, the other workspaces neither see that time nor are blocked by it. (recommended)
- B · When it's off, the details stay hidden but the time is still blocked, shown as a plain busy time.

answer: —

## Q-272 · Which bookings block a person elsewhere
chapter: 07 · status: open

A person's bookings in another workspace show as "Başga ýerde" (business spec §1). Several things aren't covered: waiting requests, the buffer after a visit, breaks and days off, and her own bookings as a client somewhere else.

- A · Confirmed bookings and waiting requests where she is the specialist, with their buffers, and nothing else. (recommended)
- B · Confirmed bookings only.
- C · Also her breaks, days off and her own bookings as a client.

answer: —

## Q-273 · How fast changes must reach open screens
chapter: 07 · status: open

Open screens ask for changes about every 10 seconds, when the window gets focus, and right after the person's own action (code). A hidden tab doesn't ask at all, but B-Shell wants a browser notification exactly when the workspace is in a background tab. The design wants new requests to show "on arrival" but sets no maximum delay. A push connection would be instant but is more to run, and it can be added later without changing screens.

- A · Within about 10 seconds by asking, including in a background workspace tab. (recommended)
- B · Instantly, through a push connection, before launch.
- C · Every 10 seconds when the tab is visible and every 60 seconds in a background tab.

answer: —

## Q-274 · What a rejected business sees
chapter: 07 · status: open

The data model has a "rejected" status with a reason (business spec §10), but no screen shows it. Three things aren't said: what the owner sees, whether they can fix things and send the business again, and what visitors see at the link.

- A · A banner with the reason and a way to fix and send again; visitors keep seeing "Bu sahypa entek açylmady". (recommended)
- B · Ýeral calls the owner; there's no screen, and the workspace keeps working.

answer: —

## Q-275 · Re-checking a verified business after changes
chapter: 07 · status: open

After verification, a business can change its name, address, category and photos. Nothing says whether that sends it back to review. Hiding a live business would also hide it from its own clients.

- A · No automatic re-check on MVP, but the Ýeral team can un-verify a business by hand. (recommended)
- B · Changing the name, address or category sends the business to review, and the page stays public meanwhile.

answer: —

## Q-276 · What the Ýeral team checks before verifying
chapter: 07 · status: open

The spec says the team verifies new businesses within 24 hours (business spec §7). It gives the owner a quality checklist (logo, 3+ photos, description) but doesn't say what the team actually checks.

- A · A call to the business phone, then a look at the name, the address on the map, the category and the photos. (recommended)
- B · The same, plus a registration document such as a patent or licence.
- C · Only a look at the profile, with no call.

answer: —

## Q-278 · What "night" means for business SMS
chapter: 07 · status: open

Quiet hours are 22:00–08:00 by default. A person can move them (start 19:00–00:00, end 05:00–10:00) or switch them off. The screen says SMS never go at night, even with quiet hours off ("SMS gije hiç haçan iberilmeýär", B-Notifications). What counts as night then isn't defined.

- A · Night is the person's quiet hours, or 22:00–08:00 when quiet hours are off. (recommended)
- B · Night is always 22:00–08:00, whatever the quiet hours.

answer: —

## Q-279 · A business SMS that falls in the night
chapter: 07 · status: open

Only two business events can use SMS: "Täze haýyş" and "Ýeral". If one happens at night, the SMS can't go, and nothing says whether it's dropped or sent in the morning. A request sent at 23:00 with a 30-minute hold has expired by morning.

- A · New-request SMS are dropped, since the morning summary covers them; "Ýeral" SMS wait until the morning. (recommended)
- B · Both wait until the morning.
- C · Both are dropped.

answer: —

## Q-280 · Summaries while the browser is the only channel
chapter: 07 · status: open

The evening and morning summaries were drawn with the app channel. On MVP only the browser is left, and it works only while Ýeral Biznes is open (B-Notifications). Summaries can't go by SMS (business spec §22). Many reception desks keep the workspace open all day, but an owner at home won't see a summary.

- A · Keep them as drawn: a browser notification if the workspace is open at that time. (recommended)
- B · Hide the summary rows until the app ships.
- C · Allow SMS for summaries, at more cost to Ýeral.

answer: —

## Q-281 · Notification settings per workspace or per person
chapter: 07 · status: open

Settings are "per person (the signed-in user), with role defaults" (business spec §16). One person can be the owner in one workspace and a specialist in another (business spec §1). Nothing says whether one set of settings covers all their workspaces.

- A · One set per person per workspace, with that workspace's role defaults, and quiet hours shared across workspaces. (recommended)
- B · One set per person for all workspaces.

answer: —

## Q-283 · Demo businesses on the live site
chapter: 07 · status: open

Production gets only the category list, and the design's demo businesses stay on local machines (ADR 0020). ADR 0020 leaves open whether yeral.app should show demo businesses before real ones join. An empty marketplace looks dead, but fake businesses mislead real clients.

- A · No demo businesses on production; launch once enough real businesses are verified. (recommended)
- B · Show demo businesses marked as examples, with booking switched off, until a set number of real ones join.

answer: —

## Q-284 · An SMS that can't be delivered
chapter: 07 · status: open

The code tries a queued SMS 5 times over about 15 minutes, then gives up, and nobody is told. For a reminder or a decline, the client silently misses it. A late retry could also deliver a reminder just before the visit.

- A · Give up after 5 tries and alert the Ýeral team, and drop reminders that would arrive after the visit has started. (recommended)
- B · Keep the code's behaviour and give up quietly.
- C · Also show the business on the booking that the SMS didn't arrive.

answer: —

## Q-285 · Client SMS at night
chapter: 08 · status: open · priority: high

Business SMS never go at night (business spec §16), but nothing is said for clients. The code sends at any hour. A 07:00 visit gets its 2-hour reminder at 05:00, a visit ending at 21:00 gets its review ask at 23:00, and expiry and confirmation SMS go out whenever they happen.

- A · Booking outcomes go at any time; reminders that fall between 22:00 and 08:00 move to 21:30 the evening before, and review asks to 08:00. (recommended)
- B · Everything goes at any time, as the code does.
- C · Nothing goes between 22:00 and 08:00, and everything waits until 08:00.

answer: —

## Q-286 · What the "Tassyklama we üýtgeşmeler" switch covers
chapter: 08 · status: open

The client's switch reads "Biznes ýazylyşyňyzy tassyklanda, wagtyny üýtgedende ýa-da ýatyranda habar bereris." (Account-Profile). It doesn't name declines or expiries, yet those SMS carry the offered times. The code sends the expiry SMS even with the switch off. Declines aren't sent yet.

- A · Declines and expiries always go; the switch covers confirmations, time changes and cancels by the business. (recommended)
- B · The switch covers declines and expiries too.

answer: —

## Q-287 · Confirmed SMS at an instant business
chapter: 08 · status: open

At an instant business, the booking is confirmed when the client sends it, and the sent screen says "Ýazylyş tassyklandy" (client spec §4.4). The spec says no SMS when a request is sent, and an SMS when a booking is confirmed. The code sends the confirmed SMS straight away.

- A · Send it, as the code does, since it carries the booking link. (recommended)
- B · No SMS, since the client is looking at the screen.

answer: —

## Q-288 · SMS texts the design doesn't have
chapter: 08 · status: open

Screens promise SMS that have no text: a business moving the booking ("Müşderä SMS iberilsin"), a client's move accepted, a booking entered by staff ("Müşderä SMS bilen habar ber"), a specialist changed after staff are removed, a class cancelled or moved by the studio, a team invite, and a new owner after a transfer. The code has its own texts for a business cancel and for the login code. It reuses the confirmed text when a move is accepted.

- A · Claude drafts the Turkmen texts in the style of client spec §6, and the owner checks them while coding, as for all copy. (recommended)
- B · The design writes them first, in the next export.

answer: —

## Q-289 · SMS when a waiting move isn't accepted
chapter: 08 · status: open

A declined or unanswered move leaves the booking at its old time. The screen says "Täze wagt kabul edilmedi — ýazylyşyňyz öňki wagtynda galýar." (ROUND6 A3). No SMS is designed and the code sends none. A client who doesn't open the site may turn up at the new time.

- A · Send an SMS with that sentence and the link. (recommended)
- B · Show it on screen only.

answer: —

## Q-290 · Telling the client about a no-show and the phone-only limit
chapter: 08 · status: open

A no-show shows on the booking as "Gelmediňiz diýlip bellendi" (client spec §4.8). The phone-only limit shows only when the client next tries to book (ROUND6 A7). Neither has an SMS, and the code sends none.

- A · Show both on screen only, as designed. (recommended)
- B · Send an SMS when the limit starts, so the client knows to call.

answer: —

## Q-291 · "Ýatlatma SMS-lerini iberme" and review asks
chapter: 08 · status: open

On the client card, the business can switch on "Ýatlatma SMS-lerini iberme" (don't send reminder SMS) when a client asks (business spec §6). The code also stops review asks with it, but not confirmations.

- A · It stops reminders only, and review asks follow the client's own switch. (recommended)
- B · It stops reminders and review asks, as the code does.
- C · It stops every SMS to that client except login codes.

answer: —

## Q-292 · SMS language for clients without an account
chapter: 08 · status: open

SMS go out in the person's language (client spec §6). A client the business entered by phone may have no Ýeral account and no language set. The code then writes to them in Turkmen.

- A · Turkmen, until the person signs in and chooses a language. (recommended)
- B · The business sets the client's language on the client card.

answer: —

## Q-293 · The 2-hour reminder text
chapter: 08 · status: open

Client spec §6 gives one text for both reminders: "Ýatlatma: ertir {time} {business}, {address}." "Ertir" (tomorrow) is wrong two hours before a visit. The code uses "Ýatlatma: şu gün {time} {business}, {address}." (today) for the 2-hour reminder.

- A · Keep the code's separate "şu gün" text for the 2-hour reminder. (recommended)
- B · One text for both reminders, with the weekday and date instead of "ertir" or "şu gün".

answer: —

## Q-294 · The "-da" after a business name
chapter: 08 · status: open

The review ask reads "{business}-da bolşuňyz nähili boldy?" (client spec §6; code). Turkmen chooses "-da" or "-de" by the name's last vowel ("Glow Studio-da" but "Ak Diş-de"), and names can end in a digit or a foreign word. The export's open list already flags "-da/-de" (CHANGELOG v0.4).

- A · Reword the text so no suffix follows the business name. (recommended)
- B · Choose "-da" or "-de" by the name's last vowel, using "-da" when unsure.

answer: —

## Q-295 · SMS length and cost
chapter: 08 · status: open · priority: high

Turkmen letters such as ý, ş and ň aren't in the basic SMS alphabet. Each SMS part therefore holds 70 characters instead of 160, and the same is true for Russian. With demo data, the confirmed, declined, expired and business-cancel texts run 95–125 characters, which is two parts each. Reminders and the review ask fit in one part only with short names and addresses. Ýeral pays for every part.

- A · Keep the full Turkmen letters and accept two-part messages, shortening texts where that's easy. (recommended)
- B · Shorten every text to fit one part, for example by dropping the weekday and the "Ýeral:" prefix.
- C · Write SMS without Turkmen letters (y for ý, s for ş) so each part fits 160 characters.

answer: —

## Q-296 · Business defaults while the app channel doesn't exist
chapter: 08 · status: open

The drawn defaults (B-Notifications, business demo data) put four events on the app channel only: "Müşderi ýatyrdy", "Täze teswir", "Ertirki ýazylyşlar" and "Topar". On MVP the app channel is hidden (business spec §16, §25), so by default nobody hears that a client cancelled or wrote a review.

- A · On MVP these four go to "Brauzerde" by default. (recommended)
- B · Leave them off, and people switch them on themselves.

answer: —

## Q-297 · New-request SMS to staff before the app exists
chapter: 08 · status: open

Staff SMS is meant only for "a new request when the person has no app" (business spec §16, §22). The screen says SMS goes only when the app can't deliver. On MVP nobody has the app. The drawn default for new-request SMS is off. Nothing says who may switch it on or how many people get one per request, and each request could cost several SMS.

- A · Off by default; each person can switch it on, and it never goes at night or to someone who has the workspace open. (recommended)
- B · On by default for the people who answer requests.
- C · No staff SMS at all until the app ships.

answer: —

## Q-298 · Changes nobody is told about
chapter: 08 · status: open

Some changes have no notification on either side. On the business side: a request that expired, a client taking an offered time, a client undoing a cancel right after the business heard "Müşderi ýatyrdy", and a declined invite (B-Login says "… habar alar", but there's no notification row for it). On the client side: a business reply to their review, and the result of a review report.

- A · Show all of these on screen only, plus two small additions: an undo updates the earlier "Müşderi ýatyrdy" notice, and a declined invite uses the "Topar" row. (recommended)
- B · Show all of them on screen only.
- C · Add a notification row for each.

answer: —

## Q-299 · A cap on SMS per business
chapter: 08 · status: open

Ýeral pays for every SMS while the service is free (business spec §16; the landing says "SMS ýatlatmalar hem mugt"; owner's direction 2026-10-16). Nothing limits how many SMS one business causes through reminders, phone bookings and review asks. A busy or misbehaving business could cost a lot.

- A · No cap on MVP; the Ýeral team watches a monthly count per business. (recommended)
- B · A monthly cap per business; above it, reminders stop and the owner is told.

answer: —
