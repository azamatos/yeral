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
- Review (one round, 15 findings): Admin keeps the app on (no `hasApp: false` with it); the phone locks while an invite
  waits for it and shows the api's `signs_in` on the field (someone who joined once); turning the app on needs a mobile
  number; an ended invite reads as invited; the save of one person never closes another's drawer (the save is tracked
  per person, and a save that ends after the drawer moved leaves it); spaces don't count as a change; the profile and
  services go together; Close waits while saving; no answer switch with «Owner and admins»; the limits sit in
  `@/shared/config`; Team's rows use `invitePending` and `inviteDaysLeft`.
- Decided (Claude, delegated; chapter 9, 25.10.2026, B-45, B-46 (how)): Admin is offered only to someone with the app; «Can answer own requests» is on (follows the
  rule) or off (the api keeps a yes or no, not the board's third «set for them» state); the phone stays mobile only
  as on the board, though the api takes a landline without the app.
- Follow-ups: Team PR 3b (Hours with time off, Remove and Reactivate with AffectedBookingsList in `entities/booking`);
  the drawer header's line and the tabs' line sit one under the other (the board has the tabs' only); the api replaces
  a specialization's every language with the one sent (merge per language before Turkmen and Russian); the member
  could carry what may change (a linked account, whether an invite can go) instead of the app working it out; the
  group with «All» belongs in `@yeral/ui` (COMPONENTS.md: Checkbox GroupWithSelectAll, also for Services' «Who does
  it»).
