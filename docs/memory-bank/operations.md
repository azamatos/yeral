# Operations: environments, CI/CD, versioning, hosting

Status 2026-10-13: production = the Next.js marketplace on Cloudflare, deployed by hand (`pnpm run deploy`).
Everything else here is *planned* and lands with milestone M0–M2 (see `progress.md`).

## Environments

| Env | Hosts | Data | Deployed |
|---|---|---|---|
| local | `localhost:3000–3003`, api `:8787` | demo memory store | `pnpm dev` |
| preview (optional) | Cloudflare preview URL per PR | demo | on every PR, once the workers.dev subdomain is renamed (today it contains part of the account e-mail, so preview URLs are off) |
| staging | `stage.yeral.app`, `client-stage.yeral.app`, `business-stage.yeral.app`, `cms-stage.yeral.app`, `api-stage.yeral.app` | demo | every push to `main` after CI passes |
| production | `yeral.app`, `client.yeral.app`, `business.yeral.app`, `cms.yeral.app`, `api.yeral.app` | demo now, Postgres later | when a release is cut (Changesets) |

Staging hosts are one level deep (`client-stage`, not `client.stage`) so the `*.yeral.app` certificate covers them.
Staging uses its own cookie names (`yeral_session_stage`) so it never overwrites a production session on `.yeral.app`.

## Hosting

- **Demo period:** Cloudflare (account of the owner, zone `yeral.app`). Workers with static assets for each app;
  the api's demo worlds in a Durable Object. Only the api's demo store adapter and the `entry/worker.ts` files are Cloudflare-specific.
- **Production:** *not decided.* It must be reachable from inside Turkmenistan without a VPN, and Cloudflare is
  reported blocked there ([ADR 0007](../decisions/0007-portable-hosting.md)). Candidates: a server in a Turkmen data
  centre, or a foreign VPS whose IP range works from Turkmenistan. Delivery is the same either way:
  Docker images (api on Node; landing and client as Node SSR servers; business and cms as static files behind Caddy)
  + Postgres, deployed from GitHub Actions over SSH with Docker Compose (or Kamal).
- **Reachability test** (do before choosing): from Ashgabat, on Turkmentelecom home internet and on TMCELL mobile,
  without VPN: open `https://yeral.app`, open a test page on each candidate server, load the map. Write the result into `activeContext.md`.

## CI/CD (GitHub Actions)

| Workflow | Trigger | Does |
|---|---|---|
| `ci.yml` | pull request, push to `main` | pnpm install (cached) → `turbo run lint lint:fsd typecheck test build --affected` → Playwright on affected apps against the local stack → reports as artifacts. Required to merge |
| `release.yml` | push to `main` | `changesets/action`: opens or updates the «Version packages» PR; when that PR is merged, tags `<app>@x.y.z`, creates GitHub Releases, starts production deploy of the apps whose version changed |
| `deploy.yml` | called by the two above | builds with turbo and deploys the given apps to the given environment (wrangler today, Docker later), then smoke-checks: `/version.json` shows the new commit and key pages return 200 |
| Renovate | weekly | grouped dependency PRs (TanStack, Radix, ESLint, …); dev-dependency patches merge themselves when CI is green |

Staging deploys every green push to `main`. Production deploys only from a release; the `production` GitHub
Environment can require a manual approval.

## Versioning and releases

- **Trunk-based.** `main` is always deployable. Short branches `feat/…`, `fix/…`, `chore/…` → pull request → squash merge.
  PR titles follow Conventional Commits with the app or package as scope: `feat(client): show free slots on cards`.
- **Changesets.** A PR that changes something a user or an API consumer can notice adds `.changeset/*.md`
  (`pnpm changeset`: which apps/packages, patch/minor/major, one sentence in user terms). The Version PR bumps
  `package.json` versions and writes `CHANGELOG.md` for each app and package.
- **SemVer for apps:** patch = fix, minor = feature, major = a big release that changes URLs or flows. Apps stay on `0.x`
  until the public launch, which is `1.0.0`. Packages are private (never published) and versioned for their changelogs;
  apps depend on them through `workspace:*`.
- **API versions:** path prefix `/v1`. Inside v1 only additive changes. A breaking change ships as `/v2` next to `/v1`
  until old clients are gone. CI compares the OpenAPI document with `main` and fails on breaking changes (*planned*: oasdiff).
- **Database:** drizzle-kit SQL migrations in git, forward only, expand → migrate data → contract, so the previous app
  version keeps working during a deploy. Deploy applies migrations before starting the new api.
- **Build stamp:** each app serves `/version.json` `{ app, version, commit, builtAt }`; the api adds `X-Yeral-Version`.
  Business and CMS show the version in settings, which helps with support.
- **Demo seed:** `SEED_VERSION` in the api; bump it when the seed's shape changes so demo worlds reset cleanly.

## Secrets

- Stored as GitHub Environment secrets (`staging`, `production`), never in the repo or in chat:
  `CLOUDFLARE_API_TOKEN` (Workers Scripts edit, Workers Routes edit, Zone read on `yeral.app`), `CLOUDFLARE_ACCOUNT_ID`;
  later `DATABASE_URL`, `SMS_*`, `VAPID_*`, error-tracking DSN, SSH deploy key.
- The owner creates tokens in the provider's dashboard and stores them with `gh secret set NAME --env staging`
  (the value is typed into the prompt).
- Local: `.env.local` per app (gitignored); `.env.example` committed and documents every variable.

## Repository settings (owner's approval needed before changing)

- Visibility: the repo is **public** today. Recommended private once backend code and infra land.
- Branch protection on `main`: required CI check, linear history, no force pushes.

## Rollback

- Cloudflare: `wrangler rollback` per Worker to the previous version.
- Docker: redeploy the previous image tag. Migrations are backward compatible, so rolling back the app never needs a database rollback.
