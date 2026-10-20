# English choices: B-Onboarding · design pass v0.6, round 2 (20.10.2026)

File: `screens/business/B-Onboarding.dc.html` (page, 1440 × 1100 for the default step, interactive). Rebuilt from the round-6 Turkmen wizard (kept in (design source)) by (design source) (+ `onb_markup.html`, `onb_script.js`).
Not repeated here: wordings from EN-GLOSSARY, business/README.md §27, `en-choices-business.md` (maps (design source)), DS-Patterns (SignInCodeStep, LanguageSwitcher, StatusBadge) and `en-choices-r2-login-shell.md` (B-Login name step, routing card). Format: Turkmen (as drawn before) → English · where · why, when it isn't obvious.

## Addresses
- Setup steps live at `business.yeral.app/setup/{step}` with step = `phone · business · address · hours · services · team · rules · done` (same values as the `step` tweak; step 4 = `/setup/hours`, as on the B-Login routing card). The client page link shown in the wizard is `yeral.app/b/{slug}` (`yeral.app/b/glow-studio`, map).

## Wordings I chose
**Frame and navigation**
- “Biznesiňizi açyň” → “Set up your business” · left panel title. The from-switcher variant uses the glossary’s “Create a business”.
- “8 ädim · takmynan 5 minut · mugt” → “8 steps · about 5 minutes · free”; from-switcher → “7 steps · about 5 minutes · free”.
- Step names: “Telefon” → “Phone” (from-switcher: “Hasap” → “Account”), “Biznes” → “Business”, “Salgy” → “Address”, “Iş wagty” → “Hours”, “Hyzmatlar” → “Services”, “Topar” → “Team”, “Ýazylyş düzgünleri” → “Booking rules”, “Taýýar” → “Done”.
- “2 / 8” (step label) → “Step 2 of 8” · same wording as the B-Login routing card.
- (new) Under “Continue later” (map): “Saves this step. Log in again and setup reopens right here.” Toast: “Saved. Log in again with +993 65 10 20 30 and setup reopens at “Hours”.” · the brief’s caption that signing in again reopens the step.
- “Soragyňyz barmy? +993 12 00 00 00” → “Questions? Contact Ýeral: [SUPPORT PHONE]” · uses the account-menu wording; the made-up number becomes the open placeholder.
- Footer: “Yza” → “Back”, “Dowam et” → “Continue”, “Ýatyr” (from-switcher, step 2) → “Cancel”, “Biznesi döret” → “Create business”, “Senenama geç” → “Go to the calendar”.

**Step 1 · Phone**
- “Ýeral Biznes-e hoş geldiňiz” → “Welcome to Ýeral Business”. Code and name states use the SignInCodeStep and B-Login wordings (“Enter the code”, “What’s your name?”…).
- Name hint → “For your Ýeral account — your team will see you by this name. You’ll be the owner of the business.”
- “Eýýäm hasabyňyz barmy? Giriş” → “Already have an account? Log in” (links to B-Login).

**Step 2 · Business**
- “Biznesiňiz barada” → “About your business”; lead “Clients find you by this name and category. The category also suggests starter services.”
- “Biznesiň ady” → “Business name”; placeholder “For example: Glow Studio”; “Sahypaňyz:” → “Your page:”.
- Search placeholder → “Search, for example: nails, dentist, tutor”. “Kategoriýa tapylmady” → “No category found”; “Try another word, or pick “Something else” and add your services yourself.”; button “Pick “Something else — I’ll add my services””.
- Categories, appointments only. Group names: Beauty · Health · Sport · Lessons · Auto · Other. Items:
  - Beauty: Beauty salon · Barbershop · Nail studio · Brows and lashes · Spa and massage
  - Health: Dentist · Medical centre · Physiotherapy · Psychologist
  - Sport: Personal trainer
  - Lessons: Tutor · Language lessons · Music lessons
  - Auto: Car wash · Tyre service · Car service
  - Other: Pet care · Home services · Something else — I’ll add my services
  - (“Gaş we kirpik”, “Dellekhana”, “Dyrnak studiýasy”, “Pet care” follow the maps.)
- From-switcher: h1 “Create a business”; lead “Each workspace is one business at one address: its own calendar, team, clients and settings. Your Ýeral account stays the same, and you’ll be the owner of the new business.”; account line caption “Your Ýeral account”.

**Step 3 · Address**
- “Müşderiler sizi nirede tapar?” → “Where will clients find you?”; lead “Search for the address, then fine-tune the pin on the map. Clients use this pin to find their way.”
- “Köçe we jaý belgisi” → “Street and building number”; aria “Address suggestions”.
- Suggestions:
  - “247 Bitarap Türkmenistan Avenue” · “Building · next to the shopping centre”
  - “247/1 …” · “Building · inside the courtyard”
  - “Bitarap Türkmenistan Avenue” · “Street · you place the pin yourself”
- Map: “Ilki salgyny saýlaň” → “Pick the address first”; “Nokady süýşürip takyklaň” → “Drag the pin to fine-tune it”; home mode → “Clients see only the approximate area — you can drag the circle”. Pin aria “Pin on the map. Move it with the arrow keys”; “Zoom in” / “Zoom out”.
- “Öýde işleýärin” → “I work from home”, with “Only clients with a confirmed booking see your exact address”. Info box: “The exact address shows only after a booking is confirmed; until then the map shows the approximate area.”
- Fields:
  - “Gat, otag” → “Floor, room” (placeholder “Optional”; demo value “2nd floor”).
  - “Girelge nirede?” → “Where is the entrance?”; placeholder “For example: through the courtyard, green door”; demo value “Door next to the shopping centre, lift to the 2nd floor”.
  - Hint “This note helps clients find their way.”

**Step 4 · Hours**
- “Iş wagtyňyz” → “Your hours”; lead “Clients can book only within these hours. You’ll add staff shifts later.”
- “Iş günleri birmeňzeş” → “Same hours Monday to Friday”, with “Pick the time once for Monday–Friday”; “Duşenbe ýaly” → “Same as Monday”.
- Headers: Day · Open · Hours.
- The brief’s “until 02:00, next day” is drawn as a small neutral pill with a moon icon after the closing picker.
- Errors: “Opening and closing can’t be at the same time.” · “The break must end after it starts.” · “The break must be within your hours.”
- Footer caption: “A day can close after midnight: 18:00–02:00 means open until 02:00 the next day. You can add special days (holidays, time off) later in Settings.”
- Summary uses the weekday letters: “Mo–Th 09:00–20:00, Fr 10:00–02:00, …”.

**Step 5 · Services**
- “Hyzmatlaryňyz” → “Your services”; lead “Pick from the ready list, then adjust each name, duration and price to suit you.”
- Heading “Suggested services for beauty salon” / “Add your services”; count “11 services selected”.
- Groups: Hair · Nails · Face · Massage · New services. “Ýüz ideg” → “Face” (not in the maps; short to match the other groups).
- Group action: “Ählisini saýla / Saýlawy aýyr” → “Select all / Clear”.
- “from” price: a “from” prefix inside the price field. The field keeps “TMT” at the end, so it reads “from 250 TMT”.
- Info box: “There’s no ready list for this category yet. Add your services below — 2–3 are enough to start.”
- Caption: “Who does which service, descriptions and photos can be added later in Settings → Services.”

**Step 6 · Team**
- “Kim bilen işleýärsiňiz?” → “Who do you work with?”; lead “With a team, each specialist gets their own calendar and clients can pick who they book with.”
- Table headers: Name · Phone · Access level. Owner row: “You” · “Owner”.
- “Işgär goş” → “Add a team member”.
- Captions under each person:
  - Uses the app (and every Admin): the brief’s “They’ll see the invite when they sign in with +993 65 •• •• 10 · valid 7 days”.
  - Uses the app off: “Bookable at once, never signs in — you and admins handle their requests. They can start using the app later with this number.”
  - No number yet: “A phone number is required — they log in with it.” or “A phone number is required. They can start using the app later with this number.”
  - Landline: “Mobile numbers only — enter a number starting with 6 or 7.”
- Footer captions: “A phone number is required for everyone — it’s how they log in. Invites work for 7 days; each person sees theirs when they sign in with the invited number.” and “You can change what each access level may do later in Settings → Permissions.”
- Level notes:
  - Specialist: “Sees their own calendar, bookings and clients; answers their own requests.”
  - Admin: “Manages the whole calendar and all clients; doesn’t see revenue.”
  - “Uses the app: off”: “The specialist is bookable at once but never signs in. You and admins handle their requests.”
- Solo info box: “Clients won’t pick a specialist — every booking comes to you. You can invite people later in Settings → Team.”

**Step 7 · Booking rules**
- “Ýazylyşlar nähili gelsin?” → “How should bookings arrive?”; lead “Confirm each new online booking yourself, or accept it at once.”
- (new) “Client sees” plus a StatusBadge (Pending / Confirmed) inside each confirmation card.
- Hold caption: “If no one answers in this time, the request is cancelled and the client is offered other times. The time counts only while you’re open.” The second sentence follows the brief §4 timer rule.
- Who answers requests:
  - Lead: “You have a team — who can confirm or decline online requests. You can always answer.”
  - Note: “Requests for specialists who don’t use the app always go to you and the admins.”
- “Müşderi ýatyryp biler” → “Clients can cancel for free”, with “Later than this, a client can only cancel by calling you.” Options: “Any time · Up to 1 h before · Up to 2 h before · Up to 6 h before · Up to 12 h before · Up to 24 h before · Up to 48 h before” (the brief’s list; “Up to … before” so each option reads on its own).
- Buffer caption: “Free time kept after each service to get ready for the next client.”; “Arakesme ýok” → “None”.
- Instant info box: “The client sees “Booking confirmed” at once. Block the times you’re busy in the calendar.”
- Footer caption: “You can change all of this later in Settings.”

**Step 8 · Done**
- “{name} taýýar!” → “Glow Studio is ready!”; lead “Add bookings that come by phone or walk-in. Online booking opens after the review.”
- The banner text is the brief’s In review wording.
- “Barlagdan soň müşderiler sizi şeýle görer” → “After the review, clients see you like this”; “Täze” → “New”.
- “Sahypaňyzyň salgysy” → “Your page link”. Link actions: “Göçür / Göçürildi” → “Copy / Copied”; “QR-y ýükle” → “Download QR”; “QR code downloaded (PNG)”.
- “0 / 3 taýýar” → “0 / 3 done”; checklist subs “Shown next to your name in search and on your page” · “The first photo is your card’s picture in search” · “Tell clients what to expect: services, products, experience”.
- “Topara çakylyk iber” → “Send invites”, then “Invites sent”. Toast: “5 invites sent — each person sees theirs when they sign in with their number. Valid 7 days, until 21 October.” No SMS promise (brief §1).
- From-switcher note: “The new workspace appears in the workspace switcher at the top of the left menu — switch back to Glow Studio there.”

## Components added, renamed or removed
- **SignInCodeStep** (DS-Patterns) replaces the wizard’s own phone field and code boxes.
  - Phone states: Empty · Sending · Incomplete · NotMobile · TooManyCodes.
  - Code states: Empty · Checking · WrongCode · Locked (60 s) · LockOver · ResendReady · Resent · TooManyCodes.
  - **firstLaunchCode** “Your code: 4821”.
  - Visible Confirm plus auto-check; the resend countdown ticks.
  - The name sub-step follows the B-Login name step (photo, first name, last name optional).
- **LanguageSwitcher** (segmented EN · TK · RU, EN first) added to the wizard panel header.
- **StatusBadge** (icon + label, compact 24) added to the confirmation option cards.
- **Team row** (TeamMemberRow, wizard variant):
  - Access level is now Specialist · Admin.
  - New **“Uses the app”** switch for Specialists (on by default), the DS · Business “Uses the app switch on the access-level field”.
  - New caption line with the masked number and 7-day validity.
  - The phone is required for everyone.
- **Removed:**
  - the “Programmasyz” (no app) level;
  - the Restaurant / Café and class-studio category rows and their info lines;
  - the category type tags.
- **Hours row:** the pickers now run 00:00–24:00 (closing 00:30–24:00), plus a new “next day” pill (`.nday`) for overnight days.
- **Continue later:** the existing link now has a caption and a saved toast.

## Decisions (simplest Fresha-like — please confirm)
- “Continue later” shows on every step once the person is signed in (steps 1–7). It isn't shown before the code check (there's no account to save to yet) or on Done (setup is finished).
- On the phone step the footer “Continue” is hidden until the number is verified. “Send code” / “Confirm” stay the single primary there. After the code, the name and the footer “Continue” appear.
- `codeOnScreen` is off by default, as on B-Login. Turn it on for the first-release variant.
- Overnight days:
  - A closing time earlier than the opening time means the next day. 24:00 means midnight the same day.
  - The closing list has no 00:00, so midnight isn't ambiguous.
  - Equal times are an error.
  - A break may cross midnight inside an overnight day.
  - Demo: the `overnight` tweak sets Friday 10:00–02:00 and turns off “Same hours Monday to Friday”. Glow Studio itself stays 09:00–20:00.
- Team phone numbers: mobile only (6 or 7), the same rule as SignInCodeStep.
- Invites are created at Done with “Send invites” (as before), for Admins and for Specialists who use the app. Specialists who don't use the app are active at once.
- In the from-switcher variant, step 1 shows as “Account” and can't be opened. Step 2 has “Cancel” (back to the calendar) instead of “Back”.
- The language switcher shows in the desktop step panel only. The phone top bar has no room, so the language chosen before stays.
- The “Who answers requests?” block shows only with “I have a team” and “I confirm”.
- At the first release, “Sport” holds only “Personal trainer” (one-to-one).
