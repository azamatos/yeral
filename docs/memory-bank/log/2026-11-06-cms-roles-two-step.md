# The admin tool's roles and its sign-in in two steps (the owner's #1 and #24 of 04.11; `feat/cms-roles-two-step`)

- What's there: `admins.role` (`superadmin | admin`, migration `0046`: the earliest account becomes the superadmin, a
  partial unique index keeps it to one); the rule in `@yeral/domain/admin-roles` (`managesTeam`, `teamActionRefusal`),
  used by the api's guards (`superadmin_only`, `superadmin_protected`) and the cms's Team page (a Role column, the
  buttons only for the superadmin and never on the superadmin's row, «Add a teammate» for the superadmin, a line for
  admins); `admin-invite` makes the first account ever the superadmin and keeps its arguments. The sign-in:
  `POST /v1/admin/sign-in` takes the login and the password and answers a challenge (`admin_challenges`, 5 minutes, 5
  wrong codes, hashes only); `POST /v1/admin/sign-in/code` takes the code for it; the cms `/login` has the two steps
  («Signed in as <login> · Change»). ADR 0026 amended, book Q-011, chapter 3 and chapter 9 (04.11.2026 row).
- Decided (Claude, delegated): a wrong code at step 2 is `admin_code_wrong` (the setup's code too); a spent, expired or
  used challenge is `sign_in_expired` (401) and the app goes back to step 1 with its message; an account held for 10
  wrong codes in the hour answers `rate_limited` with the wait at either step (before: `sign_in_failed`), since only
  someone with the password gets there. The server command may still reset the superadmin: it's their only way back.
  `superadmin_protected` comes before the own-account check, so the superadmin on themselves reads as protected, not
  as «you can't do this».
- Traps: the contract's `AdminSignIn` lost `code` (the cms and the api deploy together, so no `/v2`); the e2e
  `admin.spec.ts` signs in through both steps; a TOTP step is ±1, so a test that signs in twice from one secret moves
  the clock a minute. Api tests ran on a private Postgres (`initdb` + `pg_ctl` on 54329, `TEST_DATABASE_URL`), not Docker.
- What's left: no manager role (no rights defined); the Team page's invite modal has no role picker (every invite is
  an admin); `admin_challenges` rows that run out are swept only when their account signs in again (a few bytes each);
  the Storybook suite and the e2e ran in CI only.
