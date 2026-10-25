# The staff drawer's api (P4 slice 2, before Team PR 3; feat/api-team-edit)

- Changed (additive): `PATCH /v1/w/{slug}/team/{staffId}` (`updateMemberSchema`) takes `name`, `fullName` (`null`
  clears), `specialization` (`null` clears), `phone` (someone without the app only: `signs_in` otherwise; not a number
  already on the team: `already_on_team`) and `hasApp: false` (an open invite cancelled, the person active without the
  app, their bookings with them; someone who had joined loses the workspace) beside `level` and `canAnswerOwn`. The
  owner's own row takes the names only; an administrator always uses the app (`invalid` on `hasApp` or `level`).
- Changed (additive): `PUT /v1/w/{slug}/team/{staffId}/services` (`memberServicesSchema`, `sdk.team.setServices`):
  everything the person does in one transaction, by the owner or an administrator (`can(actor, 'services')`), under the
  menu's lock (`lockMenu`, exported from `modules/menu/service.ts`); any service makes them bookable; `business.updated`
  follows, as a service's own «who does it» does.
- Changed (additive): `PUT …/schedule` takes `affected: 'cancel'` (B-Team's «Cancel and offer 3 other times»), beside
  `move` and `keep`.
- Decided: the book's chapter 9, 25.10.2026, B-45, B-47, Q-216 (how); the owner approved the api change.
- Tests: `team.test.ts` (the profile, the phone, the owner's names, the app off, the services by an administrator),
  `away.test.ts` (a day off cancelled with offers); the OpenAPI list in `me.test.ts`. Run in CI (Docker stays off here).
- Next: the staff drawer (Team PR 3a: profile, services, access; 3b: hours and time off, remove and reactivate).
