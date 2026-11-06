# 0026. The Ýeral team signs in with its own accounts: a password and an authenticator code

- Status: Accepted 2026-10-21; amended 2026-11-06 (the sign-in in two steps; a superadmin and admins) — completes
  [0019](0019-own-phone-login-and-sessions.md)'s "the CMS gets its own staff accounts and second factor"; replaces the
  Cloudflare Access part of [0007](0007-hosting-cloudflare-now-docker-later.md) for `cms.` (ADR 0024 keeps Cloudflare to DNS)
- Decided by: the product book (F-178 MVP, Q-010, Q-011, chapter 10 P2 step 5: "with the code on the screen, a phone
  number must never open the admin tool") + Claude (how, delegated); the owner on 2026-11-04 for the amendment (the
  two steps and the roles, below)

## Context

The admin tool (cms.yeral.app, F-178) verifies businesses, hides them, closes workspaces and removes reviews, so its
accounts need more than a phone code. At the first launch no SMS goes out and the sign-in code shows on the screen
(Q-036): anyone who types a number signs in as it. Ýeral has no e-mail either. ADR 0007 put Cloudflare Access in front
of the CMS; since ADR 0024 the apps run on our own server with Cloudflare for DNS only, so nothing sits in front of it.

## Decision

- **Own accounts, never a phone account.** The team's accounts are their own table (`admins`), with nothing linking
  them to `users`: a person on the team signs in to the admin tool with its account and to Ýeral with their phone, and
  the phone never opens the admin tool.
- **Three things at each sign-in, in two steps** (amended 2026-11-06; until then all three went in one request, so a
  wrong part said nothing about which): a login name and a password first; right, the api answers a **sign-in
  challenge** (a random token, only its SHA-256 kept in `admin_challenges`, bound to the account, 5 minutes, used
  once); then a 6-digit code from an authenticator app (TOTP, RFC 6238: 30 seconds, HMAC-SHA1, one step either side; a
  code works once) or one of 10 one-time recovery codes, for that challenge. A wrong password or an unknown login is one
  refusal (`sign_in_failed`; an unknown login takes as long). A wrong code is `admin_code_wrong` and the step stays; it
  counts per challenge (5, then the challenge is spent) and per account for the hour (below). A challenge that ran out,
  was spent or used, or whose account was reset or turned off meanwhile, is `sign_in_expired`: back to the first step.
  An address gets 30 tries an hour, both steps and the setup steps included, and 10 a quarter-hour for any one login at
  the first step (`rate_limited`, the same for every login): guessing stays slow, and nobody can lock an account's owner
  out from elsewhere, as an account lock would let them. Wrong codes after the right password count per account from
  every address: 10 in an hour hold the account for the hour (`rate_limited` at either step, with the wait) and write
  an error line for the alerts; only someone who has the password can trip it. The slow password check runs before any
  transaction or lock.
- **Web Crypto only** (AGENTS rule 7): passwords are PBKDF2-SHA256 with a random salt and 600,000 rounds (12–128
  characters), and a setup link is checked before its password is hashed. Two keys are derived (HKDF) from
  `ADMIN_SECRET_KEY` (32 bytes, base64; development and tests use a fixed key): the authenticator secrets are sealed
  with AES-256-GCM under one, and the recovery codes kept as HMAC-SHA256 of the account and the code under the other.
  A copy of the database or a backup alone gives neither the codes nor anything to try them against. A config without
  the key (production) answers `admin_unavailable` on the admin endpoints and the rest of the api runs; the server's
  compose requires it, and deploy.sh makes it once. A secret sealed under another key answers `admin_unavailable` too,
  whatever the password, and logs which account to reset. No new dependency.
- **Accounts start from a link.** The first account is made on the server (`node dist/cli.js admin-invite <login>
  "<name>"` in the api's container; `pnpm --filter @yeral/api admin:invite` locally), which prints a setup link to
  `cms.<domain>/setup/<token>`, valid 24 hours; only its hash is kept. The person picks the password, adds the secret
  to their app, confirms with a code and gets the recovery codes.
- **A superadmin and admins** (amended 2026-11-06, Q-011; until then one role, and any teammate could turn off the
  first account). `admins.role`: the first account ever (the server command's) is the **superadmin**, exactly one (a
  partial unique index keeps it so); every account after it is an **admin**. Only the superadmin invites admins,
  hands out a new setup link (a reset: the password, secret, recovery codes, sessions and sign-ins under way go) and
  turns an admin off; an admin gets `superadmin_only`. Nobody resets or turns off the superadmin from the admin tool,
  the superadmin themselves included (`superadmin_protected`); only the server command does (a new link for their
  login, their way back). Admins keep every other power of the tool (businesses, reviews) and see the Team page
  read-only, the buttons they can't use left out. The rule is one pure function (`@yeral/domain/admin-roles`), used by
  the api and the app alike. No manager role yet: none has rights of its own; when one does (later: managers, analysts,
  investors, in the owner's words), it joins the enum and the rule.
- **Sessions of their own:** `admin_sessions`, a cookie `<prefix>.admin` on the api's host only (not the parent
  domain the client and business share), `SameSite=Strict`, path `/v1/admin`, 12 hours with no renewal. Signing out,
  a reset and disabling end them; a session starts inside the transaction that signed in, so none survives a reset or a
  new password that commits meanwhile. Every `/v1/admin` request must carry the admin tool's `Origin`: no other site, and no
  page the api serves itself (`/docs`), can use the cookie.
- **Setup tokens stay out of logs:** Caddy's access logs blank them as they do a booking link's (`/setup/…`,
  `/v1/admin/setup/…`).
- **One action at a time per account:** every hold on an account's row is NO KEY UPDATE, an action holds its actor
  and its target in one order and checks the actor is still active. (Since the roles, nobody acts on the superadmin,
  so two team members can't act on each other at once any more; the holds stay for the superadmin's own actions and the
  sign-in's second step, where the challenge and the account are held so one code or one challenge gets in once.)
- **Every change the team makes is written down** (`admin_actions`: who, what, which business or review, the reason,
  when), for the business endpoints that follow (step 5).

## Amended 2026-11-06: two steps, two roles

The owner's review of the first launch (04.11.2026) asked for both. "Authenticator step should be next for auth admin
panel. First step login and password, then auth code. Most of platforms use this pattern." And: "I am the main admin,
then I add my partner, then he can just turn me off… U should have roles. 1 superadmin, which creates admins. Then
admins can create managers and maybe in future analytics or business holders/investors. But for now we need at least
super admin and admin roles."

What the two steps reveal, and why that's acceptable: the first step's answer says whether the login and the password
were right, which the one request hid. A guesser learns a password is right only by guessing it, and the limits that
held before hold here: 10 tries a quarter-hour for a login from an address and 30 an hour from an address make that
slow (the password is 12 characters or more); and the code behind it still needs the phone or a recovery code, with 5
tries a challenge and 10 an hour for the account, after which the account is held and the alerts hear of it. What the
pattern buys is what every common platform has: the person sees which step they got wrong, and the code is asked for
when it's needed, not typed in advance and spent on a wrong password. The review's first option (two screens in the
app, one request) would have kept the hiding but not the second gain, and the owner asked for the common pattern.

The migration (`0046`) makes the earliest-created account the superadmin: in production the owner's, made first by
`admin-invite`; the partner's stays an admin.

## Consequences

- The admin tool is safe to open on the internet with the code on the screen; restricting `cms.` to known addresses
  in Caddy stays possible and isn't needed for the launch.
- The superadmin can't be turned off or reset from the tool; a lost phone or password for that account takes the
  server command (`admin-invite <login> "<name>"` resets a login that exists, its role kept).
- The server needs `ADMIN_SECRET_KEY` before the first account is set up (operations.md); losing it means every
  account sets up its app again through a reset link from the server command.
- No password reset by e-mail or SMS: a teammate or the server command sends a new link.
- Passkeys (WebAuthn) would be stronger against phishing; they can replace the code later without changing the
  accounts or sessions.
