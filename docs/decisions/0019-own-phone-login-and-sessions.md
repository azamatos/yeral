# 0019. Our own phone-code login and database sessions instead of Better Auth

- Status: Accepted 2026-10-14 — revises [0005](0005-typescript-backend-in-monorepo.md) (auth library) and [0018](0018-business-workspace-model.md) (identity)
- Decided by: Claude, while building the api (M2d); the owner can reverse it before the CMS milestone at no cost

## Context

ADR 0005 chose Better Auth (phone number + one-time code, sessions in Postgres). Building the api against the design
showed how much of it we would be working around:

- The design's login (client spec §4.4, §4.7): 4-digit code, **"Kod nädogry. Ýene N synanyşyk galdy."** (attempts left),
  **3 tries then a 60-second lock**, resend after 0:59, name asked only for new users, code `1234` outside production.
  Better Auth's phone plugin deletes the code after N tries and returns a generic error: no attempts left, no lock timer.
- Its user model requires an e-mail address; phone-only sign-up stores a made-up e-mail per user.
- Its endpoints live outside our contract: no zod schemas in `@yeral/contract`, no OpenAPI, no Hono RPC types, error codes
  that `@yeral/i18n` doesn't know. We'd wrap every call anyway.
- ADR 0018 already keeps teams, roles and invitations out of it, so what remains is a code table and a session table.

## Decision

Phone login and sessions are a small module in `apps/api` (`modules/auth`), on our own tables:

| Table | Holds |
|---|---|
| `users` | phone (E.164, unique), name (null until asked), language, SMS notification switches |
| `login_codes` | per phone and purpose (`login`, `change_phone`): code hash, expiry (5 min), attempts, lock until, last sent |
| `sessions` | SHA-256 of a random 32-byte token, user, expiry (60 days, renewed when under 30 left), last seen, user agent |
| `rate_limits` | fixed-window counters (code requests per phone and per IP) |

- The cookie: `<site.cookiePrefix>.session`, httpOnly, `SameSite=Lax`, `Secure` outside local, `Domain` from
  `@yeral/lib/site` (shared by the client site and the business workspace). Only the token's hash is stored.
- Mutations check `Origin` against `site.origins`. Mobile apps (later) send the same token as a bearer header.
- Codes are random 4 digits hashed with the phone; outside production the code is always `1234` and SMS go to the log.
- Every endpoint is in the contract and the OpenAPI document like the rest of the api.
- The CMS (M6) gets its own staff accounts and second factor when it's designed; Better Auth (or a TOTP library) can be
  chosen then for that app alone.

## Consequences

- Exactly the design's behaviour, tested with `app.request()` against Postgres; no placeholder e-mails.
- We own session security: token entropy, hashing, expiry, renewal, logout everywhere on phone change, rate limits.
  The module is small and covered by tests; the rules are listed above.
- `systemPatterns.md` (Auth) and `techContext.md` drop Better Auth.

## Alternatives considered

- **Better Auth with the phone plugin** (ADR 0005): sessions and cookies for free, but attempts/lock/resend behave
  differently from the design, users need fake e-mails, and its endpoints sit outside the contract.
- **Better Auth with a custom plugin endpoint for our OTP rules**: keeps its session machinery, but adds a plugin layer
  and its user schema to save ~100 lines of session code.
- **Hosted auth (Clerk, Supabase Auth, Firebase)**: phone auth is paid per SMS through their providers, which don't serve
  Turkmenistan well, and it would be one more service to move to the own server.
