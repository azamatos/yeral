# Operations: environments, hosting, Docker, CI/CD, versioning, parallel work

Status 2026-10-13 (M0): production = `apps/legacy` (Next.js) on Cloudflare. `ci.yml`, `release.yml`, `deploy.yml` exist;
legacy deploys to production from a release (first CI deploy: `@yeral/legacy@0.1.1`, 2026-10-14). The
`CLOUDFLARE_API_TOKEN` repository secret is set; without it the deploy job skips with a warning. Since 2026-10-16 there
are two kinds of environment only, local and production (ADR 0020): no staging.

## Environments

| Env | Hosts | Database | Deployed |
|---|---|---|---|
| local | `localhost:3000–3005` (`PORT_BASE` + offset) | Postgres in Docker, one database per worktree | `pnpm dev` |
| local, production-like | `*.yeral.localhost` through nginx | Postgres container | `pnpm docker:up` |
| production | `yeral.app` (client), `business.`, `cms.`, `api.`, `storybook.` | Neon branch `production` (categories, no demo) | when a release is cut (Changesets); Storybook on every push to `main` |

No staging and no PR previews (ADR 0020): a change is proven locally (tests, the Docker stack), reviewed, and merged on
green CI; production changes only from a release. A risky migration can be rehearsed on a throwaway Neon branch of
production. All hosts come from config (`@yeral/lib/site`), so a new domain is a config change.

## Hosting now: Cloudflare

Each deployable is a Worker whose wrangler config declares its host as a custom domain; `wrangler deploy` creates
the DNS record and the certificate. No dashboard work per subdomain.

| Host | Worker | Bindings |
|---|---|---|
| `yeral.app`, `www.yeral.app` | `yeral-client` (`yeral-web` = legacy until M3) | static assets + SSR |
| `business.yeral.app` | `yeral-business` | static assets, SPA fallback |
| `cms.yeral.app` | `yeral-cms` | static assets; Cloudflare Access policy (owner sets it up once in Zero Trust, free up to 50 users) |
| `api.yeral.app` | `yeral-api` | Hyperdrive → Neon, R2 bucket `yeral-media`, Cron Trigger `* * * * *` → `runDueJobs()` |
| `storybook.yeral.app` | `yeral-storybook` | static assets |

**Cost now:** Workers Free (100k requests/day, 10 ms CPU per request) until SSR and the api need more, then Workers Paid
$5/month; Neon, R2 (10 GB), Sentry and Cloudflare Web Analytics on free tiers. **No VPS needed** until the Turkmenistan launch, which gets its own servers (ADR 0023).

**Owner's one-time steps** (when the milestone needs them): Neon account (M2), Cloudflare API token for CI (M0),
Workers Paid when limits are hit, Access policy for `cms.` (M6).

## Database: Neon (while on Cloudflare)

- Project **Yeral** (`summer-mountain-55668852`), region `aws-eu-central-1` (Frankfurt), Postgres 18, org
  `org-solitary-credit-03680071`; linked to this repo by `.neon` (gitignored) and described by `neon.ts` (committed).
- Branch `production`; a throwaway branch may rehearse a risky migration (`neon checkout <name> --create` applies
  `neon.ts`), deleted afterwards. No staging branch (ADR 0020).
- Local env: `npx neon@latest env pull` (or `neon deploy`) writes `.env.local` (gitignored): `DATABASE_URL` (pooled,
  `-pooler` host — app traffic), `DATABASE_URL_UNPOOLED` (direct — migrations, `pg_dump`, `LISTEN/NOTIFY`), `NEON_BRANCH`.
- Sign-in: the owner's `npx neon@latest login` on this machine (OAuth); agents use that session, never a pasted key.
- Verified 2026-10-14: SSL connection over both URLs, write/read round trip with node-postgres, extensions `btree_gist`,
  `pg_trgm`, `cube`, `earthdistance` available.
- `neon init` also installed Neon plugins/skills/MCP settings into the owner's AI tools (user scope).

## Local database and API tests (since M2d)

- `pnpm db:up` starts Postgres 18 from `infra/docker/compose.dev.yml` (user/password `yeral`, port 5432, a named volume).
- `apps/api/.env.local` (copy `.env.example`) names this worktree's database: `DATABASE_URL=postgres://yeral:yeral@localhost:5432/yeral`
  (a second worktree uses `…/yeral_<branch>`). `pnpm db:setup` creates it if missing, applies the migrations and seeds the
  demo while the database has no businesses; it never touches a database that has them. `pnpm db:seed` starts the demo over.
  The root `.env.local` holds the **Neon production** URL for the neon tooling: the api never reads it.
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

## The api on Cloudflare (prepared in M2g, not deployed yet; production only)

- `apps/api/src/entry/worker.ts` is the Worker: a node-postgres client per request through Hyperdrive, opened on the
  request's first query (preflights, `/version.json`, `/docs` never connect); the Cron Trigger (`* * * * *`) runs the jobs
  tick on a pool of 3. Both entries run `jobsTick()` (`modules/jobs/tick.ts`): a transaction-level advisory lock keeps
  runs from overlapping (Node processes, Cron invocations), failures are logged. `apps/api/wrangler.jsonc` has one
  environment, `production` (`yeral-api` on `api.yeral.app`); its top level is a different Worker name with no database
  binding and no URL, so a deploy without `--env` can't replace production and fails loudly. `pnpm --filter @yeral/api run build:worker` is a dry-run bundle (≈ 300 KiB gzip).
- Client IPs for rate limits: `TRUSTED_IP_HEADER` names the one header the api trusts — `cf-connecting-ip` on Workers
  (wrangler vars), `x-forwarded-for` behind our nginx (compose), which sets it and drops a client-sent `CF-Connecting-IP`.
- Locally in workerd: `CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_HYPERDRIVE=postgres://user:pass@localhost:5432/yeral pnpm --filter @yeral/api exec wrangler dev --env production --local --var YERAL_ENV:local` (local site config: localhost cookies and origins, demo on).
- **First deploy, when the new client site (M3) ships and with the owner's go-ahead** (Cloudflare resources + the
  `api.yeral.app` record): a Hyperdrive config `yeral-production` on the Neon production branch's direct connection string
  (Hyperdrive pools by itself) with query caching off — the api needs fresh reads (sessions, events, free times):
  `pnpm --filter @yeral/api exec wrangler hyperdrive create yeral-production --connection-string="$DATABASE_URL_UNPOOLED" --caching-disabled`
  — put its id into `wrangler.jsonc`, migrate and write the catalogue (`YERAL_ENV=production pnpm db:setup --allow-remote`),
  then `pnpm --filter @yeral/api run deploy:production` (it refuses while the Hyperdrive id is the placeholder) and a
  deploy job in `release.yml` with a smoke check. Decide before that deploy: the jobs cron cadence (every minute keeps
  the Neon compute from suspending, which costs compute hours on a free product) and where production photos live.
- Photos: `MEDIA_BASE_URL=https://yeral.app/media` — the client site serves them from M3.

## The production-like stack (since M2g)

`pnpm docker:up` builds `infra/docker/api.Dockerfile` (turbo prune with the lockfile's turbo → pnpm install → esbuild
bundle → `node:24-alpine` with only `dist/`), starts Postgres 18, runs `migrate` (`node dist/cli.js setup`: migrations,
demo seed while empty), the api (jobs tick inside) and nginx (`infra/nginx`, one server block per host):
http://api.yeral.localhost/docs. CI's «Docker stack» job does the same and asks for health through nginx.
`pnpm docker:down` stops it (`-v` drops the data). The demo keeps the day of the first `docker:up`; start it over with
`docker compose -f infra/docker/compose.yml run --rm migrate node dist/cli.js seed`.

## Hosting later: own server with Docker + nginx

One VPS to start (≈4 vCPU, 8 GB RAM, 100 GB SSD), everything in Docker Compose (`infra/docker/compose.yml`):

| Service | Image | Role |
|---|---|---|
| `nginx` | official nginx | TLS (Let's Encrypt via certbot), one server block per host, serves business/cms/storybook static files, proxies `client` and `api`, gzip/brotli, cache and security headers |
| `client` | `yeral-client` (Node) | TanStack Start SSR |
| `api` | `yeral-api` (Node) | Hono on `@hono/node-server`, migrations on start |
| `jobs` | `yeral-api` (same image, `jobs` command) | calls `runDueJobs()` every minute |
| `postgres` | postgres:18 | data in a volume; nightly `pg_dump` to off-site storage |
| `minio` (optional) | minio | photos via S3 API (or local disk behind nginx) |

Static apps are built into the nginx image (or a volume). Cloudflare stays as DNS only (grey cloud), since proxied
Cloudflare IPs may be blocked in Turkmenistan. **Move checklist:** buy server → test from Ashgabat that its IP and
Cloudflare's nameservers work without VPN → `docker compose up` → restore `pg_dump` from Neon → copy photos from R2 →
switch DNS records → switch CI's deploy step. The Docker setup exists and is built in CI from M2, so this is a deploy.

## CI/CD (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | pull request, push to `main` | pnpm install (cached) → `turbo run lint lint:fsd typecheck test build --affected` → Storybook tests in Vitest browser mode → API tests with a Postgres service → Playwright on affected apps → Docker image builds for affected deployables. Required to merge |
| `release.yml` | push to `main` | Changesets: opens or updates «Version packages»; when merged, tags `@yeral/<app>@x.y.z`, creates GitHub Releases, deploys those apps to production |
| `deploy.yml` | called by the two above | build → database migrations (api) → `wrangler deploy` (now) / image push + `docker compose up -d` over SSH (later) → smoke check: `/version.json` shows the commit, key pages answer 200 |
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

- GitHub Environment secrets (`production`), never in the repo or in chat: `CLOUDFLARE_API_TOKEN` (Workers
  Scripts edit, Workers Routes edit, Zone read, Hyperdrive edit, R2 edit), `CLOUDFLARE_ACCOUNT_ID`, `DATABASE_URL` per
  environment, `BETTER_AUTH_SECRET`, `SENTRY_DSN`; later the SSH deploy key and SMS gateway keys.
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

- Cloudflare: `wrangler rollback` per Worker to the previous version.
- Docker: redeploy the previous image tag. Migrations are backward compatible, so rolling back the app never needs a database rollback.
