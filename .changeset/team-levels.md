---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
'@yeral/sdk': minor
---

Three fixed access levels, the team model, invites and the team endpoints (book chapter 3, chapter 10 P2 step 2;
ADR 0025).

- `@yeral/domain/permissions`: the levels and the fixed permission table (11 rows), `canOn()` (a booking shared with
  another specialist is changed by the owner or an administrator), `canManageTeam()` and `canAnswerRequest()` with
  the business's "who answers requests" setting (`requestAnswerers` in the booking rules) and the per-person
  override. `@yeral/domain/team`: invites are valid 7 days.
- The database: each team member is their `staff` row, linked to their account with a level; invites have their own
  table. Migrations `0005` (moves the data) and `0006` drop `roles` and `memberships`. Staff status `disabled` is
  `removed`.
- New endpoints (`@yeral/contract/team`, `sdk.team`): the switcher `GET /v1/me/workspaces` (request counts, the last
  opened), the person's invites `GET /v1/me/invites` with accept and decline, the link `GET /v1/invites/{token}`, and
  the team the owner manages under `/v1/w/{slug}/team` (invite, resend, cancel, a specialist without the app and
  switching the app on, level and override, remove, reactivate) and `POST /v1/w/{slug}/leave`. New errors
  `already_on_team`, `invite_expired`, `invite_answered`, `owner_cannot_leave`, `owns_workspace`; new event
  `team.changed`.
- Signing in no longer joins a team by itself; invited people aren't on the client site until they accept; a team
  member's live events follow their level; deleting an account takes its rows off every team, and an owner can't
  delete theirs.
