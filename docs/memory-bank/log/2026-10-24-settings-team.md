# Settings → Team, the list (P4 slice 2; feat/settings-team)

- **The section** (`pages/settings-team`, B-Team `tab=team`, design §8 «Topar», §28.4 Team, book B-43–B-50): the team
  in groups as the board draws them: Specialists («Clients see and pick»: specialists and anyone doing a service),
  Management (they take no bookings), Invites (each works 7 days), No longer on the team. A row: the avatar letter, the
  full name and the specialization (or the phone; «You» for the signed-in person), the access level pill, the number
  of services (from the menu's `staffIds`), the hours («Business hours», or «Own shift» with «12:00–19:00», «varies by
  day», «no working days», from each specialist's schedule), and the status: Active · Invited («N days left», or «works
  without the app until they accept» for a specialist without the app who was sent an invite) · Expired («ended on …»)
  · Declined · Cancelled · Removed, «Doesn’t use the app», and «They’ll see the invite when they sign in with +993 64 ••
  •• 90». Under 1024 the level, services and hours share one line under the name.
- **The owner's actions:** «Copy invite link», «Resend invite», «Cancel invite» (an open invite's menu), «Reactivate»
  (someone removed, with its caption). The administrator sees the board's note and no actions.
- **Delegated (Claude, 24.10.2026, the coordinator's call):** the api keeps only an invite token's hash, so an open
  invite's link can't be listed; «Copy invite link» resends the invite and copies the link the resend returns (its 7
  days start again). The token storage stays as it is.
- **Not in the contract yet:** someone who left and someone removed are both `removed` (STAFF_STATUSES), so the list
  shows «Removed» for both, with Reactivate; the board's «Left» with «Invite again» needs a `left` flag on the member
  (a small additive contract change, follow-up). No removal date either («Removed · 19 October»).
- Next PRs: add a member / invite (phone, name, specialization, level, uses the app, services, the board's errors);
  the staff drawer (profile, services, hours, time off) and remove with the AffectedBookingsList (moved to
  `entities/booking` with its second user); the specialists' order (drag, the save bar).
