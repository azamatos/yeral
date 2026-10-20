# English choices: DS · Foundations, DS · Components, DS · Categories & booking types (design pass v0.6, round 1, 19.10.2026)

Format: Turkmen (as drawn) → English · where · why, when it isn't obvious. Wordings already in EN-GLOSSARY §1–3 are not repeated. Each board ends with the components I added, renamed or removed.

Exceptions to "no Turkmen on screen", kept on purpose:
- Glyph specimens on Foundations ("Ýý", "Ää Çç Žž Ňň / Öö Şş Üü Ýý", "Жж Щщ Ыы Ёё", the letter list in the font paragraph, the glyph line on the three font cards). They are letters, not copy. They show that Onest covers the market's alphabets.
- Language names in the language switcher on Components ("Türkmençe", "Русский"). Each language is named in its own language.
- Personal and business names: Aýjemal G., Aýna, Aýdym Ş., Gülälek N., Begenç, Aýdyň ýoga, Ojak, Barber Loft, Myrat, Serdar, Merdan K., Tymur A.

## Main.dc.html · DS · Foundations

Wordings
- Magtymguly şaýoly 12 · 1,2 km → 12 Magtymguly Avenue · 1.2 km · text roles, secondary · street names stay; British address order
- Ählisini gör → See all · text roles, link · from CLIENT-SPEC §9
- Ýeriňi al → Take your place · type scale, display · the brand's meaning ("ýer al")
- Golaýyňyzdaky ýerler → Places near you · h1 sample
- Meşhur ýerler → Popular places · h2 sample
- Barber Loft · Köpetdag → Barber Loft · Barbershop · h3 sample · district name removed (no place names in copy)
- Boş wagtlary görüň we bir minutda ýazylyň. → See free times and book in a minute. · body-l sample
- Biznes tassyklandan soň size SMS geler. → You’ll get an SMS when the business confirms. · body sample
- Erkek saç kesimi · 60 min → Men’s haircut · 1 h · dense sample · duration written the English way
- Şu gün boş → Free today · label sample
- Şu gün boş wagtlar — golaýyňyzda → Free times today — near you · the three font cards
- Ýazylyş tassyklandy (on the glyph line) → Booking confirmed · font cards
- TK and RU sample lines → descriptions: "Turkmen — added for Turkmenistan. Onest draws every letter above." / "Russian — added for Turkmenistan. Full Cyrillic; plurals need three forms." · language rows (EN line first) · no Turkmen or Russian copy on the board
- "Plan for ~30% longer strings: “Ýazylmak” (TK) · “Записаться” (RU) · “Book” (EN)" → "Plan for longer strings: a 4-letter English button like “Book” runs 8–10 letters in Turkmen or Russian." · type caption
- Status meaning "By client or business — icon tells which" → "Who cancelled is written under the badge" · status table · D4: one icon per status; who cancelled moves to a sub-line
- "Needs attention — business must confirm" → "Needs attention — the business must confirm" · status table
- Onest — Turkmen Latin and Cyrillic in one family → Onest — Latin, Turkmen and Cyrillic in one family · type h2
- British spelling: Color → Colour (section label), "Even color in TK, RU and EN" → "Even colour in EN, TK and RU", centered → centred (×2), catalog → catalogue
- Header meta: Web DS v0.3 · 13.10.2026 → Web DS v0.6 · 19.10.2026; `<title>` → "Ýeral Web — design system v0.6 · Foundations"

Voice section wordings (new, chosen by me)
- h2 "Say what happened, then what to do next"; rule titles: "“Sent” until the business confirms" · "Errors say what to do next" · "No blame" · "Quiet by default" · "Four ways to show a price" · "Ýeral, with the Ý" · "English first"
- Rule captions: "Say “Booking sent”, never “booked”, until the business confirms. With instant confirmation: “Booking confirmed”." · "Name what happened in plain words and put the way forward right under it." · "Offer what still works. Never tell people what they did wrong."
- Toast action "View". Don't examples: "You’re booked!" · "Booking failed. Please try again later." · "You can’t book online because you missed 2 bookings."
- Surface rows: "No emoji" · "No new colours — tokens only" · "One gradient main button per view" · "Can’t use it? Hidden, not greyed out"
- Price rows: Fixed / From / No charge / Hidden → 80 TMT / from 250 TMT / Free / Price at the place, then "No average bill anywhere."
- Brand rows: Logos and copy → Ýeral · Business product → Ýeral Business · Domain → yeral.app · SMS sender → Yeral, then "Only the domain and the SMS sender drop the Ý."
- Language rows: Default → English · Turkmenistan → EN · TK · RU · One language → No switcher, then "Each market adds its own languages. British spelling, sentence case."
- Format strip "Write it the English way": 1,410 TMT · from 250 TMT · 4.9 · 1.2 km · 850 m · Thursday, 15 October · Today · Tomorrow · 14:30–15:30 · 45 min · 1 h 30 min · 3 hours ago, then "Digits for numbers, 24-hour time. Never a city name — “near me”, “near you”."

Added / renamed / removed
- ADDED the **Voice** section, between Type and Layout. It has 3 do / don't pairs (sent vs booked toast; slot taken + free times nearby; phone-only + Call), then 4 rule columns in the header's principle-grid style (surface, prices, brand, languages), then a format strip. Do / Don't labels use the existing completed-ink #066a41 and danger-ink #a3251b with check / x icons. Example areas use group grey #f4f4f6. No new colours.
- CHANGED the status badges in the status table: the 6 px dot became the D4 icon (clock, check, check-check, x, user-x), with padding 0 10px 0 8px.
- RENAMED status table columns: "Badge · TK" → "Badge", and "RU · EN" (translations) → "Icon · Lucide" (icon names). The Turkmen and Russian status names are removed from this board; the v0.5 export stays the translation reference.
- CHANGED the frame from 1440 × 3260 to 1440 × 5400 (root min-height and $preview). This is an estimate, not a render. Before my edits the content was already about 4,330 tall. The Voice section adds about 1,000.

## DS-Components.dc.html · DS · Components

Wordings
- Kartada görkez → Show on map · secondary button
- Soňrak → Later · ghost button
- Halanlarym → Favourites · tint toggle button
- Ýazyl (S states) → Book · button states
- Ýatyr (secondary S states) → Cancel · button states
- Paýlaş / Ýüklenýär → Share / Loading · aria-labels
- Adyňyz (placeholder) → Your name · input states
- Telefon → Phone · field label
- Etrap select (Köpetdag, Berkararlyk, Bagtyýarlyk, Büzmeýin) → "Specialist" select (Any specialist, Myrat, Serdar, Begenç) · input states · the district names were place names; the new options use names already on the board
- Näme? / Nirede? / Haçan? → What? / Where? / When? · hero search
- Hyzmat, ýer ýa-da hünärmen → Service, place or specialist · hero search placeholder
- Islendik wagt → Any time · hero search placeholder
- Gözle → Search · search button and aria-labels
- Diş lukmany · Ýakynymda · Ertir → Dentist · Near me · Tomorrow · compact search; Üýtget → Change
- Adyňyz / Familiýaňyz / Hökman däl → First name / Last name / Optional · form layout
- Biznese goşmaça maglumat → Anything the business should know · note placeholder
- Chips: Şu gün boş / Golaýda / Reýting 4,5+ / Diňe aýallar üçin / Bahasy / Süzgüçler · 2 → Free today / Nearby / Rating 4.5+ / Women only / Price / Filters · 2
- Tabs: Hyzmatlar / Hünärmenler / Teswirler / Barada → Services / Specialists / Reviews / About
- Segmented: Gün / Hepde / Aý → Day / Week / Month
- Ýatlatma iber → Send a reminder; Onlaýn ýazylyş açyk → Online booking on · checkbox and switch
- Telefon arkaly → By phone · aria-label on the phone icon
- Hyzmat ýa-da ýer gözle → Search services or places · top nav
- Biznes üçin → For business; Giriş → Log in; Dil: Türkmençe / TK → Language: English / EN · top nav
- Dellekhana · Köpetdag → Barbershop · sidebar workspace caption · district removed
- Hyzmatlar / Topar → Services / Team · sidebar
- Language switcher sub-labels "TK · esasy" / RU / EN → EN / TK / RU · "default" dropped, since the board doesn't set the first-visit rule
- Baş sahypa / Dellekhanalar → Home / Barbershops · breadcrumbs
- Öňki / Indiki (aý) → Previous / Next (month) · pagination and date picker
- Ýene görkez → Show more · pagination caption; Menýu → Menu
- Çarşenbe, 14 oktýabr → Wednesday, 14 October · table toolbar
- Müşderi ýa-da telefon → Client or phone; Eksport → Export · table toolbar
- Ählisini saýla / Saýla → Select all / Select; Hereketler → Actions · table aria-labels
- Ýagdaý → Status · table column
- Saç reňklemek · 120 min → Hair colouring · 2 h; Sakgal düzediş → Beard trim; Çaga saç kesimi → Kids’ haircut · table rows
- 3-nji gelşi → 3rd visit · table row
- 2 saýlandy → 2 selected; Ýatyr (bulk) → Cancel bookings; Saýlawy aýyr → Clear selection · bulk bar · plural, because 2 rows are selected
- Ýazylyşy ýatyrmalymy? → Cancel this booking? · modal title
- Biznese derrew habar bereris. → We’ll let the business know straight away. · modal body
- Hawa, ýatyr → Cancel booking · modal confirm · the final button repeats the action (house rule) instead of "Yes, cancel"
- Ýazylyş ugradyldy — tassyklanyşyna garaşyň → Booking sent — waiting for the business to confirm · toast; Görkez → View
- Toast caption rewritten with the owner's rule ("Booking sent", never "booked"; instant: "Booking confirmed")
- Oktýabr 2026 → October 2026; Du Si Ça Pe An Şe Ýe → Mo Tu We Th Fr Sa Su; Irden / Günortan / Agşam → Morning / Afternoon / Evening; day title "Thursday, 15 October" · date picker
- Entek ýazylyşyňyz ýok → No bookings yet · empty state
- Ýakyndaky ýerleri açyň — boş wagtlar şu ýerde görüner. → Book a free time near you — it will show up here. · empty state
- Gözlege geç → Find a place · empty-state button
- Intro "Copy is Turkmen, the default language." → "Copy is English, the first language; each market adds its own."
- Language caption: "TK is the default on first visit…" → "English first, then the market’s languages (Turkmenistan: EN · TK · RU); each language is named in itself. The choice is remembered. Hidden when a market has one language."
- British spelling: catalog → catalogue, bottom-center → bottom-centre

Added / renamed / removed
- CHANGED StatusBadge: the dot became the D4 icon on all 5 badges and on the 5 table rows. `.badge` padding is now 0 10px 0 8px. `.badge svg{flex:none}` was added and `.dot` was removed.
- CHANGED who cancelled: the two Cancelled badges that carried a person or building icon instead of the x became the Cancelled badge (x) plus a sub-line `.by` (12/16 n-600, 13 px icon; the pattern from DS-Patterns v0.5), using the owner's words: You cancelled (user) · The business cancelled (building) · The business declined (building) · No answer in time (hourglass). The last two are ADDED. A line break puts the group on its own row, and the caption reads "who cancelled — one line under the badge, never a new icon".
- CHANGED the language switcher: English is first (EN · TK · RU) and selected by default (state `lang: 'en'`). It is still interactive.
- No average-bill pill or row existed on this board.
- CODE: `renderVals()` returns explicit keys (`chips: chips`, …) so the checker's hole test passes. Behaviour is the same.
- CHANGED the frame from 1440 × 3900 to 1440 × 5280 (root min-height and $preview). This is an estimate, not a render. Before my edits the content was already about 5,150 tall. The who-cancelled row adds about 60.

## DS-Booking.dc.html · DS · Categories & booking types

Wordings
- Wagt bellemek / Stol bronlamak / Topar sapagy / Ýer kärendesi → Book a time / Book a table / Book a class / Book a space · booking-type titles
- Steps: Hyzmat → Service · Hünärmen ýa-da islendik → Specialist or any specialist · Sene we wagt → Date and time · Tassyklama → Confirmation (CLIENT-SPEC §9) · Adam sany → Party size · Ýer (zal, terrasa) → Area (hall, terrace) · Sapak → Class · Sene → Date · Ýer sany → Number of spots · Obýekt → Space · Wagt aralygy → Time range
- "seats left" → "spots left" · Class column · matches the "N spots left" glossary wording
- Dellekhana / Restoran / Ýoga studiýa → Barbershop / Restaurant / Yoga studio · card captions
- Bu agşam · 2 adam → Tonight · 2 people · table card
- Indiki sapak → Next class; Hatha ýoga · Ertir 08:00 · 60 min → Hatha yoga · Tomorrow 08:00 · 1 h; 3 ýer galdy → 3 spots left; Bir sapak → One class · class card
- Ortaça hasap · ≈ [AVG BILL] TMT → Menu · Price at the place · table card · the average bill is removed and the hidden-price wording is used, so the card keeps its price row
- Image alts: Barber Loft içi / Ojak restoranynyň zaly / Ýoga sapagy → Inside Barber Loft / The hall at Ojak / A yoga class
- Category hints: Haircut, colouring, cosmetologist · Men’s haircut, beard trim · Manicure, pedicure, gel polish · Massage, facial, hammam · Check-up, cleaning, filling · Physiotherapy, psychologist, dietitian · Table, banquet, birthday · Table, terrace · Personal trainer, group training (reordered: appointment service first) · Tutor, language course, music lesson · Car wash, tyre change, diagnostics · Grooming, vet · Cleaning, plumber — at the client’s address
- “ýer al”, take a place → from the Turkmen for “take a place” · intro · keeps the brand's meaning without Turkmen copy
- “Hünärmen” by default → “Specialist” by default; Lukman / mugallym / tälimçi / ussa → Doctor / tutor / trainer / mechanic · "Who" note
- "Pay at the place, for now" → "Pay at the place" · "Money" note · no future promises
- Money caption → "Prices are fixed (80 TMT), from (from 250 TMT), Free or hidden (Price at the place). No average bill. The booking summary keeps a hidden row for card deposits."
- "Every type uses the five statuses and manual confirmation… classes plus personal training" → "…and the same confirmation — by hand or instant. A gym can mix types: personal training first, classes later."
- Categories h2 "Launch set, in three languages" → "Launch set — appointments first"
- CMS caption: "three names" → "a name in each market language"; added "Later = after the first release: restaurants and cafés open then; gyms and schools start with appointments."; catalog → catalogue
- Intro adds "— appointments ship first"; header label v0.3 → v0.6

Added / renamed / removed
- ADDED the Later pill as class `.later` (n-100 #f0f0f3 fill, n-600 #5a5a64 text, 11/14 600 caps +.07em, 20 high, pill radius; never violet, never a status colour). It replaces `.tag-n`, which used the cancelled-status ink #41505f. It appears on 02 Table, 03 Class, 04 Resource, the Table and Class cards, and the Restaurant, Café & tea house, Fitness (on Class) and Lessons (on Class) rows, and inline in the CMS caption.
- ADDED a "Ships …" caption in each booking-type column: in the first release (Appointment) · after the first release (Table, Class) · later; not drawn yet (Resource).
- REMOVED the average bill: the table card row and both "average bill" mentions in the captions.
- REMOVED the TK and RU columns from the category table. The grid went from `52px 1.1fr 1fr 1fr 190px 1.6fr` to `52px 1.2fr 200px 2.4fr`, with headers Category · Booking type · Suggested services. The v0.5 export keeps the Turkmen and Russian names as the translation reference.
- CHANGED `.tag` to `justify-self:start`, so single type tags hug their text instead of stretching across the grid column. Multi-type rows use a new `.types` flex wrapper. The Fitness tags were reordered to Appt. first.
- CHANGED the frame from 1440 × 2500 to 1440 × 2960 (root min-height and $preview). This is an estimate, not a render. Before my edits the content was already about 2,830 tall. The "Ships" lines and the longer intro add about 60.
