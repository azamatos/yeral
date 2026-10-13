# 0005. TypeScript backend in the monorepo

- Status: Accepted 2026-10-13
- Decided by: owner (TypeScript, in this monorepo) + Claude (libraries)

## Context

There is no backend yet. The booking rules (availability, buffer, lead time, window, statuses) are already TypeScript in
`@yeral/domain`, and the frontends need a demo server that client and business share (ADR 0003).

## Decision

- `apps/api` on **Hono** with **@hono/zod-openapi**. Modules per area (catalog, availability, bookings, reviews, favorites,
  notifications, events, biz/*, admin/*); routes validate and call services; services hold the rules and use a store port.
- **The demo server is the backend's first version.** Store adapters: `memory` (seed + changes, per demo world) now;
  **PostgreSQL 18 via Drizzle ORM** for production. Same services, same routes.
- Planned for the real backend: Better Auth (phone OTP, sessions, organizations = salons with roles; to be confirmed),
  pg-boss for jobs (reminders, expiring requests, notifications), pino logs, an `Sms` port for the local gateway, Web Push.
- Double booking is prevented by a Postgres exclusion constraint on staff × time range, on top of the domain check.
- Runs on Node (Docker) for production; a Workers entry exists for the Cloudflare demo.

## Consequences

- Frontend and backend share the rules and the contract; one language, one CI.
- The backend must be written to the same standard as the apps (tests, migrations, observability).
- Durable state and jobs need a real server: production waits for the hosting decision (ADR 0007).

## Alternatives considered

- **A separate team / language** (Go, Python, Nest): would need an OpenAPI hand-off and a duplicate of the rules.
- **Backend-as-a-service** (Supabase, Firebase): fast to start, but rules end up in SQL/policies or functions, plus hosting and reachability constraints in Turkmenistan.
- **NestJS**: heavier framework, decorators, slower cold start; Hono is enough.
