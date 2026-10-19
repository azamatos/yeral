# Operations: environments, hosting, Docker, CI/CD, versioning, parallel work

Status 2026-10-13 (M0): production = `apps/legacy` (Next.js) on Cloudflare. `ci.yml`, `release.yml`, `deploy.yml` exist;
legacy deploys to production from a release (first CI deploy: `@yeral/legacy@0.1.1`, 2026-10-14). The
`CLOUDFLARE_API_TOKEN` repository secret is set; without it the deploy job skips with a warning. Since 2026-10-16 there
are two kinds of environment only, local and production (ADR 0020): no staging.

## Environments

| Env | Hosts | Database | Deployed |
|---|---|---|---|
| local | `localhost:3000–3005` (`PORT_BASE` + offset) | Postgres in Docker, one database per worktree | `pnpm dev` |
| local, production-like | `*.yeral.localhost` through Caddy | Postgres container | `pnpm docker:up` |
| production | the owner's server `yeral-vps` (api running since 2026-10-19, no public host yet); `yeral.app` still serves legacy on Cloudflare; `storybook.` on Cloudflare | Postgres 18 on the server (categories, no demo) | by hand with `infra/server/yeral/deploy.sh` until GitHub deploys exist; Storybook on every push to `main` |

No staging and no PR previews (ADR 0020): a change is proven locally (tests, the Docker stack), reviewed, and merged on
green CI; production changes only from a release. A risky migration is rehearsed on a production dump restored into
the local Postgres. All hosts come from config (`@yeral/lib/site`), so a new domain is a config change.

## Hosting (ADR 0024)

The own server runs the api, its jobs and Postgres, and later the client, business and cms apps, in Docker behind one
shared Caddy (section "The own server" below). Cloudflare keeps:

| What | Where |
|---|---|
| DNS for `yeral.app` | records point at the server, not proxied (Caddy gets the certificates) |
| `storybook.yeral.app` | Worker `yeral-storybook`, deployed from `main` |
| `yeral.app`, `www` | Worker `yeral-web` = `apps/legacy` until the new client site replaces it |
| backups | R2 (P2 step 7; needs the owner's token) |

**Cost:** the server (€16.68 a month, €12.32 on a 12-month term), shared with the owner's other projects; Workers
Free for Storybook and legacy; R2 free up to 10 GB.

**Left on the owner's accounts, unused** (delete only if the owner asks): the Neon project Yeral (Frankfurt) and the
Hyperdrive config `yeral-production` (created 2026-10-18).

**Owner's one-time steps** (when the milestone needs them): the DNS records when going public, an R2 token for
backups, accounts for error tracking and uptime checks (P2 step 7).

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
  `start`) from `docs/design/assets/photos` at `/media/demo/*` outside production; Docker mounts them at `DEMO_MEDIA_DIR`.
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
- Client IPs for rate limits: `TRUSTED_IP_HEADER` names the one header the api trusts: `x-forwarded-for` behind Caddy
  (its last entry; Caddy writes it and drops what the caller sent), `cf-connecting-ip` only if Cloudflare's proxy ever
  sits in front.
- SMS: every environment writes them to the log (`ports/sms.ts`) until a gateway comes with the Turkmenistan launch.
- Photos: on the server's disk behind a storage port (P2 step 4); demo photos are served only outside production.

## The production-like stack (since M2g)

`pnpm docker:up` builds `infra/docker/api.Dockerfile` (turbo prune with the lockfile's turbo → pnpm install → esbuild
bundle → `node:24-alpine` with only `dist/`), starts Postgres 18, runs `migrate` (`node dist/cli.js setup`: migrations,
demo seed while empty), the api (jobs tick inside) and Caddy (`infra/docker/Caddyfile`, plain HTTP, one site per host):
http://api.yeral.localhost/docs. CI's «Docker stack» job does the same, asks for health through Caddy, and validates
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
- Not yet: the `api.yeral.app` DNS record (then `PUBLIC=1` adds the Caddy site), GitHub deploys over SSH, nightly
  backups to R2 (needs an R2 token in `.env`).

**The Turkmenistan deployment** (ADR 0023) is the same stack on a second server inside the country: buy it about a
month before that launch → test from Ashgabat that its address and the DNS work without a VPN → run `setup.sh` and the
stacks → restore the database and photos → switch the DNS records → point the deploy at it (book chapter 10).

## CI/CD (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | pull request, push to `main` | pnpm install (cached) → `turbo run lint lint:fsd typecheck test build --affected` → Storybook tests in Vitest browser mode → API tests with a Postgres service → Playwright on affected apps → Docker image builds for affected deployables. Required to merge |
| `release.yml` | push to `main` | Changesets: opens or updates «Version packages»; when merged, tags `@yeral/<app>@x.y.z`, creates GitHub Releases, deploys those apps to production |
| `deploy.yml` | called by the two above | build → `wrangler deploy` for Storybook and legacy; the api and the new apps over SSH to the own server from P2 step 7 (by hand until then: `infra/server/README.md`) → smoke check: `/version.json` shows the commit, key pages answer 200 |
| `ci.yml` → `deploy-storybook` | push to `main` after checks | builds Storybook and deploys it to storybook.yeral.app (no release needed: internal docs) |
| Renovate | weekly | grouped dependency PRs; dev-dependency patches merge themselves when CI is green |

## Versioning and releases

- **Trunk-based.** `main` is always deployable. Short branches `feat/…`, `fix/…`, `chore/…` → pull request → squash merge.
  PR titles follow Conventional Commits with the app or package as scope: `feat(client): show free slots on cards`.
- **Changesets.** A PR that changes something a user or an API consumer can notice adds `.changeset/*.md`
  (`pnpm changeset`). The Version PR bumps versions and writes `CHANGELOG.md` for each app and package.
- **SemVer for apps:** patch = fix, minor = feature, major = a release that changes URLs or flows. Apps stay on `0.x`
  until the public launch (`1.0.0`). Packages are private and versioned for their changelogs; apps use `workspace:*`.
- **API versions:** path prefix `/v1`; only additive changes inside it; breaking changes ship as `/v2` side by side.
  CI compares the OpenAPI document with `main` and fails on breaking changes (oasdiff).
- **Database:** drizzle-kit SQL migrations in git, forward only, expand → migrate data → contract.
- **Build stamp:** `/version.json` `{ app, version, commit, builtAt }` in every app; `X-Yeral-Version` from the api.

## Secrets

- GitHub secrets, never in the repo or in chat: `CLOUDFLARE_API_TOKEN` (Workers deploys of Storybook and legacy);
  later the SSH deploy key for the own server, the error tracker's DSN and the SMS gateway keys.
- On the server: `/srv/yeral/.env` (mode 600) holds the database password, later the R2 token for backups.
- The owner creates tokens in the providers' dashboards and stores them with `gh secret set NAME --env production`
  (the value is typed into the prompt).
- Local: `.env.local` per app (gitignored); `.env.example` committed and documents every variable.

## Repository

- Public by the owner's choice until the product is ready, then private. Never commit secrets.
- Branch protection on `main` (since 2026-10-13): required checks «Format, lint, types, tests, build» and «PR title is a
  Conventional Commit», branch up to date before merge, linear history, no force pushes. Admins may override; nobody
  pushes to `main` directly any more.
- Issues and a GitHub Project board hold the tasks (ADR 0014).

## Parallel agents (ADR 0014, skill `parallel-work`)

- Instructions for any agent tool: `AGENTS.md`; Claude Code adds `CLAUDE.md` and `.claude/skills`.
- Task = GitHub issue with scope + acceptance criteria; claim with label `agent:<name>`.
- One worktree + branch per task; `PORT_BASE` per worktree; database `yeral_<branch>` in the shared local Postgres.
- Hot spots (contract, ui tokens, catalog, turbo/root config, migrations) in small PRs that merge first.
- Memory notes go to `docs/memory-bank/log/YYYY-MM-DD-<topic>.md` during parallel work; the lead folds them in.

## How the release flow behaves (as built in M0)

- Every workspace package is versioned (`privatePackages.version/tag: true`); tags look like `@yeral/legacy@0.1.1`.
- With pending changesets, a push to `main` opens or updates «chore: version packages». With none, the workflow runs
  `changeset tag`; any package version without a tag gets one, a GitHub Release, and — for apps with a deploy job in
  `release.yml` — a production deploy.
- The version PR is opened by GitHub Actions, so its CI run waits for approval: *Approve and run* on the PR, or
  `gh api -X POST repos/azamatos/yeral/actions/runs/<run-id>/approve`. Then it merges like any PR.
- Repo setting *Allow GitHub Actions to create and approve pull requests* is on (2026-10-13).
- Apps deploy to production only (no staging, ADR 0020); smoke checks live in `scripts/smoke.sh`.
- Labels for tasks: `lane:*`, `status:*`, `type:*`; agents add `agent:<name>` when claiming (create it if missing).

## Local setup notes

- pnpm switches itself to the pinned 12.x. If an older global pnpm fails to switch (`ENOEXEC`, pnpm 10 can't run pnpm 12's
  native binary), run `npm i -g pnpm@12` once, or `node ~/Library/pnpm/.tools/pnpm/<version>/node_modules/pnpm/install.js`.
- pnpm 11+ blocks dependency install scripts unless listed in `allowBuilds` (`pnpm-workspace.yaml`); it also skips package
  versions younger than one day and records exceptions in `minimumReleaseAgeExclude`.
- `apps/legacy` and `docs/design` are excluded from Prettier; Markdown is never auto-formatted.

## Rollback

- Cloudflare (Storybook, legacy): `wrangler rollback` per Worker to the previous version.
- The own server: point `YERAL_API_IMAGE` in `/srv/yeral/.env` at an earlier image (`docker images yeral-api`: they
  stay on the server) and run `docker compose up -d` in `/srv/yeral`, or redeploy the previous commit with `deploy.sh`. Migrations are backward compatible, so rolling back the app never needs a database rollback.
