# 8. Notifications

This chapter says who hears about what, how and when. Clients hear by SMS and on screen. Business people hear in the browser, and by SMS only for critical events. A native app channel comes later. Chapter 7c describes the timers behind these messages (S-01 to S-21).

Where things stand today:

- **Design:** client messages are decided in client spec §6 and ROUND6. Business notifications are decided in business spec §16, §22 and §25, and drawn on *B-Notifications* and *B-Shell*.
- **Code:** the api writes the client SMS texts. It sends login codes straight away and queues confirmations, phone bookings, declines, expiries and reminders. It also queues the business's moves and cancels (P2 step 4). Business notifications aren't built at all. No review ask (Q-259; the api's ask and its switch are gone).
- **No SMS reaches a phone yet.** Every environment, production included, writes SMS to a log (see "Not decided").

## Channels

### Client

| Channel | What it is | Source |
|---|---|---|
| SMS | Goes to the booking's phone, mobile numbers only, in the person's language (without one, the market's main language: English for now), and carries the booking link: a long random token on its own path, never the booking code | client spec §6; ROUND6 A1, C1; Q-168, Q-292, decided 18.10.2026 |
| On screen | The sent screen, status badges and canceller labels in *Ýazylyşlarym*, the detail drawer's timeline, toasts after the person's own actions, and the SMS link page | client spec §4.4, §4.8; ROUND6 A1–A7 |

There is no e-mail and no push. Accounts are phone-only, and the native apps come later.

### Business

| Channel | What it is | Source |
|---|---|---|
| Browser (*Brauzerde*) | A toast with sound, plus a browser notification when the tab is in the background; counts and badges in the sidebar and calendar. Works only while Ýeral Biznes is open (*Ýeral Biznes açyk bolanda*) | business spec §2, §16; B-Shell; B-Notifications |
| SMS | Critical events only: a new request, and Ýeral's own messages. Never at night. Ýeral pays | business spec §16, §22 |
| App (*Programmada*) | Later, with the native business app. Hidden on MVP | business spec §16, §25.6 |

The *B-Notifications* screen still draws the *Programmada* chip. The spec wins on behaviour here, so the chip is hidden on MVP.

## Client notifications

| Event | Channel | When | What it says (TK, short) | Can switch off? | Source |
|---|---|---|---|---|---|
| Login or phone-change code | SMS | at once | *Ýeral kody: {code}* | No | code only (`packages/i18n`) |
| Request sent | On screen only | at once | *Biznes tassyklanda SMS bilen habar bereris* + the hold-time sentence | — | client spec §4.4, §6; ROUND6 A2 |
| Booked at an instant business | On screen + the confirmed SMS, which carries the booking link | at once | *Ýazylyş tassyklandy* | as for confirmed | client spec §4.4; Q-287, decided 18.10.2026 |
| Business confirms | SMS + on screen | at once | *Ýeral: {business} ýazylyşyňyzy tassyklady. {weekday}, {date}, {time}. Üýtgetmek: {link}* | Yes: *Tassyklama we üýtgeşmeler* | client spec §6; Account-Profile |
| Business declines | SMS + on screen with up to 3 offered times | at once | *Ýeral: {business} {date} {time} ýazylyşyny kabul edip bilmedi: {reason}. Başga wagt saýlaň: {link}* | No: always goes | client spec §6; ROUND6 A1; Q-286, decided 18.10.2026 |
| Request expires | SMS + on screen with 3 free times; with nothing free, the SMS drops the times and says *Başga wagt saýlaň* | at the deadline | *Ýeral: {business} wagtynda jogap bermedi. Şu boş wagtlar bar: {t1}, {t2}, {t3} — {link}* | No: always goes | client spec §6; ROUND6 A2; Q-252, Q-286, decided 18.10.2026 |
| Business cancels a confirmed booking | SMS + on screen with the reason | at once | *{brand}: {business} cancelled your booking on {date} {time}: {reason}. {link}*; for "The client called to cancel": *{brand}: your booking at {business} on {date} {time} is cancelled, as you asked. {link}* (Claude, Q-288) | Yes, with the same switch | business spec §3, §4; B-Calendar; Account-Profile; Q-286 |
| Business moves the booking | SMS if staff leave *Müşderä SMS iberilsin* on | at once | *{brand}: {business} moved your booking to {weekday}, {date}, {time}. Change: {link}* (Claude, Q-288) | Yes, with the same switch | business spec §4; B-Calendar |
| Client's move accepted | SMS + on screen *Wagt üýtgedildi* | at once | Claude writes it (Q-288); the code reuses the confirmed text | Yes, with the same switch | ROUND6 A3; B-Calendar |
| Client's move declined or unanswered | SMS with the link + on screen | at once | *Täze wagt kabul edilmedi — ýazylyşyňyz öňki wagtynda galýar.* | No: it always goes, like declines and expiries (Claude, following Q-286) | ROUND6 A3; Q-289, decided 18.10.2026 |
| Booking entered by staff (phone call) | SMS if staff leave *Müşderä SMS bilen habar ber* on; off for walk-ins | once *Yzyna al* can't take the booking back (10 s) | *{brand}: you're booked: {business}, {weekday}, {date}, {time}, {address}. Change: {link}* (Claude, Q-288) | the business decides per booking; the client's *Tassyklama we üýtgeşmeler* too | business spec §4, §26 |
| Specialist changed because staff were removed | SMS | at once | Claude writes it (Q-288) | not defined | business spec §8; B-Team |
| The business moved (B-37) | SMS to every waiting request and confirmed visit ahead + on screen: *New address* on the booking once its SMS went and, for 30 days, on the business page | 10 min after the last save that changed the address (a typo fixed straight after makes one SMS, a move and back none); a visit sooner: 30 min before it, or at once, never before a booking the team just entered can't be undone; a reminder going first says "new address" instead | *{brand}: {business} has moved to a new address: {address}. Your booking: {weekday}, {date}, {time}. {link}* (Claude, Q-288) | No: always goes, like a decline (owner, 20.10.2026: Q-215) | Q-215; code: `queueAddressSms`, `sendAddressSms` |
| Class cancelled or moved by the studio (after the MVP) | Notified, with the reason and other sessions | at once | Claude writes it (Q-288) | not defined | business spec §21 |
| Reminder 1 day before | SMS | 24 h before; between 22:00 and 08:00 it goes at 21:30 the evening before | *Ýatlatma: ertir {time} {business}, {address}.* | Yes: *Ýatlatma: 1 gün öň*. The business can also stop it per client | client spec §6; business spec §6; Q-285, decided 18.10.2026 |
| Reminder 2 h before | SMS | 2 h before; between 22:00 and 08:00 it goes at 21:30 the evening before | *Ýatlatma: şu gün {time} {business}, {address}.* (the code's text; the spec repeats the 1-day text) | Yes: *Ýatlatma: 2 sagat öň* | client spec §6; Q-285, Q-293, decided 18.10.2026 |
| Review ask | none: no review ask. *Teswir ýaz* stays on a completed booking in *Ýazylyşlarym* and on its booking link | — | — | — | Q-259, Q-170, decided 18.10.2026 |
| Marked as a no-show | On screen | when staff mark it | *Gelmediňiz diýlip bellendi* | — | client spec §4.8 |
| Limited to phone bookings | On screen, when they next try to book | — | *Bu biznese telefon arkaly ýazylyp bilersiňiz* | — | ROUND6 A7 |
| Undo failed | Toast on screen | — | *Yzyna alyp bolmady — {sebäbi}.* | — | ROUND6 A6 |

Notes:

- Booking outcomes go at any hour. A reminder that falls between 22:00 and 08:00 goes at 21:30 the evening before: a 07:00 visit gets its 2-hour reminder at 21:30 the night before. (Q-285, decided 18.10.2026) A moved reminder goes at 21:30 the evening before the visit, with the *ertir* (tomorrow) text; at most one reminder goes on any day before the visit (the later, standing for both), and a moved one within 2 hours of booking is left out: the "confirmed" SMS has just gone (Claude, following Q-285 and Q-293). A moved reminder goes only if the client wants a reminder it stands for. (code: `reminderPlan()` in `@yeral/domain/lifecycle`; the moved reminder is the job kind `reminderEvening`, its `covers` say which switches decide)
- A reminder's address names its city when the business isn't in the market's main city: a phone has no chosen city to compare with (Q-107; Claude (delegated), 20.10.2026). (code: `bookingSmsText()`, `fmt.addressIn()`)

> Open question Q-285: Client SMS at night.

- The client's switch reads *Tassyklama we üýtgeşmeler (SMS)* — *Biznes ýazylyşyňyzy tassyklanda, wagtyny üýtgedende ýa-da ýatyranda habar bereris.* (Account-Profile). It covers confirmations, time changes and cancels by the business. Declines and expiries always go, since they carry the offered times. (Q-286, decided 18.10.2026)
- **Design to fix:** Account-Profile drops the review-ask switch *Teswir haýyşy*, leaving three SMS switches (Q-259).

> Open question Q-286: What the "Tassyklama we üýtgeşmeler" switch covers.

- At an instant business the confirmed SMS goes too, while the client is still on the sent screen, because it carries the booking link. (Q-287, decided 18.10.2026)

> Open question Q-287: Confirmed SMS at an instant business.

- Several screens promise an SMS that has no text: a business move, an accepted move, a phone booking, a specialist change, a class cancelled or moved, a team invite, and a new owner after an ownership transfer. Claude writes them in English, the source language, with the market's translations (ADR 0022), in the style of client spec §6; the owner checks them. (Q-288, decided 18.10.2026)

> Open question Q-288: SMS texts the design doesn't have.

- When a move isn't accepted, an SMS with *Täze wagt kabul edilmedi — ýazylyşyňyz öňki wagtynda galýar.* and the link tells the client. (Q-289, decided 18.10.2026; code: `sms.moveRefused`, sent when a move lapses; the business's decline sends it with P2 step 4)

> Open question Q-289: SMS when a waiting move isn't accepted.

- A no-show and the phone-only limit show on screen only, as designed. (Q-290, decided 18.10.2026)

> Open question Q-290: Telling the client about a no-show and the phone-only limit.

- On the client card the business can switch on *Ýatlatma SMS-lerini iberme* (don't send reminder SMS) when the client asks (business spec §6). It stops reminders only; confirmations still go, and there are no review asks. (Q-291, Q-259, decided 18.10.2026)

> Open question Q-291: "Ýatlatma SMS-lerini iberme" and review asks.

- A client the business entered by phone may have no account and no language set. They get SMS in the market's main language until they sign in and choose one: English for now; at the Turkmenistan launch the language, the settings and the SMS and notification templates switch to the market's. (Q-292, decided 18.10.2026; code: `MARKET.defaultLanguage`, `apps/api/src/modules/jobs/run.ts`)

> Open question Q-292: SMS language for clients without an account.

## SMS texts

These are the Turkmen texts from client spec §6 next to the ones in the code (`packages/i18n/src/messages/tk.json`, keys `sms.*`). The code also has Russian and English versions of every text. Claude wrote those, and the owner checks them before a market launches (Q-101).

| Message | Client spec §6 | Code | Match |
|---|---|---|---|
| Login code | — | *Ýeral kody: {code}* | only in the code |
| Request sent | no SMS | no SMS | yes |
| Confirmed | *Ýeral: {business} ýazylyşyňyzy tassyklady. {weekday}, {date}, {time}. Üýtgetmek: yeral.app/b/{id}* | the same, with `yeral.app/l/{token}` (Q-168); the link domain comes from config | yes |
| Declined | *Ýeral: {business} {date} {time} ýazylyşyny kabul edip bilmedi: {reason}. Başga wagt saýlaň: {link}* | the same | yes; nothing sends it yet |
| Expired | *Ýeral: {business} wagtynda jogap bermedi. Şu boş wagtlar bar: {t1}, {t2}, {t3} — {link}* | the same, with *{times}*; a time on another day gets a short date (*16 okt. 10:00*) | yes; with nothing free, the text drops the times and says *Başga wagt saýlaň* (Q-252; code: `sms.expiredNoTimes`) |
| Cancelled by the business | — | *Ýeral: {business} {date} {time} ýazylyşyňyzy ýatyrdy: {reason}. {link}* | sent since 20.10.2026 (B-27) |
| Cancelled for a closed day or new hours, with free times (B-39, B-40) | — | *{brand}: {business} cancelled your booking on {date} {time}: {reason}. Free times: {times} — {link}* (none free: *Pick another time*; a client who can't book online: *Call them to book*) | Claude wrote it (Q-288, 20.10.2026); it always goes, as a decline does |
| Cancelled as the client asked by phone (B-27) | — | *{brand}: your booking at {business} on {date} {time} is cancelled, as you asked. {link}* | Claude wrote it (Q-288, 20.10.2026) |
| Moved by the business (B-26) | — | *{brand}: {business} moved your booking to {weekday}, {date}, {time}. Change: {link}* | Claude wrote it (Q-288, 20.10.2026) |
| Specialist changed by the business, same time (B-26) | — | *{brand}: {business}: your booking on {weekday}, {date}, {time} is now with {staff}. {link}* | Claude wrote it (Q-288, 20.10.2026); B-50 can reuse it |
| Reminder 1 day | *Ýatlatma: ertir {time} {business}, {address}.* | the same; once the business moved and the client hasn't heard: *…, täze salgy: {address}.* (Q-215) | yes |
| Reminder 2 h | the same text as the 1-day reminder, with *ertir* (tomorrow) | *Ýatlatma: şu gün {time} {business}, {address}.* (today) | the code's text is kept (Q-293) |
| Review ask | *{business}-da bolşuňyz nähili boldy? Baha beriň: {link}* | the same | dropped: no review ask (Q-259) |
| Move not accepted | — | *{brand}: {business} didn't accept the new time. Your booking stays at {date} {time}. {link}* (English source; Turkmen and Russian drafts in the messages) | yes, when a move lapses (Q-289) |
| The business moved (Q-215) | — | *{brand}: {business} has moved to a new address: {address}. Your booking: {weekday}, {date}, {time}. {link}*; a home-based business's waiting request names the street only (English source; Turkmen and Russian drafts in the messages) | Claude wrote it (Q-288, 20.10.2026) |
| Phone booking (B-23) | — | *{brand}: you're booked: {business}, {weekday}, {date}, {time}, {address}. Change: {link}* (English source; Turkmen and Russian drafts in the messages) | Claude wrote it (Q-288, 20.10.2026) |
| The Ýeral team's review, to the owner (S-17, Q-274, Q-012) | — | *{brand}: {business} is open: clients find it in search and at {link}* · *{brand}: {business} isn't open yet: {reason}. Fix it in your workspace and send it again: {link}* · *{brand}: we've hidden {business}'s page for now: {reason}.* · *{brand}: {business}'s page is open again.* (English source; Turkmen and Russian drafts in the messages) | Claude wrote them (Q-288, 21.10.2026); at night they wait for 08:00 (Q-279) |
| A workspace closed or opened again, to the owner (Q-213) | — | *{brand}: {business} is closed, as you asked: its page is hidden, its bookings ahead are cancelled and their clients told. Your data is kept.* · *{brand}: {business} is open again in your workspace.* (English source; Turkmen and Russian drafts in the messages) | Claude wrote them (Q-288, 21.10.2026); each client's booking gets the cancel SMS with the reason "The business has closed" |
| Move accepted, specialist changed, class cancelled, invite, new owner | — | — (an accepted move reuses Confirmed) | missing; Claude writes them (Q-288) |

Notes:

- Every booking SMS links to the booking with a long random token on its own path. The booking's code (*YR-48213*) is shown and read out on the phone, but never opens anything by itself. (Q-168, decided 18.10.2026) Built 20.10.2026: the link is `/l/{token}` on the client site's domain, which comes from config (AGENTS rule 6); the api serves the link page (`GET /v1/links/{token}`) and its sign-in, and the client site draws it with P4.
- Reminders start with *Ýatlatma:*. The other texts start with *Ýeral:*. The sender name is "Yeral" (Q-109), which may make the prefix unnecessary.
- The 2-hour text in the spec says *ertir* (tomorrow), which is wrong two hours before a visit. The code's *şu gün* (today) text is kept. (Q-293, decided 18.10.2026)

> Open question Q-293: The 2-hour reminder text.

- Turkmen chooses *-da* or *-de* by the name's last vowel, so no text puts a suffix after the business name: texts are reworded instead. The review ask that had *-da* is dropped anyway (Q-259). (CHANGELOG v0.4; Q-294, decided 18.10.2026)

> Open question Q-294: The "-da" after a business name.

- Turkmen letters such as ý, ş and ň aren't in the basic SMS alphabet. Each SMS part therefore holds 70 characters instead of 160, and the same is true for Russian. With demo data, the confirmed, declined, expired and business-cancel texts run 95–125 characters, which is two parts each. Ýeral pays for every part. The full Turkmen letters stay and two-part messages are accepted; texts are shortened where that's easy. (Q-295, decided 18.10.2026)

> Open question Q-295: SMS length and cost.

## Business notifications

In the table, *siz* (you) means the person reading their own settings. The drawn captions are written for the owner. "Default" columns follow the drawn defaults (business demo data, *B-Notifications*), with the app channel hidden for MVP.

| Event | Who gets it | Channel | When | What it says | Settings | Source |
|---|---|---|---|---|---|---|
| *Täze haýyş* (new request) | *siz, administrator we haýyşyň hünärmeni*: people who can see the request, per *Haýyşlara kim jogap berýär?* | Browser: toast, sound, and a browser notification in a background tab. SMS optional | at once (*täze haýyş gelende derrew*) | toast *Täze haýyş: Ejegyz T. · Aýna · şu gün 15:30* | default: browser and sound on, SMS off; each person can switch SMS on, and it never goes at night or to someone who has the workspace open | business spec §2, §16; B-Shell; Q-297, decided 18.10.2026 |
| *Haýyşyň wagty gutarýar* (request about to expire) | *siz we administrator* | Browser | 5 min before the deadline (*jogap bermäge 5 minut galanda*) | not drawn | default: browser and sound on; no SMS | business spec §16 |
| *Müşderi ýatyrdy* (client cancelled) | *siz we şol hünärmen* | drawn default: app only | when a client cancels; an undo within 5 minutes updates this notice | not drawn | off by default on MVP; each person can switch on *Brauzerde* | business spec §16; Q-296, Q-298, decided 18.10.2026 |
| *Müşderi wagtyny üýtgetdi* (client asked to move) | *siz, administrator we hünärmen* | Browser | when a move request arrives | not drawn | default: browser on | business spec §16, §26 |
| *Kärdeşiňiz ýazylyş goşdy* (a colleague added a booking) | *siz* | none by default | when a colleague adds a phone or walk-in booking | not drawn | default: all off | business spec §16 |
| *Täze teswir* (new review) | *siz* | drawn default: app only | when a client writes a review | not drawn | off by default on MVP; each person can switch on *Brauzerde* | business spec §16; Q-296, decided 18.10.2026 |
| *Ertirki ýazylyşlar* (tomorrow's bookings) | each specialist, their own bookings | drawn default: app only | every evening, default 20:00 | one summary: *Ertir kim gelýär* | time 17:00–23:00; off by default on MVP; switched on, a browser notification if the workspace is open then | business spec §16; B-Notifications; Q-280, Q-296, decided 18.10.2026 |
| *Gündelik jemleme* (daily summary) | *siz* | Browser | every morning, default 08:00 | one summary: today's bookings and requests | time 05:00–10:00; a browser notification if the workspace is open then | business spec §16; B-Notifications; Q-280, decided 18.10.2026 |
| *Topar* (team) | *siz* | drawn default: app only | when someone accepts or declines an invite | not drawn | off by default on MVP; each person can switch on *Brauzerde* | business spec §16; Q-296, Q-298, decided 18.10.2026 |
| *Ýeral: barlag we täzelikler* (review and news) | *diňe eýesi* (owner only) | Browser + SMS | when the page passes review, and for important news | not drawn | default: browser and SMS on; SMS allowed | business spec §16, §25 |
| Team invite | the invited person | SMS link | when sent or resent | Claude writes it (Q-288) | — | business spec §1, §8; B-Team |
| Ownership transfer | the new owner | SMS | at the transfer | Claude writes it (Q-288) (*Täze eýä SMS bilen habar bereris.*) | — | B-Team |
| Invite declined | the inviter | the *Topar* row | when declined | *… habar alar* (will be told) | as for *Topar* | B-Login; Q-298, decided 18.10.2026 |
| Requests in other workspaces | the person | count in the workspace switcher | at once | count only | — | B-Shell; business spec §9 |

Code: none of this is built. The system only writes change notes that open screens pick up (chapter 7c, S-15).

Notes:

- Four events are drawn on the app channel only: *Müşderi ýatyrdy*, *Täze teswir*, *Ertirki ýazylyşlar* and *Topar*. With the app channel hidden on MVP, they stay off by default, a client cancelling included, and each person switches them on themselves. (Q-296, decided 18.10.2026)

> Open question Q-296: Business defaults while the app channel doesn't exist.

- Staff SMS is meant for "a new request when the person has no app". The screen says *SMS diňe programma habary ýetirip bilmese gelýär — gije däl.* (SMS only when the app can't deliver, never at night). On MVP nobody has the app, so the new-request SMS is off by default; each person can switch it on, and it never goes at night or to someone who has the workspace open. (Q-297, decided 18.10.2026)

> Open question Q-297: New-request SMS to staff before the app exists.

- Some changes have no notification of their own. On the business side: a request that expired, a client taking an offered time, a client undoing a cancel after *Müşderi ýatyrdy* went out, and an invite being declined. On the client side: a business reply to their review and the result of a review report (chapter 7c, S-06). All of these show on screen only, with two additions: an undo updates the earlier *Müşderi ýatyrdy* notice, and a declined invite uses the *Topar* row. (Q-298, decided 18.10.2026) Only the business hears the result of a review report. (Q-262, decided 18.10.2026)

> Open question Q-298: Changes nobody is told about.

## Rules

- **No SMS when a request is sent.** The client sees it on screen only (client spec §6). The code agrees.
- **Client SMS** cover booking outcomes, reminders and a business's move for its bookings ahead (Q-215); there's no review ask (Q-259). The profile has three switches: confirmations and changes, the 1-day reminder and the 2-hour reminder (Account-Profile). Declines and expiries always go (Q-286). Login codes always go. Booking outcomes go at any hour; a reminder that falls between 22:00 and 08:00 goes at 21:30 the evening before (Q-285). (decided 18.10.2026)
- **Staff SMS only for critical events.** SMS is allowed only for *Täze haýyş* and *Ýeral* (business spec §22). The new-request SMS is off by default; each person can switch it on, and it never goes at night or to someone who has the workspace open (business spec §16; Q-297, decided 18.10.2026).
- **Never at night for business SMS.** Quiet hours are 22:00–08:00 by default. During them there's no sound and no alert. Night is the person's quiet hours, or 22:00–08:00 when quiet hours are off. A new-request SMS that falls at night is dropped, since the morning summary covers it; a *Ýeral* SMS waits until the morning. (chapter 7c, S-18; Q-278, Q-279, decided 18.10.2026)
- **Summaries:** *Ertirki ýazylyşlar* in the evening and *Gündelik jemleme* in the morning, one message each, never by SMS. Each comes as a browser notification if the workspace is open at that time. (chapter 7c, S-18; Q-280, decided 18.10.2026)
- **Settings** are one set per person per workspace, with that workspace's role defaults; quiet hours are shared across workspaces. (business spec §16; Q-281, decided 18.10.2026)
- **Sound:** there's a *Ses bilen* (with sound) switch, but only on the first two business events (business spec §22).
- **Browser permission:** a banner asks for it: *Brauzer habarnamalary ýapyk — täze haýyşlary sekuntda görmek üçin açyň.* with *Rugsat ber*. The denied state isn't drawn, so it uses the same banner with *Brauzer sazlamalarynda açyň* (business spec §16, §22).
- **Language:** messages go in the person's language: *Saýt we SMS habarnamalar şu dilde bolar.* (Account-Profile). English is the source and each market's languages are translations (ADR 0022). Without a saved language, SMS go in the market's main language until the person signs in and chooses one: English for now (Q-292, decided 18.10.2026).
- **Programmasyz staff** get nothing, and their requests go to the owner and admin (business spec §2).
- **Mobile numbers only:** SMS go only to mobile numbers (ROUND6 C1), so a phone client saved with a landline gets no SMS. (code: the jobs settle an SMS to a number the team typed in unsent when it isn't a mobile; an account's number took a sign-in code; 20.10.2026)
- **The SMS link** works signed out. Any action on it logs in with the booking's own phone, shown masked and not editable (ROUND6 A1).
- **Planned SMS check again before sending.** A reminder goes only if the booking is still in the right state and at the same time, and the switches allow it (code; chapter 7c, S-04, S-21). A reminder that would arrive after the visit has started is dropped. An SMS that fails 5 times is given up, and the Ýeral team is alerted. (Q-284, decided 18.10.2026) **Code differs:** the give-up writes an error line, `job gave up`, that error tracking (F-209, P2 step 7) turns into an alert; until then nobody is told.
- **What the client knows** (code, 20.10.2026): each booking keeps it (its time and specialists: what the client
  chose, agreed to on the phone or at the desk, or was last told by SMS, a reminder included). One news SMS waits per
  booking and is worded when it goes, from that and the booking as it is then: a confirmation tells the booking as it
  is, naming who does it when that changed after the call (one the client chose online and that changed before it went
  says what changed); a change says what changed (*moved*, *moved … with …*,
  *now with …*), or nothing when it's back as they knew it. A booking the team enters is first told 15 seconds after
  it's saved, once its undo can't come any more; cancelled before that SMS went, it texts nothing (the client learned
  of it on the phone); a cancel names the time the client knows (`queueBookingSms`, `newsSms`).
- **Staff choose per action** whether the client hears about it: *Müşderä SMS iberilsin* when moving a booking, and *Müşderä SMS bilen habar ber* for a new booking (off for walk-ins) (business spec §4, §26).
- **Who pays for SMS:** Ýeral. Business spec §16 says "costs are Ýeral's", and the landing says *SMS ýatlatmalar hem mugt* (SMS reminders are free too). Owner's direction, 2026-10-16: Ýeral is free for now. There's no cap on SMS per business on MVP; the Ýeral team watches a monthly count per business. (Q-299, decided 18.10.2026) Code (21.10.2026): a safety limit all the same (see Q-299's concern): past 1000 a day or 30 in 10 minutes per business an SMS waits for the window instead of going at once (one that would then arrive after the visit has started is settled unsent, as a late reminder is); a business in review texts no number its team typed in; the closing's notices are never held.

> Open question Q-299: A cap on SMS per business.

## Not decided

- **SMS at the first launch:** none. Every text below is written and goes to the log, the sign-in code shows on the screen, and clients see every outcome on screen in *Ýazylyşlarym*. Real SMS, with a provider, start with the Turkmenistan launch. The sender name is decided: "Yeral" in plain Latin. (Q-036, Q-109, decided 18.10.2026)
- **No SMS gateway in the code.** Every environment, production included, writes SMS to the log (`apps/api/src/deps.ts`, `apps/api/src/ports/sms.ts`). Until a gateway exists or the first launch switches the code on the screen on (`SIGN_IN_CODE_ON_SCREEN`, off unless set; chapter 10, P2 step 6), nobody can sign in on production; sign-in codes never reach the log (ADR 0024). While it's on, the plain sign-in's answer carries the code, a booking link's never does, a phone change is refused, and an unused account signs in as it is ("Is this you?" isn't asked) (chapter 9, 20.10.2026).
- **Push and the app channel.** *Programmada* and phone push come with the native apps (business spec §25.6), not before.
- **Browser notifications while the workspace is closed** (web push) aren't designed. *Brauzerde* means "while Ýeral Biznes is open".
- **A client inbox or bell** isn't designed. The client sees changes on the booking itself.
- **E-mail** isn't used anywhere.

> Open question Q-036: SMS at the first launch.
