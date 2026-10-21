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
    first code with the recovery codes), the sign-in (one refusal, the lock, a code works once, recovery codes once),
    new recovery codes, a new password (other sessions end), the team list, `recordAction()`.
  - Routes `/v1/admin/sign-in|sign-out|me|me/password|me/recovery-codes|setup/{token}[/password|/confirm]|team[/{id}/reset|/disable]`;
    errors `sign_in_failed`, `admin_code_wrong`, `setup_expired`, `login_taken`, `admin_unavailable` (tk, ru, en).
  - The CLI: `admin-invite <login> "<name>"` (`pnpm --filter @yeral/api admin:invite`), a new account or a reset.
  - Infra: the server's `.env` gets `ADMIN_SECRET_KEY` from deploy.sh once; compose passes it; operations.md.
- Tests: `lib/admin-crypto.test.ts`, `modules/admin/admin.test.ts` (setup, sign-in, the lock, a phone and other sites
  kept out, the team's actions, password and recovery codes, no key).
- Follow-ups: the business endpoints of step 5 (verify, reject, hide, close, reported reviews, add a business), each
  through `recordAction()`; the sdk's admin namespace with the admin tool (P4 slice 6); passkeys later (ADR 0026).
