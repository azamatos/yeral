# Operations: environments, hosting, Docker, CI/CD, versioning, parallel work

Status 2026-10-25: production = the owner's server (`yeral-vps`): the api, its jobs and Postgres, the client site and
the business app, and Caddy serving `api.yeral.app`, `yeral.app` (the client site, noindex until the first launch;
`www` redirects to it) and `business.yeral.app`; the old Next.js site (`apps/legacy`, the
Worker `yeral-web`) was retired on 2026-10-22/23. Storybook is the only Cloudflare deploy left (`deploy.yml`, on every
push to `main`). Releases are paused until the MVP works (ADR 0009, amended 2026-10-21: `release.yml` and Changesets
removed). The `CLOUDFLARE_API_TOKEN` repository secret is set; without it the deploy job skips with a warning. Since 2026-10-16 there
are two kinds of environment only, local and production (ADR 0020): no staging.

## Environments

| Env | Hosts | Database | Deployed |
|---|---|---|---|
| local | `localhost:3001–3005` (`PORT_BASE` + offset; +0 is free) | Postgres in Docker, one database per worktree | `pnpm dev` |
| local, production-like | `*.yeral.localhost` through Caddy | Postgres container | `pnpm docker:up` |
| production | the owner's server `yeral-vps`: `api.yeral.app` since 2026-10-22, `business.yeral.app` and the client site on `yeral.app` (noindex until the launch; `www` redirects) since 2026-10-25, `cms.` with its app; `storybook.` on Cloudflare | Postgres 18 on the server (categories, no demo) | by hand with `infra/server/yeral/deploy.sh` until GitHub deploys exist; Storybook on every push to `main` |

No staging and no PR previews (ADR 0020): a change is proven locally (tests, the Docker stack), reviewed, and merged on
green CI; production is deployed by hand, when the owner asks, while releases are paused. A risky migration is rehearsed on a production dump restored into
the local Postgres. All hosts come from config (`@yeral/lib/site`), so a new domain is a config change.

## Hosting (ADR 0024)

The own server runs the api, its jobs, Postgres, the business app and the client site (since 2026-10-25), and later
the cms app, in Docker behind one shared Caddy (section "The own server" below). Cloudflare keeps:

| What | Where |
|---|---|
| DNS for `yeral.app` | records point at the server, not proxied (Caddy gets the certificates) |
| `storybook.yeral.app` | Worker `yeral-storybook`, deployed from `main` |
| mail to `hello@yeral.app` | Email Routing forwards it to the owner's inbox (its MX, SPF and DKIM records; nothing sent; 2026-10-23) |
| backups | R2 with the real working MVP, not the demo launch (owner, 2026-10-22; needs the owner's token then) |

**Cost:** the server (€16.68 a month, €12.32 on a 12-month term), shared with the owner's other projects; Workers
Free for Storybook; R2 free up to 10 GB.

**Left on the owner's accounts, unused** (delete only if the owner asks): the Neon project Yeral (Frankfurt) and the
Hyperdrive config `yeral-production` (created 2026-10-18).

**Owner's one-time steps** (when the milestone needs them): the DNS records (`infra/server/README.md`, "DNS records";
the A records for `@`, `www`, `api`, `business` and `cms` done 2026-10-22; Email Routing for `hello@` and the `_dmarc`
record, chosen 2026-10-23); the Worker `yeral-web` (deleted 2026-10-23); with the real working MVP (P6), an R2 token
for backups and accounts for error tracking and uptime checks (owner, 2026-10-22: not for the demo launch).

## Local database and API tests (since M2d)

- `pnpm db:up` starts Postgres 18 from `infra/docker/compose.dev.yml` (user/password `yeral`, port 5432, a named volume).
  When another Postgres already holds 5432 on the machine, `YERAL_DB_PORT=5433 pnpm db:up` and use 5433 in
  `DATABASE_URL` and `TEST_DATABASE_URL`.
- `apps/api/.env.local` (copy `.env.example`) names this worktree's database: `DATABASE_URL=postgres://yeral:yeral@localhost:5432/yeral`
  (a second worktree uses `…/yeral_<branch>`). `pnpm db:setup` creates it if missing, applies the migrations and seeds the
  demo while the database has no businesses; it never touches a database that has them. `pnpm db:seed` starts the demo over.
- Seeding wipes the database, so `db:seed` and `db:setup` refuse any host but localhost/`postgres`/`db` unless
  `--allow-remote` is passed (production, by hand), and refuse without an explicit `YERAL_ENV` (`.env.example` sets
  `local`): `local` and `docker` seed the demo, `production` writes only the category catalogue. The seed is one
  transaction: if it fails, the database stays as it was.
- Demo dates move with today, once: the design's demo day (2026-10-14) becomes the day you seed, and stays that date.
  A database seeded on an earlier day shows that day's demo (requests expired, "today" in the past): `pnpm db:seed` (wipes
  the database) brings it to today. Weekly data turns with the dates (opening hours, shifts, breaks, the yoga week), so the
  demo day always has the design's Wednesday, whatever weekday it is. Photos are served by the Node entry (dev and
  `start`) from `docs/design/assets/photos` at `/media/demo/*`; the api image carries them at `/app/demo-photos`
  (`DEMO_MEDIA_DIR`) and serves them in production too, for the first launch's example businesses.
- API tests: `TEST_DATABASE_URL` (default `postgres://yeral:yeral@localhost:5432/postgres`, an admin connection). A global
  setup migrates a template of the run's own (`yeral_test_<run>_template`); each test file gets a copy
  (`create database … template …`); at the end the run drops every `yeral_test_<run>_…` database, so parallel runs from
  several worktrees share one server.
  CI runs a `postgres:18` service container for this (`ci.yml`, job «Format, lint, types, tests, build»).
- Migrations: `pnpm db:generate` (drizzle-kit, `apps/api/src/db/migrations`); hand-written SQL (extensions, exclusion
  constraints) goes into a `--custom` migration. Never edit a merged migration.

## The api in production

- One Node process (`apps/api/src/entry/node.ts`): one `pg` pool, the app, and the jobs tick every minute
  (`modules/jobs/tick.ts`): a transaction-level advisory lock keeps runs from overlapping if a second process ever
  runs; failures are logged.
- Client IPs for rate limits: `TRUSTED_IP_HEADER=x-forwarded-for`, the one header the api trusts: its last entry, which
  Caddy writes after dropping what the caller sent. A proxy in front of Caddy would need Caddy's `trusted_proxies`.
  Visitors over IPv6 would arrive as the Docker gateway (the edge network has no IPv6), so `api.yeral.app` gets only an
  A record until IPv6 is set up (`infra/server/README.md`).
- Caddy (server and local) caps request bodies at 11 MB (a photo of 10 MB and its form), sets `nosniff`, `Referrer-Policy` and `X-Frame-Options`, and
  writes a JSON access log.
- Sign-in codes never reach a log: the SMS log adapter writes "(sign-in code hidden)" for them.
- SMS: every environment writes them to the log (`ports/sms.ts`) until a gateway comes with the Turkmenistan launch.
- The first launch's sign-in code on the screen: `SIGN_IN_CODE_ON_SCREEN=true` (off unless set; the api refuses it
  with a gateway that delivers). With it on, anyone who types a number signs in as it (book Q-036 and its concern).
  The server's `compose.yml` has it on since 2026-10-25 (the owner), ahead of the first launch, so the business app at
  `business.yeral.app` can be tried live: test data only; the examples and the demo workspace stay off until the launch.
- The Ýeral team's admin tool (ADR 0026): `ADMIN_SECRET_KEY` in `/srv/yeral/.env` (deploy.sh makes it once with
  `openssl rand -base64 32`; development and the local stack use a fixed key) seals the authenticator secrets; without
  it the admin endpoints answer `admin_unavailable`. Keep it with the backups' secrets: losing it means every account
  sets up its app again. The first account, or a new link for one that's locked out:
  `docker compose -f /srv/yeral/compose.yml run --rm api node dist/cli.js admin-invite <login> "<name>"` prints a
  setup link (24 hours) to hand over in person; locally `pnpm --filter @yeral/api admin:invite <login> "<name>"`.
- The first launch (book Q-004, Q-030): `EXAMPLE_BUSINESSES=true` makes `setup` (every deploy's migrate step) add the
  design's appointment businesses that aren't there yet, marked "Example" and confirming at once, with no team; their
  photos come in the api's image (`/app/demo-photos`, `DEMO_MEDIA_DIR`). They show Ýeral's support phone
  (`YERAL_SUPPORT_PHONE`, or `EXAMPLE_PHONE` when set; one of the two is needed), never the design's numbers. `BOOKING_TYPES=appointment` keeps tables and classes out of
  lists and search. Both sit in the server's compose; the examples are on since 2026-10-25 (the owner), with the code on the screen, so booking can be tried live. When the pilot
  ends, hide them from the admin tool (a close can't be undone for a business with no owner account).
- One of the owner's test businesses open to clients (the owner's D2, 25.10.2026; book chapter 9): nothing is verified
  while the code shows on the screen (ADR 0023 amended), so
  `docker compose -f /srv/yeral/compose.yml run --rm api node dist/cli.js make-example <slug>` opens the business at
  that page address (its current one) to clients, marked "Example" as the seeded ones are, with its own booking rules
  (it still confirms by hand if it did), so answering, declining and expiry can be tried live; it prints the
  business's name to check. `--off` takes the mark away, and an open one back to "in review" (a verdict the Ýeral team
  gave meanwhile stays). Opening needs the code on the screen (the api's rule: `SIGN_IN_CODE_ON_SCREEN=true` and no
  SMS gateway) and a business in review: refused for one still being set up, closed, hidden, or verified or sent back
  by the team; `--off` works at any time (take them back before the real SMS sign-in: nothing else removes the mark).
  Both refuse the demo workspace and a business with no owner who signs in (the seeded examples, whose phone the
  examples step keeps up; it leaves a business with a team alone). A change of verification goes in the business's
  verification history, and its team's banner and page follow at once (`business.reviewed`). Locally
  `pnpm --filter @yeral/api make:example <slug> [--off]`.
- The business app's demo workspace (book F-242): `DEMO_WORKSPACE=true` makes the jobs (every minute in the api) create
  it when it's missing and again after every 04:00, Ashgabat time: the design's Glow Studio at `/w/demo`, its numbers in
  the market's unused range (`MARKET.phone.unusedPrefix`), each a team member uses held by a demo account (`users.demo`),
  kept from night to night. It's never public, sends no SMS and links nothing to a real account (`businesses.sandbox`).
  Turn it on with the examples when the first launch opens.
- The address search (ADR 0027): `GEOCODER_URL` is a Photon server's address (its `api` under it), the public
  `https://photon.komoot.io` by default (fair use, no guarantee; the api caches a day, pauses a minute after a failure,
  and counts 120 searches an hour per account and 240 per address); `off` turns it off and the pin is placed by hand. For the Turkmenistan launch: a self-hosted Photon with the country's extract, or a paid
  geocoder (the owner's call).
- Photos: the ones people upload on the server's disk behind a storage port (`ports/storage.ts`), in `MEDIA_DIR` (the
  `media` volume at `/data/media` on the server and in the local stack; `apps/api/data/media` in development),
  served at `/media/up/…`; the design's demo photos come with the image (above). The nightly backup (with the real working MVP, P6) must
  take the volume along with the database.

## The production-like stack (since M2g)

`pnpm docker:up` builds `infra/docker/api.Dockerfile` (turbo prune with the lockfile's turbo → pnpm install → esbuild
bundle → `node:24-alpine` with `dist/` and the design's demo photos), starts Postgres 18, runs `migrate` (`node dist/cli.js setup`: migrations,
demo seed while empty), the api (jobs tick inside), the business app, the client site and Caddy
(`infra/docker/Caddyfile`, plain HTTP, one site per host): http://yeral.localhost, http://business.yeral.localhost,
http://api.yeral.localhost/docs. A single-page app's image
(`infra/docker/business.Dockerfile`) builds it with its hosts baked in (`YERAL_ENV`, `YERAL_DOMAIN` build arguments →
`VITE_*`) and serves `dist/` with a small Caddy of its own (`static.Caddyfile`: every app address answers
`index.html`, hashed files cached for a year, `noindex`); the front door adds the security headers. The client site's
image (`infra/docker/client.Dockerfile`) bakes its hosts in the same way and runs one Node process with no
`node_modules`: Vite bundles the renderer (`ssr.noExternal`) and esbuild the server (`apps/client/server.mjs` →
`dist/node.mjs`: hashed files cached for a year and a missing one a 404, every page rendered by TanStack Start). The
renderer asks the api inside the stack (`API_INTERNAL_URL=http://api:3004`, read at run time; unset = the public api
address) and passes the visitor's cookie on. The server's stack
takes the apps when they have something to serve (P2 step 7). CI's «Docker stack» job does the same, asks for health through Caddy, and validates
the server's Caddy config (`infra/server/edge/Caddyfile` with `yeral.caddy`).
`pnpm docker:down` stops it (`-v` drops the data). The demo keeps the day of the first `docker:up`; start it over with
`docker compose -f infra/docker/compose.yml run --rm migrate node dist/cli.js seed`.

## The own server (since 2026-10-19)

A netcup VPS 1000 (4 vCPU, 8 GB, 128 GB, Ubuntu 24.04, EU), `ssh yeral-vps` from the owner's Mac (key login; the
owner's Claude Code allows `Bash(ssh yeral-vps:*)`). It also hosts the owner's other projects. Everything about it:
`infra/server/README.md`.

- `setup.sh` ran on 2026-10-19: keys-only SSH, firewall (SSH, 80, 443), fail2ban, automatic security updates, 2 GB
  swap, UTC, Docker 29 with log rotation, the `edge` network, a `deploy` user.
- `/srv/edge`: one Caddy for every project (HTTPS by itself); projects add `sites/<project>.caddy`.
- `/srv/yeral`: Postgres 18 and the api (image built on the server from a `git archive`), `.env` with the database
  password (server only). First deploy 2026-10-19 at `382c6bc`: health ok, 13 categories.
- Not yet: the `api.yeral.app` DNS record (the owner adds it, 2026-10-22; then `PUBLIC=1` adds the Caddy site), GitHub
  deploys over SSH; nightly backups to R2 (an R2 token in `.env`) come with the real working MVP (P6).

**The Turkmenistan deployment** (ADR 0023) is the same stack on a second server inside the country: buy it about a
month before that launch → test from Ashgabat that its address and the DNS work without a VPN → run `setup.sh` and the
stacks → restore the database and photos → switch the DNS records → point the deploy at it (book chapter 10).

## CI/CD (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | pull request, push to `main` | pnpm install (cached) → format check → one `turbo run lint lint:fsd typecheck test build --affected` step (on `main` without `--affected`): the Storybook stories run as Vitest browser tests in Chromium, the api tests against a Postgres 18 service · a Docker job builds and starts the api stack (`infra/docker/compose.yml`) and checks its health through Caddy · the PR title is checked as a Conventional Commit |
| `deploy.yml` | called by `ci.yml` for Storybook; by hand (Actions → Deploy) | build → `wrangler deploy` for Storybook; the api and the new apps over SSH to the own server from P2 step 7 (by hand until then: `infra/server/README.md`) → smoke check: `/version.json` shows the commit, key pages answer 200 |
| `ci.yml` → `deploy-storybook` | push to `main` after checks | builds Storybook and deploys it to storybook.yeral.app (no release needed: internal docs) |
| Renovate | weekly | grouped dependency PRs; dev-dependency patches merge themselves when CI is green |

Turborepo's cache: `lint`, `typecheck` and `test` depend on `^transit`, an empty task, so a change in a package's
dependencies (say `@yeral/ui` for the Storybook tests, `@yeral/contract` for the api) changes their hash and they run
again instead of replaying a cached result. A new task that reads its dependencies' files needs the same. A task
that reads a file outside every package lists it as an input with `$TURBO_ROOT$` in its package's `turbo.json`
(`@yeral/ui#test` reads `docs/design/tokens.css`; the Storybook build and tests and the api tests read
`docs/design/assets/photos`); otherwise a change there runs no check at all.

## Versioning (releases paused)

- **Trunk-based.** `main` is always deployable. Short branches `feat/…`, `fix/…`, `chore/…` → pull request → squash merge.
  PR titles follow Conventional Commits with the app or package as scope: `feat(client): show free slots on cards`.
- **No releases while the MVP is built** (the owner, 2026-10-21; ADR 0009 amended): no changesets, no version PR, no
  tags or GitHub Releases. Versions and the `CHANGELOG.md` files stay where they are; releases (Changesets or another
  tool) come back before the first launch (book chapter 10, P2 step 7). Packages use `workspace:*`.
- **API versions:** path prefix `/v1`; only additive changes inside it; breaking changes ship as `/v2` side by side.
  Planned, not built: CI comparing the OpenAPI document with `main` and failing on breaking changes (oasdiff).
- **Database:** drizzle-kit SQL migrations in git, forward only, expand → migrate data → contract.
- **Build stamp:** `/version.json` `{ app, version, commit, builtAt }` in every app; `X-Yeral-Version` from the api.

## Secrets

- GitHub secrets, never in the repo or in chat: `CLOUDFLARE_API_TOKEN` (the Storybook Worker's deploys);
  later the SSH deploy key for the own server, the error tracker's DSN and the SMS gateway keys.
- On the server: `/srv/yeral/.env` (mode 600) holds the database password, `ADMIN_SECRET_KEY` and the ways to reach
  Ýeral (`YERAL_SUPPORT_PHONE`, `YERAL_SUPPORT_TELEGRAM`, `YERAL_SUPPORT_EMAIL`: the owner's own phone and Telegram,
  never in the repo, and `hello@yeral.app`; the api reads them from the compose environment, the sites bake them in at
  build time through `deploy.sh`'s build args), later (P6) the R2 token for backups.
- The owner creates tokens in the providers' dashboards and stores them with `gh secret set NAME --env production`
  (the value is typed into the prompt).
- Local: `.env.local` per app (gitignored); `.env.example` committed and documents every variable.

## Repository

- Public by the owner's choice until the product is ready, then private. Never commit secrets.
- Branch protection on `main` was set on 2026-10-13: required checks «Format, lint, types, tests, build» and «PR title
  is a Conventional Commit», branch up to date before merge, linear history, no force pushes. On 2026-10-27 none was
  found (no classic protection, no ruleset), so nothing enforces it: agents still merge only through a PR with green
  CI, rebased on `main`. The owner keeps it off while the demo app is built and turns it on when it's done (27.10).
- Issues and a GitHub Project board hold the tasks (ADR 0014).

## Parallel agents (ADR 0014, skill `parallel-work`)

- Instructions for any agent tool: `AGENTS.md`; Claude Code adds `CLAUDE.md` and `.claude/skills`.
- Task = GitHub issue with scope + acceptance criteria; claim with label `agent:<name>`.
- One worktree + branch per task; `PORT_BASE` per worktree; database `yeral_<branch>` in the shared local Postgres.
- Hot spots (contract, ui tokens, catalog, turbo/root config, migrations) in small PRs that merge first.
- Memory notes go to `docs/memory-bank/log/YYYY-MM-DD-<topic>.md` during parallel work; the lead folds them in.

## Deploys and labels

- Apps deploy to production only (no staging, ADR 0020), by hand while releases are paused; smoke checks live in
  `scripts/smoke.sh`.
- The repository setting *Allow GitHub Actions to create and approve pull requests* (on since 2026-10-13) served the
  removed version PR; Renovate doesn't need it.
- Labels for tasks: `lane:*`, `status:*`, `type:*`; agents add `agent:<name>` when claiming (create it if missing).

## Local setup notes

- pnpm switches itself to the pinned 12.x. If an older global pnpm fails to switch (`ENOEXEC`, pnpm 10 can't run pnpm 12's
  native binary), run `npm i -g pnpm@12` once, or `node ~/Library/pnpm/.tools/pnpm/<version>/node_modules/pnpm/install.js`.
- pnpm 11+ blocks dependency install scripts unless listed in `allowBuilds` (`pnpm-workspace.yaml`); it also skips package
  versions younger than one day and records exceptions in `minimumReleaseAgeExclude`.
- `docs/design` is excluded from Prettier; Markdown is never auto-formatted.

## Rollback

- Cloudflare (Storybook): `wrangler rollback` to the previous version.
- The own server: point `YERAL_API_IMAGE` in `/srv/yeral/.env` at an earlier image (`docker images yeral-api`: they
  stay on the server) and run `docker compose up -d` in `/srv/yeral`, or redeploy the previous commit with `deploy.sh`. Migrations add before they take away (expand, then contract), so an
  image runs on a database migrated after it, back to the last contract migration: one that drops what older images
  read (0041 drops `users.notify_review_ask`, `businesses.avg_bill` and `businesses.typical_confirm_minutes`) ends
  that. An image older than it can't run on the database after it (Drizzle names every column it knows in its selects
  and returns), and `/v1/health` doesn't notice: roll back only to an image at or after the newest contract migration,
  or restore the database from the backup taken before the deploy (`deploy.sh` saves it as
  `/srv/yeral/backup-<date>-before-<commit>.sql.gz`, mode 600).
