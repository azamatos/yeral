# 2. Norms

The conventions every screen, message and number follows: languages, words, money, time, phones, places, copy and the
look. Each fact names its source in brackets. Where sources disagree or say nothing, the chapter points to an open
question.

## Languages

- **Three languages:** Turkmen (*TK*, the default), Russian (*RU*) and English (*EN*). (client spec §1, ADR 0016)
- **The client site carries the language in every link:** `/tk/…`, `/ru/…`, `/en/…`. Opening `/` goes to the saved
  language, else Turkmen. Every public page tells search engines where its other two languages are. (client spec §3,
  ADR 0016)
- **Each person has one language.** It's saved in their profile when they log in and follows them to every device.
  The switch is in the site header (icon and code) and the footer (full names), and in the business workspace in the
  person's menu as *Dil* (Language). (client spec §3, §8; business spec §1)
- **Business workspace links:** ADR 0016 says they carry no language and use the person's setting. The business spec
  draws them with one: `business.yeral.app/tk/giris`, `/tk/calendar`. (ADR 0016, business spec §1, §4)
- **SMS** go in the client's language. A client without a Ýeral account (a phone booking) gets Turkmen. The login code
  goes in the saved language, else the language of the page. (client spec §6; code: apps/api/src/modules/jobs/run.ts,
  apps/api/src/modules/auth/routes.ts)
- **Category names, hints and specialist words** come from Ýeral's catalogue, in all three languages. (ADR 0017; code:
  apps/api/src/db/seed/categories.ts)

> Open question Q-100: do business workspace links carry the language?

### Who writes which text

- The design is **Turkmen only**. The Turkmen text in the screens is the final draft and goes into the product word for
  word. (design CLAUDE.md, ROUND6-ANSWERS)
- **Russian and English are written in code** from the Turkmen. (owner, ROUND6-ANSWERS)
- The owner checks the Turkmen while screens are built. All Turkmen text needs a native review before public launch.
  (client spec §9, §13; Q-101)
- Nobody is named to check the Russian and English. (Q-101)
- Russian runs about 30% longer: buttons fit their text and never have a fixed width; labels wrap to two lines before
  they're cut. (client spec §8)
- Plurals: Turkmen and English have one form; Russian has three (1 место, 2 места, 5 мест). (client spec §8)
- **Text a business writes** (description, service names) has TK, RU and EN tabs. (business spec §8) The code requires
  the Turkmen text and shows it whenever another language is missing. (code: packages/domain/src/model.ts)

> Open question Q-101: who checks the Russian and English text before launch?

> Open question Q-102: which language must a business fill in?

## Words we use

Use these exact Turkmen words. A status means the same thing on every screen, in every app and in every SMS.
(client spec §9, business spec §12, ROUND6-ANSWERS)

| Turkmen | English | Notes |
|---|---|---|
| *Ýeral* | "ýer al", take a place | the product's name (working title) |
| *Biznes*, *ýer* | business, place | any business that sells its time |
| *Iş ýeri* | workspace | one business at one address; a second address is another workspace |
| *Hünärmen* · *Islendik hünärmen* | specialist · any specialist | *Hünärmen* is also the name of an access level |
| *Lukman*, *mugallym*, *tälimçi*, *ussa* | doctor, teacher, trainer, master | category words that replace *hünärmen* |
| *Stilist*, *dellek*, *dyrnak ussasy* | stylist, barber, nail artist | beauty role names |
| *Müşderi* · *Müşderiler* | client · clients | a business's client and its client list |
| *Ýazylyş* · *Ýazylmak* | booking · to book | the main button on a business page is *Ýazylmak* |
| *Ýazylyşy ugrat* | send booking | the client sends a request; it isn't booked yet |
| *Haýyş* | request | a booking waiting for the business's answer |
| *Boş wagt* | free time | a time the client can pick |
| *Hyzmat* · *Hyzmatlar* | service · services | |
| *Wagt bellemek* · *Stol bronlamak* · *Topar sapagy* · *Ýer kärendesi* | appointment · table · class · resource | the booking types; resource comes later |
| *Stoly bronla* · *Ýer al* | book a table · take a seat | main buttons of the table and class flows |
| *Adam sany* · *Sapak* | party size · class session | |
| *Zal*, *Terrasa*, *VIP otag* | hall, terrace, VIP room | seating areas |
| *Teswir* · *Baha ber* | review · rate | |
| *Garaşylýar* | Pending | status, clock icon |
| *Tassyklandy* | Confirmed | status, check icon |
| *Tamamlandy* | Completed | status, double check icon |
| *Ýatyryldy* | Cancelled | status, x icon |
| *Gelmedi* | No-show | status, person-with-x icon |
| *Siz ýatyrdyňyz* · *Biznes ýatyrdy* · *Biznes ret etdi* · *Wagtynda jogap gelmedi* | you cancelled · the business cancelled · the business declined · no answer in time | who cancelled; *ret etdi* when it was never confirmed |
| *Tassykla* · *Ret et* | confirm · decline | |
| *Başga wagta geçir* · *Wagty üýtget* | move to another time · change the time | the second is the title of the move flow |
| *Ýazylyşy ýatyr* · *Yzyna al* · *Gaýtadan ýazyl* | cancel booking · undo · book again | |
| *Arz et* | report, complaint | the business reports a no-show or a problem; also reporting a review |
| *Eýesi* · *Administrator* · *Hünärmen* · *Programmasyz hünärmen* | owner · admin · specialist · phone-only specialist | access levels (*Dereje*) |
| *Topar* · *Çakylyk* · *Rugsatlar* | team · invite · permissions | |
| *Içerki ýagdaý* | internal status | team only, never shown to clients |
| *Başga ýerde* | busy elsewhere | a person working in another workspace at that time |
| *Çeşme*: *Onlaýn* · *Telefon* · *Gelip ýazyldy* | source: online · phone · walk-in | |
| *Iş wagty* · *Arakesme* · *Aýratyn günler* · *Dynç güni* | hours · break · special days · day off | |
| *Hyzmatdan soňky arakesme* | buffer | free time after a service |
| *Ýazylyş düzgünleri* · *Derrew tassyklama* | booking rules · instant confirmation | |
| *Barlagda* | in review | a new business before the Ýeral team verifies it |
| *Senenama* | calendar | |
| *Töleg ýerinde* · *Mugt* | pay at the place · free | |
| *Ýakynymda* · *Golaýyňyzda* | near me · near you | never a city name |
| *Ýazylyşlarym* · *Halanlarym* | my bookings · favourites | |
| *Gelýän* · *Geçen* | upcoming · past | tabs in my bookings |
| *Girdeji* · *Ortaça çek* · *Gelşi* | revenue · average check · visit | business figures |
| *Yzygiderli* · *Täze* · *Köpden bäri gelmedik* · *Arz edilen* | regular · new · lapsed · reported | client segments |

All Turkmen copy still needs a native review before launch. (client spec §9)

## Money

- **Manats, whole numbers only,** written `40 TMT`. Large amounts group with a space: `1 410 TMT`. (client spec §1,
  business spec §4; code: packages/i18n/src/fmt.ts)
- **Four price types** on a service (client spec §2, ROUND6-ANSWERS B1; B-Services screen):
  - fixed: `80 TMT`;
  - from: `250 TMT-den` (Russian "от 250 TMT", English "from 250 TMT");
  - free: *Mugt*;
  - hidden (*Görkezme* in the business's settings): clients see *Baha ýerinde aýdylýar* (the price is told at the
    place) wherever a price would be: service rows, the booking flow, the summary and the booking detail.
- **Totals:** if any service is "from" or hidden, the total is "from" the priced sum (`60 TMT-den`). If every service is
  hidden, the total shows no amount, only *Baha ýerinde aýdylýar*. All free: *Mugt*. (ROUND6-ANSWERS B1; code:
  packages/domain/src/pricing.ts)
- **The business's own figures** (revenue, average check) include its hidden prices. Clients never see those amounts.
  (business spec §4; code: packages/domain/src/pricing.ts)
- **Restaurants show an average bill:** *Ortaça hasap* `≈ 150 TMT`. (client spec §2; Booking-Table screen) Real amounts
  for the demo restaurants are still missing. (Q-103)
- **No online payment.** Every summary says *Töleg ýerinde* (pay at the place). Card deposits come later; summaries
  keep a hidden row for them. (client spec §1)
- **Ýeral is free for businesses.** No plans, commission or billing screens. The business landing says *Mugt* with no
  "for now" and no future prices. (owner 16.10.2026; business spec §19, §25)
- **Decimals use a comma** in Turkmen and Russian: `4,9`. (client spec §8) The code writes English as `4.9` and
  `1,410`. (code: packages/i18n/src/fmt.ts)

**Code differs:** a hidden price prints the average bill or nothing instead of *Baha ýerinde aýdylýar*
(code: packages/i18n/src/fmt.ts).

> Open question Q-103: who sets a restaurant's average bill?

> Open question Q-104: which number format does English use?

## Time and dates

- **Business-local time.** Every time is the business's own clock, whatever the phone or the server says. All
  businesses are in Asia/Ashgabat: UTC+5, no daylight saving. A 14:30 visit shows 14:30 everywhere. (AGENTS rule 5;
  code: packages/domain/src/time.ts)
- The week starts on Monday.

| What | Example | Rule (source) |
|---|---|---|
| Full date | *Penşenbe, 15 oktýabr* | weekday with a capital, month in lower case (client spec §8) |
| Short date | *15 okt.* | (client spec §8) |
| Near dates | *Şu gün*, *Ertir*, then the weekday within the week, then the date | (client spec §8; code: packages/i18n/src/fmt.ts) |
| Short weekdays | Du Si Ça Pe An Şe Ýe | Monday first (client spec §8) |
| Month heading | *Oktýabr 2026* | (code: packages/i18n/src/fmt.ts) |
| Time | `14:30` | 24-hour clock (client spec §8) |
| Time range | `14:30–15:30` | dash, no spaces (screens) |
| Date and time together | *Ertir · Penşenbe, 15 oktýabr · 14:30* | parts joined with " · " (demo data) |
| Duration up to an hour | `45 min`, `60 min` | (client spec §2; code: packages/i18n/src/fmt.ts) |
| Longer duration | `1 sag 30 min`, `2 sag` | (client spec §2) |
| Settings and sentences | *1 sagat*, *2 sagat öňünden*, *24 sagat* | the full word *sagat* (B-Settings screen) |
| In the past | *Düýn*, *2 gün öň*, *1 hepde öň* | drawn on reviews (demo data) |
| "Until" | *20:00-a çenli*, *21:00-e*, *20:00-ä* | the ending follows the vowel of the number (business spec §22) |

- **The 24:00 rule.** A day may end at 24:00. Clients then see `09:00–24:00` and *Häzir açyk · 24:00-a çenli* (open now,
  until 24:00). End pickers go up to 24:00; start pickers stop at 23:30. A visit must end by 24:00. (ROUND6-ANSWERS E1,
  business spec §26; code: packages/contract/src/common.ts)
- **Past midnight** (a bar open until 02:00) isn't designed. (client spec §13, Q-105)

> Open question Q-105: can a business be open past midnight?

## Phones

- **Turkmen numbers:** +993 and 8 digits. The phone field has a fixed +993 in front and also accepts the local form
  `8 65 …`. (client spec §4.4; code: packages/domain/src/phone.ts)
- **Mobile numbers start with 6 or 7** (61–65 and 71 today). Only they can receive a login code. (ROUND6-ANSWERS C1;
  code: packages/domain/src/phone.ts)
  - A landline gets: *Kod diňe mobil belgä iberilýär. +993 6… ýa-da 7… bilen başlaýan belgi ýazyň.* (the code goes only
    to mobile numbers);
  - a short number gets: *Belgi doly däl: 8 san bolmaly.* (the number isn't complete: 8 digits).
- **Shown as** `+993 65 12 34 56`. (client spec §8; code: packages/domain/src/phone.ts)
- **Masked** as `+993 65 •• •• 22` on the SMS link page, where the client can't edit it: the code goes only to the
  booking's own phone. (ROUND6-ANSWERS A1)
- A business's contact phone may be a landline (`+993 12 45 67 89`). (demo data)
- **Who sees a client's phone:** the owner and the admin see every client's; a specialist sees the phones of their own
  clients. (business spec §1; access matrix in the business demo data)
- *Jaň et* (call) opens the phone's dialer. (screens README)

## Places and distance

- **No city name in any text:** not in headings, titles, the footer or SMS. Everything is relative to the person:
  *Ýakynymda* (near me), *Golaýyňyzda* (near you). (client spec §1, §8; design CLAUDE.md)
- **Location denied:** the city from the internet address may appear only inside the *Nirede?* (where?) field, with
  *Ýerleşiş ýapyk — şäher boýunça görkezilýär* (location is off, showing by city). Distances are hidden; lists sort by
  rating × number of reviews. (client spec §5)
- **Location unknown:** a banner *Ýakynyňyzdaky ýerleri görkezeliň* (let us show places near you) above
  *Meşhur ýerler* (popular places). (client spec §4.1)
- **Distances:** `1,2 km`; under 1 km in metres: `850 m`. (client spec §5) The code rounds to 10 m and shows whole
  kilometres from 10 km (`12 km`). (code: packages/i18n/src/fmt.ts)
- **Where distance shows:** cards `category · distance`; search rows `category · street · distance`; the business page
  shows the full address. (client spec §5)
- **Home-based businesses** hide the exact address until the booking is confirmed; the map shows an approximate circle.
  (client spec §2, business spec §7)
- **Entrance note:** *Girelge nirede?* (where is the entrance?) next to the address. (business spec §7)
- **Maps:** MapLibre with OpenFreeMap tiles. (owner 14.10.2026) *Ýol görkez* (directions) opens a map link.
  (screens README)

> Open question Q-106: whole kilometres: `3,0 km` or `3 km`?

> Open question Q-107: does a business address show the city?

> Open question Q-108: which map app does *Ýol görkez* open?

## Copy and tone

What the texts say:

- **"Sent", never "booked",** until the business confirms. The first state is *Garaşylýar* and the screen says
  *Ýazylyş ugradyldy* (booking sent). At an instant business it says *Ýazylyş tassyklandy* (booking confirmed).
  (client spec §1, design CLAUDE.md)
- **Five statuses, one meaning everywhere.** A status badge is always an icon and a label, never a coloured dot.
  (client spec §1, business spec §3, ROUND6-ANSWERS)
- **Cancelled by the client and by the business share one colour;** the icon and the label tell them apart.
  (client spec §1) The labels are in the table above. (ROUND6-ANSWERS A2)
- **A phone booking is Confirmed with a phone icon,** a walk-in with a person icon; neither is a separate status.
  (client spec §1, business spec §3)
- **No blame.** A client the business limited to phone bookings sees a calm card: *Bu biznese telefon arkaly ýazylyp
  bilersiňiz* (you can book this business by phone), *Biznes siziň bilen ýazylyşlary jaň arkaly ylalaşmagy haýyş etdi*
  (the business asked to arrange bookings with you by phone) and *Jaň et*. (ROUND6-ANSWERS A7)
- **A business still in review** shows visitors a friendly page: *Bu sahypa entek açylmady* (this page isn't open yet),
  *Biznes Ýeral-a täze goşuldy we barlagdan geçýär. Adatça 24 sagat çekýär.* (ROUND6-ANSWERS F1)
- **Errors say what to do next:** *Bu wagt ýaňy alyndy. Golaý boş wagtlar:* (this time was just taken; nearby free
  times) (client spec §11); *Kod nädogry. Ýene N synanyşyk galdy.* (wrong code, N tries left) (client spec §4.4);
  *Yzyna alyp bolmady — {sebäbi}.* with *Başga wagt saýla* (couldn't undo, pick another time) (ROUND6-ANSWERS A6).
- **Free means free:** the business landing says *Mugt* without "for now". (business spec §19)
- **People's names in reviews:** first name and the initial of the last, *Aýjemal G.* (screens README) A review under
  moderation carries *Ýeral barlaýar · ortaça baha hasaplanmaýar* (Ýeral is checking; not in the average).
  (ROUND6-ANSWERS F2) A business reply warns *Jogabyňyz hemmä görüner* (everyone will see your reply).
  (business spec §15)
- **Reports:** at most one plain-language insight sentence per section. (business spec §14)

How the screens behave:

- **One gradient main button per view.** The search button in the header is ink, not gradient. (client spec §1, §11)
- **What a person can't use is hidden, not greyed out.** (business spec §1)
- **The solid red button** is only for the final confirm of something destructive. (design CLAUDE.md)
- **No emoji, no new colours.** Status colours are for statuses only; charts use shades of the accent; a change in a
  report always shows an arrow and a sign, not colour alone. (design CLAUDE.md, business spec §14, §22)
- **No text typed into code.** Every visible word, screen-reader labels included, comes from the translations.
  (AGENTS rule 4)

**Code differs:** the "phone only" error says *Bu ýere diňe jaň edip ýazylyp bilersiňiz.* instead of the decided card
text (code: packages/i18n/src/messages/tk.json).

## Brand and look

- **Name:** *Ýeral*, from "ýer al" (take a place). (client spec §1) The business product is *Ýeral Biznes*.
  (business spec §19)
- **Name and domain are working titles.** Every app reads them from one setting, so a rename is a configuration
  change. (owner 13.10.2026; AGENTS rule 6; code: packages/lib/src/site.ts, translation key `common.brand`) The final
  name and domain are open question Q-003 in chapter 1.
- **Font:** Onest, weights 400–800, with every Turkmen letter (ä ç ž ň ö ş ü ý) and Cyrillic; served by Ýeral itself.
  (client spec §8, techContext)
- **Look:** design tokens v0.5 (v0.4 plus one selection ring). White base, thin dividers instead of boxes, one violet
  accent for selection, status and the main button, flat surfaces with shadows only on raised layers, Lucide icons.
  (design CLAUDE.md, tokens.css)
- **Reference product:** Fresha. Copy its logic, never its look. (client spec §1)

**Code differs:** the SMS texts write "Ýeral" into each template instead of using the configurable brand name
(code: packages/i18n/src/messages/tk.json, ru.json, en.json).

> Open question Q-109: what sender name do SMS show?
