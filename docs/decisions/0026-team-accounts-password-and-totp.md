# 0026. The Ýeral team signs in with its own accounts: a password and an authenticator code

- Status: Accepted 2026-10-21 — completes [0019](0019-own-phone-login-and-sessions.md)'s "the CMS gets its own staff
  accounts and second factor"; replaces the Cloudflare Access part of [0007](0007-hosting-cloudflare-now-docker-later.md)
  for `cms.` (ADR 0024 keeps Cloudflare to DNS)
- Decided by: the product book (F-178 MVP, Q-010, Q-011 one role, chapter 10 P2 step 5: "with the code on the screen, a
  phone number must never open the admin tool") + Claude (how, delegated)

## Context

The admin tool (cms.yeral.app, F-178) verifies businesses, hides them, closes workspaces and removes reviews, so its
accounts need more than a phone code. At the first launch no SMS goes out and the sign-in code shows on the screen
(Q-036): anyone who types a number signs in as it. Ýeral has no e-mail either. ADR 0007 put Cloudflare Access in front
of the CMS; since ADR 0024 the apps run on our own server with Cloudflare for DNS only, so nothing sits in front of it.

## Decision

- **Own accounts, never a phone account.** The team's accounts are their own table (`admins`), with nothing linking
  them to `users`: a person on the team signs in to the admin tool with its account and to Ýeral with their phone, and
  the phone never opens the admin tool.
- **Three things at each sign-in, in one request:** a login name, a password and a 6-digit code from an authenticator
  app (TOTP, RFC 6238: 30 seconds, HMAC-SHA1, one step either side; a code works once). One of 10 one-time recovery
  codes stands in for the app's code. Any wrong part gets the same refusal (`sign_in_failed`); 10 wrong in a row lock
  the account for 15 minutes (`too_many_attempts`), and an address gets 30 tries an hour (`rate_limited`).
- **Web Crypto only** (AGENTS rule 7): passwords are PBKDF2-SHA256 with a random salt and 600,000 rounds (12–128
  characters); the authenticator secrets are kept sealed with AES-256-GCM under `ADMIN_SECRET_KEY` (32 bytes, base64,
  set on the server; development and tests use a fixed key), so a copy of the database or a backup alone doesn't give
  the codes. Without the key in production the admin tool answers `admin_unavailable` and the rest of the api runs.
  No new dependency.
- **Accounts start from a link.** The first account is made on the server (`node dist/cli.js admin-invite <login>
  "<name>"` in the api's container; `pnpm --filter @yeral/api admin:invite` locally), which prints a setup link to
  `cms.<domain>/setup/<token>`, valid 24 hours; only its hash is kept. The person picks the password, adds the secret
  to their app, confirms with a code and gets the recovery codes. After that any team member invites others and
  resets one who lost their phone or password (a new link; their password, secret, recovery codes and sessions go).
  One role (Q-011); no one disables themselves or the last active account.
- **Sessions of their own:** `admin_sessions`, a cookie `<prefix>.admin` on the api's host only (not the parent
  domain the client and business share), `SameSite=Strict`, path `/v1/admin`, 12 hours with no renewal. Signing out,
  a reset and disabling end them.
- **Every change the team makes is written down** (`admin_actions`: who, what, which business or review, the reason,
  when), for the business endpoints that follow (step 5).

## Consequences

- The admin tool is safe to open on the internet with the code on the screen; restricting `cms.` to known addresses
  in Caddy stays possible and isn't needed for the launch.
- The server needs `ADMIN_SECRET_KEY` before the first account is set up (operations.md); losing it means every
  account sets up its app again through a reset link from the server command.
- No password reset by e-mail or SMS: a teammate or the server command sends a new link.
- Passkeys (WebAuthn) would be stronger against phishing; they can replace the code later without changing the
  accounts or sessions.
