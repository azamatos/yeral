# 2026-10-25: `make-example` (U7)

The owner's D2 (book chapter 9, 25.10.2026): while the sign-in code shows on the screen nothing is verified, so one of
the owner's own test businesses is opened to clients by a server command, marked "Example", still confirming by hand,
to try answering, declining and expiry live.

- `apps/api/src/modules/admin/examples.ts` `makeExample`: from "in review" sets `demo` and `verification: 'verified'`;
  `--off` drops `demo` and an open one back to `pending` (a team's verdict given meanwhile stays), at any time. Each
  change emits `business.reviewed`, a change of `verification` adds a history row; the booking rules stay. Opening needs
  `showsCodeOnScreen` and refuses a draft, a closed or hidden business, or one the team verified or sent back; both
  refuse the demo workspace and a business with no owner who signs in (`signsIn`), so the seeded examples aren't
  touched. `exampleArgs` refuses a mistyped flag.
- `seedExamples` no longer rewrites the phone of a business with a team (an owner's test business may sit at a design
  address, the phone rewrite matched `demo` and the slug only).
- `apps/api/src/db/cli.ts`: `make-example <slug> [--off]` (prints the business's name), `withDb` for the commands run
  by hand; locally `pnpm --filter @yeral/api make:example`.
- How to run it on the server: operations.md and `infra/server/README.md` ("Deploying Ýeral by hand").

## Handoff

- Not deployed. After the next deploy: `ssh yeral-vps 'docker compose -f /srv/yeral/compose.yml run --rm api node
  dist/cli.js make-example <slug>'` with the owner's test business's page address.
- Before the real SMS sign-in (the Turkmenistan launch), take the test businesses back with `--off`; it works with
  the switch off too, and nothing else removes the mark.
