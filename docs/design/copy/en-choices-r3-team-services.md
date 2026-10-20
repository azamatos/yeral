# English choices: B-Team and B-Services (redrawn in English) · design pass v0.6, round 3 (20.10.2026)

Files:
- `screens/business/B-Team.dc.html`: page, **1440 × 1440** (was 1400; the "Aýna left" state needs 1425), interactive. Addresses `/w/glow-studio/settings/team` and `/settings/permissions`.
- `screens/business/B-Services.dc.html`: page, **1440 × 1440** (unchanged), interactive. Address `/w/glow-studio/settings/services`.
- Both are generated: (design source) (or `team` / `services`). Sources in (design source):
  - `css/settings_*.css` and `settings_markup_ref.html`: frozen copies of the B-Settings round-3 generator ((design source), 20.10). The shell (sidebar, switcher, account menu with Contact Ýeral, banners, rail, tab bar, More sheet), the settings header and nav, the save bar and the modal styles come from there, so the three settings boards look the same. If B-Settings' shell changes, copy those files again.
  - `css/common.css`, `css/team.css`, `css/services.css`, `css/media.css`: the new pieces.
  - `team.html` + `team.js`, `services.html` + `services.js`, `shell.js` (the shell values, pasted into both classes).
- Backups of the Turkmen boards: (design source), (design source).
- Checks: (design source) (logic: every tweak combination plus the flows), (design source) (local render, cut/overflow/wrap scan, `--long` = labels 30 % longer).

Not repeated here: wordings from EN-GLOSSARY, the round-2/3 briefs (business/README.md §27–28), `en-choices-business.md` (04, 09), `en-choices-r2-*.md`, `en-choices-r3-*.md`, B-Shell ("Someone leaves", the permissions table), B-Onboarding's team step and B-Settings.

Format: wording · where · why, when it isn't obvious.

## Tweaks
- **B-Team:** `tab` team · permissions · `panel` none · staff · invite · inviteError · remove · reassign · shift · timeOff · usesAppOn · `aynaLeft` (boolean, off) · `role` owner · admin · `banner` none · inReview · notApproved · demo · `font`.
  - staff = Jeren's drawer on Hours. invite = step 1 filled for Nazik Rejepowa. inviteError = Ýazgül's number, which has an open invite. remove = the owner removes Aýna. reassign = Aýna has left, and "Choose" has been pressed ("Who takes Aýna's bookings?"). shift = Jeren's new shift Mon–Sat 12:00–19:00 hits 3 bookings and 1 request. timeOff = Jeren's time off 9–13 November hits 3 bookings. usesAppOn = Leýli after "Uses the app" was turned on and saved: Invited, drawer open on Access level.
  - `aynaLeft`: Aýna's row moves to "No longer on the team" as "Left", and the Team banner shows (owner only).
  - `banner`: the business status banners, as on B-Calendar and B-Bookings. Demo = the signed-out demo workspace.
- **B-Services:** `drawer` none · edit · new (default edit = Hair colouring) · `modal` none · deleteBooked · deleteFree · `languages` one · several · `role` owner · admin · `banner` (as above) · `font`.
  - deleteBooked = the confirm for Hair colouring.
  - deleteFree = Bridal hair styling deleted, with the Undo toast.

## B-Team · what changed
- English, with the round-2 shell copied from B-Settings: Settings is current in the sidebar, and Team and Permissions are current in the settings nav (a chip row under 1024). No top-bar search, no Reports, Help, Notifications or Language.
- **Removed:**
  - Transfer ownership: the modal, the menu item, the owner box caption and "You're an admin now".
  - The editable permission matrix: switches, selects, the save bar and "The owner changes cells".
  - "Specialist (no app)" / "Programmasyz": the select option, hints, statuses and footnote.
  - "Turn off" / "Reactivate a specialist" → **Remove from the team**.
  - The inline amber conflict box with its money sum ("350 TMT in total") → the AffectedBookingsList modal.
  - "Any free specialist".
  - Personal yearly special days → **Time off**.
- **Team list:**
  - Sections: Specialists (drag order = the order clients see) · Management · **Invites** · **No longer on the team**.
  - Columns: Name · Access level · Services · Hours · Status.
  - Leýli shows "Active" + the pill "Doesn't use the app".
- **Invites (owner only):**
  - Rows with "Copy invite link" and the caption "They'll see the invite when they sign in with +993 65 •• •• 22".
  - Statuses: Invited (N days left) · Expired · Declined · Cancelled.
  - Open invite: Copy invite link · Resend invite · Cancel invite. Closed invite: Resend invite · Remove.
  - The add-a-member modal (Who · Services · Review) offers Specialist · Admin, needs a mobile number, and has "Uses the app" for Specialists.
  - Errors: "This person is already on the team." · "There's already an open invite for this number." · "Mobile numbers only — enter a number starting with 6 or 7."
- **Remove a member:** RemoveStaffModal with AffectedBookingsList, as on B-Shell: per-row results, and its own choice (default **Keep it**) for a booking nobody else can do. Statuses "Removed" and "Left".
- **Shift change and time off over bookings:** AffectedBookingsList with Keep them · Cancel and offer 3 other times. The shift version says "New bookings follow the new shift either way."
- **Team banner:** "Aýna left: 4 bookings and 1 request need a new specialist" + Choose, until settled.
- **Permissions tab:** the fixed read-only table (13 rows, same strings as B-Shell) + "Access levels are fixed at the first release." Under 768 each row stacks with OWNER / ADMIN / SPECIALIST labels.
- **Admin view (`role` = admin):**
  - Team and Permissions are view-only: no Add, invite actions, Copy invite link, remove, drag or Team banner.
  - The admin can still change a person's services, hours and time off (see Decided while drawing).

## B-Services · what changed
- English, with the same shell, header and nav. Services is current.
- Price types: Fixed · From · Free · **Price at the place** (was "Hidden"; it has no amount now).
- Names and descriptions use one language by default. `languages` = several adds EN · TK · RU tabs to the drawer: EN is the main language and required, an empty language gets a dot, and the caption reads "Missing texts show in the main language."
- **Delete:**
  - With upcoming bookings → modal "Delete Hair colouring?" / "It has 4 upcoming bookings. They stay as they are; new bookings can't choose it." → **Delete service**. The toast after it has no Undo.
  - Without bookings → deleted at once, with the Undo toast.
- The staff tag "Doesn't use the app" (Leýli) in Who does it (was "programmasyz").
- Durations: "60 min", "1 h 15 min", "1 h 30 min", "2 h".
- Reordering with the keyboard: the handles take ↑ ↓ → the save bar (Discard · Save).

## Wordings · B-Team
- "Clients see specialists in this order." · page lead · Turkmen "Müşderiler hünärmenleri şu tertipde görýär".
- "Add a team member" · page button and modal title · the B-Onboarding team step wording.
- "Name · Access level · Services · Hours · Status" · table headers · "Name" as on the onboarding team step (DS-Business used "Specialist" for a column that also lists the management).
- "Invites" + "Each invite works for 7 days. They join when they accept it." · section.
- "No longer on the team" + "Their past bookings and reviews stay" · section for Left / Removed.
- "Active · Invited · Expired · Declined · Cancelled · Left · Removed" · status line. Sub-lines: "5 days left" / "1 day left" · "ended on 13 October" · "on 12 October" · "today" · "works without the app until they accept".
- "Copy invite link" · "Resend invite" · "Cancel invite" · "Remove" · invite row link and menu.
- "Edit · Hours and time off · Access level · Remove from the team" · member row menu.
- "Drag a specialist by the handle, or use the arrow keys on it, to change the order clients see." · footnote (owner) / "The owner sets the order clients see." (admin). aria "Drag to reorder: {name}. Or use the arrow keys".
- "You can change people's services, hours and time off. Only the owner adds and removes people and changes access levels." · admin note on Team.
- Drawer tabs: "Profile · Services · Hours · Access level".
- "Name clients see" · "Clients see: Jeren · Beautician" · "Full name (optional)" · "Only your team sees it." · "Specialization (optional)" · placeholder "For example: stylist, colourist" · Profile tab.
- "Phone number" + "This is their Ýeral login. They change it themselves in My profile." (app user, read-only) · "Required. They can start using the app later with this number." (no app, owner can edit) · "The invite is for this number." (invited).
- "Only the owner changes names, phone numbers and access levels." · admin note in the drawer (Profile and Access level tabs).
- "What does Jeren do?" · "Clients see Jeren only for these services." · "{Name} doesn't take bookings now. Pick services and clients can book {Name} too." · "All" · Services tab.
- "Working hours" · "Business hours — Works whenever the business is open" · "Own shift — Set hours for each day" · "Day off" · "The business hours come first: when the business is closed, a shift doesn't open bookings." · Hours tab. aria "Monday: works / starts / ends".
- "Time off" · "Clients can't book Jeren on these days." · "No time off planned." · "Add time off" · "From" · "To (optional)" · "Note (optional)" · placeholder "For example: family trip" · "Only your team sees the note." · "The end date can't be before the start date." · "4 days" · aria "Remove time off: 28–31 December 2026".
- "Owner — every permission, including the team. One owner per workspace; the owner can't leave it." · owner's Access level box · replaces the transfer box.
- Level summaries reuse the onboarding team step: "Sees their own calendar, bookings and clients; answers their own requests." / "Manages the whole calendar and all clients; doesn't see revenue."
- "Uses the app" captions:
  - "Signs in with +993 62 •• •• 33." (on, active)
  - "Saving creates an invite. They'll see it when they sign in with +993 63 •• •• 47 · valid 7 days. Until they accept, they work without the app." (just turned on)
  - "The invite is waiting for Leýli. Turn this off to cancel it." (invited)
  - "Saving cancels the invite. Leýli keeps working without the app."
  - "Saving turns this off: Jeren stays bookable but can't sign in."
  - Off: the onboarding wording.
- Invite box: "Invited" · "Works without the app until they accept. Their bookings stay with them." · "They'll see the invite when they sign in with +993 63 •• •• 47 · until 21 October · 7 days left" · "Copy invite link".
- "Leýli's requests go to you and the admins. The permissions don't apply — Leýli never signs in." · no-app box (replaces the "Programmasyz hünärmen…" lock box).
- "Admins always use the app." (+ " Saving creates an invite: they'll see it when they sign in with … · valid 7 days." when a no-app person is made Admin).
- Add a team member modal:
  - "Mobile number" · "Required for everyone — it's how they sign in." · "Name clients see".
  - Admin caption: "Admins always use the app. They'll see the invite when they sign in with … · valid 7 days."
  - Step 2: "Optional for an admin — pick services and clients can book them too." · "No services selected yet".
  - Review rows: "Mobile number · Name · Specialization · Access level · Uses the app (Yes / No) · Services (None)" + "Change".
  - Note: "They'll see the invite when they sign in with +993 64 •• •• 36. It works for 7 days — until 21 October. You can also copy the invite link in Team and send it yourself." / "{Name} can be booked at once and never signs in. You and the admins handle their requests."
  - Buttons: "Send invite" / "Add to the team".
- Remove modal:
  - Title "Remove Aýna from the team?" and lead "Aýna loses access to Glow Studio, and clients can't book Aýna any more. Past bookings and reviews stay." (+ " Selbi has no upcoming bookings.").
  - Danger button "Remove Aýna".
  - Row variant "Gülnar Öwezowa doesn't do {service}" (when others do it but not the chosen person).
  - Options, row choices and "Who takes Aýna's bookings?" (reassign) are B-Shell's.
- Shift modal: "3 bookings and 1 request fall outside Jeren's new shift" · "New shift: Mon–Sat 12:00–19:00, Sun day off. These were booked before the change." · "They stay in the calendar as they are." · Save.
- Time-off modal: "Jeren has 3 bookings during this time off" · "Time off · 9–13 November. These were booked before." · "They stay in the calendar as they are — Jeren comes in for them." · "Clients can't book Jeren on these days either way." · "Add time off".
- Permissions:
  - Lead "Permissions work by access level — give each person a level in Team." · the en-choices wording + link.
  - Second caption "Specialists who don't use the app never sign in, so the table doesn't apply to them." · from the B-Shell note.
- Toasts:
  - "Invite link copied — send it to Ýazgül in any messenger"
  - "Invite sent again · valid until 21 October" (+ Copy invite link)
  - "Invite sent to Nazik · valid until 21 October" (+ Copy invite link)
  - "Invite cancelled · Ýazgül can't accept it any more" (+ Undo)
  - "Invite removed" (+ Undo)
  - "Nazik added to the team · clients can book Nazik now"
  - "{Name}: changes saved"
  - "Invite created for Leýli · valid until 21 October · Leýli works without the app until they accept" (+ Copy invite link)
  - "Invite cancelled · Leýli keeps working without the app"
  - "Jeren no longer uses the app · you and the admins handle Jeren's requests"
  - "Aýna removed from the team · 4 moved to Gülnar Öwezowa, 1 kept as it is · the clients are notified"
  - "Aýna's bookings are settled · …"
  - "Jeren's shift saved · 3 bookings and 1 request kept as they are" / "… cancelled — each client picks a new time in My bookings"
  - "Time off added: 9–13 November · 3 bookings kept as they are"
  - "Time off removed · 28–31 December" (+ Undo)
  - "Order saved · clients see the specialists in this order"

## Wordings · B-Services
- "12 services · 4 groups. Clients see them in this order." · lead.
- "Add group" · "Add service" · "New group name" · placeholder "For example: Beard, Waxing" · "Clients see the group as a section on your page. A new group goes to the end of the list."
- Group menu "Add a service here" · "Delete group" · disabled with "Move or delete its services first".
- Row menu "Edit" · "Hide from online booking" / "Open for online booking" · "Delete service".
- "no buffer" · row sub-line for a 0 buffer (DS has "+15 min buffer").
- "Drag a service or a group by its handle, or use the arrow keys on it, to change the order. Services with online booking off don't show on your page — you add their bookings yourself." · footnote.
- Drawer:
  - "Edit service" / "New service" · sub "Hair · Hair colouring" / "Goes to Hair".
  - "Name" ("Name · EN" with tabs) · "Description (optional)" · placeholder "What's included and how to get ready".
  - "Group" · "Duration" · "Buffer after the service" with "As in Booking rules · 10 min" and "No buffer", and the caption "The specialist stays free for this long after the service — to clean up and get ready. The general rule is in Booking rules."
  - "Price" (label of the price-type chips) · "Price" / "Lowest price" (amount) · "Tell the client the price at the visit." (Price at the place).
  - Errors "Enter the service name." · "Enter the price."
  - "Clients see free times only for the people you tick."
  - "Online booking" · "Clients can book it themselves on your Ýeral page." / "Hidden from your page — you add its bookings yourself (phone only)."
- Language tabs (several): aria "English, main language" · "Turkmen" · "Russian" (+ ", empty") · "Empty — clients see "Hair colouring"." · placeholders "Name in Turkmen" / "Name in Russian".
- Demo service s12 **Bridal hair styling** (the client site's s12, also on B-Calendar and B-Bookings) · "With a trial styling; the price is agreed" · 2 h · Price at the place · Aýna.
- Toasts:
  - "Hair colouring saved"
  - "New service added: {name}"
  - "Bridal hair styling deleted" (+ Undo)
  - "Hair colouring deleted · its 4 upcoming bookings stay as they are"
  - "Children's haircut is open for online booking" / "Children's haircut: phone only — it's hidden from your page"
  - "Group added: Beard" / "Group deleted: Beard"
  - "Order saved · clients see your services in this order"

## Components added, renamed, removed
- **Added:**
  - InviteRow in its own **Invites** section (Invited · Expired · Declined · Cancelled; Copy invite link; Resend / Cancel / Remove).
  - FormerMemberRow (Left · Removed).
  - Team banner "Aýna left" (B-Shell banner).
  - RemoveStaffModal with two modes: remove and someone-left. It uses the B-Shell AffectedBookingsList with per-row results and own-row choice.
  - Shift / time-off AffectedBookingsList modal (Keep them · Cancel and offer 3 other times).
  - UsesAppSwitch + pending-invite box in the Access level tab.
  - TimeOffList + add-time-off form.
  - Read-only PermissionsTable (from B-Shell) with a stacked phone layout.
  - ServiceDeleteConfirm.
  - Language tabs in the service drawer.
  - Keyboard reorder on the drag handles + the Settings save bar.
  - A toast with a second action ("Copy invite link").
- **Renamed:** "Işgäri öçür / Öçürilen / Gaýtadan işjeňleşdir" (turn off / turned off / reactivate) → "Remove from the team / Removed" (no reactivate). Price type "Görkezme" (Hidden) → "Price at the place". "Şahsy aýratyn günler" → "Time off".
- **Removed:**
  - TransferOwnershipModal and the owner-box transfer entry.
  - The editable PermissionMatrix (switches, selects, save bar).
  - The "Specialist (no app)" level.
  - BookingConflictBox (inline, with a money sum).
  - DisableStaffOptions with "Any free specialist".
  - The top-bar search and the old sidebar items (Reports, Your Ýeral page, Help), the Notifications nav item, the Language row.

## Decided while drawing
1. **Invites are their own section:** an invited person isn't a member until they accept. Four demo rows show every status:
   - Ýazgül Orazowa, Specialist, +993 65 •• •• 22, sent 12 October → 5 days left.
   - Arslan Gurbanow, Admin, expired 13 October.
   - Enejan Nazarowa, declined 12 October.
   - Dilber Saparowa, cancelled 13 October.
   Resend makes a fresh 7-day invite. Adding a number that has a closed invite replaces that row.
2. **Gülnar Öwezowa is Active** (she has accepted, per the demo facts) and does Women's haircut, Hair styling and Children's haircut. Nazik Rejepowa is the name typed in the invite modal.
3. **Left / Removed people** stay in "No longer on the team". They have no drawer and no actions; their past bookings and reviews stay.
4. **Remove:**
   - Owner only, never the owner row. The owner can't leave or be removed: the owner's Access level tab shows only the lock box.
   - When nobody else does any of the person's services, "Move to another specialist" is hidden and **Keep them** is preselected (least destructive). A single booking nobody else can do gets its own row choice, default **Keep it** (remove and someone-left alike).
   - The final button is the danger "Remove {name}".
5. **Remove and someone-left share one demo:** `panel` = remove shows the owner removing Aýna (before she leaves) with the brief's 4 bookings + 1 request. `aynaLeft` / `panel` = reassign shows the same list after she left (title and lead as on B-Shell). The banner and Choose are owner only.
6. **Admin view:** Team and Permissions are view-only, but the admin can change a person's **Services** and **Hours / time off**, because the fixed table gives admins "Shifts and time off" and "Change services and prices". Profile, phone, access level and "Uses the app" are read-only for the admin. The admin gets no add, remove or invite actions, no Copy invite link and no reorder.
7. **Time off saves at once** (Add time off / the trash button with Undo). A shift change saves with the drawer's Save. Both open the AffectedBookingsList when bookings are hit.
8. **Jeren's demo bookings** (changed in the consistency pass, see below): Today 15:00 Sona P. and Arzygül H.'s real request (Fri, 16 Oct · 10:00–11:00, Pending, 12 min) from B-Calendar / B-Bookings; the rest are invented clients that B-Clients doesn't draw, all Confirmed:
   - Sat, 17 Oct Bägül A. · Mon, 19 Oct Nurana K. · Tue, 20 Oct Dürdäne B.
   - Mon, 9 Nov Täzegül S. · Wed, 11 Nov Bägül A. · Fri, 13 Nov Nurana K.
   The time-off demo is 9–13 November (2 November is closed for Stocktake). Jeren already has time off on 28–31 December 2026.
9. **"Uses the app":**
   - Turning it on for a Specialist without the app creates the invite on Save. The row says "Invited · works without the app until they accept", and turning the switch off again cancels the invite.
   - Turning it off for an app user stops their sign-in; they stay bookable.
   - Making a no-app Specialist an Admin also creates an invite, because admins always use the app.
10. **Phone number:** read-only for app users (it is their login). The owner can edit it for people without the app, with the onboarding errors.
11. **"Can answer own requests"** (the per-person override) stays, for app-using Specialists only.
12. **The add-a-member modal keeps 3 steps** (Who · Services · Review). A Specialist with "Uses the app" off is added at once ("Add to the team"), with no invite row.
13. **Reorder:** the drag handles also move rows with ↑ ↓. A changed order shows the save bar Discard · Save, same for groups and services on B-Services.
14. **s12 Bridal hair styling** (Hair, 2 h, Price at the place, Aýna, no upcoming bookings) — the client site's existing s12, now on B-Calendar and B-Bookings too. It shows the 4th price type in the list and gives `deleteFree` a service without bookings. So Aýna does 5 services on B-Team; 12 services in 4 groups.
15. **Price at the place has no amount field** (simplest); the client sees "Price at the place".
16. **Upcoming bookings per service** (demo):
   - Women's haircut 9 · Hair styling 5 · Hair colouring 4 · Children's haircut 2 · Bridal hair styling 0
   - Manicure 6 · Gel manicure 4 · Pedicure 3
   - Facial cleansing 8 · Brows and lashes 4
   - Back massage 3 · Full body massage 2
   Pending requests count as upcoming bookings in the delete text.
17. **Who does it** lists only active specialists (Aýna, Gülnar, Maral, Jeren, Leýli); invited people appear after they accept.
18. **`languages` = several:** EN is the main language and required. TK names are filled from the old Turkmen board; RU is empty. The list always shows the main language.
19. **B-Services `role`:** the owner and the admin see and edit the same page; only the shell differs. A Specialist has no Settings, so there is no specialist view on either board.
20. The demo (signed-out) workspace shows the owner's Team page.
21. Durations follow the round-3 brief ("60 min", longer = "1 h 30 min", "2 h"). DS-Business round 1 still writes "1 h" for 60 min.
22. The masked numbers use non-breaking spaces, so "+993 65 •• •• 22" never splits across lines.

## Consistency pass (20.10.2026, after the cross-board check items A1, A10, B2, B3, B4, B12)
- **Jeren's affected rows (B3, B4):**
  - No more clashes with B-Clients / B-Calendar / B-Bookings. Arzygül H. is her real request (Fri, 16 Oct · 10:00–11:00 · Pending · 12 min). Jahan M., Merjen K., Ogulşat M. and Aýsoltan R. are no longer in Jeren's list.
  - The invented clients (Bägül A., Nurana K., Dürdäne B., Täzegül S.) aren't drawn on B-Clients. No booking falls on a closed day.
  - The time-off demo moved from 2–9 November (2 November = Stocktake, closed) to **9–13 November**.
  - The shift / time-off lists now show requests with their timer, and the titles count both: "3 bookings and 1 request fall outside Jeren's new shift".
- **s12 (B2):** Keratin treatment → **Bridal hair styling** (the client site's s12: Hair, 2 h, Price at the place, Aýna, "With a trial styling; the price is agreed", no upcoming bookings). Still 12 services in 4 groups. Team's service picker lists it as "2 h · Price at the place".
- **Invite note (A1):** "They'll see the invite when they sign in with +993 64 •• •• 36. …" (no "to Ýeral Business"). The active-user caption is now "Signs in with +993 62 •• •• 33." "Sign in" everywhere on B-Team (A10).
- **Own-row default:** a booking nobody else can do defaults to **"Keep it"** (least destructive), on remove and on someone-left alike. The select now lists Keep it first. Shift / time-off lists keep "Keep them" as their default. The remove toast now reads "… 4 moved to Gülnar Öwezowa, 1 kept as it is · the clients are notified".
- **Client names (B12):** affected-booking rows show the saved client name in full: "Aýjemal Gurbanowa" (others are saved with an initial, e.g. "Gülälek N."). "Aýjemal G." stays only for reviews.
- **Money rule:** prices are booking information everyone who sees the booking sees, Admin included. "See revenue" covers only sums (revenue lines, client totals, average check, earnings). Nothing changed on these boards: they show prices (service list, the Team service picker) and no sums, and the Admin edits prices.
- Checks rerun: build, check_dc.py, dccheck.py, node --check, smoke.js (all ok), renders of shift / time off / remove / deleteFree, long text at 390.
