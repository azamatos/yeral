# 9. Decisions

Every decision that shapes Ýeral, newest first, with who made it and where it's written down. When the owner answers a
question in this book, the answer is added here with its date, and the chapters are updated to match. From
18.10.2026 the owner answers only the critical questions; the others get their recommended option, marked
"Claude (delegated)".

## Answered in this book

| Date | Question | Decision | By |
|---|---|---|---|
| 20.10.2026 | Q-107 (how) | The market's cities are a list (seeded until the admin tool manages them) and the market names its main one. A position preselects the city whose centre is within 50 km, else the main city. A chosen city keeps search to it, without a radius (a position still gives distances); near me crosses city lines; the map area ignores the city; with neither a city nor a position the list keeps to the main city. "Nirede?" suggests places in the chosen city. A reminder SMS names the city when the business isn't in the main city, since a phone has no chosen city | Claude (delegated) |
| 20.10.2026 | Q-120 (how) | The hold counts only while the business is open: its hours and special days, not its breaks (as in "open now"); a request sent while closed starts counting at the opening, a night open past midnight keeps counting after it, and the hold never runs past the visit start; with no open time at all before the visit, the hold counts plain time | Claude (delegated) |
| 20.10.2026 | Q-105 (how) | A business day keeps everything after its midnight, up to 48:00: times after 24:00 belong to the day that started and are offered under it; a day's part past midnight ends by the next day's opening; bookings are compared in absolute time, so late ones of one day and early ones of the next can't overlap | Claude (delegated) |
| 19.10.2026 | Team (P2 step 2) | Only the owner invites; the override only takes the right to answer away; the owner can't leave and there's no hand-over in the MVP; an unanswered, declined or cancelled invite keeps its row until the owner resends or removes it; a removed member loses access, and reactivating restores it; the account link stays after leaving, so kept bookings still block the person elsewhere; "own clients" have a booking with the person; an owner can't delete their account while they own a workspace; the copied invite link only opens the invite, which must match the signed-in phone; inviting someone already on the team or with an open invite is refused (ADR 0025) | Claude (delegated) |
| 19.10.2026 | P2 review | A hold counts the business's opening hours, special days included; a reminder between 22:00 and 08:00 goes at 21:30 the evening before the visit (corrected 20.10.2026 to follow chapter 8), also for visits after midnight; "unused for 6 months" means no sign-in; the `yr-` slug rule goes with `/b/{code}`; a lower no-show limit counts from its change; the failed-SMS alert goes to the error tracker (chapter 10, P2) | Claude (delegated) |
| 19.10.2026 | Hosting | No Neon and no Cloudflare Workers for the api: the first launch runs on the own server, and Neon is removed (F-203, F-205) | owner |
| 18.10.2026 | Q-299 | No cap on MVP; the Ýeral team watches a monthly count per business | owner |
| 18.10.2026 | Q-298 | Show all of these on screen only, plus two small additions: an undo updates the earlier "Müşderi ýatyrdy" notice, and a declined invite uses the "Topar" row | owner |
| 18.10.2026 | Q-297 | Off by default; each person can switch it on, and it never goes at night or to someone who has the workspace open | Claude (delegated) |
| 18.10.2026 | Q-296 | Leave them off, and people switch them on themselves | owner |
| 18.10.2026 | Q-295 | Keep the full Turkmen letters and accept two-part messages, shortening texts where that's easy | owner |
| 18.10.2026 | Q-294 | Reword the text so no suffix follows the business name | owner |
| 18.10.2026 | Q-293 | Keep the code's separate "şu gün" text for the 2-hour reminder | owner |
| 18.10.2026 | Q-292 | The market's main language until the person signs in and chooses one | owner |
| 18.10.2026 | Q-291 | It stops reminders only (there are no review asks, Q-259) | owner |
| 18.10.2026 | Q-290 | Show both on screen only, as designed | owner |
| 18.10.2026 | Q-289 | Send an SMS with that sentence and the link | owner |
| 18.10.2026 | Q-288 | Claude writes them in English, the source language, with the market's translations (ADR 0022), in the style of client spec §6; the owner checks them | owner |
| 18.10.2026 | Q-287 | Send it, as the code does, since it carries the booking link | Claude (delegated) |
| 18.10.2026 | Q-286 | Declines and expiries always go; the switch covers confirmations, time changes and cancels by the business | owner |
| 18.10.2026 | Q-285 | Booking outcomes go at any time; reminders that fall between 22:00 and 08:00 move to 21:30 the evening before | owner |
| 18.10.2026 | Q-284 | Give up after 5 tries and alert the Ýeral team, and drop reminders that would arrive after the visit has started | owner |
| 18.10.2026 | Q-281 | One set per person per workspace, with that workspace's role defaults, and quiet hours shared across workspaces | Claude (delegated) |
| 18.10.2026 | Q-280 | Keep them as drawn: a browser notification if the workspace is open at that time | owner |
| 18.10.2026 | Q-279 | New-request SMS are dropped, since the morning summary covers them; "Ýeral" SMS wait until the morning | owner |
| 18.10.2026 | Q-278 | Night is the person's quiet hours, or 22:00–08:00 when quiet hours are off | owner |
| 18.10.2026 | Q-276 | A call to the business phone, then a look at the name, the address on the map, the category and the photos | Claude (delegated) |
| 18.10.2026 | Q-275 | No automatic re-check on MVP, but the Ýeral team can un-verify a business by hand | owner |
| 18.10.2026 | Q-274 | A banner with the reason and a way to fix and send again; visitors keep seeing "Bu sahypa entek açylmady" | Claude (delegated) |
| 18.10.2026 | Q-273 | Within about 10 seconds by asking, including in a background workspace tab | owner |
| 18.10.2026 | Q-272 | Confirmed bookings and waiting requests where she is the specialist, with their buffers, and nothing else | Claude (delegated) |
| 18.10.2026 | Q-271 | No switch: "Başga ýerde" always blocks the time and never shows details (owner's note on Q-031), so there is nothing to hide, and the Profilim switch is dropped | Claude, from the owner's note on Q-031 |
| 18.10.2026 | Q-270 | No password: phone bookings link to an account only if upcoming or from the last 6 months, and an account unused for 6 months asks "Is this you?" at sign-in | owner |
| 18.10.2026 | Q-269 | Keep 60 days with renewal, and no "all devices" button on MVP | owner |
| 18.10.2026 | Q-268 | A new code is needed, and after the lock the screen offers to send one | owner |
| 18.10.2026 | Q-267 | Keep 5 minutes and 5 codes per phone, raise the address limit to 100 an hour, and show the wait in minutes | owner |
| 18.10.2026 | Q-266 | Bring back the booking only; the client asks for the move again if they still want it | Claude (delegated) |
| 18.10.2026 | Q-265 | One booking, as for declines and in the code; the other chips go | owner |
| 18.10.2026 | Q-264 | An offered time is past once it's earlier than now plus the lead time, like any other booking | Claude (delegated) |
| 18.10.2026 | Q-263 | A move's deadline also never runs past the original visit's start | Claude (delegated) |
| 18.10.2026 | Q-262 | Only the business is told | owner |
| 18.10.2026 | Q-261 | Ýeral decides within 48 hours, otherwise the review counts again; a cleared review can't be reported again | Claude (delegated) |
| 18.10.2026 | Q-260 | Out of the MVP: there are no review asks at all (Q-259) | owner |
| 18.10.2026 | Q-259 | No review automation: no review-ask SMS. Clients review from Ýazylyşlarym (My bookings) and from the booking link after a completed visit (Q-170); a specialist may ask in person | owner |
| 18.10.2026 | Q-258 | Moot while there is no review-ask SMS (Q-259); if asks ever return, skip the SMS when a review exists | owner |
| 18.10.2026 | Q-257 | Skip, as the code does, since the confirmed SMS has just told them | Claude (delegated) |
| 18.10.2026 | Q-254 | Until 24 hours after the end; a review written before stays | Claude (delegated) |
| 18.10.2026 | Q-253 | Show the real deadline as a clock time; Claude writes it in English, the owner checks it | owner |
| 18.10.2026 | Q-252 | Tables get the 3 nearest times for the same party size and area, classes get the next 3 sessions of the same class with seats, and if nothing is free the SMS drops the times and says "Başga wagt saýlaň" | owner |
| 18.10.2026 | Q-250 | Every minute, as built, accepting the database cost | owner |
| 18.10.2026 | Q-216 | Specialists without the app stay, as an option on Hünärmen (phone required), not a separate level | owner |
| 18.10.2026 | Q-215 | A relocation may change the address and keeps everything, perhaps with a new Ýeral check; only a second, simultaneous location needs a new workspace | Claude (delegated) |
| 18.10.2026 | Q-214 | Tables: the owner and administrators answer requests (the setting is hidden); a Hünärmen sees the whole timeline and can seat, free tables and add walk-ins, but can't answer requests or change settings | Claude (delegated) |
| 18.10.2026 | Q-213 | No self-service delete on MVP: switching online booking off pauses the business, and closing a workspace goes through Ýeral support (future bookings cancelled with SMS, page hidden, data kept) | Claude (delegated) |
| 18.10.2026 | Q-212 | Switching the app on for a specialist who works without it sends the normal 7-day invite; their bookings stay with them | Claude (delegated) |
| 18.10.2026 | Q-211 | Same pattern as special days: on save, list the affected bookings with "Ýazylyşlary galdyr" or "Ýatyr we müşderilere 3 başga wagt hödürle"; new bookings follow the new hours either way | Claude (delegated) |
| 18.10.2026 | Q-210 | Allowed: future bookings stay as they are with the copied name and price, the modal warns how many there are, and the service disappears from new bookings | Claude (delegated) |
| 18.10.2026 | Q-209 | Drop "Başga wagta geçir" from the bulk bar on MVP; bookings move one at a time | Claude (delegated) |
| 18.10.2026 | Q-208 | Don't allow deleting while the client has upcoming bookings or waiting requests; the modal asks to cancel them first | Claude (delegated) |
| 18.10.2026 | Q-207 | Let the team remove a complaint from the booking drawer within 7 days: the status goes back to Tamamlandy, the no-show count drops, and the client gets no message | Claude (delegated) |
| 18.10.2026 | Q-206 | "Gelmedi" only from the start time; "Gijä galdy", "Gödek gylyk" and "Başga" any time on a confirmed or completed booking | Claude (delegated) |
| 18.10.2026 | Q-205 | Waiting requests stay requests with their original timers; only new bookings follow the new setting | Claude (delegated) |
| 18.10.2026 | Q-204 | Clicking an empty slot offers "Täze ýazylyş" or "Wagty ýap" (block time: person, from–to, reason, optional repeat), with the same rights as adding bookings; a block can't cover existing bookings | owner |
| 18.10.2026 | Q-203 | Leaving works like "Işgäri öçür" with "Bolşy ýaly galdyr": she's no longer bookable, her bookings stay in her column, and the owner gets a notification that opens the remove flow to move or cancel them | Claude (delegated) |
| 18.10.2026 | Q-202 | Put the workspace in the address (for example `/tk/w/{slug}/calendar`), so links, tabs and notifications always open the right workspace; the switcher just changes the address | Claude (delegated) |
| 18.10.2026 | Q-201 | For table and class categories, skip the services step and the specialist part of the team step; step 8 ends with a checklist pointing to Stollar or Sapaklar, and online booking opens once at least one table or class exists | Claude (delegated) |
| 18.10.2026 | Q-200 | The business exists as a draft from step 2; at login the wizard reopens at the saved step instead of the no-workspace card; the draft joins the switcher only when finished | Claude (delegated) |
| 18.10.2026 | Q-172 | Cancel upcoming bookings; delete the account, favourites and reviews; businesses keep their own visit records without a link to a Ýeral account; the modal copy is adjusted to say so | owner |
| 18.10.2026 | Q-171 | Client records follow the Ýeral account: a phone change updates the phone on every business's record of that person | Claude (delegated) |
| 18.10.2026 | Q-170 | The booking card with its status; a completed booking adds "Teswir ýaz", which logs in with the masked phone and opens the review; the others add "Gaýtadan ýazyl" | owner |
| 18.10.2026 | Q-169 | Signed in as the booking's owner: open "Ýazylyşlarym" with that booking's detail; signed in as someone else: show the signed-out link page with the masked-phone login | owner |
| 18.10.2026 | Q-168 | SMS links carry a long random token on their own path; the YR code is still shown and read out on the phone, but never opens anything by itself | owner |
| 18.10.2026 | Q-167 | The same services and specialist, opening at the time step; services or people no longer offered are dropped and the flow opens at the first step that needs a choice | Claude (delegated) |
| 18.10.2026 | Q-166 | No dispute in the MVP: the client calls the business, or writes to Ýeral support from the help pages | Claude (delegated) |
| 18.10.2026 | Q-165 | Allow it: the booking's own time doesn't count as busy for its move | Claude (delegated) |
| 18.10.2026 | Q-163 | Switch on: the modal shows the reason chips, still optional; switch off: no reason section | Claude (delegated) |
| 18.10.2026 | Q-162 | Past the deadline only "Jaň et", for every booking type; the class line is reworded to say so | Claude (delegated) |
| 18.10.2026 | Q-161 | Treat it like a decline with offered times: "Biznes ýatyrdy", the reason, up to 3 sessions as chips, and one tap books a confirmed seat | Claude (delegated) |
| 18.10.2026 | Q-159 | Each offered or free time belongs to one named specialist and is booked with that person only; if they're no longer free the chip shows "Eýýäm eýelendi" | owner |
| 18.10.2026 | Q-157 | One shared code step everywhere: a visible "Tassykla", one lock message, and after the lock the client asks for a new code, as the code does now | Claude (delegated) |
| 18.10.2026 | Q-156 | Ask for both everywhere, surname optional, and store them as two fields; a review shows "Aýjemal G.", or "Aýjemal" without a surname | Claude (delegated) |
| 18.10.2026 | Q-155 | Allow it, as today; businesses handle no-shows with "Arz et" | owner |
| 18.10.2026 | Q-154 | For that client, or while the business is paused, hide "Başga wagta geçir" and the free-time chips and show the "Jaň et" card; only decline offers stay bookable online | owner |
| 18.10.2026 | Q-153 | No bookings before verification; the preview shows the booking buttons disabled | owner |
| 18.10.2026 | Q-150 | Search and category pages list only places with a free time on the chosen day, as drawn and built | owner |
| 18.10.2026 | Q-134 | Keep them: they come from service prices, so no billing is involved | owner |
| 18.10.2026 | Q-133 | Redraw every board in English in the design pass that follows the book; Turkmen comes back as a translation | owner |
| 18.10.2026 | Q-132 | The phone's or browser's language if Ýeral has it, else the country's main language | owner |
| 18.10.2026 | Q-131 | One code base, one deployment per country: each country gets its own server, database and address, built from that country's settings | owner |
| 18.10.2026 | Q-128 | Hours from 00:00 to 24:00 in 30-minute steps; classes any time inside the hours, in 15-minute steps | owner |
| 18.10.2026 | Q-127 | Reaching N turns the switch on; the business can turn it off, and counting starts again from zero | owner |
| 18.10.2026 | Q-126 | Up to 30 days after the visit | owner |
| 18.10.2026 | Q-125 | Same as appointments: after the window only *Jaň et*, and the class line changes to say so | owner |
| 18.10.2026 | Q-124 | At most 3 waiting requests at one business and 10 in total | owner |
| 18.10.2026 | Q-120 | The hold runs only during the business's opening hours, still never past the start | owner |
| 18.10.2026 | Q-119 | The settings list in both places | owner |
| 18.10.2026 | Q-118 | A lateness setting next to the cancel window (none to 30 min, default 15); it comes with F-103 after the MVP, which shows a fixed 15 min | owner |
| 18.10.2026 | Q-117 | The last start is 1 hour before closing, online and by staff; the table is held until closing | owner |
| 18.10.2026 | Q-116 | Keep 10 | owner |
| 18.10.2026 | Q-115 | Up to 20 photos, each up to 10 MB (JPG, PNG or WebP), made smaller on upload | owner |
| 18.10.2026 | Q-114 | Show the average from the first review, always with the count, for example `5,0 (1)` | owner |
| 18.10.2026 | Q-113 | The median answer time over the last 30 days, rounded (15 min, 1 sagat …); hidden until the business has answered 5 requests | owner |
| 18.10.2026 | Q-112 | Restaurants whose limit is below the party stay in the list with *Jaň et* instead of times; chips stay 1–7 and 8+ | owner |
| 18.10.2026 | Q-109 | SMS sender "Yeral" in plain Latin; the name was chosen for its sound, not its Turkmen meaning | owner |
| 18.10.2026 | Q-108 | "Directions" opens the phone's own map app; Google Maps on a computer | owner |
| 18.10.2026 | Q-107 | The city is data: preselected from the person's location, changeable; an address shows its city when it differs | owner |
| 18.10.2026 | Q-106 | `3 km`; formats follow what the country's common platforms show | owner |
| 18.10.2026 | Q-105 | Businesses may be open past midnight, and bookings may cross midnight; options stay flexible | owner |
| 18.10.2026 | Q-104 | Ýeral isn't bound to one country: built in English; each country it launches in adds its languages and settings. Number formats follow the language (ADR 0022) | owner |
| 18.10.2026 | Q-103 | No average bill for restaurants; a menu may come later | owner |
| 18.10.2026 | Q-102 | A business fills in any one language; a missing language shows the one written | owner |
| 18.10.2026 | Q-101 | English is the source text, the design included; Claude translates, the owner checks | owner |
| 18.10.2026 | Q-100 | No language in workspace and CMS links; the client site keeps it in every link | owner |
| 18.10.2026 | Q-037 | For the first launch the data lives abroad (Cloudflare, the database in Frankfurt); the Turkmenistan deployment gets its own servers and database in the country | owner |
| 18.10.2026 | Q-036 | No real SMS at the first launch: the sign-in code shows on the screen; real SMS start with the Turkmenistan launch | owner |
| 18.10.2026 | Q-033 | Claude drafts both from this book's rules, in English for the first launch; each market's translation is checked by a lawyer there before that market launches | owner |
| 18.10.2026 | Q-032 | Launch on Cloudflare: early users and investors in Turkmenistan reach it through a VPN; own servers in Turkmenistan come once marketing starts and investment arrives | owner |
| 18.10.2026 | Q-031 | Both at launch (the owner placed F-094 and F-104 in the MVP). "Başga ýerde" never shows anything from the other workspace: the time shows only as reserved, and nobody can book it | owner |
| 18.10.2026 | Q-030 | Appointments at launch; tables and classes after the MVP | owner |
| 18.10.2026 | Q-022 | One booking type per business at launch; several types later | owner |
| 18.10.2026 | Q-020 | At the business only, plus the hidden exact address for home-based businesses; at the client's address and online come later | owner |
| 18.10.2026 | Q-012 | The team can hide a business (with a reason to the owner); no Ýeral-wide client blocks at launch; client karma later (F-241) | owner |
| 18.10.2026 | Q-011 | One role at launch: every team member can do everything in the admin tool | owner |
| 18.10.2026 | Q-010 | Design a small admin tool for launch: verify businesses and handle reported reviews | owner |
| 18.10.2026 | Q-005 | "Ýeral" everywhere, as in the logo; "Yeral" only where the letter can't be used (domain, SMS sender) | owner |
| 18.10.2026 | Q-004 | The first launch is an English pilot with Turkmenistan's settings: example businesses beside real ones, and a nightly-reset demo of the business app | owner |
| 17.10.2026 | Q-003 | Launch as Ýeral on yeral.app | owner |
| 17.10.2026 | Q-002 | The team adds the first businesses in the CMS; sign-up stays open | owner |
| 17.10.2026 | Q-001 | One launch with the client site, the business app and the CMS; native apps later | owner |

## How we work

| Date | Decision | By | Source |
|---|---|---|---|
| 19.10.2026 | The backend runs alongside the design pass (the book is closed); components and the apps wait for the design | owner | ADR 0021 (amended), chapter 10 |
| 18.10.2026 | The owner answers only critical questions; Claude decides the rest with the recommended option and records who decided | owner | this book, README |
| 18.10.2026 | Claude doesn't take an answer for granted: a weaker or risky answer gets a concern; without a reply the owner's answer stands | owner | this book, README |
| 18.10.2026 | No separate decisions app: the repository stays the record and this book's page stays where the owner answers | owner | activeContext |
| 17.10.2026 | The plan is reset: first a complete product book with no open questions, then the design, then components in Storybook, then code | owner | this book, chapter 1 |
| 17.10.2026 | Claude Code writes every prompt for Claude Design; the owner reviews, pastes and submits it; Claude Code reads the result from the canvas and checks it against the book | owner | this book, README |
| 17.10.2026 | The book lives as Markdown in `docs/product`; a published page is built from it for reading, answering and commenting | owner | this book, README |
| 16.10.2026 | Every pull request gets a code review before it's merged | owner | memory bank |
| 16.10.2026 | Only two environments: local and production; no staging | owner | ADR 0020 |
| 13.10.2026 | Infrastructure first; several agents may work in parallel, each in its own branch | owner | ADR 0014 |

## Product

| Date | Decision | By | Source |
|---|---|---|---|
| 18.10.2026 | Two launches: first in English on Cloudflare (investors, early users, a portfolio piece), then Turkmenistan with Turkmen, Russian and servers in the country | owner | chapter 1; Q-032, Q-037, Q-133 |
| 17.10.2026 | Round 6, part B: the client side of declines, expiries and moves is drawn; tables and classes can't be moved (cancel and book again); a move never swaps the specialist silently; undo works for 5 minutes; search gets a party-size filter for restaurants; tables can be combined when creating a reservation; hours may end at 24:00; no back-dated bookings; unverified business links show "not open yet"; reviews under moderation are shown but not counted; login codes go to mobile numbers only | owner, through design v0.5 | `ROUND6-ANSWERS.md`, client spec §14, business spec §26 |
| 16.10.2026 | Round 6, part A: one account for client and business; a person can be in several workspaces with a level in each; a workspace is one address (no branches); three fixed access levels and a permission matrix; a setting for who answers requests; invites by SMS link for 7 days; ownership transfer; every status has an icon; optional team-only internal statuses; the business app works fully on phones; native apps later | owner, through design v0.5 | business spec §25 |
| 16.10.2026 | Ýeral is free for now: no plans, commission or invoices; the paid model is kept for later | owner | activeContext, business spec §25 |
| 14.10.2026 | Only verified businesses are public; they use the workspace from the first minute | business design round 4 | ADR 0018 |
| 14.10.2026 | Manual confirmation is the default; a business can switch on instant confirmation; requests expire after the business's hold time (default 30 minutes) with 3 other times for the client | owner, through business design round 4 | ADR 0017 |
| 14.10.2026 | Declines carry a reason and up to 3 offered times; complaints replace a "came" button; after N no-shows a client books only by phone | business design round 4 | ADR 0017 |
| 14.10.2026 | One booking engine with appointment, table and class types (resource later) and five statuses | design v0.3 | ADR 0017 |
| 14.10.2026 | Turkmen first, then Russian and English; every client address carries its language (Turkmen first replaced by English first, 18.10.2026) | owner | ADR 0016, ADR 0022 |
| 14.10.2026 | The marketplace lives on yeral.app; there's no separate landing site; businesses use business.yeral.app | owner | ADR 0015 |
| 14.10.2026 | Maps: MapLibre with OpenFreeMap tiles | owner | activeContext |
| 14.10.2026 | The old mobile designs are removed: the web has its own design and logic | owner | activeContext |
| 14.10.2026 | Ýeral is for any business that sells its time, not only beauty | design v0.3 | projectbrief |

## Technology

| Date | Decision | Source |
|---|---|---|
| 19.10.2026 | The first launch runs on the owner's server (netcup VPS 1000, EU) in Docker, not on Cloudflare; the server also hosts other projects | ADR 0023 (revised) |
| 18.10.2026 | One code base, one deployment per country; the first launch runs on Cloudflare | ADR 0023 |
| 18.10.2026 | Built in English; each country adds its languages and settings | ADR 0022 |
| 14.10.2026 | Our own phone-code login and sessions stored in the database | ADR 0019 |
| 14.10.2026 | Each business has its own team, access and client records | ADR 0018 |
| 13.10.2026 | One repository for all apps and packages (pnpm and Turborepo) | ADR 0001 |
| 13.10.2026 | Vite and TanStack instead of Next.js | ADR 0002 |
| 13.10.2026 | Feature-Sliced Design inside the apps | ADR 0004 |
| 13.10.2026 | A TypeScript api in the same repository, on Postgres from the start | ADR 0005 |
| 13.10.2026 | One shared contract for the api and a client library generated from it | ADR 0006 |
| 13.10.2026 | Cloudflare now; the team's own server with Docker and nginx later | ADR 0007 |
| 13.10.2026 | Translations with use-intl | ADR 0008 |
| 13.10.2026 | Versions and releases with Changesets | ADR 0009 |
| 13.10.2026 | Checks and deploys on GitHub Actions | ADR 0010 |
| 13.10.2026 | Every kind of app state has one owner | ADR 0011 |
| 13.10.2026 | The design system lives in `@yeral/ui` and is tested in Storybook | ADR 0012 |
| 13.10.2026 | Testing strategy: unit, story, api and end-to-end tests | ADR 0013 |
