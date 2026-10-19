# Active context

_Last updated: 2026-10-19_

## Current focus

**The product book is closed (2026-10-18; [ADR 0021](../decisions/0021-product-book-first.md)).** `docs/product/` holds
every rule, flow, limit and feature with no open question; its page is
https://claude.ai/artifact/LY9U6jrQRo3MfoHTg3JpyN (pinned for the owner; answers and placements sync from its
database). Chapter 10 is the build plan. **Two tracks now run side by side** (ADR 0021 amended 2026-10-19): the design
pass in English (P1: Claude writes the Claude Design prompts, the owner pastes them, Claude checks the canvas) and the
backend to the book (P2). Components in Storybook and the apps wait for design export v0.6.

Where things stand: M0–M2 are merged and released as tags (#20, 2026-10-16): monorepo and CI, `@yeral/ui` (38
components), domain, contract, sdk, an api for every client screen, written to the rules before the book. The api and
Postgres run on the owner's server since 2026-10-19 (not public). yeral.app still serves `apps/legacy`. Design export
v0.5 (in Turkmen) is the newest export; v0.6 (English) is being drawn. The version PR #26 (`@yeral/lib@0.2.0`,
`@yeral/api@0.1.1`, staging removed) is merged. The backend plan (chapter 10, P2) was reviewed on 2026-10-19 against
every **Code differs** line and the built api, and now has steps 0–7.

## Owner's direction
- 2026-10-13: infrastructure first; Cloudflare now, own server (Docker + nginx, Cloudflare for DNS) later; name/domain in
  config; repo public until ready; design system with Storybook and tests; run 2–3 agents in parallel later.
- 2026-10-14: follow the design's site map (marketplace on yeral.app, no landing app); remove the old mobile designs
  entirely ("we have a new design and our own logic"); maps = MapLibre + OpenFreeMap.
- 2026-10-14 (business design round 4, "decided 14.10.2026"): manual confirmation is the default, a business may switch on
  instant confirmation; requests expire after the business's hold time (default 30 min) with 3 alternative times. This
  replaces the morning's "every booking by hand, no instant setting".
- 2026-10-16: review every PR before merging (the agent merges after review and green CI).
- 2026-10-16: Ýeral is free for now (no plans, no commission); no staging, only local and production (ADR 0020); don't
  build the new yeral.app until the design is clarified and exported again (v0.5).
- 2026-10-17: stop everything and reorganise: first document the whole product (ideas, norms, rules, roles, limits,
  features, MVP in and out, every flow, with visuals) until no question is left; then the full design and
  components/Storybook; then code. Claude Code writes the prompts for Claude Design, the owner pastes them, Claude Code
  reads the canvas to check the result (ADR 0021).
- 2026-10-18: a shared decision room (first a claude.ai page "Karar", then an own app) was considered and dropped: the
  repo stays the record agents read, the product book page stays where the owner answers, and Claude syncs the answers.
  Build an own decisions app only when a second person decides regularly or syncing becomes a bottleneck. Next: the
  owner answers every book question; then an exact plan for yeral.app, the business app, the CMS and the backend,
  including when and what server to buy.
- 2026-10-18 (book answers): Ýeral isn't a Turkmen-only platform: it's built in English, and each country it launches
  in adds its own languages and settings (Turkmenistan first: Turkmen, Russian); ADR 0022. One launch with the client
  site, the business app and the CMS; the team adds the first businesses in the CMS; Ýeral on yeral.app; no average
  bill; businesses may be open past midnight and options stay flexible; the city is a choice (book Q-001–Q-003,
  Q-100–Q-109).
- 2026-10-19: the backend runs alongside the design (the book is closed: ADR 0021 amended); components and the apps
  wait for the design. The owner bought a netcup VPS 1000 (EU) for the first launch and other projects; Claude set it
  up the same day (hardening, a shared Caddy, Postgres and the api; `infra/server/README.md`). Backups to R2 wait.
- 2026-10-18 (book closed): the first launch is an English pilot with Turkmenistan's settings: example businesses
  marked "Example" beside real ones, a nightly-reset demo of the business app, no SMS (codes on screen); the name is
  written *Ýeral*, "Yeral" only where the letter can't be used; a specialist may work without the app (an option, not a
  level). Plan: product book chapter 10.
- 2026-10-18 (book answers, batch 2): the owner answers only critical questions; Claude decides the rest with the
  recommended option and records it ("Claude (delegated)"), and says so where it disagrees (a concern). Two launches:
  first in English on Cloudflare (investors and early users, from Turkmenistan through a VPN; also a portfolio piece),
  then Turkmenistan with Turkmen, Russian and its own servers and database, after investment; one deployment per
  country (ADR 0023). No server to buy for the first launch. Appointments first, tables and classes after the MVP; no
  review-ask SMS; "Başga ýerde", internal statuses and the business PWA in the MVP; client karma later.
- 2026-10-19 (later): Neon isn't needed; work on the VPS. Review the backend plan for gaps, then build the backend
  alongside the design.

## Decisions

2026-10-13: [0001](../decisions/0001-monorepo-pnpm-turborepo.md) pnpm + Turborepo ·
[0002](../decisions/0002-vite-tanstack-instead-of-nextjs.md) Vite + TanStack ·
[0004](../decisions/0004-feature-sliced-design.md) FSD ·
[0005](../decisions/0005-typescript-backend-in-monorepo.md) Hono + Postgres/Drizzle + Better Auth ·
[0006](../decisions/0006-contract-and-sdk.md) zod contract + Hono RPC + OpenAPI ·
[0007](../decisions/0007-hosting-cloudflare-now-docker-later.md) Cloudflare now, Docker + nginx later ·
[0008](../decisions/0008-i18n-use-intl.md) use-intl ·
[0009](../decisions/0009-versioning-changesets.md) Changesets ·
[0010](../decisions/0010-ci-cd-github-actions.md) GitHub Actions ·
[0011](../decisions/0011-state-management.md) state ownership ·
[0012](../decisions/0012-design-system-and-storybook.md) design system + Storybook ·
[0013](../decisions/0013-testing-strategy.md) testing ·
[0014](../decisions/0014-parallel-agents.md) parallel agents

2026-10-14: [0015](../decisions/0015-marketplace-on-the-apex.md) marketplace on yeral.app (supersedes 0003) ·
[0016](../decisions/0016-languages-tk-ru-en.md) TK default + RU + EN, prefixed URLs ·
[0017](../decisions/0017-booking-model.md) one booking engine, four types, five statuses, always confirmed by hand ·
0012 revised to tokens v0.3.1 + self-hosted Onest · maps MapLibre + OpenFreeMap ·
[0017](../decisions/0017-booking-model.md) revised by the business design: confirm modes, hold time, booking rules,
decline with alternatives, complaints, source `web|app|phone|walkin|ai` ·
[0018](../decisions/0018-business-workspace-model.md) business model: our own staff, memberships, per-business roles and
client records; a branch is its own business; only verified businesses are public ·
[0019](../decisions/0019-own-phone-login-and-sessions.md) (in PR #16) own phone-code login and database sessions
instead of Better Auth (the design's attempts/lock/resend rules, no placeholder e-mails, endpoints in the contract).

2026-10-16: [0020](../decisions/0020-local-and-production-only.md) local and production only, no staging.

2026-10-17: [0021](../decisions/0021-product-book-first.md) product book first (`docs/product/`), then design,
Storybook, code; Claude Code writes the Claude Design prompts and checks the canvas.

2026-10-18: [0023](../decisions/0023-one-deployment-per-market.md) one code base, one deployment per market; first
launch on Cloudflare, Turkmenistan later on its own servers ·
[0022](../decisions/0022-english-first-any-country.md) built in English, not bound to one country; each
market adds its languages (supersedes 0016's Turkmen first).

## Open questions

Product questions now live in **`docs/product/questions.md`**, one ID each (ADR 0021); answer them on the book's page.
Where the old questions went (2026-10-17):

| Old # | Question | Now |
|---|---|---|
| 16, 18 | Moving tables/classes; the round-6 logic gaps | answered by design v0.5 (`docs/design/ROUND6-ANSWERS.md`) |
| 17 | Font sizes 28 / 24 / 80; open past midnight | font sizes: keep the code's mapping (v0.5, H); past midnight: feature F-109 in chapter 6 |
| 1 | Checkout / POS; table/class setup wizard | features F-221 and F-116 in chapter 6; Q-030 |
| 2 | CMS design | Q-010, Q-011, Q-012 |
| 4 | Average bills; store badges | Q-103; feature F-004 |
| 5 | Native copy review | Q-101 |
| 6 | SMS provider and sender name | Q-109; chapter 8 (notifications) |
| 7 | Final name and domain | Q-003 |
| 10 | Real business photos and texts | Q-002 |

## Next steps

The product book is closed (2026-10-18). The build plan is its chapter 10 (`docs/product/10-plan.md`). Two tracks
run side by side (ADR 0021, amended 2026-10-19):

**Design track (P1):** Claude writes each Claude Design prompt (`docs/product/prompts/`), the owner pastes it, Claude
checks the canvas (artifact `Hkq5oyUnRVrRV3XSs7EAtt`, read with the Artifact tool). Round 1 (design system in English)
is with Claude Design; round 2 (business app part 1) is written. Next: check round 1, then rounds 3–6 (business app
part 2, client site, admin tool, fixes) → export v0.6 → P3 components in Storybook → P4 apps.

**Backend track (P2).** The steps are in the book's chapter 10 (reviewed 2026-10-19): 0 the own server only (no
Neon, no Workers for the api), 1 market settings and English as the source, 2 the business model, 3 the **Code
differs** fixes in the booking engine (past midnight first), 4 business endpoints (with photos, the address pin,
notifications), 5 admin endpoints (team accounts with a second factor), 6 first-launch mode, 7 before the launch
(deploys from GitHub, backups, alerts). Work in a worktree on a branch per step, tests with every rule (ADR 0013), a
PR each, merged on green CI after review. The rules: the book's chapters 4, 5, 7a–7c and 8 (each **Code differs**
line is a fix to make; chapter 6 lists the features).

**Server:** `ssh yeral-vps` (the owner allowed `Bash(ssh yeral-vps:*)`); deploy by hand with
`infra/server/README.md` → "Deploying Ýeral by hand". Checked 2026-10-19: Caddy (no sites), Postgres 18.6 with the 4
migrations and the 13 categories only, the api from #34, healthy; firewall SSH/80/443, fail2ban, keys only. Not public
yet (no DNS record), no backups, and the `deploy` user has no key yet (P2 step 7).

**Waiting on the owner:** the main checkout needs `git checkout -- docs/design && git clean -fd docs/design && git
pull`; the unused Hyperdrive config `yeral-production` and the Neon project on their accounts (delete only if asked);
later an R2 token for backups, accounts for error tracking and uptime checks, the DNS records when going public.
