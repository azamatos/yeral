# 0006. zod contract, Hono RPC client, generated OpenAPI

- Status: Accepted 2026-10-13
- Decided by: Claude, following 0005

## Context

Today the UI depends on a TypeScript `Api` interface with an in-browser mock. With a real HTTP API in the monorepo we
want end-to-end types without code generation, runtime validation at the edge, and a standard spec for consumers
outside the monorepo (a future mobile app, partners).

## Decision

- `@yeral/contract`: zod 4 schemas for everything on the wire (DTOs, inputs, enums, error codes). Used by the api for
  validation, by forms for client-side validation, and as inferred TypeScript types everywhere.
- `apps/api` declares routes with `createRoute` from these schemas; OpenAPI 3.1 is generated and served at `/docs`.
- `@yeral/sdk`: the typed client is Hono's `hc<AppType>` (type-only import from the api; no runtime coupling), wrapped with
  credentials, `ApiError` mapping and the event stream. It exports query keys, `queryOptions` and mutation helpers per
  resource. Apps use only the sdk.
- Errors: `{ error: { code, message?, details? } }` + HTTP status; codes enumerated in the contract.
- API path versioning `/v1` (ADR 0009).

## Consequences

- Renaming a field fails type-checking in every app that uses it, in the same PR.
- `docs/API.md` becomes a short guide; the generated OpenAPI is the reference.
- Type inference across a large Hono app can slow the editor; mitigated by per-module clients if it happens.

## Alternatives considered

- **OpenAPI-first + codegen** (openapi-typescript, hey-api, Orval): good across languages; unnecessary while both sides are TypeScript in one repo. The generated spec keeps this door open.
- **tRPC / oRPC**: great types, but not plain REST; mobile apps and partners would need a separate API.
- **Keep the TypeScript `Api` interface + mock**: no network boundary, can't be shared across subdomains.
