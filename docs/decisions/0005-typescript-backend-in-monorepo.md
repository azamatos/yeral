# 0005. TypeScript backend in the monorepo, on Postgres from the start

- Status: Accepted 2026-10-13 (revised the same day: real database from the start instead of a demo memory store)
- Decided by: owner (TypeScript, in this monorepo; "make a working project") + Claude (libraries)

## Context

There is no backend yet. The booking rules are already TypeScript (`@yeral/domain`). The four sites live on different
subdomains, so browser storage can't be the shared "database" any more (ADR 0003). The owner wants a working product,
not a longer-lived mock. A demo memory store would be thrown away when the real database arrives.

## Decision

- `apps/api`: **Hono** + **@hono/zod-openapi**. Modules per area: auth, catalog, availability, bookings, reviews,
  favorites, notifications, events, `biz/*` (salon side), `admin/*` (CMS). Routes validate and call services; services hold
  the use cases and call `@yeral/domain` rules; data access through Drizzle repositories inside the module.
- **PostgreSQL 18 from the first endpoint**, through **Drizzle ORM** (schema in TypeScript, SQL migrations in git).
  Neon (serverless Postgres, free tier, branch per environment) while we're on Cloudflare; Postgres in Docker locally,
  in CI and on the future server.
- **Seed** (`pnpm db:seed`): the 24 salons, staff, services, reviews from today's mock; demo salons keep synthetic
  occupancy as an availability overlay (flag on the salon), so search looks alive.
- **Auth: Better Auth** — phone number + one-time code, sessions in Postgres, cookie on the configured domain,
  organization plugin = salon with member roles and invitations. SMS goes through an `Sms` port: the dev/staging adapter
  accepts code `1234` and logs it; the production gateway comes later.
- **Jobs** (reminders, expiring requests, notifications): a Postgres `jobs` table + `runDueJobs()`; Cloudflare Cron
  Trigger calls it every minute now, a `jobs` container loop later. No queue service.
- **Live updates**: an `events` table and `GET /v1/events?after=<cursor>`; the sdk polls it while a screen is open
  (≈10 s, plus on focus and after own mutations) and invalidates queries. A push channel (SSE) can replace polling on the
  own server without changing screens.
- **Files** (salon photos): S3 API — R2 now, MinIO or disk later. Photos are resized in the browser before upload.
- Double booking: Postgres exclusion constraint (`btree_gist`) on staff × time range for active bookings + the domain check;
  the API answers `409 slot_taken` with alternatives.

## Consequences

- No throwaway mock layer: what we build in M2 is the backend.
- Demo behaviour (code `1234`, auto-answering demo salons, synthetic occupancy) is configuration on non-production environments.
- Needs a Neon account (owner, free) at M2; Docker Postgres for local work.

## Alternatives considered

- **Demo memory store first, Postgres later**: double work on the data layer, and it needs Cloudflare-only persistence (Durable Objects) to be shared.
- **Cloudflare D1** (SQLite): no exclusion constraints, Cloudflare-only; moving to the own server would mean a rewrite.
- **Supabase**: Postgres plus auth/storage/realtime APIs we wouldn't use; Neon is plain Postgres with branches.
- **Prisma 7 / Kysely** instead of Drizzle: Prisma is heavier with its own schema language; Kysely has no schema/migration generation.
- **pg-boss** for jobs: needs a long-running process that Workers don't have.
- **NestJS / Fastify / Express**: Node-only or heavier; Hono runs unchanged on Workers and Node.
- **A separate backend team or language**: would duplicate the rules and need an OpenAPI hand-off.
