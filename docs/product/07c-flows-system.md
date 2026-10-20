# 7c. What the system does by itself

This chapter covers everything Ýeral does without anyone pressing a button. That includes timers that run out, messages sent at set times, checks that block or unblock something, and how open screens learn about changes. Each flow has a number (S-01, S-02…) so other chapters can point to it. Who hears about what is in chapter 8.

How to read the status line at the end of each flow:

- **Design** says where the rule is decided or drawn.
- **Code** says what the api does today. **Built** means the system part works in the api, **partly** means some of it does, and **not built** means none of it exists yet. The new client site (M3) and the business workspace (M5) aren't built yet, so none of these flows shows on a screen today.
- No SMS reaches a phone yet. Every environment, production included, writes SMS to a log. At the first launch no SMS goes out: texts go to the log and the sign-in code shows on the screen (Q-036, decided 18.10.2026).

Sources in brackets: *client spec* = `docs/design/README.md`; *business spec* = `docs/design/business/README.md`; *ROUND6* = `docs/design/ROUND6-ANSWERS.md` (the owner's final decisions); screen names such as *B-Login* are files in `docs/design/screens/`. Code paths are under `apps/api/src` and `packages/`.

## How timed actions run

```mermaid
flowchart LR
  A["Every minute"] --> B["End unanswered requests"]
  B --> C["Complete finished visits"]
  C --> D["Send queued SMS"]
```

- Every minute the system makes one pass (code: `modules/jobs/run.ts`, `modules/jobs/tick.ts`; ADR 0017):
  1. It ends requests and move requests whose answer time ran out (S-01, S-07).
  2. It marks finished visits *Tamamlandy* (S-02).
  3. It sends what's queued: SMS and reminders (S-04, S-21). Outside production it also sends the demo businesses' own answers (S-20). No review asks (S-05; Q-259).
- Two passes never run at the same time. Each pass handles up to 100 items of each kind, and the rest wait for the next minute.
- Screens don't wait for the pass. From the exact deadline, a request already shows as expired and a finished visit as completed (code: `packages/domain/src/lifecycle.ts`). The pass then saves what people already see.
- A pass every minute keeps the database awake, and that costs compute hours on a free product (`docs/memory-bank/operations.md`). Ýeral accepts that cost: the pass runs every minute, as built (Q-250, decided 18.10.2026).

> Open question Q-250: How often the system checks the clock.

## Overview

| Flow | What the system does | Trigger | Code |
|---|---|---|---|
| S-01 | Cancels an unanswered request, offers 3 times, sends an SMS | hold time ends | built |
| S-02 | Marks a finished visit *Tamamlandy* | visit end | built |
| S-03 | Limits a client to phone bookings | no-shows reach the limit | built |
| S-04 | Sends reminders | 24 h and 2 h before | built |
| S-05 | Asks for a review: not in the MVP (Q-259) | none | built, must stop |
| S-06 | Stops counting a reported review | the business reports it | not built |
| S-07 | Drops an unanswered move | move deadline | built |
| S-08 | Treats offered times as taken or past | time passes, someone books | partly |
| S-09 | Ends the undo window | 5 min after a cancel | built |
| S-10 | Sends, checks and locks login codes | a code is asked for | built |
| S-11 | Keeps, renews and ends sign-ins | sign-in, visits, sign-out | built |
| S-12 | Links a phone's bookings and invites | sign-in | built |
| S-13 | Expires team invites | 7 days after sending | partly |
| S-14 | Blocks a person's time in other workspaces | a booking in one workspace | not built |
| S-15 | Updates open screens | any change | built |
| S-16 | Alerts the business to a new request | a request is sent | partly |
| S-17 | Makes a business public after review | Ýeral verifies it | partly |
| S-18 | Keeps quiet at night, sends summaries | quiet hours, summary times | not built |
| S-19 | Works out the typical answer time | past answers | not built |
| S-20 | Keeps demo data off production | database setup | built |
| S-21 | Retries failed SMS | sending fails | built |

## Bookings

### S-01 · A request's hold time runs out

**Goal.** A client never waits forever. If the business doesn't answer in time, the slot is freed and the client gets three other times.

**Trigger.** Time: the request's answer deadline passes. The deadline is the time the request was sent plus the business's hold time, but never later than the visit start (business spec §2, §11). The hold runs only during the business's opening hours (Q-120, decided 18.10.2026). Hold time options are 15 min, 30 min (default), 1 h, 2 h, 6 h and 24 h. This applies only to businesses that confirm by hand. At an instant business nothing waits.

```mermaid
flowchart TD
  A["Client sends a request"] --> B["Deadline is set"]
  B --> C{"Business answers in time?"}
  C -->|"Yes"| D["Confirmed or declined"]
  C -->|"No"| E["Cancelled by the system"]
  E --> F["System picks 3 free times"]
  F --> G["SMS with times and link"]
  G --> H{"Client taps a time?"}
  H -->|"Yes"| I["A new request is sent"]
  H -->|"No"| J["Nothing more happens"]
```

**Steps**

1. The client sends a request. The system sets its deadline and holds the slot (client spec §1 rule 1; business spec §2).
2. The business sees a timer on the request. Five minutes before the deadline, the owner and admin get *Haýyşyň wagty gutarýar* (S-16).
3. The deadline passes with no answer. The booking becomes *Ýatyryldy*, cancelled by the system (business spec §2; ADR 0017).
4. The system picks 3 free times for the same services, each with one named specialist (Q-159, decided 18.10.2026). It looks on the same day first, nearest to the time asked for, then on the next days with free time (code: `modules/jobs/run.ts`; the spec only says "3 alternative times"). For a table it picks the 3 nearest times for the same party size and area, and for a class the next 3 sessions of the same class with seats (Q-252, decided 18.10.2026); tables and classes come after the MVP (Q-030).
5. The client gets the expiry SMS with the times and the booking link, in their own language (client spec §6). If nothing is free, the SMS drops the times and says *Başga wagt saýlaň* (pick another time) (Q-252).
6. Everywhere the booking shows, it carries the hourglass label *Wagtynda jogap gelmedi* (no answer in time), with the 3 times as chips (ROUND6 A2).
7. Tapping a chip sends a **new request** for that time, with that time's specialist (Q-159). It is *Garaşylýar*, or *Tassyklandy* at once at an instant business (ROUND6 A2).

**Edge cases**

- The business answers in the last seconds. Whatever reaches the system first wins. An answer after the deadline is refused with *Haýyşyň wagty geçdi* (code: `request_expired`).
- Screens show the request as expired from the exact deadline, even if the pass runs up to a minute later (code).
- A move request that runs out works differently: no times, no SMS, and the booking stays (S-07).
- The 3 times aren't held for the client, so someone else may take them (S-08).
- Each time belongs to one named specialist and is booked with that person only. If they're no longer free, the chip shows *Eýýäm eýelendi* (Q-159, decided 18.10.2026). At the same time the client's own specialist comes first; services nobody does alone are still split between people, and such a time names nobody (Claude (delegated), 20.10.2026). (code: `modules/jobs/run.ts` `alternativesFor`; `modules/bookings/offers.ts` for the chips' state)

> Open question Q-159: which specialist an offered or free time is for.

- **Code differs:** table and class requests get no times in the code. Their SMS then reads *Şu boş wagtlar bar: —* with an empty list. The same broken text goes out when an appointment has no free time to offer.

> Open question Q-252: What an expired table or class request offers.

- At a manual business, the sent screen shows the real deadline as a clock time, since the visit start and closed hours move it away from the plain hold time; Claude writes the sentence in English and the owner checks it (Q-253, decided 18.10.2026). **Design to fix:** the sent screen draws *Jogap bermese, {N} minutdan soň size başga wagtlary hödürläris.*, with N = the hold time (ROUND6 A2), which reads "360 minutdan" or "1440 minutdan" for a 6 h or 24 h hold.

> Open question Q-253: The answer time the client is shown.

- The expiry SMS goes at any hour, since it's a booking outcome (Q-285, decided 18.10.2026). It goes even when the client has switched off *Tassyklama we üýtgeşmeler* (Q-286, decided 18.10.2026).
- A client who is now limited to phone bookings (S-03), or whose business has paused online booking, can't take these times online: the chips are hidden and the *Jaň et* card shows instead (Q-154, decided 18.10.2026). Only times the business offered after a decline are an exception (ROUND6 A7; the code agrees).
- **Code differs:** the code counts the hold straight through closed hours (code: `packages/domain/src/lifecycle.ts`; Q-120).

**Status.** Design: decided and drawn (client spec §1, §6; business spec §2; ROUND6 A2; Account-Bookings, Booking-Link) · Code: built in the api, with the differences above (specialist, opening hours, times for tables and classes).

### S-02 · A visit completes by itself

**Goal.** There's no "came" button. The business only acts when something went wrong.

**Trigger.** Time: the end of a confirmed booking passes.

```mermaid
flowchart TD
  A["Confirmed visit ends"] --> B["System marks it Tamamlandy"]
  B --> C["Review becomes possible"]
  C --> D["Review from Ýazylyşlarym or the link"]
  B --> E{"Staff report Gelmedi?"}
  E -->|"Yes"| F["Status becomes Gelmedi"]
  E -->|"No"| G["Stays Tamamlandy"]
```

**Steps**

1. A confirmed booking's end time passes, and the system marks it *Tamamlandy* (client spec §1 rule 3; business spec §3).
2. The client can now write a review from *Ýazylyşlarym* (My bookings) or the booking link. No review ask is sent (S-05; Q-259, decided 18.10.2026).
3. The visit counts toward the client's visits and the business's revenue, which is the sum of completed visits' prices (business spec §6, §14).
4. If the client didn't come, staff use *Arz et → Gelmedi* and the booking becomes *Gelmedi* (business spec §3). Staff can do this before or after the automatic completion, from the start time until 24 hours after the end (Q-206, Q-254, decided 18.10.2026).

**Edge cases**

- A request never completes, because it expires at the visit start at the latest (S-01).
- Team-only statuses such as *Geldi* or *Başlandy* don't change the system status (business spec §3).
- Classes (after the MVP, Q-030): every attendee completes after the session. Staff mark single no-shows, and only after the session starts (business spec §21, §22).
- Tables (after the MVP, Q-030): a confirmed table past its start counts as seated. The table is held 15 minutes for late guests (*Stol saklanýar*). After that, staff may give it away and mark *Gelmedi*; the system frees nothing by itself (business spec §20, §22; B-Tables).
- A no-show can be marked until 24 hours after the end. A review written before the no-show is marked stays (Q-254, decided 18.10.2026). **Code differs:** the code allows it at any time after the start, with no end.

> Open question Q-254: How long after a visit a no-show can be marked.

**Status.** Design: decided (client spec §1, §6; business spec §3, §20–§22) · Code: built for completion. Reporting a no-show comes with the workspace and isn't built.

### S-03 · Repeated no-shows limit a client to phone bookings

**Goal.** Protect businesses from clients who book and don't come.

**Trigger.** Event: a business marks a no-show, and the client's no-shows at that business reach the business's limit.

```mermaid
flowchart TD
  A["Staff mark Gelmedi"] --> B["System counts no-shows here"]
  B --> C{"Count reaches the limit?"}
  C -->|"No"| D["Online booking stays open"]
  C -->|"Yes"| E["Phone bookings only here"]
  E --> F["Client sees the call card"]
```

**Steps**

1. Staff mark *Gelmedi* through *Arz et* (S-02).
2. The system counts this client's no-shows at this business.
3. The limit is set in *Ýazylyş düzgünleri*: *N gelmedikden soň onlaýn ýazylyşy ýap* (1–5, default 2; 0 = never). When the count reaches it, the system switches on *Diňe jaň arkaly ýazylyp biler* on the client card, and the client can book this business only by phone (business spec §3, §8, §11; Q-127, decided 18.10.2026).
4. Next time the client opens the business page or the booking flow signed in, they see a calm card. It reads *Bu biznese telefon arkaly ýazylyp bilersiňiz* (you can book this business by phone) and *Biznes siziň bilen ýazylyşlary jaň arkaly ylalaşmagy haýyş etdi.*, with a *Jaň et* button (ROUND6 A7). Signed out, everything looks normal until they log in.
5. The business can also set this by hand on the client card with *Diňe jaň arkaly ýazylyp biler* (business spec §6). Turning it off lifts the limit, and counting starts again from zero (Q-127).

**Edge cases**

- The limit is per business, so other businesses aren't affected (business spec §3; code). There are no Ýeral-wide client blocks at launch; client karma comes later (F-241; Q-012).
- The client can still take times the business offered after a decline online (ROUND6 A7).
- The block is worked out from the bookings, not stored: removing a wrong no-show (Q-207) or setting the limit to 0 lifts a block that came from the count; one set by hand stays. A changed limit applies to every client at once: lowering it blocks those already at the new limit, raising it lifts those below it (Claude (delegated), 20.10.2026). (code: `modules/clients/online.ts`)

> Open question Q-127: no-shows: what counts and how the limit ends.

- Bookings the client already has stay as they are. For this client, or while the business has paused online booking, *Başga wagta geçir* and the free-time chips are hidden and the *Jaň et* card shows instead; only times the business offered after a decline stay bookable online (Q-154, decided 18.10.2026). The code already refuses both. **Design to fix:** the booking screens draw *Başga wagta geçir* and the free-time chips with no phone-only or paused state.

> Open question Q-154: moves and free times for a client who must call.

- The client gets no SMS when the limit starts: the no-show and the limit show on screen only, as designed (Q-290, decided 18.10.2026).

**Status.** Design: decided and drawn (business spec §3, §8; ROUND6 A7; Venue and Booking tweak `restricted`) · Code: built for the check in the api. Marking no-shows isn't built.

### S-04 · Reminders 1 day and 2 hours before

**Goal.** Fewer no-shows.

**Trigger.** Time: 24 hours and 2 hours before the start of a confirmed booking.

```mermaid
flowchart TD
  A["Booking becomes confirmed"] --> B["Two reminders are planned"]
  B --> C["24 hours before"]
  B --> D["2 hours before"]
  C --> E{"Still confirmed and wanted?"}
  D --> E
  E -->|"Yes"| F["SMS is sent"]
  E -->|"No"| G["Nothing is sent"]
```

**Steps**

1. A booking can become *Tassyklandy* in four ways: the business confirms it, the business confirms instantly, the client takes an offered time, or a move is confirmed. Each time, the system plans the two reminders (code: `modules/bookings/confirm.ts`). No review ask (S-05; Q-259).
2. At the planned time the system checks four things. The booking is still confirmed and still at the same time. The client's switch is on (*Ýatlatma: 1 gün öň*, *Ýatlatma: 2 sagat öň*; Account-Profile). The business hasn't stopped reminders for this client (*Ýatlatma SMS-lerini iberme*, business spec §6).
3. If all pass, it sends the SMS: *Ýatlatma: ertir {time} {business}, {address}.* a day before (client spec §6), and the code's separate *Ýatlatma: şu gün {time} {business}, {address}.* (today) 2 hours before (Q-293, decided 18.10.2026).

**Edge cases**

- A moved booking gets new reminders for the new time, and the old ones stay quiet (code).
- A cancelled booking or a no-show gets nothing (code).
- A booking made less than 24 h ahead gets no day reminder. One made less than 2 h ahead gets no reminder at all, since the confirmed SMS has just told the client (code; Q-257, decided 18.10.2026).

> Open question Q-257: Reminders for bookings made at short notice.

- A reminder that falls between 22:00 and 08:00 moves to 21:30 the evening before: a 07:00 visit gets its 2-hour reminder at 21:30 the day before, not at 05:00 (Q-285, decided 18.10.2026). A moved reminder goes at 21:30 the evening before the visit, with the *ertir* (tomorrow) text; at most one reminder goes on any day before the visit (the later, standing for both), and a moved one within 2 hours of booking is left out (Claude, following Q-285 and Q-293). A moved reminder goes only if the client wants a reminder it stands for. (code: `reminderPlan()`)
- Once staff can enter phone bookings (M5), the same reminders go to the number the business entered, in the market's main language until the person signs in and chooses one, English for now (Q-292). Only mobile numbers can receive SMS (ROUND6 C1).

**Status.** Design: decided (client spec §6; Account-Profile switches) · Code: built in the api, except the night rule.

### S-05 · The review ask after a visit (not in the MVP)

**Goal.** Collect honest reviews from real visits, without pushing clients to write them.

**Trigger.** None. Ýeral sends no review ask: no SMS and no automation (Q-259, decided 18.10.2026). Client spec §6 had an SMS 2 hours after the end; the owner wants no aggressive asking.

```mermaid
flowchart TD
  A["Visit ends"] --> B["Marked Tamamlandy"]
  B --> C{"Client taps Teswir ýaz?"}
  C -->|"Yes"| D["Review form"]
  C -->|"No"| E["Nothing is sent"]
  D --> F["Client writes a review"]
  F --> G["Average is updated"]
```

**Steps**

1. The visit completes (S-02). Nothing is planned or sent to ask for a review (Q-259).
2. The completed booking shows *Teswir ýaz* (write a review) in *Ýazylyşlarym* (My bookings) and on the booking link page. On the link page it logs in with the booking's masked phone and opens the review (Q-170). Client spec §6 calls this "review request (SMS + in-app)"; only the on-screen part stays.
3. A specialist may ask the client in person (Q-259).
4. The client can write the review up to 30 days after the visit (Q-126).
5. The review counts in the average at once (code) unless it's reported (S-06). There is one review per booking, and it can be edited for 7 days (client spec §4.8).

**Edge cases**

- A review that already exists needs no ask. If asks ever return, the SMS is skipped when a review exists (Q-258, decided 18.10.2026).

> Open question Q-258: Review ask when a review already exists.

- There's no review-ask link. The booking link page (a token link, Q-168) shows a completed visit with *Teswir ýaz* (Q-170). **Design to fix:** Booking-Link has no state for a finished visit; it's drawn only for declined, expired, confirmed, pending, offers expired and not found.

> Open question Q-259: Where the review-ask link lands.

- Bookings entered by staff (phone, walk-in) get no ask either: there are no review asks at all (Q-260, decided 18.10.2026).

> Open question Q-260: Review asks for bookings made by staff.

- With no ask, no review SMS goes at night after a late visit (Q-285).
- The api plans no review ask since 20.10.2026; asks queued before were settled unsent (migration 0016).
- **Design to fix:** drop the *Teswir haýyşy* switch from Account-Profile, leaving 3 client SMS switches (Q-259).

**Status.** Not in the MVP (Q-259) · Design: *Teswir ýaz* on the completed booking drawn (client spec §4.8); the link page's completed state not drawn (Q-170) · Code: no review ask (stopped 20.10.2026; asks queued before are dropped).

### S-06 · A reported review stops counting

**Goal.** A business can flag an unfair review without deleting it, and the average stays honest.

**Trigger.** Event: the business reports a review (*Arz et*).

```mermaid
flowchart TD
  A["Business reports a review"] --> B["Marked Barlanýar"]
  B --> C["Stops counting in the average"]
  C --> D{"Ýeral team decides"}
  D -->|"Cleared"| E["Counts again"]
  D -->|"Removed"| F["Review disappears"]
```

**Steps**

1. The business picks a reason and may add text (business spec §15). The reasons are *Ýalan / bu müşderi gelmedi*, *Kemsidiji sözler*, *Başga biznes barada*, *Mahabat / spam* and *Başga*.
2. The review is marked *Barlanýar* (being checked). It stays visible on both sides with a grey line: *Ýeral barlaýar · ortaça baha hasaplanmaýar* (Ýeral is checking · not counted in the average) (ROUND6 F2).
3. From that moment it stops counting in the average, the review count and the star bars (business spec §15).
4. The Ýeral team decides in its admin tool (Q-010). If they **clear** it, it counts again. If they **remove** it, it disappears (business spec §15; ROUND6 F2).
5. The business can reply while the review is being checked (business spec §15).

**Edge cases**

- The business can't delete reviews (business spec §15).
- At launch the Ýeral team works in a small admin tool that verifies businesses and handles reported reviews (Q-010, decided 18.10.2026). **Design to fix:** the tool isn't drawn yet, and until it exists nobody can clear or remove a review.
- Ýeral decides within 48 hours. If it doesn't, the review counts again. A cleared review can't be reported again, so a business can't keep bad reviews out of its average (Q-261, decided 18.10.2026).

> Open question Q-261: How long a reported review may stay uncounted.

- Only the business is told the result; the author isn't (Q-262, decided 18.10.2026).

> Open question Q-262: Who hears the moderation result.

**Status.** Design: decided and drawn (business spec §15; ROUND6 F2; Venue, B-Reviews) · Code: not built. Every review counts as soon as it's written, and there's no report or moderation.

### S-07 · A waiting move expires

**Goal.** A client's request to move never leaves them without a booking.

**Trigger.** Time: the move request's answer deadline passes. This applies only to businesses that confirm by hand.

```mermaid
flowchart TD
  A["Client asks to move"] --> B["Old time stays confirmed"]
  B --> C["New time is held"]
  C --> D{"Business answers in time?"}
  D -->|"Accepts"| E["Booking moves to new time"]
  D -->|"Declines"| F["Booking stays at old time"]
  D -->|"No answer"| F
  F --> G["Client told on screen and by SMS"]
```

**Steps**

1. The client asks for a new time in move mode (ROUND6 A5). At a manual business the booking stays *Tassyklandy* and shows *Täze wagt soraldy: … · jogap garaşylýar* (new time asked · waiting) (ROUND6 A3).
2. The new time is held. The business sees a *Wagt üýtgetmek* request with a timer, plus a dashed ghost block *Täze wagt?* (business spec §26).
3. The deadline is the business's hold time counted from the moment the client asked. It never runs past the new time's start (code; the same rule as S-01) or the original visit's start (Q-263, decided 18.10.2026).
4. If nobody answers, the request is dropped and the new time is freed. The booking stays at its old time (business spec §26).
5. The client sees *Täze wagt kabul edilmedi — ýazylyşyňyz öňki wagtynda galýar.* (new time not accepted; your booking stays at its old time) (ROUND6 A3). They also get an SMS with that sentence and the booking link (Q-289, decided 18.10.2026). No other times are offered.

**Edge cases**

- A second move replaces the first (*Öňki haýyşyňyz … täzesi bilen çalşylar.*). Cancelling the booking also withdraws the move (ROUND6 A3; the code agrees).
- At an instant business the move happens at once, and nothing waits (ROUND6 A3).
- If the business allows cancelling at any time (*Islendik wagt*), a client can ask to move shortly before the visit. The move's deadline then ends at the original visit's start at the latest, so it never waits past it (Q-263, decided 18.10.2026; code: `holdCap` in `bookings/create.ts`).

> Open question Q-263: A waiting move that outlives the original time.


- **Code differs:** the business's decline of a move comes with the workspace (P2 step 4).

**Status.** Design: decided and drawn (ROUND6 A3, A5; business spec §26; Account-Bookings, B-Calendar) · Code: built in the api for the client (the move, its lapse with the SMS, withdrawing); the business's side with step 4.

### S-08 · Offered times go past or get taken

**Goal.** An offered time never promises something that's already gone.

**Trigger.** Time and events: an offered time passes, or another booking takes it.

| Kind | Who picks the times | Tapping one gives | Source |
|---|---|---|---|
| After a decline | the business, up to 3 | a **confirmed** booking at once | ROUND6 A1; business spec §2 |
| After an expiry | the system, 3 | a **new request** | ROUND6 A2 |

```mermaid
flowchart TD
  A["Times are offered"] --> B{"Client taps a time?"}
  B -->|"Yes"| C{"Still free?"}
  C -->|"Yes"| D["Booking or new request"]
  C -->|"No"| E["Chip shows Eýýäm eýelendi"]
  B -->|"Not yet"| F{"All times past?"}
  F -->|"Yes"| G["Offers expired message"]
```

**Steps**

1. The times show as chips on the booking, in the account and on the SMS link page (ROUND6 A1, A2).
2. Nobody holds them. A chip whose time someone else took, or whose specialist is no longer free, shows *Eýýäm eýelendi* (already taken) (Q-159).
3. When every offered time is past, the client sees *Teklip edilen wagtlaryň möhleti geçdi* (the offered times have expired) and *Başga wagt saýla* (pick another time).
4. After a decline, a declined request can turn into only one booking. Once a time is taken, the other chips go. The declined booking moves to *Geçen* with *Teklip edilen wagt kabul edildi → YR-…* (ROUND6 A1).

**Edge cases**

- Phone-only clients (S-03) can still take times the business offered (ROUND6 A7).
- Code: when the client taps a time, the system checks it's still free and refuses a taken one. The api doesn't mark chips as taken or past for display, so the screens must work that out themselves.
- An offered time counts as past once it's earlier than now plus the business's lead time, like any other booking (Q-264, decided 18.10.2026).

> Open question Q-264: When an offered time counts as past.

- An expired request also turns into only one booking: once a time is taken, the other chips go, as for declines and in the code (Q-265, decided 18.10.2026).

> Open question Q-265: One booking from the times offered after an expiry.

**Status.** Design: decided and drawn (ROUND6 A1, A2; Account-Bookings, Booking-Link) · Code: partly.

### S-09 · The undo window closes

**Goal.** A client who cancels by mistake can take it back, but not forever.

**Trigger.** Time: 5 minutes after the client's own cancel (ROUND6 A6), or the visit start if that comes first (code).

```mermaid
flowchart TD
  A["Client cancels"] --> B["Toast with Yzyna al"]
  B --> C{"Tapped within 5 minutes?"}
  C -->|"No"| D["Undo is gone"]
  C -->|"Yes"| E{"Time still possible?"}
  E -->|"Yes"| F["Booking comes back"]
  E -->|"No"| G["Undo failed with reason"]
```

**Steps**

1. The client cancels. The booking turns grey with *Ýatyryldy*, and a toast offers *Yzyna al* (undo) (client spec §4.8). The business is told at once: *Ýatyrmak mugt, biznese derrew habar bereris.* (Account-Bookings).
2. From that moment, the slot is free for others.
3. Within 5 minutes, *Yzyna al* returns the booking to what it was. That is either *Tassyklandy*, or *Garaşylýar* with the answer time it had left (code).
4. If that isn't possible, the client sees *Yzyna alyp bolmady — {sebäbi}.* with *Başga wagt saýla*. There are four reasons (ROUND6 A6):
  - *bu wagt eýýäm başga müşderä berildi*: the time was taken.
  - *sapakda boş ýer galmady*: the class is full.
  - *ýazylyş wagty başlandy*: the visit has started.
  - *haýyşyň jogap wagty gutardy*: the request's answer time ran out.
5. After 5 minutes the grey row has no *Yzyna al*. On the next page load it moves to *Geçen* (client spec §4.8; ROUND6 A6).

**Edge cases**

- Only the client's own cancel can be undone. A business cancel or an expiry can't be (code).
- Code differs: "visit started" and "answer time ran out" come back as the same error (*Yzyna almak wagty geçdi.*), so the screen can't show which of the four reasons applies.
- A reminder that fell due inside the 5 minutes isn't sent later (code).
- If the cancel also withdrew a waiting move (S-07), undo brings back only the booking, as the code does. The client asks for the move again if they still want it (Q-266, decided 18.10.2026).

> Open question Q-266: Undo after a cancel that withdrew a waiting move.

- When the client undoes, the business's earlier *Müşderi ýatyrdy* notice is updated on screen, and nothing new is sent (Q-298, decided 18.10.2026).

**Status.** Design: decided and drawn (ROUND6 A6; Account-Bookings) · Code: built in the api, with one difference.

## Accounts and sign-in

### S-10 · Login codes

**Goal.** Signing in by phone is quick for people and hard to abuse.

**Trigger.** Event: someone asks for a code. That happens at login, on a phone change, at the login inside a booking, and on the SMS link page.

```mermaid
flowchart TD
  A["Person enters a phone"] --> B{"Mobile number?"}
  B -->|"No"| C["Mobile only message"]
  B -->|"Yes"| D{"Within limits?"}
  D -->|"No"| E["Wait message"]
  D -->|"Yes"| F["4-digit code by SMS"]
  F --> G{"Right code?"}
  G -->|"Yes"| H["Signed in"]
  G -->|"No"| I{"Third wrong try?"}
  I -->|"No"| J["Tries left shown"]
  I -->|"Yes"| K["60 second lock"]
```

| Rule | Value | Source |
|---|---|---|
| Who can get a code | mobile numbers only (+993 6… or 7…); landlines get *Kod diňe mobil belgä iberilýär. +993 6… ýa-da 7… bilen başlaýan belgi ýazyň.* | ROUND6 C1; code |
| Code | 4 digits; checked by itself on the 4th digit | client spec §4.4 |
| Resend | after 0:59 | client spec §4.4; code |
| Wrong code | *Kod nädogry. Ýene N synanyşyk galdy.* | client spec §4.4; code |
| Lock | 60 seconds after 3 wrong tries | client spec §4.4; code |
| Code valid for | 5 minutes | Q-267; code (ADR 0019) |
| After the lock | the code is used up; the screen offers to send a new one | Q-268; code |
| Limits | 5 codes per phone per hour; 100 per internet address per hour; the wait is shown in minutes | Q-267 (code differs) |
| Outside production | the code is always 1234 and SMS go to the log | code; ADR 0019 |
| First launch | no SMS: the code shows on the screen, texts go to the log | Q-036, decided 18.10.2026 |
| SMS text | *Ýeral kody: {code}* | code only |
| On the SMS link page | the code goes only to the booking's own phone, shown masked and not editable | ROUND6 A1 |

**Steps**

1. The person enters a phone number. A number that isn't a mobile is refused.
2. The system checks the lock, the 59-second resend wait and the hourly limits.
3. It sends a new 4-digit code by SMS, valid for 5 minutes, and any earlier code stops working.
4. Each try uses up one of the 3 attempts before the code is checked. A right code signs the person in (S-11). If they're new, they're asked for their name.
5. The third wrong try starts a 60-second lock, and the code is used up. After the lock, the screen offers to send a new code (Q-268).

**Edge cases**

- Code differs on wording. The code's lock text is *Synanyşyk köp boldy. {N} sekuntdan soň gaýtalaň.* The design has *Köp synanyşyk. 60 sekuntdan soň gaýtadan synanyşyň.* (Auth). The design itself differs between screens: Booking-Link has *Synanyşyklar gutardy. 60 sekuntdan soň täzeden synanyşyň.* **Design to fix:** one shared code step with one lock message on every screen (Q-157).
- The message for the hourly limit shows the wait in minutes (Q-267, decided 18.10.2026). **Design to fix:** no screen draws it. **Code differs:** the code's text, *Haýyş köp boldy. Biraz garaşyň.*, gives no wait.
- Mobile operators often put many phones behind one internet address, so the address limit is 100 codes an hour (Q-267). **Code differs:** the code allows 20 (code: `modules/auth/codes.ts`).

> Open question Q-267: Login code limits that only the code sets.

- If sending the SMS fails, the 59-second wait has already started (code).
- The same code doesn't work after the lock: a new one is needed, and the screen offers to send it (Q-268, decided 18.10.2026). The code already uses the code up.

> Open question Q-268: After the 60-second lock, a new code or the same one.

**Status.** Design: decided and drawn (client spec §4.4, §4.7; ROUND6 C1; Auth, B-Login, Booking-Link) · Code: built in the api. The login on the link page isn't built.

### S-11 · Sessions

**Goal.** People stay signed in without typing codes often, and can sign out when they want.

**Trigger.** Events and time: sign-in, every visit, sign-out, a phone change and account deletion.

```mermaid
flowchart TD
  A["Right code entered"] --> B["Signed in for 60 days"]
  B --> C{"Visit with under 30 days left?"}
  C -->|"Yes"| D["Extended to 60 days"]
  B --> E{"Çykmak pressed?"}
  E -->|"Yes"| F["This browser signed out"]
  B --> G{"Phone changed?"}
  G -->|"Yes"| H["Other devices signed out"]
```

**Steps**

1. A right code signs the person in on this browser for 60 days (code; ADR 0019).
2. A visit with less than 30 days left extends the sign-in to 60 days again, so active people stay signed in.
3. One sign-in covers both yeral.app and the business workspace in the same browser. That follows from one Ýeral account (business spec §1) and the *Müşderi hökmünde aç* menu item. *Çykmak* signs out of both on that browser.
4. *Çykmak* signs out only this browser, and other devices stay signed in.
5. Changing the phone signs out every other device (code; ADR 0019).
6. Deleting the account signs the person out and cancels their upcoming bookings, and the businesses are told (Account-Profile: *Gelýän 3 ýazylyşyňyz ýatyrylar we bizneslere habar bereris.*). The account, favourites and reviews are deleted; businesses keep their own visit records, no longer linked to a Ýeral account (Q-172, decided 18.10.2026; code). **Design to fix:** the delete modal says all bookings are deleted; its copy changes to say this.

**Edge cases**

- There's no "sign out on all devices" button on MVP (Q-269, decided 18.10.2026).
- Native apps (later) will use the same sign-in with a token (ADR 0019).
- The CMS, at launch a small admin tool (Q-010), will get separate staff accounts with a second sign-in step (ADR 0019; not designed).
- Removing someone from a workspace removes their access to it, but their Ýeral sign-in stays (business spec §1, §8).
- A sign-in lasts 60 days and renews with use, as built (Q-269; ADR 0019).

> Open question Q-269: How long a sign-in lasts, and signing out everywhere.

**Status.** Design: decided (Q-269), nothing to draw · Code: built in the api.

### S-12 · Signing in links what the phone already has

**Goal.** A person who was known by their phone before signing up sees everything in one place.

**Trigger.** Event: a phone signs in. This happens at every sign-in, not only the first.

```mermaid
flowchart TD
  A["Phone signs in"] --> B{"Account exists?"}
  B -->|"No"| C["Account created, name asked"]
  B -->|"Yes"| D["Link upcoming and recent bookings"]
  C --> D
  D --> E["Link business client records"]
  E --> F["Activate waiting invites"]
```

**Steps** (code: `modules/auth/identity.ts`, `modules/auth/sign-in.ts`)

1. If there's no account for this phone, the system creates one and asks for the name (client spec §4.7; business spec §1). If the account hasn't been used for 6 months, Ýeral first asks *Is this you?* with the account's first name. *No* starts a fresh account and leaves the old history unlinked. There's no password (Q-270, decided 18.10.2026).
2. Bookings made with this phone, such as phone bookings a business entered, are linked to the account if they're upcoming or from the last 6 months (Q-270). They then show in *Ýazylyşlarym*.
3. Businesses' client records with this phone are linked to the account if they were made in the last 6 months or hold a booking linked in step 2 (Q-270).
4. Team invites waiting for this phone become active at once. S-13 describes what the design wants instead.
5. In the workspace, routing follows the design: a pending invite first, then *Entek iş ýeriňiz ýok* if there's no workspace, otherwise the last workspace used (business spec §1; B-Login).

**Edge cases**

- A phone number that passes to a new person is covered by the 6-month limit and the *Is this you?* check, so the new person doesn't see the previous owner's older history (Q-270, decided 18.10.2026). **Design to fix:** draw the *Is this you?* step at sign-in.
- *Unused* means no sign-in and no use for 6 months: an account in use is marked as used once a day. An account without a name is asked by the name on its latest booking, team row or client record; one holding none of them starts afresh without a question. Nobody is signed in until the answer, which must come within 10 minutes (`POST /v1/auth/identity`); one answer settles every open question for the account. The link page's login asks the same way.
- *No* lets the old account go, much as a deletion does (C-47): its team rows leave (an invite that brought one back is cancelled), its links stop working and its bookings never join anyone; the businesses' client records and team rows of the person keep their history without the number, so they never join the new holder, block them or come back for an invite to the number. Its bookings ahead aren't cancelled: the business keeps them, and no SMS goes to the number. What was sent to the number lately is the new holder's and stays: invites to new rows, and phone bookings no account holds yet, with their links and a client record of their own. A workspace owner's account can't go this way: the answer is refused (`owns_workspace`) and the Ýeral team sorts the number out.

> Open question Q-270: Linking bookings made under the same phone.

**Status.** Design: routing drawn (B-Login); linking decided (Q-270), the *Is this you?* step not drawn · Code: built in the api (`POST /v1/auth/verify` answers 202 with the question; `POST /v1/auth/identity`).

### S-13 · Invite links expire after 7 days

**Goal.** Team invites don't stay open forever.

**Trigger.** Time: 7 days after an invite is sent or resent.

```mermaid
flowchart TD
  A["Owner sends an invite"] --> B["SMS link valid 7 days"]
  B --> C{"Person signs in in time?"}
  C -->|"Yes"| D{"Kabul et or Ret et"}
  D -->|"Kabul et"| E["Member, owner is told"]
  D -->|"Ret et"| F["Inviter is told"]
  C -->|"No"| G["Invite expired message"]
  G --> H["Owner may resend"]
```

**Steps**

1. The owner invites a person with their phone number (their Ýeral login), name, specialization, access level and services (business spec §8).
2. The person gets an SMS link that's valid for 7 days. The team list shows *Çagyryldy · 19 oktýabra çenli* (invited · until 19 October), with *Täzeden iber* (resend) and *Çakylygy ýatyr* (withdraw) (business spec §8; B-Team).
3. The person signs in with that phone, and the invite screen comes first: *Kabul et* / *Ret et* (accept / decline) (business spec §1; B-Login).
4. If they accept, they become a member with the chosen access level, and the owner hears *Topar: işgär çakylygy kabul edende* (business spec §16). If they decline, the inviter is told (*… habar alar*) through the *Topar* notification row (Q-298, decided 18.10.2026), and joining later needs a new invite (B-Login).
5. After 7 days the invite expires. Signing in then shows *Çakylygyň möhleti geçdi* with *Her çakylyk 7 gün işleýär… Eýesinden täzeden ibermegini haýyş ediň* (B-Login).
6. A resend starts a new 7 days (B-Team).

**Edge cases**

- *Programmasyz* staff (no login) get no SMS and are active at once (business spec §11).
- The design has no invite SMS text. Claude writes it in English, the source language, with the market's translations, and the owner checks it (Q-288, decided 18.10.2026).
- Code: an invite is valid 7 days and reads as expired after that, with no job; the person accepts or declines it (`/v1/me/invites`), and resending gives a new link and a new 7 days (`modules/team`, ADR 0025). No invite SMS is sent yet: at the first launch the invite shows at the invited phone's sign-in and the owner copies the link.

**Status.** Design: decided and drawn (business spec §1, §8; B-Login, B-Team) · Code: partly.

## Workspaces and businesses

### S-14 · "Başga ýerde" blocks a person across workspaces

**Goal.** A specialist who works at two businesses can't be booked in both at the same time.

**Trigger.** Event: a booking is created, moved or cancelled for a person who belongs to two or more workspaces.

```mermaid
flowchart TD
  A["Booking for her in A"] --> C["Block shown in B"]
  C --> D["B cannot book that time"]
```

**Steps**

1. Aýna works in Glow Studio and also owns her own studio (business spec §1, demo).
2. A confirmed booking or a waiting request where she is the specialist, with its buffers, shows in the other workspace's calendar as a dashed grey *Başga ýerde* block with a briefcase icon (Q-272, decided 18.10.2026). It never shows anything from the other workspace: it has no details and can't be clicked (business spec §1, §4; Q-031, decided 18.10.2026).
3. The other workspace's online booking doesn't offer that time, and its staff can't book her then. Times under the block are refused with a toast (business spec §1, §4).
4. There's no switch: the block always applies and never shows details, so there's nothing to hide (Q-271, decided 18.10.2026).

**Edge cases**

- *Programmasyz* staff have no account, so nothing links them across workspaces.
- **Design to fix:** drop the *Profilim* switch *Beýleki iş ýerlerimdäki wagtymy «Başga ýerde» görkez* (show my time in other workspaces as "Başga ýerde") (business spec §1; Q-271).

> Open question Q-271: What the "Başga ýerde" switch controls.

- Nothing else blocks her elsewhere: not her breaks, her days off or her own bookings as a client (Q-272).

> Open question Q-272: Which bookings block a person elsewhere.

**Status.** Design: decided and drawn, in the MVP (business spec §1, §4; Q-031; B-Calendar, DS-Business) · Code: not built. Free times count only the same business's bookings.

### S-15 · Live updates on open screens

**Goal.** Screens show changes made by other people without a reload.

**Trigger.** Event: any change to a booking or a review.

```mermaid
sequenceDiagram
  participant P as Person A
  participant S as System
  participant Q as Screen of person B
  P->>S: Changes a booking
  S->>S: Writes a change note
  Q->>S: Anything new, every 10 s
  S-->>Q: Yes, this booking changed
  Q->>S: Reloads that booking
```

**Steps**

1. Every change leaves a short change note in the system. The note types are created, confirmed, declined, cancelled, expired, moved, completed, no-show, updated and review created (code: `packages/contract/src/events.ts`).
2. Open screens of signed-in people ask for new notes about every 10 seconds. They also ask when the window gets focus and right after the person's own action (code: `packages/sdk/src/events.ts`; `systemPatterns.md`).
3. A client gets notes about their own bookings. A team member gets notes about their active workspaces.
4. The screen then reloads what changed.

**Edge cases**

- Public pages (search, business page) don't refresh by themselves. If someone takes a time meanwhile, the client finds out when sending: *Bu wagt ýaňy alyndy. Golaý boş wagtlar:* plus the 3 nearest times (client spec §4.4).
- Code differs: a hidden tab doesn't ask at all. A workspace tab in the background therefore never learns of a new request, but B-Shell wants a browser notification exactly then ("Browser notification when the tab is in the background"), and Q-273 includes background workspace tabs.
- A push connection can replace the asking later on the own server, and screens stay the same (`systemPatterns.md`).
- Changes reach open screens within about 10 seconds by asking, including a workspace tab in the background (Q-273, decided 18.10.2026).

> Open question Q-273: How fast changes must reach open screens.

**Status.** Design: decided (business spec §2; B-Shell; Q-273) · Code: built (the asking), with the background-tab difference.

### S-16 · A new request reaches the business

**Goal.** The business sees a new request within seconds and answers before the deadline.

**Trigger.** Event: a client sends a request or asks to move.

```mermaid
flowchart TD
  A["Client sends a request"] --> B["Workspace learns within seconds"]
  B --> C["Badge, chip and dashed block"]
  B --> D{"Person can see it?"}
  D -->|"Yes"| E["Toast with sound"]
  E --> F{"Tab in background?"}
  F -->|"Yes"| G["Browser notification"]
  B --> H["5 minutes before deadline"]
  H --> I["Warning to owner and admin"]
```

**Steps**

1. The request appears in the workspace in four places: an amber count on *Ýazylyşlar*, an *N haýyş* chip in the calendar header, a dashed block with a timer in the grid, and a row in *Haýyşlar* (business spec §2, §4, §5).
2. People who can see it get a toast at the bottom left for 6 seconds, with a soft sound. It reads *Täze haýyş: Ejegyz T. · Aýna · şu gün 15:30*. If the tab is in the background, they also get a browser notification (B-Shell; business spec §2).
3. Requests in other workspaces only raise the count in the workspace switcher (B-Shell; business spec §9).
4. Who may answer follows the setting *Haýyşlara kim jogap berýär?*. The options are *Administrator we eýesi*, *Her hünärmen özi* and *Ikisi hem* (default). Someone who can't answer sees a read-only footer instead of the buttons (business spec §2).
5. Five minutes before the deadline, the owner and admin get *Haýyşyň wagty gutarýar* (business spec §16).
6. If nobody answers, S-01 follows, or S-07 for a move.

**Edge cases**

- During quiet hours there's no sound and no alert (S-18).
- Requests for *Programmasyz* staff go to the owner and admin (business spec §2).
- Before the app exists, new-request SMS to staff are off by default. Each person can switch them on, and they never go at night or to someone who has the workspace open (Q-297, decided 18.10.2026).

**Status.** Design: decided and drawn (business spec §2, §16; B-Shell, B-Calendar, B-Bookings) · Code: partly. The change note exists, but the workspace, toasts and warnings aren't built.

### S-17 · A new business is verified

**Goal.** Only real businesses are public.

**Trigger.** Event: a new business finishes setup, including one created from the workspace switcher.

```mermaid
flowchart TD
  A["Owner finishes setup"] --> B["Status Barlagda"]
  B --> C["Team uses the calendar"]
  B --> D["Visitors see not opened yet"]
  B --> E{"Ýeral team decides"}
  E -->|"Verified"| F["Public in search and link"]
  F --> G["Owner is notified"]
  E -->|"Rejected"| H["Banner with reason, fix and send again"]
```

**Steps**

1. After setup the business has the status *Barlagda* (in review). It can use the calendar straight away (business spec §7).
2. Setup step 8 says *Salgyňyz we QR kodyňyz taýýar — barlagdan soň müşderiler üçin açylar.* (your link and QR code are ready and open to clients after review) (ROUND6 F1).
3. The owner and team see their own page with the banner *Sahypaňyz barlagda — häzir ony diňe siz we toparyňyz görýärsiňiz. Barlagdan soň gözlegde we salgyňyzda hemmä açylar.* (ROUND6 F1; B-Shell).
4. Visitors at the link see *Bu sahypa entek açylmady* and *Biznes Ýeral-a täze goşuldy we barlagdan geçýär. Adatça 24 sagat çekýär.*, with a *Başga ýerleri gözle* button. They see no business details. ROUND6 F1 also suggests telling search engines the page doesn't exist (States tile 11).
5. The Ýeral team verifies the business in its admin tool (Q-010), usually within 24 hours (business spec §7).
6. Once verified, the business appears in search, on category pages, at its link and among similar places. The owner hears *Ýeral: barlag we täzelikler*, by browser and SMS by default (business spec §16).

**Edge cases**

- At launch the Ýeral team works in a small admin tool that verifies businesses and handles reported reviews; categories, help articles and support chat come later (Q-010, decided 18.10.2026; business spec §24, "admin panel … for business verification").
- Clients can't book online before verification, because nobody else can open the page. Staff can still enter phone bookings (business spec §7).
- A rejected business sees a banner with the reason and a way to fix things and send the business again. Visitors keep seeing *Bu sahypa entek açylmady* (Q-274, decided 18.10.2026). The data already has a "rejected" status with a reason. **Design to fix:** draw the rejected banner and the send-again action.

> Open question Q-274: What a rejected business sees.

- Changes after verification don't send the business back to review on MVP, but the Ýeral team can un-verify a business by hand (Q-275, decided 18.10.2026).

> Open question Q-275: Re-checking a verified business after changes.

- Before verifying, the team calls the business phone, then looks at the name, the address on the map, the category and the photos (Q-276, decided 18.10.2026).

> Open question Q-276: What the Ýeral team checks before verifying.

- **Design to fix:** the admin tool isn't drawn yet, and without it no business can become public (Q-010).

> Open question Q-010: what the Ýeral team can do at launch, and with which tool.

**Status.** Design: decided and drawn for the business and the visitor (business spec §7, §26; ROUND6 F1) · Code: partly. Only verified businesses are public, and an unverified link gives a plain "not found". There's no owner preview, no banner and no verification tool.

### S-18 · Quiet hours and summaries for the business

**Goal.** The business hears what matters, but not at night.

**Trigger.** Time: the person's quiet hours and the two summary times.

```mermaid
flowchart TD
  A["Something happens"] --> B{"In quiet hours?"}
  B -->|"Yes"| C["No sound, no alert, no SMS"]
  B -->|"No"| D["Chosen channels are used"]
  E["Summary time comes"] --> F["One summary message"]
```

**Steps**

1. Each person sets *Habarnamalar* (notifications) for themselves: *Bu sazlamalar diňe size degişli.* (these settings apply only to you) (business spec §16; B-Notifications).
2. Quiet hours (*Gijeki dymyşlyk*) are on by default from 22:00 to 08:00. The start can be 19:00–00:00 and the end 05:00–10:00, in 30-minute steps (B-Notifications).
3. During quiet hours there's no sound and no alert in the browser or the app. SMS never go at night, even with quiet hours off: *SMS gije hiç haçan iberilmeýär* (B-Notifications; business spec §16, §22).
4. There are two summaries, each sent as one message:
  - *Ertirki ýazylyşlar* (tomorrow's bookings): who comes tomorrow, every evening, default 20:00 (range 17:00–23:00). Each specialist gets their own bookings. On MVP it's off by default, and each person switches it on (Q-296, decided 18.10.2026).
  - *Gündelik jemleme* (daily summary): today's bookings and requests, every morning, default 08:00 (range 05:00–10:00). This one goes to the owner.
5. A summary time inside quiet hours shows *Bu wagt gijeki dymyşlyga düşýär — ses we push bolmaz.* (this time falls in quiet hours; no sound or push).
6. Summaries can't go by SMS. SMS is allowed only for *Täze haýyş* and *Ýeral* (business spec §22).

**Edge cases**

- For SMS, night is the person's quiet hours, or 22:00–08:00 when quiet hours are off (Q-278, decided 18.10.2026).

> Open question Q-278: What "night" means for business SMS.

- A *Täze haýyş* SMS that falls in the night is dropped, since the morning summary covers it. A *Ýeral* SMS waits until the morning (Q-279, decided 18.10.2026).

> Open question Q-279: A business SMS that falls in the night.

- On MVP the browser is the only alert channel, and it works only while Ýeral Biznes is open (*Ýeral Biznes açyk bolanda*). The summaries stay as drawn: a browser notification if the workspace is open at that time, so a summary reaches nobody whose workspace isn't open then (Q-280, decided 18.10.2026).

> Open question Q-280: Summaries while the browser is the only channel.

- A person in two workspaces has one set of settings per workspace, with that workspace's role defaults. Quiet hours are shared across their workspaces (Q-281, decided 18.10.2026).

> Open question Q-281: Notification settings per workspace or per person.

**Status.** Design: decided and drawn (business spec §16, §22; B-Notifications) · Code: not built.

### S-19 · The typical answer time

**Goal.** Set the client's expectations before and after they send a request.

**Trigger.** Time: the system works it out from the answers of the last 30 days (Q-113, decided 18.10.2026). The spec says "computed" but doesn't say when.

```mermaid
flowchart LR
  A["Business answers requests"] --> B["System computes typical time"]
  B --> C["Business page line"]
  B --> D["Sent screen sentence"]
```

**Steps**

1. The business page shows *Adatça 15 minudyň dowamynda tassyklaýar* (usually confirms within 15 minutes) (client spec §4.3).
2. At a manual business, the sent screen shows *Biznes adatça {N1} içinde jogap berýär.* (ROUND6 A2).

**Edge cases**

- It's the median answer time over the last 30 days, rounded (15 min, 1 sagat …). Both lines stay hidden until the business has answered 5 requests (Q-113, decided 18.10.2026).
- Code differs: each business stores a fixed number, set only by the demo data (default 20 minutes). Nothing computes it.
- Instant businesses don't need it.

> Open question Q-113: how the typical answer time is worked out.

**Status.** Design: decided (client spec §4.3; ROUND6 A2; Q-113) · Code: not built (only a stored number).

## Behind the scenes

### S-20 · Demo data and example businesses

**Goal.** Test shortcuts never reach real people; at the first launch, example businesses and a demo workspace let anyone try Ýeral (Q-004, decided 18.10.2026).

**Trigger.** Event: the database is set up or reset.

```mermaid
flowchart TD
  A["Database is set up"] --> B{"Which environment?"}
  B -->|"Local or Docker"| C["Full demo, code 1234"]
  B -->|"Production"| D["Categories only, demo refused"]
```

**Steps** (code: `db/seed/mode.ts`; ADR 0020; `operations.md`)

1. Local and Docker databases get the full demo from `docs/design/demo-data.json`, with Glow Studio, Barber Loft, Aýdyň ýoga and the others. The demo dates move to the day the data is loaded.
2. Production gets only the category list. Loading the demo into any remote database is refused, because it wipes the database.
3. Outside production, the login code is always 1234 and SMS go to the log.

**Things the code does that no spec describes**

- A demo business with no active team member confirms a request by itself after 20 seconds. This happens only outside production.
- Demo dates shift to the loading day but keep the design's weekdays.
- The login code is 1234 outside production (ADR 0019 mentions it).

**Edge cases**

- **First launch** (Q-004, decided 18.10.2026): production also gets example businesses from the design's demo data, marked "Example" everywhere they appear and set to confirm bookings at once. Bookings visitors make there show only in their own *Ýazylyşlarym*. "Try the business app" opens a shared demo workspace with seeded clients only, so no visitor sees another visitor's phone; it resets every night. Real businesses sit beside the examples.
- **Code differs:** production refuses all demo data, and nothing marks a business as an example or resets a demo workspace.

> Open question Q-004: who the first launch is for.

**Status.** Design: not a design topic · Code: built.

### S-21 · Failed messages are retried

**Goal.** A short outage at the SMS gateway doesn't lose messages.

**Trigger.** Event: sending an SMS fails.

```mermaid
flowchart TD
  A["SMS is due"] --> B{"Still wanted?"}
  B -->|"No"| C["Dropped quietly"]
  B -->|"Yes"| D{"Sent?"}
  D -->|"Yes"| E["Done"]
  D -->|"No"| F["Retry four more times"]
  F --> G["Give up after 5 tries"]
```

**Steps** (code: `modules/jobs/run.ts`)

1. Booking SMS go into a queue with their planned time.
2. Right before sending, the system checks the booking again: its state, its time and the switches (S-04).
3. If sending fails, it tries again after 1, 2, 4 and 8 minutes.
4. After 5 failed tries, about 15 minutes in all, it gives up, keeps the record and alerts the Ýeral team (Q-284, decided 18.10.2026). **Code differs:** nobody is alerted.

**Edge cases**

- Login codes are sent straight away, not queued. If sending fails, the person sees an error and can ask again after the 59-second wait (S-10).
- A reminder that would arrive after the visit has started is dropped (Q-284). **Code differs:** a retried reminder can still go out after the start.
- There's no SMS gateway yet, so every environment writes SMS to the log. At the first launch no SMS goes out: texts go to the log and the sign-in code shows on the screen (Q-036, decided 18.10.2026).

> Open question Q-284: An SMS that can't be delivered.

**Status.** Design: not a design topic · Code: built (queue and retries); the gateway isn't built.
