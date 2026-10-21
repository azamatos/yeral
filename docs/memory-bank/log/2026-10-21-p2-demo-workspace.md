# 2026-10-21 · The business app's demo workspace, part 1: the data (feat/p2-demo-workspace)

- Changed: migration 0040 (`users.demo`, `businesses.sandbox`); `MARKET.phone.unusedPrefix` (`69`); the seed's Glow
  Studio block is `seedGlow()`, used by development's demo and by `seedSandbox()` (one business into a live database:
  the old one deleted with what visitors added, the design's Glow Studio made again at `/w/demo`, every number moved to
  the unused range by `demoPhones()`, demo accounts kept by number, booking codes skipping the table's);
  `modules/demo/sandbox.ts` (`keepSandbox` in `runDueJobs`: made when missing or older than the last 04:00;
  `isSandbox`); never public (`isPublic`, `publicRow`, `visibleBusiness`: its own team sees it as it would be); no
  SMS (`businessSmsLimit`, `dropped: the demo workspace sends no SMS`); nothing joins an account (`linkPhone`,
  `phoneClient`, `holderAccount`). `DEMO_WORKSPACE` in the config, `deps.demoWorkspace`, the server's compose (off).
- Decided (Claude, delegated; chapter 9, 21.10.2026): the slug, the 04:00 remake, the unused range and demo accounts,
  requests that wait until their visit in the demo.
- Follow-ups (part 2, the session): `POST /v1/demo/session` signs the visitor in as the demo owner; a demo account may
  use only its workspace (`/v1/w/demo/…` minus invites), `GET /v1/me`, `/v1/me/workspaces`, events, logout and public
  reads, else 403; numbers it types must be in the unused range (S-20: no visitor sees another's number); `me.demo`
  for the Demo banner (web-b2 shows status `demo` in `/me/workspaces`); a demo session lasts a day.
