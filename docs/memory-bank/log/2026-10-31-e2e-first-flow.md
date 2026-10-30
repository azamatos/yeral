# 2026-10-31 · The first end-to-end test: the booking loop in CI's Docker stack

The 27.10 review found no end-to-end test at all (slice 3's U8, `log/2026-10-25-slice-3-plan.md`). This PR adds
Playwright and two flows, run on every PR against the stack CI already brings up.

## What runs where

- `e2e/` is the workspace package `@yeral/e2e` (ADR 0013 names Playwright but not a place; the `testing` skill said
  "cross-app in `e2e/` at the root"): `playwright.config.ts`, `src/` (hosts, the seed's salon, a fresh number, the
  shared sign-in), `tests/owner.setup.ts` and `tests/booking-loop.spec.ts`. It imports no app code; `@playwright/test`
  joined the catalog beside `playwright`. `pnpm e2e` at the root runs it through Turborepo (`e2e` task, uncached,
  `E2E_*` and `CI` passed through).
- Chromium only, `workers: 1`: the flows share one salon's calendar, and CI's time matters (ADR 0013's "all three
  engines" stays for later if a browser-specific bug ever shows).
- Against running apps, never started by the tests: CI's stack on `http://yeral.localhost` and
  `http://business.yeral.localhost` (Caddy on port 80; Chromium resolves `*.localhost` itself, no `/etc/hosts`), or a
  developer's dev servers through `E2E_CLIENT_URL` / `E2E_BUSINESS_URL`. `ignoreHTTPSErrors` for a local TLS Caddy.
- CI: the `docker` job became «Docker stack and end-to-end flows»: pnpm and Node set up, Chromium cached by Playwright
  version (as the story tests' in `checks`), `pnpm e2e` after the health and push-channel checks, the HTML report and
  traces uploaded as `playwright-report` on failure, the stack's logs as before. Same workflow, so a red flow is a red
  PR. The stack now sets `SIGN_IN_CODE_ON_SCREEN=true` like the server (the flows read the code off the screen; the
  smoke check's `1234` still verifies).
- Locators by role and accessible name from the apps' `en.json`; no test id was needed: every control had a name.

## The flows

1. **Book → confirm.** A fresh random number (the market's mobile prefixes) picks two services on Glow Studio's page,
   any specialist, the first free time (or the next free day), signs in on the confirm step with the code on the
   screen and its name, sends the booking; My bookings shows it Pending. The owner (the seed's Maýsa, signed in once
   per run with a `storageState`) is already looking at the booked day: the request block appears without a reload
   (the push channel, ADR 0028); the request drawer, opened from the calendar's address (`?date=&request=`), is
   confirmed; the client's My bookings, open all along, shows Confirmed within seconds.
2. **Decline with two offers → the client takes one.** The same start; the owner declines with «This time isn't free»
   and two offered times; the client's row shows the decline and the offered times, takes the first, and a new
   booking stands Confirmed at that time (book B-20).

16 s for the three Playwright steps locally; in CI the job grows by the install, the cached browser and the run (about
2–3 minutes on top of the stack's build).

## Fixture strategy

- No reset between runs: each test signs a new number up and books a free time, so a run leaves bookings and a client
  behind that the next run doesn't depend on. In CI the stack is fresh every run (`down -v`). Locally the database fills
  up slowly; `pnpm db:seed` starts it over.
- The owner's number gets 5 codes an hour from the api (`CODES_PER_PHONE`): the setup project signs in once per run.
  More than 5 runs an hour against one local database need `delete from rate_limits` (operations.md).
- The salon is the demo seed's `glow-studio` (verified, `confirmMode: 'manual'`), bookable in the stack without
  `EXAMPLE_BUSINESSES`; `make-example` isn't needed.

## Found on the way

- The client site is rendered on the server and a click before React takes the page over is lost (the service's
  «Select» did nothing for about a second after load). The test retries the first click until it sticks; for a
  visitor on a slow connection this is a real miss: a follow-up could keep the clicks (`hydrateRoot` sooner, or a
  disabled state until hydration).
- A request's block on the calendar can sit under a neighbour's block at the click point (absolute layout, two
  services at once); the test opens the request by address instead. Worth a look in the day grid's stacking.

## Left: the rest of the slice's "Done when" as later tests

Expiry (an expired request offers 3 times), cancel + Undo and Undo failing once the time is taken, a move with its
ghost block, the «How was it?» card and the review on the page; the 390 px width; a Russian-length check. Each is a
test in `e2e/tests/` on the same helpers.

## Local run on this machine (Docker off)

A private Postgres 18 in the scratchpad on port 54333 (`initdb`, `pg_ctl`), `pnpm --filter @yeral/api db:setup` with
`DATABASE_URL`, the api started directly (`pnpm --filter @yeral/api dev` with `SIGN_IN_CODE_ON_SCREEN=true`; through
turbo the task strips `DATABASE_URL`, so use `.env.local` or run it directly) and the two sites through
`pnpm dev --filter=…` with `PORT_BASE=3400`; then `E2E_CLIENT_URL=http://localhost:3401
E2E_BUSINESS_URL=http://localhost:3402 pnpm e2e`.
