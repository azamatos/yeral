# 5. Limits and numbers

Every number in the product in one place: defaults, choices, limits, timers and sizes.

How to read the tables:

- **Value** shows the default first and the choices or the range in brackets: `30 min (15 min, 30 min, 1 h, 2 h, 6 h, 24 h)`.
- **Who can change it:** *Fixed* means nobody; it's part of the product. *Owner/admin* means the business owner, and the
  administrator when Rugsatlar allows it (allowed by default for settings, services and tables). *Client* means the person
  in their own profile or choices. *Ýeral team* means the team, through its admin tool.
- **Source** "code only" marks a number that exists only in the code. No design or spec mentions it, so the owner sees
  it here for the first time.
- **Conflict** in the Value cell means two sources say different things; a question follows the table.

## Login and accounts

| What | Value | Who can change it | Source |
|---|---|---|---|
| Phone number | +993 and 8 digits | Fixed | client spec §4.4; code: packages/domain/src/phone.ts |
| Numbers that get a login code | mobile only: starting with 6 or 7 | Fixed | ROUND6-ANSWERS C1; code: packages/domain/src/phone.ts |
| Login code | 4 digits | Fixed | client spec §4.4 |
| Code is valid for | 5 min | Fixed | Q-267, decided 18.10.2026; code: apps/api/src/modules/auth/codes.ts |
| "Send again" after | 59 s (timer 0:59) | Fixed | client spec §4.4; code: apps/api/src/modules/auth/codes.ts |
| Wrong tries | 3, then a 60 s lock; a new code is needed after it | Fixed | client spec §4.4; code: apps/api/src/modules/auth/codes.ts |
| Codes per phone | 5 an hour | Fixed | Q-267, decided 18.10.2026; code: apps/api/src/modules/auth/codes.ts |
| Codes per internet address | 100 an hour | Fixed | Q-267, decided 18.10.2026 |
| Too many codes asked for | the message shows the wait in minutes | Fixed | Q-267, decided 18.10.2026 |
| Test code outside production | `1234`; on the design canvases `0000` is wrong and any other code works | Fixed | ADR 0019, productContext |
| Sign-in code at the first launch | shown on the screen; no SMS goes out | Fixed | Q-036, decided 18.10.2026 |
| Name | asked once, at the first login; 1–80 characters | Client | client spec §4.7; length code only: packages/contract/src/account.ts |
| Staying signed in | 60 days, renewed to 60 whenever fewer than 30 are left; no "sign out on all devices" button on MVP | Fixed | Q-269, decided 18.10.2026; code: apps/api/src/modules/auth/session.ts |
| Changing the phone | a code goes to the new number; every other device is signed out | Client | client spec §4.8; sign-out code only: apps/api/src/modules/me/routes.ts |
| Deleting the account | upcoming bookings are cancelled; the account, favourites and reviews are deleted; each business keeps its own visit records, no longer linked to a Ýeral account | Client | client spec §4.8; Q-172, decided 18.10.2026; code: apps/api/src/modules/me/routes.ts |
| Accounts per person | 1, for booking and for business work | Fixed | business spec §1 |
| SMS switches | 3, all on: confirmations and changes, reminder a day before, reminder 2 h before; no review-ask switch | Client | client spec §4.8; Q-259, decided 18.10.2026; defaults code only: apps/api/src/db/schema/auth.ts |

**Code differs:** one internet address may ask for 20 codes an hour, and the message doesn't say how long to wait
(code: apps/api/src/modules/auth/codes.ts). Deleting an account keeps the reviews (code: apps/api/src/modules/me/routes.ts).
The client has a fourth SMS switch, for review asks (code: apps/api/src/db/schema/auth.ts).

**Design to fix:** drop the review-ask switch *Teswir haýyşy* from Account-Profile; adjust the delete-account modal's
copy to say businesses keep their visit records (Q-172).

> Open question Q-267: login code limits that only the code sets.

> Open question Q-269: how long a sign-in lasts, and signing out everywhere.

## Search and location

| What | Value | Who can change it | Source |
|---|---|---|---|
| Search radius | 5 km (1, 3, 5, 10, 25 km) | Client | client spec §5; code: packages/domain/src/geo.ts |
| Results per page | 12; *Ýene görkez* (show more) loads 12 more | Fixed | client spec §4.2; code: packages/contract/src/common.ts |
| Largest page the api returns | 50 | Fixed | code only: packages/contract/src/common.ts |
| Free times on a search card | up to 4, then "+N" | Fixed | client spec §4.2 ("3–4"); code: apps/api/src/modules/catalog/cards.ts |
| Home "free today near you" | 4 businesses, nearest first, 3 times each | Fixed | client spec §4.1 |
| Home category tiles | 13 | Ýeral team | client spec §4.1; code: apps/api/src/db/seed/categories.ts |
| Day filter | *Şu gün* (today) · *Ertir* (tomorrow) · *Şu hepde* (this week, 7 days) | Client | client spec §4.2; code: apps/api/src/modules/catalog/search.ts |
| Rating chip | 4,5 and up | Client | client spec §4.2 |
| Place suggestions in *Nirede?* | at most 6 | Fixed | client spec §5 |
| Suggestions in *Näme?* | at most 4 categories, 6 services, 6 businesses | Fixed | code only: packages/contract/src/catalog.ts |
| Search text | up to 80 characters | Fixed | code only: packages/contract/src/catalog.ts |
| Party size (restaurants, after the MVP) | 2 (1–7 and "8+", which shows times for 8); a restaurant whose online limit is below the party stays in the list with *Jaň et* (call) instead of times | Client | ROUND6-ANSWERS D2; Search screen; Q-112, decided 18.10.2026; code: packages/contract/src/catalog.ts |
| Earliest time shown | now + the business's minimum notice | Owner/admin (minimum notice) | client spec §4.2 |
| Without location | no distances; sorted by rating × number of reviews | Fixed | client spec §5; code: packages/domain/src/geo.ts |

> Open question Q-112: how does the search party size meet each restaurant's own limit?

## Business page

| What | Value | Who can change it | Source |
|---|---|---|---|
| Gallery | 1 large + 4 small photos; *Ähli suratlar* (all photos) | Fixed | client spec §4.3 |
| Photos | 3 or more recommended, up to 20; each up to 10 MB (JPG, PNG or WebP), made smaller on upload; the first is the cover everywhere | Owner/admin | business spec §7, §8; client spec §11; Q-115, decided 18.10.2026 |
| Typical answer time | "*Adatça 15 minudyň dowamynda tassyklaýar*"; the median answer time over the last 30 days, rounded (15 min, 1 sagat …); hidden until the business has answered 5 requests | Fixed | client spec §4.3; Q-113, decided 18.10.2026 |
| Rating | average with one decimal (`4,9`), count, bars 5 to 1 | Fixed | client spec §4.3; code: apps/api/src/modules/bookings/actions.ts |
| Rating shown from | the first review, always with the count: `5,0 (1)` | Fixed | Q-114, decided 18.10.2026; code: apps/api/src/modules/bookings/actions.ts |
| Reviews under moderation | listed, not counted in the average, count or bars | Ýeral team | ROUND6-ANSWERS F2 |
| Reviews per page | 12 | Fixed | code only: packages/contract/src/common.ts |
| Similar places | 4 | Fixed | client spec §4.3; code: packages/contract/src/catalog.ts |
| Special days shown | the next 14 days | Fixed | code only: apps/api/src/modules/catalog/detail.ts |
| "Opens next" looks ahead | 7 days | Fixed | code only: packages/domain/src/hours.ts |
| Home-based business on the map | a circle of about 1 km until the booking is confirmed | Owner/admin (switch "*Öýde işleýärin*") | client spec §2; size code only: apps/api/src/modules/catalog/map.ts |
| Verification | usually within 24 h; until then visitors see "*Bu sahypa entek açylmady*" | Ýeral team | business spec §7; ROUND6-ANSWERS F1 |
| Page link | `yeral.app/tk/b/{slug}`; slug of lowercase letters, digits and dashes, up to 64 characters, never starting with "yr-" | Fixed | business spec §7; ROUND6-ANSWERS notes; length code only: packages/contract/src/common.ts |

**Code differs:** the typical answer time is a stored number per business that nothing works out
(code: apps/api/src/db/schema/business.ts). Slugs starting with "yr-" aren't refused yet (code: packages/contract/src/common.ts).

> Open question Q-113: how is the typical answer time worked out?

> Open question Q-114: show a rating from the first review?

> Open question Q-115: how many photos may a business upload, and how big?

## Appointment booking

| What | Value | Who can change it | Source |
|---|---|---|---|
| Services in one booking | at least 1; at most 10 | Fixed | client spec §4.4; maximum Q-116, decided 18.10.2026; code: packages/contract/src/bookings.ts |
| Date strip | 14 days, today first; arrows move a week | Fixed | client spec §4.4 |
| Start times | every 15 or 30 min from opening | Owner/admin | client spec §4.4, business spec §8 |
| Time groups | *Irden* before 12:00 · *Günortan* 12:00–17:00 · *Agşam* from 17:00 | Fixed | Booking screen |
| Nearest times when a time was just taken | 3, same day | Fixed | client spec §4.4; code: packages/domain/src/availability.ts |
| Service length | 5–240 min in 5-min steps | Owner/admin | B-Services screen; code: at least 5, no maximum |
| Service price | whole manats, up to 5 digits (99 999 TMT) | Owner/admin | B-Services screen; code: no maximum |
| Buffer after one service | the business's buffer, or its own: none, 5, 10, 15, 20, 30 min | Owner/admin | business spec §4, §8; B-Services screen |
| Note to the business | optional, up to 500 characters; editable while the request waits | Client | client spec §4.4, §4.8; length code only: packages/contract/src/bookings.ts |
| Staff bookings: earliest start | the slot that holds "now" (11:20 → 11:15 with a 15-min step) | Fixed | ROUND6-ANSWERS E3; code: packages/domain/src/availability.ts |
| Staff bookings: minimum notice and window | don't apply | Fixed | code only: packages/domain/src/availability.ts |

> Open question Q-116: how many services can one booking hold?

## Table booking

Tables come after the MVP; these numbers apply then. (Q-030, decided 18.10.2026)

| What | Value | Who can change it | Source |
|---|---|---|---|
| Online party limit | 8 (2–12); chips 1 to the limit, then "{limit+1}+" with "*… we ondan köp adam bolsa, jaň ediň*" (call for more) | Owner/admin | ROUND6-ANSWERS D1; business spec §20; B-Tables screen |
| VIP area | 6 or more people | Owner/admin (each area's smallest and largest party) | client spec §4.5 |
| Table held after the booked time | 15 min (10, 15, 20, 30 min) | Owner/admin | business spec §20; B-Tables screen |
| Sitting time | 1–2 people 1 sag 30 min · 3–4 people 2 sag · 5 and more 2 sag 30 min (each 1–3 sag in 30-min steps) | Owner/admin | business spec §20; B-Tables screen |
| Last reservation of the day | 1 h before closing, online and by staff; the table is held until closing | Fixed | B-Tables screen; Q-117, decided 18.10.2026 |
| Table for an online booking | the smallest free table that fits; staff can change it | Staff | business spec §22 |
| Two tables together | pairs marked as combinable, offered when no single table fits | Owner/admin (pairs), staff (use) | business spec §20; ROUND6-ANSWERS D3 |
| Party size for a staff reservation | 1–12 | Fixed | B-Tables screen |
| Special requests | chips set by the restaurant (demo: 4); at most 5 per booking, 40 characters each | Owner/admin | client spec §4.5; limits code only: packages/contract/src/bookings.ts |
| Start times | on the business's time step | Owner/admin | code: packages/domain/src/availability.ts |

**Code differs:** the online party limit is fixed at 8 for every restaurant (code: packages/domain/src/availability.ts);
one sitting time of 2 h applies to every party (code: apps/api/src/db/schema/business.ts); the table hold reuses the
appointment lateness number instead of its own setting (code: packages/domain/src/rules.ts); the last online table
starts at closing minus the sitting time, so 21:00 for a 23:00 close (code: packages/domain/src/availability.ts).

> Open question Q-117: when is the last table reservation of the day?

## Class booking

Classes come after the MVP; these numbers apply then. (Q-030, decided 18.10.2026)

| What | Value | Who can change it | Source |
|---|---|---|---|
| Seats per booking | 1 to 2, never more than the seats left | Fixed | client spec §4.6; code: packages/domain/src/availability.ts |
| Full session | "*Doly*" (full), can't be picked; waiting list later | Fixed | client spec §4.6 |
| Seats a staff member adds | 1, confirmed | Fixed | business spec §22 |
| Class length | 30, 45, 60, 75, 90 min or 2 sagat | Owner/admin | B-Classes screen |
| Session start | any time inside the business's hours, in 15-min steps | Owner/admin | B-Classes screen; Q-128, decided 18.10.2026 |
| Repeats | every week or every two weeks | Owner/admin | B-Classes screen |
| Seats in a session | set per class (demo: 12 and 14); no limit set | Owner/admin | business spec §21 |
| Schedule days shown | 7 (up to 14) | Fixed | code only: packages/contract/src/availability.ts |
| Minimum notice | the business's setting applies | Owner/admin | code: packages/domain/src/availability.ts |
| Marking a no-show | only after the session starts | Fixed | business spec §22 |
| Request hold | the business's hold time, as for appointments | Owner/admin | business spec §22 |

## Business booking rules (settings)

All in *Sazlamalar → Ýazylyş düzgünleri* (settings → booking rules). (business spec §8, §11; ADR 0017; code:
packages/domain/src/rules.ts)

| What | Value | Who can change it | Source |
|---|---|---|---|
| Online booking (*Onlaýn ýazylyş*) | on (on, off) | Owner/admin | business spec §8; code: packages/domain/src/rules.ts |
| Confirmation (*Tassyklama*) | by hand (by hand, instant) | Owner/admin | business spec §2 |
| Who answers requests | both (*Administrator we eýesi*, *Her hünärmen özi*, *Ikisi hem*); hidden for a one-person business | Owner/admin | business spec §2 |
| Request hold (*Haýyş saklanýar*) | 30 min (15 min, 30 min, 1 h, 2 h, 6 h, 24 h), counted only during opening hours, never past the start | Owner/admin | business spec §2, §8; Q-120, decided 18.10.2026 |
| Minimum notice (*Iň az öňünden*) | 1 h (none, 30 min, 1 h, 2 h, 4 h, 24 h) | Owner/admin | business spec §8, §11 |
| Booking window (*Näçe gün öňünden açyk*) | 30 days (7, 14, 30, 60, 90); today counts as day 0 | Owner/admin | business spec §8; day 0 code only: packages/domain/src/rules.ts |
| Buffer (*Hyzmatdan soňky arakesme*) | 10 min (none, 5, 10, 15, 20, 30, or own 1–120 min) | Owner/admin | business spec §11 |
| Time step (*Wagt ädimi*) | 15 min (15, 30) | Owner/admin | business spec §8 |
| Free cancel and move (*Müşderi ýatyryp biler*) | 2 h before the start (any time, 1, 2, 6, 12, 24, 48 h), the same list in settings and in the setup wizard | Owner/admin | business spec §11; B-Settings and B-Onboarding screens; Q-119, decided 18.10.2026 |
| Ask for a cancel reason | on (on, off) | Owner/admin | business spec §8 |
| Phone-only after no-shows | 2 (none, 1–5) | Owner/admin | business spec §11 |
| Lateness allowed | 15 min for every business in the MVP, shown in the rules; after the MVP a setting next to the free-cancel window: none, 5, 10, 15, 20 or 30 min, default 15 (F-103); tables keep their own hold | Fixed in the MVP; Owner/admin with F-103 | client spec §7 (data model); demo rules; Q-118, decided 18.10.2026; F-103 |
| Internal statuses | off; up to 5; name up to 20 characters; 8 icons, 6 colours; ready-made *Geldi* (arrived), *Başlandy* (started); in the MVP | Owner/admin | business spec §3, §8; B-Settings screen; Q-031, decided 18.10.2026 |

**Code differs:** lateness is a number per business, 0–120 min, that the table hold also uses (code:
packages/domain/src/rules.ts).

**Design to fix:** setup wizard step 7 offers the settings list of free-cancel choices (Q-119).

> Open question Q-118: should the lateness rule be a setting?

> Open question Q-119: which free-cancel choices does the setup wizard offer?

## Requests, holds and expiry

| What | Value | Who can change it | Source |
|---|---|---|---|
| A request holds its time | the business's hold time, ending at the visit start at the latest | Owner/admin | business spec §2, §11 |
| Hold counts | only during the business's opening hours | Fixed | Q-120, decided 18.10.2026 |
| Warning to staff before it runs out | 5 min before | Each person (notification settings) | business spec §16 |
| Request timer in the workspace | "*Jogap bermäge 18 min galdy*" (18 min left to answer) | Fixed | business spec §4 |
| Answer time shown to the client | the real deadline as a clock time; Claude writes the sentence in English and the owner checks it | Fixed | ROUND6-ANSWERS A2; Q-253, decided 18.10.2026 |
| No answer in time | cancelled by the system; the client gets 3 free times by SMS; if nothing is free, the SMS drops the times and says *Başga wagt saýlaň* | Fixed | client spec §1, §6; business spec §2; Q-252, decided 18.10.2026 |
| Free times after expiry | appointments: nearest on the same day first, then the next free days within the booking window, each with one named specialist; tables (after the MVP): the 3 nearest times for the same party size and area; classes (after the MVP): the next 3 sessions of the same class with seats | Fixed | Q-252, Q-159, decided 18.10.2026; code: apps/api/src/modules/jobs/run.ts |
| Expiry check | every minute; screens show the expiry on time | Fixed | Q-250, decided 18.10.2026; code: apps/api/src/modules/jobs/run.ts |
| Decline | a reason (4 chips; own text for *Başga sebäp*) and up to 3 offered times | Fixed | business spec §2, §4 |
| An offered time taken | confirmed at once if its named specialist is still free, else the chip shows *Eýýäm eýelendi*; one booking per declined request; all offers past: "*Teklip edilen wagtlaryň möhleti geçdi*" | Fixed | ROUND6-ANSWERS A1; Q-159, decided 18.10.2026 |
| Move request | same hold time, never past the start of the new time or of the original visit; no answer in time: dropped, the booking stays | Owner/admin (hold time) | ROUND6-ANSWERS A3; business spec §26; Q-263, decided 18.10.2026 |
| Waiting requests per client | at most 3 at one business and 10 in total | Fixed | Q-124, decided 18.10.2026 |
| Demo businesses answer by themselves | after 20 s, outside production only | Fixed | code only: apps/api/src/modules/bookings/create.ts |

**Code differs:** the hold counts clock time, day and night (code: packages/domain/src/lifecycle.ts). Free times after
an expiry exist only for appointments and may be with any specialist; with none, the SMS keeps an empty list (code:
apps/api/src/modules/jobs/run.ts). A taken offered time falls back to any free specialist (code:
apps/api/src/modules/bookings/create.ts). Waiting requests have no limit.

**Design to fix:** the sent screen shows the answer deadline as a clock time, not "*{N} minutdan*" (Q-253).

> Open question Q-120: does the hold time run while the business is closed?

> Open question Q-253: the answer time the client is shown.

> Open question Q-252: what an expired table or class request offers.

> Open question Q-159: which specialist an offered or free time is for.

> Open question Q-124: how many waiting requests may one client have?

## Cancel, move and undo

| What | Value | Who can change it | Source |
|---|---|---|---|
| Cancel a waiting request | any time, free | Fixed | client spec §4.8 |
| Cancel or move a confirmed booking | until the free-cancel window (default 2 h before the start); after it only *Jaň et*, for every booking type, classes included | Owner/admin (window) | client spec §4.8; ROUND6-ANSWERS A5; Q-125, Q-162, decided 18.10.2026 |
| What can be moved | appointments only; tables and classes: cancel and *Gaýtadan ýazyl* (book again) | Fixed | ROUND6-ANSWERS A4 |
| Moves waiting at once | 1; a second move replaces the first | Fixed | ROUND6-ANSWERS A3 |
| Undo a cancel (*Yzyna al*) | 5 min after the client's own cancel, and only before the visit starts | Fixed | ROUND6-ANSWERS A6; code: apps/api/src/modules/bookings/view.ts |
| A cancelled booking in *Gelýän* | stays, greyed, until the next page load | Fixed | client spec §4.8 |
| Cancel reason from the client | optional, up to 300 characters | Client | business spec §8; length code only: packages/contract/src/bookings.ts |
| Business cancels or moves | any time before the start | Owner/admin and specialists, by permission | business spec §3; code: packages/domain/src/lifecycle.ts |
| SMS to the client when the business moves | on by default (a box on the confirm popover) | Staff, per move | business spec §4 |
| Complaint (*Arz et*) | *Gelmedi* (no-show) from the visit start until 24 h after its end; *Gijä galdy*, *Gödek gylyk* and *Başga* any time on a confirmed or completed booking; one per booking | Owner/admin and specialists, by permission | ADR 0017; Q-206, Q-254, decided 18.10.2026; code: packages/domain/src/lifecycle.ts |
| Removing a complaint | from the booking drawer within 7 days; a removed no-show goes back to *Tamamlandy* and the no-show count drops; the client gets no message | Owner/admin and specialists, by permission | Q-207, decided 18.10.2026 |

**Code differs:** the move keeps the booking with any free specialist when the chosen one is busy; the decided rule is no
silent swap (code: apps/api/src/modules/bookings/create.ts). A booking with a waiting move doesn't offer a second move,
though a second move should replace the first (code: apps/api/src/modules/bookings/view.ts). A no-show can be marked at
any time after the start, with no end (code: packages/domain/src/lifecycle.ts).

**Design to fix:** the class line "*Mugt ýatyrmak wagty geçdi — ýatyrsaňyz, studiýa habar beriler*" changes to say
that only *Jaň et* is left (Q-125).

> Open question Q-125: can a class be cancelled online after the free window?

## Reviews

| What | Value | Who can change it | Source |
|---|---|---|---|
| Who can write | clients with a completed booking; one review per booking | Fixed | client spec §4.3, §4.8 |
| Stars | 1–5, required | Client | client spec §4.8 |
| Quick tags | 5 drawn (*Wagtynda kabul etdiler*, *Arassa*, *Ussat hünärmen*, *Mähirli*, *Bahasyna laýyk*); at most 6 per review, 40 characters each | Fixed | Account-Bookings screen; limits code only: packages/contract/src/bookings.ts |
| Text | optional, up to 500 characters | Client | client spec §4.8 |
| Editing | for 7 days after writing | Client | client spec §4.8; code: packages/domain/src/lifecycle.ts |
| Deadline to write one | 30 days after the visit | Fixed | Q-126, decided 18.10.2026 |
| Review ask by SMS | none: clients review from *Ýazylyşlarym* (My bookings) and from the booking link after a completed visit | Fixed | Q-259, Q-170, decided 18.10.2026 |
| Business reply | up to 500 characters; the business can edit or delete it | Owner/admin | business spec §15 |
| Reviews per page in the workspace | 20 | Fixed | business spec §15 |
| Report reasons | 5 | Fixed | business spec §15 |
| A reported review | visible on both sides, not counted until the Ýeral team clears it; the team decides within 48 h, otherwise it counts again; a cleared review can't be reported again | Ýeral team | business spec §15; ROUND6-ANSWERS F2; Q-261, decided 18.10.2026 |

**Code differs:** there's no moderation yet; every review counts as soon as it's written (code:
apps/api/src/modules/bookings/actions.ts). A review can be written any time after the visit (code:
apps/api/src/modules/bookings/actions.ts). The code still sends a review ask by SMS 2 h after the visit ends.

> Open question Q-126: how long after a visit can a client write a review?

## Team and access

| What | Value | Who can change it | Source |
|---|---|---|---|
| Owners per workspace | exactly 1; handed over to an active member who logs in | Owner | business spec §1, §8 |
| Access levels | 3 (*Eýesi*, *Administrator*, *Hünärmen*); a *Hünärmen* may work without the app; no custom levels | Fixed | business spec §1; Q-216, decided 18.10.2026 |
| Team size | no limit | Fixed | business spec §19 |
| Invite link | sent by SMS; valid 7 days; can be sent again; expired: "*Çakylygyň möhleti geçdi*" | Owner/admin | business spec §1, §8 |
| Specialist without the app | phone number required, no invite, active at once | Owner/admin | business spec §11; Q-216 |
| Workspaces per person | no limit; one address each | Fixed | business spec §1 |
| Busy elsewhere (*Başga ýerde*) | always on, in the MVP: the specialist's confirmed bookings and waiting requests in other workspaces, with their buffers, block the time as a reserved gap with no details | Fixed | business spec §1; Q-031, Q-271, Q-272, decided 18.10.2026 |
| Who answers requests | both (see booking rules); each person can be allowed to answer their own | Owner/admin | business spec §2, §8 |
| Rows in the permission matrix | 11 | Owner | business demo data (accessLevels) |

**Code differs:** invitations never expire, and an invited person joins at the first login without the accept or decline
step (code: apps/api/src/modules/auth/routes.ts).

**Design to fix:** drop the *Profilim* switch *Beýleki iş ýerlerimdäki wagtymy «Başga ýerde» görkez* (Q-271).

## Clients (segments, no-show block)

| What | Value | Who can change it | Source |
|---|---|---|---|
| *Yzygiderli* (regular) | 3 or more visits in the last 6 months | Fixed | business spec §6; code: packages/domain/src/clients.ts |
| *Täze* (new) | first visit in the last 30 days | Fixed | business spec §6; code: packages/domain/src/clients.ts |
| *Köpden bäri gelmedik* (lapsed) | no visit for 60 days or more | Fixed | business spec §6; code: packages/domain/src/clients.ts |
| *Arz edilen* (reported) | at least one complaint | Fixed | business spec §6 |
| Phone-only after no-shows | 2 (none, 1–5); reaching it turns on the client card's switch *Diňe jaň arkaly ýazylyp biler*; the business can turn it off, and counting starts again from zero | Owner/admin | business spec §3, §6, §11; Q-127, decided 18.10.2026 |
| New client | only the phone is required | Fixed | business spec §6 |
| "Where they came from" choices | 5 (Instagram, a friend, Ýeral, walked by, other) | Fixed | business spec §6 |
| Deleted client | bookings stay in reports without a name | Owner/admin | business spec §6 |
| Full reports | after 30 bookings; returning clients after one full month | Fixed | business spec §14; B-Analytics screen |
| Insight sentences | at most 1 per report section | Fixed | business spec §14 |

**Code differs:** every no-show ever counts, and turning the switch off doesn't lift a limit that came from the count
(code: packages/domain/src/clients.ts).

> Open question Q-127: which no-shows count, and how does the phone-only limit end?

## Hours and special days

| What | Value | Who can change it | Source |
|---|---|---|---|
| Opening and closing pickers | from 00:00 to 24:00, in 30-min steps | Owner/admin | business spec §11, §26; ROUND6-ANSWERS E1; Q-128, decided 18.10.2026 |
| Latest end of a day | past midnight allowed: hours like 18:00–02:00, and bookings may cross midnight (not drawn yet) | Owner/admin | ROUND6-ANSWERS E1; Q-105, decided 18.10.2026 |
| Breaks | 1 per day, may differ per day; each staff member has their own | Owner/admin | business spec §11; ADR 0017 |
| Staff hours | the business's hours, or their own inside them | Owner/admin | business spec §10; ADR 0017 |
| "*Iş günleri birmeňzeş*" (same every weekday) | copies Monday to Tuesday–Friday | Owner/admin | business spec §11 |
| Special days | one day or a range; dated or every year; closed or other hours | Owner/admin | business spec §8 |
| Overlapping special days | dated beats yearly, shorter beats longer, closed beats other hours; a full tie keeps the existing one; a warning, never a block | Fixed | ROUND6-ANSWERS E2; code: packages/domain/src/hours.ts |
| A special day over existing bookings | keep them, or cancel them and offer each client 3 other times | Owner/admin | B-Settings screen |

**Design to fix:** opening pickers start at 00:00 instead of 06:00; class sessions start any time inside the hours
instead of 07:00–21:00 (Q-128).

> Open question Q-128: how early and how late can hours and classes start?

## Notifications and SMS timings

```mermaid
flowchart LR
  A["Request sent: no SMS"] --> B["Confirmed: SMS at once"]
  B --> C["Reminder a day before"]
  C --> D["Reminder 2 h before"]
  D --> E["Visit ends"]
  E --> F["No review ask (Q-259)"]
```

| What | Value | Who can change it | Source |
|---|---|---|---|
| Request sent | no SMS; on screen only | Fixed | client spec §6 |
| Confirmed | SMS at once | Client (switch) | client spec §6 |
| Declined | SMS at once, with the reason and a link; always sent | Fixed | client spec §6; Q-286, decided 18.10.2026 |
| No answer in time | SMS at once, with 3 free times and a link, or *Başga wagt saýlaň* when nothing is free; always sent | Fixed | client spec §6; Q-252, Q-286, decided 18.10.2026 |
| Cancelled by the business | SMS with the reason | Client (the *Tassyklama we üýtgeşmeler* switch) | business spec §3; Q-286, decided 18.10.2026; code: packages/i18n/src/messages/tk.json |
| Reminders | a day (24 h) before and 2 h before; skipped when the booking is made later than that | Client (switches); business ("*Ýatlatma SMS-lerini iberme*" per client) | client spec §6, business spec §6; skipping Q-257, decided 18.10.2026; code: apps/api/src/modules/bookings/confirm.ts |
| Review ask | none | Fixed | Q-259, decided 18.10.2026 |
| Client SMS at night | booking outcomes at any hour; a reminder that falls between 22:00 and 08:00 goes at 21:30 the evening before the visit with the "tomorrow" text, and only one reminder goes that evening | Fixed | Q-285, decided 18.10.2026; Q-293 |
| SMS that fail | tried 5 times, waiting 1, 2, 4 and 8 min, then the Ýeral team is alerted; a reminder that would arrive after the visit has started is dropped | Fixed | Q-284, decided 18.10.2026; code: apps/api/src/modules/jobs/run.ts |
| SMS length | full Turkmen letters; two-part messages accepted; texts shortened where that's easy | Fixed | Q-295, decided 18.10.2026 |
| SMS per business | no cap on MVP; the Ýeral team watches a monthly count per business | Ýeral team | Q-299, decided 18.10.2026 |
| Staff: new request | at once, in the browser with a sound; SMS off by default, each person can switch it on; never at night or to someone who has the workspace open | Each person | business spec §2, §16; Q-297, decided 18.10.2026 |
| Staff: request about to run out | 5 min before | Each person | business spec §16 |
| Staff: tomorrow's bookings | 20:00 (17:00–23:00); off by default on MVP | Each person | business spec §16; B-Notifications screen; Q-296, decided 18.10.2026 |
| Staff: day summary | 08:00 (05:00–10:00); a browser notification if the workspace is open then | Each person | business spec §16; B-Notifications screen; Q-280, decided 18.10.2026 |
| Staff quiet hours | 22:00–08:00 (start 19:00–00:00, end 05:00–10:00); no SMS at night: night is the quiet hours, or 22:00–08:00 when they're off; a new-request SMS at night is dropped, a *Ýeral* SMS waits until the morning | Each person | business spec §16; B-Notifications screen; Q-278, Q-279, decided 18.10.2026 |
| Staff SMS | only for "new request" and "Ýeral" messages | Each person | business spec §22 |
| Staff channels on MVP | browser and SMS; "in the app" once the business app ships | Fixed | business spec §16 |

**Code differs:** client SMS go at any hour, the review ask is still planned 2 h after the visit, and a failed SMS is
dropped after 5 tries without telling anyone (code: apps/api/src/modules/jobs/run.ts).

> Open question Q-285: client SMS at night.

> Open question Q-295: sMS length and cost.

## Technical limits

| What | Value | Who can change it | Source |
|---|---|---|---|
| Request limits | only on login codes (see Login); nothing else is limited | Fixed | code only: apps/api/src/lib/rate-limit.ts |
| Open screens refresh | every 10 s, a background workspace tab included; also when the window gets focus, and after the person's own action | Fixed | Q-273, decided 18.10.2026; code: packages/sdk/src/events.ts |
| Changes per refresh | up to 100 | Fixed | code only: apps/api/src/modules/events/routes.ts |
| Background work (expiries, completions, SMS) | every minute, up to 100 items a run | Fixed | every minute Q-250, decided 18.10.2026; code: apps/api/src/modules/jobs/run.ts |
| Page size | 12 by default, at most 50 | Fixed | code only: packages/contract/src/common.ts |
| Free times in one request | 14 days by default, up to 31; classes 7, up to 14 | Fixed | code only: packages/contract/src/availability.ts |
| Booking code | "YR-" and 5 digits, never starting with 0; one more digit after repeated clashes | Fixed | code only: packages/domain/src/id.ts |
| SMS link | a long random token on its own path; the booking code never opens anything by itself | Fixed | Q-168, decided 18.10.2026 |
| Text lengths | name 80, note 500, cancel reason 300, review 500, search 80 characters | Fixed | code only: packages/contract/src |
| Environments | local and production only; no staging | Fixed | owner 16.10.2026; ADR 0020 |

**Code differs:** a hidden tab doesn't ask for changes at all (code: packages/sdk/src/events.ts). SMS links open the
booking from its code, `yeral.app/b/{code}`.
