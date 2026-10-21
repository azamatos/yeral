# 2026-10-21 · The business app's demo workspace (feat/p2-demo-workspace, feat/p2-demo-session)

- Part 1, the data. Changed: migration 0040 (`users.demo`, `businesses.sandbox`); `MARKET.phone.unusedPrefix` (`69`); the seed's Glow
  Studio block is `seedGlow()`, used by development's demo and by `seedSandbox()` (one business into a live database:
  the old one deleted with what visitors added, the design's Glow Studio made again at `/w/demo`, every number moved to
  the unused range by `demoPhones()`, demo accounts kept by number, booking codes skipping the table's);
  `modules/demo/sandbox.ts` (`keepSandbox` in `runDueJobs`: made when missing or older than the last 04:00;
  `isSandbox`); never public (`isPublic`, `publicRow`, `visibleBusiness`: its own team sees it as it would be); no
  SMS (`businessSmsLimit`, `dropped: the demo workspace sends no SMS`); nothing joins an account (`linkPhone`,
  `phoneClient`, `holderAccount`). `DEMO_WORKSPACE` in the config, `deps.demoWorkspace`, the server's compose (off).
- Review fixes (web-b2, 14): the unused range is no mobile (`isUnusedNumber`, `isMobile`), so no real account ever
  holds a demo number and nothing (the SMS port) is sent to one; the remake drops visitors' uploads after it commits
  (`dropPhotos`), puts a demo account's photo, language and switches back, fills `told` only for its own bookings and
  looks up only the codes it may take; a failed remake logs `demo workspace not made` and keeps the old one; `demo`
  is reserved (`DEMO_SLUG`); the admin queues leave it out; a request made after its visit waits the hold time;
  `accountFor()` replaces the two copies of the no-account rule; `businessSmsLimit` takes the row its callers hold.
- Decided (Claude, delegated; chapter 9, 21.10.2026): the slug, the 04:00 remake, the unused range and demo accounts,
  requests that wait until their visit in the demo.
- Part 2, the session. Changed: `POST /v1/demo/session` (`modules/demo/routes.ts`; 30 an hour per address; the
  previous session ends) signs the visitor in as the demo owner; `demoGuard` after `sessionMiddleware`
  (`modules/demo/guard.ts`): a demo account may use its workspace (`/v1/w/demo/…` minus invites, photos and logo,
  leave, setup, verification, review reports), `GET /v1/me`, `/v1/me/workspaces`, events, `/v1/auth/*` and public
  reads, else `not_in_demo` (403); every `phone` in a body must be in the unused range, else `demo_number` (400,
  `details.prefix`). A demo account's session lasts a day and isn't renewed (`startSession`, `sessionMiddleware`).
  `me.demo` (contract, `toMe`; `canChangePhone` false for it); `@yeral/contract/demo` `demoSessionSchema`;
  `sdk.demo.start()`. The apps' fakes got `demo: false`.
- Decided (chapter 9, 21.10.2026): a day, never renewed; what a demo account reaches; made-up numbers only.
- Follow-ups (web-b2, the apps): the Demo frame from `me.demo` (signed-out sidebar with "Log in", the Demo banner,
  status `demo` in `/me/workspaces`), "Try the business app" on the landing, the login and the wizard, and
  `demo_number`'s hint ("In the demo, use a made-up number starting with 69").
