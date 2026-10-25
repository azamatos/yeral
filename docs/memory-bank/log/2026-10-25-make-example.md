# 2026-10-25: `make-example` (U7)

The owner's D2 (book chapter 9, 25.10.2026): while the sign-in code shows on the screen nothing is verified, so one of
the owner's own test businesses is opened to clients by a server command, marked "Example", still confirming by hand,
to try answering, declining and expiry live.

- `apps/api/src/modules/admin/examples.ts` `makeExample`: sets `demo` and `verification: 'verified'` (`--off`: back to
  `pending`, the mark gone, at any time) and emits `business.reviewed`; it keeps the booking rules. Opening is refused
  unless `SIGN_IN_CODE_ON_SCREEN=true`; both are refused for a draft, a closed business, the demo workspace, or one with
  no active owner who signs in (so the seeded examples aren't touched).
- `apps/api/src/db/cli.ts`: `make-example <slug> [--off]`; locally `pnpm --filter @yeral/api make:example`.
- How to run it on the server: operations.md and `infra/server/README.md` ("Deploying Ýeral by hand").

## Handoff

- Not deployed. After the next deploy: `ssh yeral-vps 'docker compose -f /srv/yeral/compose.yml run --rm api node
  dist/cli.js make-example <slug>'` with the owner's test business's page address.
- Before the real SMS sign-in (the Turkmenistan launch), take the test businesses back with `--off`; it works with
  the switch off too, and nothing else takes them back (they stay verified).
