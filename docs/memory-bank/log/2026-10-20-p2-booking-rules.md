# Booking rules settings (feat/p2-4-booking-rules)

- Changed: P2 step 4 begins (book B-41, B-42). New module `settings` (`apps/api/src/modules/settings`) and contract
  `@yeral/contract/settings`: `GET`/`PATCH /v1/w/{slug}/settings/rules`. `requireSettings` = `requireMember` + the
  `settings` permission (owner, administrator; a specialist 403, not on the team 404). `updateRules` checks the changed
  fields with `rulesErrors` (an invalid stored value elsewhere doesn't block a change) and writes `business.updated`.
  Lateness is read-only (`LATE_MINUTES`). The "how" is a 20.10.2026 row in chapter 9.
- Events: `business.updated` is new; everyone on the team hears it like `team.changed` (`events/routes.ts`), since
  who answers requests may change. The sdk refreshes settings, the page, free times and the switcher.
- Q-205 needs nothing: each request stored its own hold and status; a test pins it.
- Follow-ups: next in step 4, opening hours and special days (B-39, B-40) with `weekHoursErrors()`; then services and
  groups (B-38), the profile (B-37), staff schedules (B-47). The requests endpoints apply `requestAnswerers`.
