# 8. Notifications

This chapter says who hears about what, how and when. Clients hear by SMS and on screen. Business people hear in the browser, and by SMS only for critical events. A native app channel comes later. Chapter 7c describes the timers behind these messages (S-01 to S-21).

Where things stand today:

- **Design:** client messages are decided in client spec §6 and ROUND6. Business notifications are decided in business spec §16, §22 and §25, and drawn on *B-Notifications* and *B-Shell*.
- **Code:** the api writes the client SMS texts. It sends login codes straight away and queues confirmations, expiries, reminders and review asks. Texts for declines and business cancels exist, but nothing sends them yet, because the business side isn't built (M5). Business notifications aren't built at all.
- **No SMS reaches a phone yet.** Every environment, production included, writes SMS to a log (see "Not decided").

## Channels

### Client

| Channel | What it is | Source |
|---|---|---|
| SMS | Goes to the booking's phone, mobile numbers only, in the person's language, and carries the booking link `yeral.app/b/{code}` | client spec §6; ROUND6 A1, C1 |
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
| Booked at an instant business | On screen; the code also sends the confirmed SMS | at once | *Ýazylyş tassyklandy* | as for confirmed | client spec §4.4 |
| Business confirms | SMS + on screen | at once | *Ýeral: {business} ýazylyşyňyzy tassyklady. {weekday}, {date}, {time}. Üýtgetmek: {link}* | Yes: *Tassyklama we üýtgeşmeler* | client spec §6; Account-Profile |
| Business declines | SMS + on screen with up to 3 offered times | at once | *Ýeral: {business} {date} {time} ýazylyşyny kabul edip bilmedi: {reason}. Başga wagt saýlaň: {link}* | Not defined | client spec §6; ROUND6 A1 |
| Request expires | SMS + on screen with 3 free times | at the deadline | *Ýeral: {business} wagtynda jogap bermedi. Şu boş wagtlar bar: {t1}, {t2}, {t3} — {link}* | Not defined (the code always sends it) | client spec §6; ROUND6 A2 |
| Business cancels a confirmed booking | SMS + on screen with the reason | at once | text only in code: *Ýeral: {business} {date} {time} ýazylyşyňyzy ýatyrdy: {reason}. {link}* | Yes, with the same switch | business spec §3, §4; B-Calendar; Account-Profile |
| Business moves the booking | SMS if staff leave *Müşderä SMS iberilsin* on | at once | not written | Yes, with the same switch | business spec §4; B-Calendar |
| Client's move accepted | SMS + on screen *Wagt üýtgedildi* | at once | not written; the code reuses the confirmed text | Yes, with the same switch | ROUND6 A3; B-Calendar |
| Client's move declined or unanswered | On screen | at once | *Täze wagt kabul edilmedi — ýazylyşyňyz öňki wagtynda galýar.* | — | ROUND6 A3 |
| Booking entered by staff (phone call) | SMS if staff leave *Müşderä SMS bilen habar ber* on; off for walk-ins | at once | not written | the business decides per booking | business spec §4, §26 |
| Specialist changed because staff were removed | SMS | at once | not written | not defined | business spec §8; B-Team |
| Class cancelled or moved by the studio | Notified, with the reason and other sessions | at once | not written | not defined | business spec §21 |
| Reminder 1 day before | SMS | 24 h before | *Ýatlatma: ertir {time} {business}, {address}.* | Yes: *Ýatlatma: 1 gün öň*. The business can also stop it per client | client spec §6; business spec §6 |
| Reminder 2 h before | SMS | 2 h before | the spec repeats the 1-day text; the code says *Ýatlatma: şu gün {time} {business}, {address}.* | Yes: *Ýatlatma: 2 sagat öň* | client spec §6 |
| Review ask | SMS + *Teswir ýaz* on the booking | 2 h after the end | *{business}-da bolşuňyz nähili boldy? Baha beriň: {link}* | Yes: *Teswir haýyşy* | client spec §6 |
| Marked as a no-show | On screen | when staff mark it | *Gelmediňiz diýlip bellendi* | — | client spec §4.8 |
| Limited to phone bookings | On screen, when they next try to book | — | *Bu biznese telefon arkaly ýazylyp bilersiňiz* | — | ROUND6 A7 |
| Undo failed | Toast on screen | — | *Yzyna alyp bolmady — {sebäbi}.* | — | ROUND6 A6 |

Notes:

- No time window is set for client SMS. The code sends at any hour: a 07:00 visit gets its 2-hour reminder at 05:00, and a visit ending at 21:00 gets its review ask at 23:00.

> Open question Q-285: Client SMS at night.

- The client's switch reads *Tassyklama we üýtgeşmeler (SMS)* — *Biznes ýazylyşyňyzy tassyklanda, wagtyny üýtgedende ýa-da ýatyranda habar bereris.* (Account-Profile). It doesn't name declines or expiries, even though those SMS carry the offered times.

> Open question Q-286: What the "Tassyklama we üýtgeşmeler" switch covers.

- At an instant business, the client is still on the sent screen when the code sends the confirmed SMS.

> Open question Q-287: Confirmed SMS at an instant business.

- Several screens promise an SMS that has no text: a business move, an accepted move, a phone booking, a specialist change, a class cancelled or moved, a team invite, and a new owner after an ownership transfer.

> Open question Q-288: SMS texts the design doesn't have.

- When a move isn't accepted, only the screen says so.

> Open question Q-289: SMS when a waiting move isn't accepted.

- A no-show and the phone-only limit show only on screen.

> Open question Q-290: Telling the client about a no-show and the phone-only limit.

- On the client card the business can switch on *Ýatlatma SMS-lerini iberme* (don't send reminder SMS) when the client asks (business spec §6). The code then stops reminders and review asks too, but not confirmations.

> Open question Q-291: "Ýatlatma SMS-lerini iberme" and review asks.

- A client the business entered by phone may have no account and no language set. The code then writes to them in Turkmen.

> Open question Q-292: SMS language for clients without an account.

## SMS texts

These are the Turkmen texts from client spec §6 next to the ones in the code (`packages/i18n/src/messages/tk.json`, keys `sms.*`). The code also has Russian and English versions of every text. Claude wrote those, and a native speaker still needs to check them (Q-101).

| Message | Client spec §6 | Code | Match |
|---|---|---|---|
| Login code | — | *Ýeral kody: {code}* | only in the code |
| Request sent | no SMS | no SMS | yes |
| Confirmed | *Ýeral: {business} ýazylyşyňyzy tassyklady. {weekday}, {date}, {time}. Üýtgetmek: yeral.app/b/{id}* | the same; the link domain comes from config | yes |
| Declined | *Ýeral: {business} {date} {time} ýazylyşyny kabul edip bilmedi: {reason}. Başga wagt saýlaň: {link}* | the same | yes; nothing sends it yet |
| Expired | *Ýeral: {business} wagtynda jogap bermedi. Şu boş wagtlar bar: {t1}, {t2}, {t3} — {link}* | the same, with *{times}*; a time on another day gets a short date (*16 okt. 10:00*) | yes; the list can be empty (chapter 7c, Q-252) |
| Cancelled by the business | — | *Ýeral: {business} {date} {time} ýazylyşyňyzy ýatyrdy: {reason}. {link}* | only in the code; nothing sends it yet |
| Reminder 1 day | *Ýatlatma: ertir {time} {business}, {address}.* | the same | yes |
| Reminder 2 h | the same text as the 1-day reminder, with *ertir* (tomorrow) | *Ýatlatma: şu gün {time} {business}, {address}.* (today) | no |
| Review ask | *{business}-da bolşuňyz nähili boldy? Baha beriň: {link}* | the same | yes |
| Moved, move accepted, phone booking, specialist changed, class cancelled, invite, new owner | — | — (an accepted move reuses Confirmed) | missing (Q-288) |

Notes:

- Every booking SMS links to `yeral.app/b/{code}`, where the code is the booking's *YR-48213* number. This path was the code's choice, and ROUND6 accepts it. Business page addresses must therefore never start with `yr-` (ROUND6 notes). The domain comes from config (AGENTS rule 6). The link page itself isn't built yet (M3).
- Reminders start with *Ýatlatma:*, and the review ask has no prefix at all. The other texts start with *Ýeral:*. The sender name is still open (Q-036, Q-109), and it may make the prefix unnecessary.
- The 2-hour text in the spec says *ertir* (tomorrow), which is wrong two hours before a visit.

> Open question Q-293: The 2-hour reminder text.

- The review ask fixes the suffix *-da* after the business name, but Turkmen chooses *-da* or *-de* by the name's last vowel. The export's open list already flags this (CHANGELOG v0.4).

> Open question Q-294: The "-da" after a business name.

- Turkmen letters such as ý, ş and ň aren't in the basic SMS alphabet. Each SMS part therefore holds 70 characters instead of 160, and the same is true for Russian. With demo data, the confirmed, declined, expired and business-cancel texts run 95–125 characters, which is two parts each. Ýeral pays for every part.

> Open question Q-295: SMS length and cost.

## Business notifications

In the table, *siz* (you) means the person reading their own settings. The drawn captions are written for the owner. "Default" columns follow the drawn defaults (business demo data, *B-Notifications*), with the app channel hidden for MVP.

| Event | Who gets it | Channel | When | What it says | Settings | Source |
|---|---|---|---|---|---|---|
| *Täze haýyş* (new request) | *siz, administrator we haýyşyň hünärmeni*: people who can see the request, per *Haýyşlara kim jogap berýär?* | Browser: toast, sound, and a browser notification in a background tab. SMS optional | at once (*täze haýyş gelende derrew*) | toast *Täze haýyş: Ejegyz T. · Aýna · şu gün 15:30* | default: browser and sound on, SMS off; SMS allowed | business spec §2, §16; B-Shell |
| *Haýyşyň wagty gutarýar* (request about to expire) | *siz we administrator* | Browser | 5 min before the deadline (*jogap bermäge 5 minut galanda*) | not drawn | default: browser and sound on; no SMS | business spec §16 |
| *Müşderi ýatyrdy* (client cancelled) | *siz we şol hünärmen* | drawn default: app only | when a client cancels | not drawn | on MVP the default reaches nobody | business spec §16 |
| *Müşderi wagtyny üýtgetdi* (client asked to move) | *siz, administrator we hünärmen* | Browser | when a move request arrives | not drawn | default: browser on | business spec §16, §26 |
| *Kärdeşiňiz ýazylyş goşdy* (a colleague added a booking) | *siz* | none by default | when a colleague adds a phone or walk-in booking | not drawn | default: all off | business spec §16 |
| *Täze teswir* (new review) | *siz* | drawn default: app only | when a client writes a review | not drawn | on MVP the default reaches nobody | business spec §16 |
| *Ertirki ýazylyşlar* (tomorrow's bookings) | each specialist, their own bookings | drawn default: app only | every evening, default 20:00 | one summary: *Ertir kim gelýär* | time 17:00–23:00; on MVP the default reaches nobody | business spec §16; B-Notifications |
| *Gündelik jemleme* (daily summary) | *siz* | Browser | every morning, default 08:00 | one summary: today's bookings and requests | time 05:00–10:00 | business spec §16; B-Notifications |
| *Topar* (team) | *siz* | drawn default: app only | when someone accepts an invite | not drawn | on MVP the default reaches nobody | business spec §16 |
| *Ýeral: barlag we täzelikler* (review and news) | *diňe eýesi* (owner only) | Browser + SMS | when the page passes review, and for important news | not drawn | default: browser and SMS on; SMS allowed | business spec §16, §25 |
| Team invite | the invited person | SMS link | when sent or resent | not written | — | business spec §1, §8; B-Team |
| Ownership transfer | the new owner | SMS | at the transfer | not written (*Täze eýä SMS bilen habar bereris.*) | — | B-Team |
| Invite declined | the inviter | not defined | when declined | *… habar alar* (will be told) | — | B-Login |
| Requests in other workspaces | the person | count in the workspace switcher | at once | count only | — | B-Shell; business spec §9 |

Code: none of this is built. The system only writes change notes that open screens pick up (chapter 7c, S-15).

Notes:

- Four events are drawn on the app channel only: *Müşderi ýatyrdy*, *Täze teswir*, *Ertirki ýazylyşlar* and *Topar*. With the app channel hidden on MVP, nobody hears about them by default, including a client cancelling.

> Open question Q-296: Business defaults while the app channel doesn't exist.

- Staff SMS is meant for "a new request when the person has no app". The screen says *SMS diňe programma habary ýetirip bilmese gelýär — gije däl.* (SMS only when the app can't deliver, never at night). On MVP nobody has the app.

> Open question Q-297: New-request SMS to staff before the app exists.

- Some changes reach nobody. On the business side: a request that expired, a client taking an offered time, a client undoing a cancel after *Müşderi ýatyrdy* went out, and an invite being declined. On the client side: a business reply to their review and the result of a review report (chapter 7c, S-06).

> Open question Q-298: Changes nobody is told about.

## Rules

- **No SMS when a request is sent.** The client sees it on screen only (client spec §6). The code agrees.
- **Client SMS** cover booking outcomes, reminders and review asks. The profile has four switches: confirmations and changes, the 1-day reminder, the 2-hour reminder and review asks (Account-Profile; Q-286 for declines and expiries). Login codes always go. There's no rule about night (Q-285).
- **Staff SMS only for critical events.** SMS is allowed only for *Täze haýyş* and *Ýeral* (business spec §22), and goes only when the person has no app (business spec §16; Q-297).
- **Never at night for business SMS.** Quiet hours are 22:00–08:00 by default. During them there's no sound and no alert, and SMS never go at night even with quiet hours off (chapter 7c, S-18; Q-278, Q-279).
- **Summaries:** *Ertirki ýazylyşlar* in the evening and *Gündelik jemleme* in the morning, one message each, never by SMS (chapter 7c, S-18; Q-280).
- **Sound:** there's a *Ses bilen* (with sound) switch, but only on the first two business events (business spec §22).
- **Browser permission:** a banner asks for it: *Brauzer habarnamalary ýapyk — täze haýyşlary sekuntda görmek üçin açyň.* with *Rugsat ber*. The denied state isn't drawn, so it uses the same banner with *Brauzer sazlamalarynda açyň* (business spec §16, §22).
- **Language:** messages go in the person's language: *Saýt we SMS habarnamalar şu dilde bolar.* (Account-Profile). English is the source and each market's languages are translations (ADR 0022). Without a saved language the code uses Turkmen; what it should be is Q-292.
- **Programmasyz staff** get nothing, and their requests go to the owner and admin (business spec §2).
- **Mobile numbers only:** SMS go only to mobile numbers (ROUND6 C1), so a phone client saved with a landline gets no SMS.
- **The SMS link** works signed out. Any action on it logs in with the booking's own phone, shown masked and not editable (ROUND6 A1).
- **Planned SMS check again before sending.** A reminder or review ask goes only if the booking is still in the right state and at the same time, and the switches allow it (code; chapter 7c, S-04, S-05, S-21).
- **Staff choose per action** whether the client hears about it: *Müşderä SMS iberilsin* when moving a booking, and *Müşderä SMS bilen habar ber* for a new booking (off for walk-ins) (business spec §4, §26).
- **Who pays for SMS:** Ýeral. Business spec §16 says "costs are Ýeral's", and the landing says *SMS ýatlatmalar hem mugt* (SMS reminders are free too). Owner's direction, 2026-10-16: Ýeral is free for now.

> Open question Q-299: A cap on SMS per business.

## Not decided

- **SMS provider and sender name.** These are Q-036 (provider) and Q-109 (sender name), also listed in client spec §13 and business spec §24. It blocks production SMS (M8).
- **No SMS gateway in the code.** Every environment, production included, writes SMS to the log (`apps/api/src/deps.ts`, `apps/api/src/ports/sms.ts`). Until a gateway exists, nobody can sign in on production, and real login codes would sit in the production log.
- **Push and the app channel.** *Programmada* and phone push come with the native apps (business spec §25.6), not before.
- **Browser notifications while the workspace is closed** (web push) aren't designed. *Brauzerde* means "while Ýeral Biznes is open".
- **A client inbox or bell** isn't designed. The client sees changes on the booking itself.
- **E-mail** isn't used anywhere.

> Open question Q-036: which SMS provider at launch.
