---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

Three fixed access levels and the team model (book chapter 3, chapter 10 P2 step 2; ADR 0025).

- `@yeral/domain/permissions`: the levels and the fixed permission table (11 rows), `canOn()`, `canManageTeam()` and
  `canAnswerRequest()` with the business's "who answers requests" setting (`requestAnswerers` in the booking rules)
  and the per-person override. `@yeral/domain/team`: invites are valid 7 days.
- The database: each team member is their `staff` row, linked to their account with a level; invites have their own
  table. Migrations `0005` (moves the data) and `0006` drop `roles` and `memberships`. Staff status `disabled` is
  `removed`.
- Signing in no longer joins a team by itself; invited people aren't on the client site until they accept.
- `DELETE /v1/me` answers `409 owns_workspace` while the person owns a workspace.
