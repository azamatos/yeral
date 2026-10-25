# Settings → Team: the staff drawer, profile, services and access (P4 slice 2, Team PR 3a; feat/settings-team-drawer)

- Changed: a Team row (not someone no longer on the team) opens the staff drawer (B-Team `sd`, design §28.4, book
  B-45, B-46; `pages/settings-team/ui/member-drawer.tsx`): the avatar, the full name, «You» or the specialization with
  the level; tabs Profile, Services, Access level (Hours comes with Team PR 3b). **Profile**: the name clients see
  («Clients see: Maral · Nail artist» for someone clients pick), the full name the team sees, the specialization, the
  phone (the owner keeps it for someone without the app who never joined, mobile and not on the team; otherwise read
  only, with why). **Services**: what they do in the menu's groups (`ServicePicker`, now shared with «Add a team
  member»). **Access level**: the owner's lock text on the owner's row; the level with what it means and «See
  permissions»; a specialist's «Uses the app» with the board's six captions, the invite box (Invited, until when, Copy
  invite link) and the no-app box; «Can answer own requests» for someone who signs in, naming the business's rule.
  One Save sends what changed (`saveOf`, tested): `PATCH` with the profile, the access and the app off; the services
  through `PUT …/services`; an invite when the app goes on; the toast says which («Invite created for …» with Copy
  invite link, «Invite cancelled · …», «… no longer uses the app …», «…: changes saved»). The administrator reads it
  all and saves only Services; nothing closes the drawer while it saves.
- Decided (Claude, delegated; chapter 9, 25.10.2026, B-45, B-46 (how)): Admin is offered only to someone who already
  uses the app (the api makes administrators of people who signed in); «Can answer own requests» is on (follows the
  rule) or off (the api keeps a yes or no, not the board's third «set for them» state); the phone stays mobile only
  as on the board, though the api takes a landline without the app.
- Follow-ups: Team PR 3b (Hours with time off, Remove and Reactivate with AffectedBookingsList in `entities/booking`);
  the drawer header's line and the tabs' line sit one under the other (the board has the tabs' only).
