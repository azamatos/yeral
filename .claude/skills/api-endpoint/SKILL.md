---
name: api-endpoint
description: Add or change a Yeral API endpoint end to end — zod contract, api route + service + Drizzle repository (+ migration), mirror notification/event, sdk query or mutation, tests. Use whenever a screen needs data or an action the API doesn't offer yet, or an existing request/response shape changes.
---

# API endpoint, end to end

References: ADR 0005, 0006; `systemPatterns.md` (Backend, Data flow); `productContext.md` (rules, mirror screens);
`docs/API.md` (current endpoint list). Before milestone M2 the API is the in-browser mock in `apps/legacy/src/api` —
there, change `contract.ts`, `mock/index.ts` and `hooks.ts` the same way.

## Steps

1. **Contract** (`packages/contract/src/<area>.ts`): add or change the zod schemas for params, query, body and response.
   New error codes go into the error enum. Inside `/v1` changes must be additive (new optional fields, new endpoints).
   Removing or renaming a field is breaking: stop and ask; it needs `/v2` or a migration plan.
2. **Rules**: a business rule (availability, statuses, deadlines, limits) goes into `@yeral/domain` as a pure function with a unit test.
3. **Route** (`apps/api/src/modules/<area>/routes.ts`): `createRoute({ method, path, request, responses })` + handler.
   The handler validates (automatic), checks auth and role, calls the service and maps the result. No rules in handlers.
4. **Service + data** (`service.ts`, `repo.ts`): the use case in the service; Drizzle queries in the module's repository.
   A schema change = `apps/api/src/db/schema/*` + `pnpm db:generate` (a new SQL migration; never edit a merged one;
   migrations are a hot spot, skill `parallel-work`). Extend the seed if demo data needs it.
5. **Mirror**: a salon action notifies the client and a client action notifies the salon (`productContext.md`). Write the
   notification and an `events` row (`booking.confirmed`, ids) in the same transaction, so open screens refresh.
6. **SDK** (`packages/sdk/src/<area>.ts`): query key, `queryOptions` or mutation options with the invalidations it causes,
   and the event type → invalidation mapping. Apps use only this. Add MSW handlers/fixtures for stories (skill `testing`).
7. **Tests**: `app.request()` tests on the test database for success, validation error, auth, and conflicts (`409`);
   domain tests for the rule (skill `testing`).
8. **Ship**: OpenAPI regenerates by itself; update `docs/API.md` only if the guide changes (skill `ship`).

## Conventions

- Paths under `/v1`, nouns, kebab-case: `/v1/me/bookings/:id/cancel`. Salon-side under `/v1/biz/...`, CMS under `/v1/admin/...`.
- Lists: `{ items, total? }`. Errors: `{ error: { code, message?, details? } }` with the right status
  (400 validation, 401, 403, 404 `not_found`, 409 `slot_taken` with `details.alternatives`, 429 rate limit).
- Dates `YYYY-MM-DD` in Ashgabat time, times of day in minutes, instants in epoch ms, money in whole manats.
- Never return internal fields: map store records to contract DTOs.
- Ask yourself: who may call it (anonymous, client, salon role, staff)? Is it rate-limited (OTP, search)? Is a retry safe?
