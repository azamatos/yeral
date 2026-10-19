# 2. Norms

The conventions every screen, message and number follows: languages, words, money, time, phones, places, copy and the
look. Each fact names its source in brackets. Where sources disagree or say nothing, the chapter points to an open
question.

## Languages

- **English is the build language.** Ýeral is designed, written and built in English first. It isn't a Turkmen-only
  product: it launches in Turkmenistan first and must work for any country. (owner, 18.10.2026; Q-101, Q-104,
  ADR 0022)
- **Each market adds its own languages** when Ýeral launches there: Turkmenistan gets Turkmen (*TK*) and Russian (*RU*)
  next to English (*EN*); a later country brings its own, for example Uzbek and Russian. (owner, 18.10.2026)
- **Every text goes through translations from day one,** so adding a language means translating, not rewriting.
  (AGENTS rule 4)
- **The client site carries the language in every link:** `/en/…` now; `/tk/…` and `/ru/…` when Turkmenistan
  launches. Public pages need it: a search engine indexes a language only at its own address, a shared link opens in
  the same language for everyone, and pages can be cached. Every public page tells search engines where its other
  languages are. Links in this book are written with `/tk/`, from the Turkmen design: read them as `/{language}/`.
  (client spec §3; Q-100; ADR 0016, ADR 0022)
- **Opening `/`** goes to the saved language; someone who hasn't chosen yet gets their phone's or browser's language
  if Ýeral has it, else the market's main language. (Q-132, decided 18.10.2026)
- **Each person has one language.** It's saved in their profile when they log in and follows them to every device.
  The switch is in the site header (icon and code) and the footer (full names), and in the business workspace in the
  person's menu as *Dil* (Language). (client spec §3, §8; business spec §1)
- **The business workspace and the CMS carry no language in their links.** They're behind a login, so each person
  sees their own language, and a link shared between staff opens in the reader's language. The business spec's
  `business.yeral.app/tk/giris` and `/tk/calendar` lose the `/tk`. (Q-100, decided 18.10.2026; ADR 0016)
- **SMS** go in the client's language. A client without a Ýeral account (a phone booking) gets the market's main
  language until they sign in and choose one: English for now, Turkmen when Turkmenistan launches. (Q-292, decided
  18.10.2026) The login code goes in the saved language, else the language of the page, else the market's main one. (client spec §6; code: apps/api/src/modules/jobs/run.ts,
  apps/api/src/modules/auth/routes.ts)
- **Category names, hints and specialist words** come from Ýeral's catalogue, in every language of the market.
  (ADR 0017; code:
  apps/api/src/db/seed/categories.ts)

> Open question Q-100: do business workspace links carry the language?

> Open question Q-131: how does Ýeral keep countries apart?

> Open question Q-132: which language does a new visitor see first?

### Who writes which text

- **English is the source text** from 18.10.2026, the design included: every board is redrawn in English in the
  design pass that follows the book, and Turkmen comes back as a translation. Design v0.5 is Turkmen; it showed how
  Turkmen looks with the font and stays the reference for the Turkmen translation. (Q-101; Q-133, decided 18.10.2026)
- **Claude writes the translations** into each market's languages; the owner checks all of them before the market
  launches. (Q-101, decided 18.10.2026)
- Russian runs about 30% longer: buttons fit their text and never have a fixed width; labels wrap to two lines before
  they're cut. (client spec §8)
- Plurals: Turkmen and English have one form; Russian has three (1 место, 2 места, 5 мест). (client spec §8)
- **Text a business writes** (description, service names) has a tab per language of its market. (business spec §8)
  Any one language is required; a missing language shows the one that was written. Some businesses write two copies,
  for example Russian and Turkmen. (Q-102, decided 18.10.2026; code: packages/domain/src/model.ts, `localized()`: the
  asked language, else the market's main one, else the one written)

> Open question Q-101: who checks the Russian and English text before launch?

> Open question Q-133: are the existing boards redrawn in English?

> Open question Q-102: which language must a business fill in?

## Words we use

The product's words. English is the source (ADR 0022); the Turkmen column is the Turkmenistan translation, as drawn in
design v0.5. A status means the same thing on every screen, in every app and in every SMS. (client spec §9, business
spec §12, ROUND6-ANSWERS)

| English | Turkmen | Notes |
|---|---|---|
| Ýeral | *Ýeral* | the product's name, chosen for its sound (Q-109) |
| business, place | *Biznes*, *ýer* | any business that sells its time |
| workspace | *Iş ýeri* | one business at one address; a second address is another workspace |
| specialist · any specialist | *Hünärmen* · *Islendik hünärmen* | *Hünärmen* is also the name of an access level |
| doctor, teacher, trainer, master | *Lukman*, *mugallym*, *tälimçi*, *ussa* | category words that replace *hünärmen* |
| stylist, barber, nail artist | *Stilist*, *dellek*, *dyrnak ussasy* | beauty role names |
| client · clients | *Müşderi* · *Müşderiler* | a business's client and its client list |
| booking · to book | *Ýazylyş* · *Ýazylmak* | the main button on a business page is *Ýazylmak* |
| send booking | *Ýazylyşy ugrat* | the client sends a request; it isn't booked yet |
| request | *Haýyş* | a booking waiting for the business's answer |
| free time | *Boş wagt* | a time the client can pick |
| service · services | *Hyzmat* · *Hyzmatlar* | |
| appointment · table · class · resource | *Wagt bellemek* · *Stol bronlamak* · *Topar sapagy* · *Ýer kärendesi* | the booking types; resource comes later |
| book a table · take a seat | *Stoly bronla* · *Ýer al* | main buttons of the table and class flows |
| party size · class session | *Adam sany* · *Sapak* | |
| hall, terrace, VIP room | *Zal*, *Terrasa*, *VIP otag* | seating areas |
| review · rate | *Teswir* · *Baha ber* | |
| Pending | *Garaşylýar* | status, clock icon |
| Confirmed | *Tassyklandy* | status, check icon |
| Completed | *Tamamlandy* | status, double check icon |
| Cancelled | *Ýatyryldy* | status, x icon |
| No-show | *Gelmedi* | status, person-with-x icon |
| you cancelled · the business cancelled · the business declined · no answer in time | *Siz ýatyrdyňyz* · *Biznes ýatyrdy* · *Biznes ret etdi* · *Wagtynda jogap gelmedi* | who cancelled; *ret etdi* when it was never confirmed |
| confirm · decline | *Tassykla* · *Ret et* | |
| move to another time · change the time | *Başga wagta geçir* · *Wagty üýtget* | the second is the title of the move flow |
| cancel booking · undo · book again | *Ýazylyşy ýatyr* · *Yzyna al* · *Gaýtadan ýazyl* | |
| report, complaint | *Arz et* | the business reports a no-show or a problem; also reporting a review |
| owner · admin · specialist | *Eýesi* · *Administrator* · *Hünärmen* | access levels (*Dereje*); a specialist may work without the app (*programmasyz*), an option, not a level (Q-216) |
| team · invite · permissions | *Topar* · *Çakylyk* · *Rugsatlar* | |
| internal status | *Içerki ýagdaý* | team only, never shown to clients |
| busy elsewhere | *Başga ýerde* | a person working in another workspace at that time |
| source: online · phone · walk-in | *Çeşme*: *Onlaýn* · *Telefon* · *Gelip ýazyldy* | |
| hours · break · special days · day off | *Iş wagty* · *Arakesme* · *Aýratyn günler* · *Dynç güni* | |
| buffer | *Hyzmatdan soňky arakesme* | free time after a service |
| booking rules · instant confirmation | *Ýazylyş düzgünleri* · *Derrew tassyklama* | |
| in review | *Barlagda* | a new business before the Ýeral team verifies it |
| calendar | *Senenama* | |
| pay at the place · free | *Töleg ýerinde* · *Mugt* | |
| near me · near you | *Ýakynymda* · *Golaýyňyzda* | never a city name |
| my bookings · favourites | *Ýazylyşlarym* · *Halanlarym* | |
| upcoming · past | *Gelýän* · *Geçen* | tabs in my bookings |
| revenue · average check · visit | *Girdeji* · *Ortaça çek* · *Gelşi* | business figures |
| regular · new · lapsed · reported | *Yzygiderli* · *Täze* · *Köpden bäri gelmedik* · *Arz edilen* | client segments |

The owner checks every translation before a market launches. (Q-101)

## Money

- **Money is in the market's currency.** Turkmenistan: manats, whole numbers only, written `40 TMT`. Large amounts
  group as the language does: `1 410 TMT` in Turkmen and Russian, `1,410 TMT` in English. (client spec §1, business
  spec §4; Q-104; code: packages/i18n/src/fmt.ts)
- **Four price types** on a service (client spec §2, ROUND6-ANSWERS B1; B-Services screen):
  - fixed: `80 TMT`;
  - from: `250 TMT-den` (Russian "от 250 TMT", English "from 250 TMT");
  - free: *Mugt*;
  - hidden (*Görkezme* in the business's settings): clients see *Baha ýerinde aýdylýar* (the price is told at the
    place) wherever a price would be: service rows, the booking flow, the summary and the booking detail.
- **Totals:** if any service is "from" or hidden, the total is "from" the priced sum (`60 TMT-den`). If every service is
  hidden, the total shows no amount, only *Baha ýerinde aýdylýar*. All free: *Mugt*. (ROUND6-ANSWERS B1; code:
  packages/domain/src/pricing.ts)
- **The business's own figures** (revenue, average check) stay: they're worked out from the prices of completed
  visits, so no billing is involved. They include the business's hidden prices; clients never see those amounts.
  (Q-134, decided 18.10.2026)
  (business spec §4; code: packages/domain/src/pricing.ts)
- **No average bill.** Restaurants show no expected amount: billing isn't Ýeral's job, booking a place is. A menu may
  come later (F-239). (Q-103, decided 18.10.2026) The design's *Ortaça hasap* `≈ 150 TMT` goes.
- **No online payment.** Every summary says *Töleg ýerinde* (pay at the place). Card deposits come later; summaries
  keep a hidden row for them. (client spec §1)
- **Ýeral is free for businesses.** No plans, commission or billing screens. The business landing says *Mugt* with no
  "for now" and no future prices. (owner 16.10.2026; business spec §19, §25)
- **Number formats follow the language:** a decimal comma in Turkmen and Russian (`4,9`), a point in English (`4.9`).
  (client spec §8; Q-104, decided 18.10.2026; code: packages/i18n/src/fmt.ts)

**Code differs:** a hidden price prints the average bill or nothing instead of *Baha ýerinde aýdylýar*, and the
average bill is still in the code (code: packages/i18n/src/fmt.ts).

> Open question Q-103: who sets a restaurant's average bill?

> Open question Q-104: which number format does English use?

> Open question Q-134: does the business app keep its money figures?

## Time and dates

- **Business-local time.** Every time is the business's own clock, whatever the phone or the server says. The time
  zone comes from the market; every business in Turkmenistan is in Asia/Ashgabat: UTC+5, no daylight saving. A 14:30 visit shows 14:30 everywhere. (AGENTS rule 5;
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
  until 24:00). End pickers go up to 24:00; start pickers stop at 23:30. (ROUND6-ANSWERS E1,
  business spec §26; code: packages/contract/src/common.ts)
- **Past midnight:** a business may be open past midnight (`18:00–02:00`), and a booking may cross midnight. Everything
  after midnight belongs to the day that started: a 01:00 booking at a bar open 18:00–02:00 on Friday is Friday's, shown
  under Friday as `01:00`. A day's part past midnight ends by the time the next day opens, so no moment belongs to two
  days. The screens aren't designed yet. (client spec §13; Q-105, decided 18.10.2026; the business-day model: Claude
  (delegated), 20.10.2026; code: packages/domain/src/hours.ts)

> Open question Q-105: can a business be open past midnight?

## Phones

- **Phone rules come from the market.** These are Turkmenistan's.
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

- **No city name written into the copy:** headings, titles, the footer and SMS stay relative to the person:
  *Ýakynymda* (near me), *Golaýyňyzda* (near you). (client spec §1, §8; design CLAUDE.md)
- **The city is data** (Q-107, decided 18.10.2026): the person's location preselects a city; they can pick another one
  (booking in a city they're moving to, or for relatives); a business address shows its city when it differs from the
  selected one. Not designed yet (F-240).
- **Location denied:** the city from the internet address may appear only inside the *Nirede?* (where?) field, with
  *Ýerleşiş ýapyk — şäher boýunça görkezilýär* (location is off, showing by city). Distances are hidden; lists sort by
  rating × number of reviews. (client spec §5) **Code differs:** the api has no city from the internet address since
  it left Cloudflare (ADR 0024); at the first launch visitors come through a VPN, so the field starts at the market's
  main city instead (chapter 10, P2 step 0).
- **Location unknown:** a banner *Ýakynyňyzdaky ýerleri görkezeliň* (let us show places near you) above
  *Meşhur ýerler* (popular places). (client spec §4.1)
- **Distances:** `1,2 km`; under 1 km in metres: `850 m`. (client spec §5) The code rounds to 10 m and shows whole
  kilometres from 10 km (`12 km`). (code: packages/i18n/src/fmt.ts) Whole kilometres drop the ",0": `3 km`; formats
  follow what the country's common platforms show. (Q-106, decided 18.10.2026)
- **Where distance shows:** cards `category · distance`; search rows `category · street · distance`; the business page
  shows the full address. (client spec §5)
- **Home-based businesses** hide the exact address until the booking is confirmed; the map shows an approximate circle.
  (client spec §2, business spec §7)
- **Entrance note:** *Girelge nirede?* (where is the entrance?) next to the address. (business spec §7)
- **Maps:** MapLibre with OpenFreeMap tiles. (owner 14.10.2026) *Ýol görkez* (directions) opens the phone's own
  choice (Apple Maps on iPhone, the app chooser on Android), Google Maps on a computer. (screens README; Q-108, decided
  18.10.2026)

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

- **Name:** *Ýeral*, chosen because it sounds good and is uncommon, not for its Turkmen meaning ("ýer al", take a
  place). (client spec §1; Q-109) The business product is *Ýeral Biznes*. (business spec §19)
- **SMS sender name:** "Yeral" in plain Latin. (Q-109, decided 18.10.2026)
- **Name and domain are working titles.** Every app reads them from one setting, so a rename is a configuration
  change. (owner 13.10.2026; AGENTS rule 6; code: packages/lib/src/site.ts, translation key `common.brand`) The launch name
  and domain are decided (Q-003). The name is written *Ýeral*; "Yeral" only where the letter can't be
  used, such as the domain and the SMS sender (Q-005).
- **Font:** Onest, weights 400–800, with every Turkmen letter (ä ç ž ň ö ş ü ý) and Cyrillic; served by Ýeral itself.
  (client spec §8, techContext)
- **Look:** design tokens v0.5 (v0.4 plus one selection ring). White base, thin dividers instead of boxes, one violet
  accent for selection, status and the main button, flat surfaces with shadows only on raised layers, Lucide icons.
  (design CLAUDE.md, tokens.css)
- **Reference product:** Fresha. Copy its logic, never its look. (client spec §1)

> Open question Q-109: what sender name do SMS show?
