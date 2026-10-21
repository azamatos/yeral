# The Ýeral team's sign-in (feat/p2-admin-auth)

- Changed: P2 step 5's first part, book F-178 and Q-011 (chapter 9 how-row 21.10.2026, Claude (delegated)); ADR 0026.
  Stacked on the floor PR (migration 0035 after its 0034).
  - `lib/password.ts` (PBKDF2-SHA256, 600,000 rounds, about 90 ms), `lib/totp.ts` (RFC 6238, tested on its test
    values), `lib/sealed.ts` (AES-256-GCM): Web Crypto only, no new dependency.
  - Config `ADMIN_SECRET_KEY` (`config.adminKey`, `Deps.adminKey`): a fixed key outside production; none in production
    answers `admin_unavailable` (503).
  - Schema `admins`, `admin_sessions`, `admin_actions` (migration 0035).
  - `modules/admin/session.ts`: the cookie `<prefix>.admin` (api host, `SameSite=Strict`, path `/v1/admin`, 12 hours),
    `adminSessionMiddleware` on `/v1/admin/*` (refuses another site's Origin), `requireAdmin()`.
  - `modules/admin/accounts.ts`: invite, reset, disable (never one's own), the setup (password and secret, then the
    first code with the recovery codes), the sign-in (one refusal, the limits, a code works once, recovery codes once),
    new recovery codes, a new password (other sessions end), the team list, `recordAction()`.
  - Routes `/v1/admin/sign-in|sign-out|me|me/password|me/recovery-codes|setup/{token}[/password|/confirm]|team[/{id}/reset|/disable]`;
    errors `sign_in_failed`, `admin_code_wrong`, `setup_expired`, `login_taken`, `admin_unavailable` (tk, ru, en).
  - The CLI: `admin-invite <login> "<name>"` (`pnpm --filter @yeral/api admin:invite`), a new account or a reset.
  - Infra: the server's `.env` gets `ADMIN_SECRET_KEY` from deploy.sh once; compose passes it; operations.md.
- Tests: `lib/admin-crypto.test.ts`, `modules/admin/admin.test.ts` (setup, sign-in, the limits, a phone and other sites
  kept out, the team's actions, password and recovery codes, no key).
- The review's findings, fixed: a setup link is checked (and the address counted) before the password is hashed;
  recovery codes are HMAC-SHA256 of the account and the code under a key derived from `ADMIN_SECRET_KEY` (HKDF, as the
  sealing key now is); Caddy blanks `/setup/…` and `/v1/admin/setup/…` tokens in its logs (server, edge, local
  stack); the account lock went (columns gone from migration 0035) for limits per address (30 an hour) and per login
  from an address (10 a quarter-hour), the same for any login; every account row hold is NO KEY UPDATE, actor and
  target held in id order with the actor re-checked as active; `/v1/admin/*` needs the cms `Origin` (no Origin is
  refused too); a secret that won't open answers `admin_unavailable` before the password check and logs the login; a
  malformed `ADMIN_SECRET_KEY` names the variable. Tests for each (`admin.test.ts`, `config.test.ts`).
- The second review's findings, fixed: the password is checked before any transaction or lock (the row read
  plainly, held again only to use the code, its password and secret checked unchanged), so tries can't tie up the
  database's connections; the session starts inside the transaction that signed in or confirmed the setup
  (`StartSession`), so a reset or a new password that commits meanwhile can't miss it; wrong codes after the right
  password count per account from anywhere (`CODE_MISSES_PER_ACCOUNT`, 10 an hour, `under()` in `lib/rate-limit.ts`),
  holding the account for the hour and writing an error line for the alerts; the schema's comment and techContext
  say the recovery codes are keyed; `adminKeys()` and `keyedHash()` have their test.
- Migration 0035 was replaced in the review (the lock's columns went; a later journal time): a development database
  migrated on the PR's first commit fails on it ("relation admins already exists"). Drop it and run `pnpm db:setup`
  again; production never ran it.
- When the admin tool's site joins Caddy, serve `/setup/…` with `Referrer-Policy: no-referrer` (or filter the
  `Referer` header): its assets would carry the token in that header otherwise (the same holds for `/l/` on the
  client site).
- The edge's Caddyfile changed too: copy `infra/server/edge/Caddyfile` to `/srv/edge` and reload Caddy at the next
  deploy (as #49's).
- Follow-ups: the business endpoints of step 5 (verify, reject, hide, close, reported reviews, add a business), each
  through `recordAction()`; the sdk's admin namespace with the admin tool (P4 slice 6); passkeys later (ADR 0026).
