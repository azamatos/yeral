# English choices: B-Onboarding (round-3 fixes) and B-Settings (redrawn in English) · design pass v0.6, round 3 (20.10.2026)

Files:
- `screens/business/B-Onboarding.dc.html`: page, 1440 × 1100, interactive. Built by (design source) from `onb_markup.html` and `onb_script.js`. The build now reads the round-6 source from (design source) by itself, so it can be run again safely.
- `screens/business/B-Settings.dc.html`: page, 1440 × 2320 for the default Business profile pane, interactive. Built by (design source) from:
  - `content.css`: frozen from the round-6 Turkmen board;
  - `shell.css`: frozen from B-Calendar round 3;
  - `extra.css` and `media.css`;
  - `markup.html` and `script.js`.

Backups are in (design source). Tests: (design source) and (design source).

Not repeated here: wordings from EN-GLOSSARY, round-2/3 briefs (business/README.md §27–28), `en-choices-business.md`, `en-choices-r2-*.md`, `en-choices-r3-login-shell.md`, `en-choices-r3-calendar.md`, DS-Business section 05 and DS-Patterns.

Format: wording · where · why, when it isn't obvious.

## B-Onboarding · what changed
- **Sign-in:** the first-release copy is the default.
  - The new tweak **`sms`** (off by default) replaces `codeOnScreen`.
  - Resend reads "Get a new code in 0:59" → "Get a new code"; the lock-over button is "Get a new code".
  - After a resend: "Here's a new code." With the `sms` tweak on: "New code sent." Same as B-Login.
  - The rate limit is 5 codes for one number. "Too many codes. Try again in 42 minutes." shows on both the phone step and the code step.
  - A rate-limited code step works like the lock: the boxes are disabled, and Confirm, resend and the on-screen code are hidden.
- **Removed:** the EN · TK · RU switcher from the left panel.
- **The `overnight` tweak is now off · on · error.**
  - on: Friday 10:00–02:00.
  - error: Monday 10:00–09:30, with "Same hours Monday to Friday" off. Monday shows the "until 09:30, next day" pill and the error.
- **New hours rule:** a day that closes after midnight must close before the next open day opens. Closing exactly when the next day opens is allowed.
  - Error: "Closes after {Tuesday} opens. Pick an earlier time."
  - The check wraps from Sunday to Monday and skips a closed next day.
  - Added to the hours caption: "The part after midnight must end before the next day opens."
- **Durations:**
  - The hold option and the service duration show "60 min".
  - The free-cancel list keeps "Up to 1 h before", as the brief lists it.
- **Done step:** the label "Your page link" becomes "Link and QR".
- **City:**
  - The address step gets a **City** select before the address: Ashgabat · Arkadag · Balkanabat · Dashoguz · Mary · Turkmenabat.
  - Suggestion captions end with the city ("Building · next to the shopping centre · Ashgabat").
  - The step summary and the done card show "247 Bitarap Türkmenistan Avenue, Ashgabat". When working from home, the card shows "Beauty salon · Ashgabat · approximate area shown".
- **Step 1, signed out:** the line "Want to look around first? **Try the business app** — a demo workspace, no sign-in needed." links to B-Calendar.dc.html, where the demo workspace is the `banner` = demo state. It sits next to "Already have an account? Log in".
- **Team step:** "You can change what each access level may do later in Settings → Permissions." becomes "Access levels are fixed at the first release. See what each one can do in Settings → Permissions."
- **Phone bar:** the "3 / 8 · Address" label may wrap to two lines instead of being cut, which matters with long text.

## B-Settings · wordings I chose
**Frame**
- Page title: "Settings · Glow Studio". h1: "Settings".
- The round-3 shell, as on B-Calendar: Settings is current in the sidebar and in the More sheet, and More is current on the tab bar (aria "More · Settings is here").
- Settings nav (aria "Settings sections"): Business profile · Booking rules · Hours · Services · Team · Permissions · Link and QR.
  - Services links to B-Services. Team and Permissions both link to B-Team.
  - The URL is `…/w/glow-studio/settings/{profile · rules · hours · link}`.
- Save bar: "Save your changes?" Discard · Save (aria "Unsaved changes").

**Business profile**
- Lead: "This is how clients see you in search and on your page."
- Link: "View your page" (goes to Venue).
- Not-approved box on top:
  - title "Your page wasn't approved", followed by the reason;
  - "Fix it on this page, then send your page again. Until then only you and your team can see it.";
  - buttons "Send again" and "Go to photos";
  - toast "Sent again — your page is in review".
- Section titles: "Main details" · "About" · "Photos" · "Contact and amenities" · "Address". The last section is "Pause or close" for the owner and "Online booking" for an admin.
- Logo: "Shows in search and on your page. A square picture, at least 400 × 400 px." Button: "Change logo".
- "Business name", with "Clients see this name in search and when they book." and the error "Enter the business name."
- "Category", with "Helps clients find you in search." The categories are the wizard's appointment list.
- About:
  - "What you do and why clients should come to you — 2–3 sentences are enough."
  - Placeholder: "Write a few words about your business".
  - Caption: "Clients read this in "About" on your page." The counter reads "103 / 600".
- About when the `languages` tweak is "several":
  - "Main language" (select: English · Türkmençe · Русский), with "Missing texts show in the main language.";
  - EN · TK · RU tabs, with a dot when the text is empty (tab aria "English, main language" or "Русский, empty");
  - on an empty tab: "Empty — clients who use Русский see the English text."; on a filled one: "Clients who use Türkmençe see this text.";
  - placeholder "Write the Русский text here".
- Photos:
  - Counter "5 of 20".
  - "The first photo is your cover: it shows in search and at the top of your page. Drag to change the order."
  - Rule caption: "Up to 20 photos, 10 MB each · JPG, PNG or WebP".
  - States:
    - "Uploading…" with a meter;
    - too big: the tile says "Too big · 14 MB", with the error "salon-hall.jpg is 14 MB. Photos can be up to 10 MB.";
    - wrong type: the tile says "Not a photo", with the error "price-list.pdf isn't a photo. Use JPG, PNG or WebP.";
    - the dismiss aria is "Dismiss salon-hall.jpg".
  - "Cover photo", "Make cover", "Add photo" and the under-3 caption come from DS-Patterns.
- "Phone for clients", with "The Call button on your page rings this number." Error: "The number is incomplete — it needs 8 digits."
- "Amenities", with "Ticked ones show in "About" on your page.": Wi-Fi · Air conditioning · Parking · Card payment at the place · Kids' corner · Free tea.
- Address:
  - Caption: "Clients see it on the map and in their booking."
  - Fields: "City", "Street and building" (error "Enter the street and building number."), and from the wizard "Floor, room" and "Where is the entrance?".
  - Map captions: "Drag the pin onto your entrance — clients follow it to your door". From home: "Clients see only this area until their booking is confirmed — you can drag the circle".
  - Notes: "Moved? …" as in the brief, and "Another address at the same time is a new workspace: Create a business".
- Pause:
  - "Pause online booking", with the brief's caption.
  - When on: "Online booking is paused. Your page stays open and clients can call you; you can still add bookings in the calendar."
- Close (owner): "Close this workspace", with "To close this workspace, contact Ýeral." and a "Contact Ýeral" button. The menu offers Call [SUPPORT PHONE] and Write on Telegram [TELEGRAM]; on phones it is a bottom sheet.

**Booking rules**
- Lead: "Choose when and how clients can book you online. The rules apply to every specialist."
- When paused: "Online booking is paused — clients see a Call card. Resume it in Business profile."
- Confirmation:
  - "How online bookings arrive", with "Bookings you add yourself (by phone or walk-in) are always confirmed at once." The cards come from DS-Business.
  - Note after changing the mode: the brief's sentence.
- "Hold requests for": "If no one answers in this time, the request is cancelled and the client is offered 3 other times. The time counts only while you're open." Options: 15 min · 30 min · 60 min · 2 h · 6 h · 24 h.
- "Who answers requests?" comes from DS-Business. Caption: "… Requests for specialists who don't use the app always go to the owner and admins."
- "When clients can book":
  - "Minimum notice": "Clients can't book a time closer than this, so you have time to get ready." Options: No limit · 30 min · 60 min · 2 h · 4 h · 24 h.
  - "How far ahead clients can book": "Your calendar opens this many days ahead." Options: 7 · 14 · 30 · 60 · 90 days.
  - "Buffer": "Free time kept after each service to get ready for the next client. Clients don't see it, but can't book into it. You can set it per service." Then "Set per service: Hair colouring — 15 min · Services". Options run None … 30 min, then "Other…", which opens a minutes field (aria "Buffer, minutes") with the error "Enter 1 to 120 minutes."
  - "Time step": "Clients see free times like this: 10:00, 10:15, 10:30…"
- "Cancelling, lateness and no-shows":
  - "Clients can cancel for free", as in the wizard.
  - "Ask clients for a reason when they cancel": "The reason is optional for the client. You see it in the booking's history."
  - "Clients may be up to 15 min late": "The same rule for every business on Ýeral. Clients see it when they book." It carries a "Fixed" pill with a lock.
  - "Turn off online booking after no-shows":
    - with a limit: "After 2 no-shows the client can only book by phone ("Phone only"). Switching Phone only off on the client's card starts the count again.";
    - set to zero: "Off: clients who didn't come can still book online.";
    - stepper: "Off · 1 time · 2 times …", with aria "Fewer" and "More".
- Booking statuses and "Add internal status" come from DS-Business.
  - Icon arias: Person with a tick · Play · Hourglass · Flag · Star · Bell · Message · Sparkles.
  - Colours: Violet · Green · Brown · Red · Grey · Black.
  - Toasts: ""Preparing" added · only the team sees it" and ""Preparing" deleted".
- Preview, "What the client sees":
  - Manual: "Booking sent" · Pending · "The business answers by 15:10" · "You'll see the answer in My bookings."
  - Instant: "Booking confirmed" · "Your time is set. You'll find it in My bookings."
  - Paused: "Book by phone" · "Glow Studio isn't taking online bookings right now. Call to book a time." · "Call +993 12 45 67 89".
  - Cancel line: "You can cancel or change the booking for free up to 2 hours before." or "… at any time."
  - Caption: "Example: a request sent today at 14:40. It updates as you change the rules."

**Hours**
- Lead: "Clients can book online only within these hours."
- "Opening hours": "Specialists' shifts stay within these hours." The day row uses the wizard's pill and errors. Arias read "Monday: opens", "Monday: add a break" and so on.
- "Special days": "Holidays and unusual days — days you're closed or open at other times." Button: "Add a special day".
  - Rows: Stocktake · New Year · Nowruz · Independence Day, with the tags One-off / Every year.
  - Row menu: Edit · Delete. Toast: "Stocktake deleted" with "Undo".
  - Empty state: "No special days yet. Add holidays ahead, so clients can't book those days."
- Special-day modal:
  - Title "Add a special day" or "Edit special day".
  - "Name" (placeholder "For example: Holiday"), with "Clients see this name if their booking has to be cancelled."
  - "How many days?": One day · Several days. Dates: "Date", or "From" and "To". Errors: "You can't pick a day in the past." and "The end can't be before the start."
  - "Repeat every year (holiday)".
  - "That day" or "On those days": Closed · Different hours. These use the same pickers, with the next-day pill.
  - Overlap warning from DS-Business.
  - Conflict line "3 bookings on this day — Aýna 2, Maral 1", or "3 bookings fall outside these hours — …".
  - Conflict options:
    - Keep them: "They stay in the calendar as they are. No new online bookings on those days."
    - Cancel and offer 3 other times: "Each client picks a new time in one tap in My bookings."
  - Footer: Cancel · Add (Save when editing).
- Saving the hours with bookings outside them (AffectedBookingsList):
  - Title: "3 bookings fall outside the new hours", or "6 bookings and 3 requests fall outside the new hours".
  - Lead: "Today, Wednesday · 09:00–18:00. These were booked before the change."
  - Options: Keep them, "They stay in the calendar as they are.", or Cancel and offer 3 other times, "Each client picks a new time in one tap in My bookings."
  - Rows as on B-Shell. Requests show their timer, for example "18 min".
  - Caption: "New bookings follow the new hours either way."
  - Footer: Cancel · Save.
  - Toasts: "Hours saved · 3 bookings kept as they are" or "Hours saved · 3 bookings cancelled — each client picks a new time in My bookings".

**Link and QR**
- Lead: "Send clients straight to your booking page."
- State box:
  - **Live**: "Your page shows in search and opens at your link."
  - **In review**: "Your page opens to clients after the check. Until then only you and your team can see it."
  - **Not approved**: the reason, then "Fix and send again".
  - **Hidden by Ýeral**: "Clients reported that your page shows the wrong address." and "Clients can't find your page or open your link. Your calendar and bookings work as usual.", then "Contact Ýeral".
- "Your page link": "Put it in your Instagram profile, WhatsApp status or on your business card — clients book straight from it." Field aria "Your page link". Copy (toast "Link copied") · Share (WhatsApp · Telegram · IMO).
- When `languages` is "several": "The link has no language in it: the page opens in each visitor's language."
- "QR code" (aria "QR code"): "Put it by the till — clients open it on their phone and book." · "Download QR" · "A PNG file, ready to print." Toast: "QR code downloaded · PNG".

## Components added · renamed · removed (B-Settings)
- **Added:**
  - round-3 shell: sidebar, account menu without Language, Contact Ýeral menu, banners, demo sidebar, tab bar and More sheet;
  - not-approved reason box (top of Business profile);
  - LinkStateBox (Live · In review · Not approved · Hidden by Ýeral);
  - PhotoManager states: uploading, too big, wrong type;
  - address with City select and a draggable pin (the wizard's map);
  - Pause online booking;
  - Close via Contact Ýeral;
  - next-day pill and after-midnight error in the hours rows and in the special-day modal;
  - AffectedBookingsList modal for hours;
  - lateness "Fixed" row;
  - `languages` variant (Main language select and EN · TK · RU tabs);
  - paused preview card.
- **Removed:**
  - top-bar search, Language rows, Reports and Help in the sidebar, the Notifications nav item;
  - restaurant, café, fitness and yoga categories, and the tables notice;
  - the address modal;
  - the Online booking switch in Booking rules (now Pause in Business profile);
  - "Booking button · soon";
  - Share by SMS;
  - Download SVG (one "Download QR");
  - the "Per person → Team" link (permissions are fixed);
  - the `yeral.app/tk/…` link;
  - SMS mentions in the logo caption, the name caption, the instant preview and the special-day cancel caption.
- **Renamed:** "Salgy we QR" → "Link and QR"; "Iş wagty" → "Hours" with the section "Opening hours"; time pickers now run 00:00–24:00 instead of 06:00–24:00.

## Tweaks (B-Settings)
- `pane`: profile (default) · rules · hours · link.
- `dirty`: a real unsaved change on the pane.
  - profile: the About text;
  - rules: Instant confirmation, which also shows the mode-change note;
  - hours: Wednesday closes at 18:00;
  - link: nothing to save.
- `languages`: one (default) · several.
- `photos`: normal · uploading · tooBig · wrongType.
- `overnight`: off · on (Friday 10:00–02:00) · error (Monday 10:00–09:30). Opens Hours.
- `exceptionModal`, `exceptionOverlap`, `statusModal`: as in round 6, now in English.
- `affected`: Hours, Wednesday 09:00–18:00, with the modal open (Aýsoltan R., Läle O., Merdan K.).
- `linkState`: live · inReview · notApproved · hidden. It drives the banners too.
- `demo`: the signed-out demo workspace.
- `role`: owner · admin.
- `font`.

Priority when tweaks conflict: statusModal opens Rules; exceptionModal, exceptionOverlap, affected and overnight open Hours.

## Decided while drawing
- **Banners follow `linkState`.** In review and Not approved show their banner, Live and Hidden show none, and the demo shows the Demo banner. Hidden by Ýeral has no banner; it shows only in Link and QR, because the brief lists three banners.
- **"Fix and send again"** (in the banner or in Link and QR) opens Business profile with the reason box on top, because the demo reason is about photos. "Send again" is always enabled and moves the page to In review.
- **Pause online booking** lives only in Business profile, next to the close line. Booking rules shows a note that links there, and the client preview shows the Call card.
- **Closing is owner-only.** An admin sees the section titled "Online booking" with Pause only. The demo hides Close.
- **A Specialist isn't drawn**, because she never reaches Settings. The admin view is the owner view with Selbi, one workspace and no Close.
- **Lateness is a fixed row** with a "Fixed" pill and no control.
- **The answer deadline in the preview** is worked out from an example request sent on Wednesday at 14:40.
  - The hold counts only within the draft opening hours: 15:10 for 30 min, and "09:40 tomorrow" for 6 h.
  - It never passes the visit start, so 24 h shows "14:30 tomorrow".
  - The caption says it is an example.
- **The overnight check** compares the after-midnight part with the next open day only. A closed next day doesn't limit it, and closing exactly at the next opening is allowed.
  - Special-day hours may close after midnight (with the pill), but aren't checked against the next day.
- **The AffectedBookingsList for hours:**
  - checks today's (Wednesday's) bookings that haven't started yet (from 11:20), which is the demo data available;
  - counts a booking as affected when it falls outside the new hours, overlaps the new break, or the day is now closed;
  - Keep them is the default;
  - shows requests with their timers;
  - opens on Save only when the week changed.
- **Photos** are part of the draft, so the save bar applies. A picked file shows the uploading tile for about 1.4 s.
  - The error tile can only be dismissed; Try again would not help with a wrong size or type.
  - The add tile hides at 20 photos.
- **Address:** changing the city keeps the street text, because there are no suggestions here. The pin is part of the draft and can be dragged or moved with the arrow keys.
- **One language by default.** About has no tabs and writes in the main language, English. Other demo texts: Türkmençe is filled and Русский is empty.
- **The link-language caption** shows only in the `languages` = several variant, because with one language it says nothing.
- **"Phone for clients"** may be a landline; the demo keeps +993 12 45 67 89. Only the length is checked.
- **The per-person answer override is not linked from Settings.** The round-3 permissions are fixed and say "Own — per Who answers requests?".
- **Onboarding:** the switcher-created workspace keeps its round-2 copy. The "Try the business app" link appears only on the signed-out phone step. The demo resets nightly, so the wizard never mentions a demo in the switcher.

## Consistency pass (round 3)
- B-Onboarding team step: footer "… it's how they log in. …" → "… it's how they sign in. …"; the row caption "A phone number is required — they log in with it." → "… they sign in with it." (same team/invite context; B-Team and DS-Business say "sign in"). Buttons and the code-step lead keep "Log in" / "To log in with …" (B-Login wording).
- B-Settings: no team/invite caption with "log in" (only the demo "Log in" button, as on B-Calendar), and no money anywhere (no prices, sums or See revenue) — nothing to change.

## Round 3.1
- B-Settings: `linkState: hidden` now shows a shell banner too (danger tone, no dismiss, owner and admins): "**Ýeral has hidden your page:** Clients reported that your page shows the wrong address. Clients can’t find or book you." + Contact Ýeral (Call [SUPPORT PHONE] · Write on Telegram [TELEGRAM]; a bottom sheet on phones). This reverses the round-3 "Hidden by Ýeral has no banner"; the Link and QR state box stays as drawn. Shifts / time off: B-Settings only says "Specialists’ shifts stay within these hours." — no Admin wording to change.

## Round 3.3
- B-Onboarding team step: "Access levels are fixed at the first release. See what each one can do in Settings → Permissions." → "See what each access level can do in Settings → Permissions." (no release caption). Phone caption under a row with a missing / incomplete number (both "Uses the app" on and off) → "Required for everyone. With the app on, it’s how they sign in." (B-Team wording); the footer starts the same way: "Phone number: required for everyone. With the app on, it’s how they sign in. Invites work for 7 days; …".

## Round 3.4
Backups: (design source) (both boards + generator sources). Frames: B-Settings 1440 × 2400 (default profile pane is taller with counters), B-Onboarding 1440 × 1100 (unchanged).

1. **Categories** (settings select and wizard list, flat, no groups): **Beauty · Barbershop · Nails · Spa & massage · Dentist · Health · Fitness · Lessons · Auto · Pets · Home services**. Glow Studio = Beauty. No "Something else".
   - Wizard: search also matches hidden words (e.g. tutor → Lessons, dog → Pets, manicure → Nails). No match → box "**No category fits? Contact Ýeral.**" + "Nothing matches “cafe”. Try another word, or tell us what you do." + **Contact Ýeral** button → menu Call [SUPPORT PHONE] · Write on Telegram [TELEGRAM] (bottom sheet on phones).
   - Settings: under the select "No category fits? **Contact Ýeral**" (link → the same menu).
   - Starter services per category (wizard step 5, title "Suggested services for {category}"; picking another category swaps the list, own "New services" rows stay): Beauty = the demo list (Hair · Nails · Face · Massage, 11 services); Barbershop = Men’s haircut, Children’s haircut, Beard trim, Haircut and beard; Nails = Manicure, Gel manicure, Pedicure, Gel pedicure; Spa & massage = Back massage, Full body massage, Facial cleansing, Spa ritual; Dentist = Check-up, Teeth cleaning, Filling (from), Whitening; Health = Doctor’s appointment, Physiotherapy session, Psychologist session; Fitness = Personal training, Trial session, Stretching session; Lessons = Lesson, Trial lesson, Exam preparation; Auto = Car wash, Interior cleaning, Tyre change, Oil change (from); Pets = Dog grooming (from), Cat grooming, Bath and dry, Nail trim; Home services = Cleaning (from), Repair visit (from), Appliance installation. Durations and TMT prices are sample values.
2. **Text limits + counters** (always shown, right-aligned under the field; over the limit: red field, red bold counter, error, Save / Continue blocked):
   - Business name **80** — "11 / 80"; error "Too long: up to 80 characters." (settings + wizard; wizard hint "Shorten the business name to 80 characters.").
   - Description (About) **1,000** — "103 / 1,000", over: "1,042 / 1,000" + "Too long: up to 1,000 characters." (settings; new tweak **`overLimit`** draws it).
   - Street line **120** — "31 / 120" + "Too long: up to 120 characters." (settings "Street and building"; wizard "Address" field, hint "Shorten the address to 120 characters.").
   - Entrance note **200** — "55 / 200" + "Too long: up to 200 characters." (settings + wizard, hint "Shorten the entrance note to 200 characters.").
   - Numbers ≥ 1,000 take a comma. Inputs accept up to twice the limit so the over state can be reached by pasting.
3. **Special days past midnight** (B-Settings modal, "Different hours"): checked against the opening of the weekday after the (last) date, from the weekly hours on screen — "Closes after Thursday opens. Pick an earlier time." (e.g. 28 Oct 2026, 18:00–10:00); blocks Add. Other special days on the next date are not taken into account.
4. **Keep them** caption by kind: Closed → "They stay in the calendar as they are. No new online bookings on that day." (several days: "… on those days."); Different hours → "They stay in the calendar as they are. New bookings follow the new hours."
5. **Changing hours → AffectedBookingsList** now covers every upcoming booking on each changed weekday (today from 11:20, then the next 7 days). Rows "Today · 18:00–18:45", "Tomorrow · 14:30–15:30", "Fri, 16 Oct · 19:00–19:45", "Wed, 21 Oct · 18:30–19:30" + status; requests with their timer pill ("45 min"). Lead lists the changed days: "Wednesday 09:00–18:00 · Friday 09:00–19:00. These were booked before the change." Tweak `affected` = Wednesday closes 18:00 + Friday closes 19:00 → "5 bookings and 1 request fall outside the new hours" (label "5 bookings · 1 request").
6. **Hold caption** (Booking rules + wizard step 7): "If no one answers in this time, the request is cancelled and the client is offered 3 other times. The time counts only while you’re open. The hold never runs past the visit’s start." (wizard keeps "… offered other times. …").
7. **No-show limit** caption adds "A new limit applies to every client right away." → "After 2 no-shows the client can only book by phone (“Phone only”). Switching Phone only off on the client’s card starts the count again. A new limit applies to every client right away."
8. **Download QR**: two buttons **"Download PNG" · "Download SVG"** + caption "PNG for printing, SVG for designers." (Link and QR); toasts "QR code downloaded · PNG" / "QR code downloaded · SVG". Wizard Done step: the same two buttons; status "QR code downloaded (PNG)" / "(SVG)".
9. Wizard hours caption: "… You can add special days (holidays, closures) later in Settings."
- Round 3.4 follow-up: the hours-saved toasts count like the modal — "Hours saved · 5 bookings and 1 request kept as they are" / "Hours saved · 5 bookings and 1 request cancelled — each client picks a new time in My bookings" (one item: "Hours saved · 1 booking kept as it is").
