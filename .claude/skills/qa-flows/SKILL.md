---
name: qa-flows
description: Click-test Yeral's critical flows in a real browser with Claude in Chrome — sign-in, profile, the business app's shell, and each slice's flows as they're built (booking, answering, calendar), phone layouts — and report what broke. Use before a production deploy, after porting or changing a screen, at the end of a slice, or when the user asks to test the site.
---

# Browser QA

Use the Claude in Chrome tools: open a new tab, never reuse the owner's tabs. Phone checks at 390×844, desktop at 1280×800.
Watch the console (`read_console_messages` with a pattern) for errors on every page. Don't trigger native dialogs.

## Demo facts

- Local: `pnpm db:setup` once, then `pnpm dev`: client :3001, business :3002, cms :3003 (not built yet), api :3004
  (`/docs`), Storybook :3005 (plus the `PORT_BASE` offset in other worktrees). No staging (ADR 0020): test locally or
  with `pnpm docker:up` (`*.yeral.localhost`).
- Sign-in outside production: any mobile number of the market (`MARKET` in `@yeral/domain/market`), code `1234`; the
  development seed's accounts and businesses are in `apps/api/src/db/seed`.
- The old site's flows (`apps/legacy`, removed 2026-10-23) went with it.

## Flows (expected result in brackets)

Each P4 slice adds its flows here as it's built, from the book's flows (`pnpm book show C-…` / `B-…`) and the design
(`docs/design/screens/README.md`, `docs/design/business/README.md`), at 1440 and 390, in English.

1. **Client sign-in** (slice 1): client site → Log in → number → code → name for a new account [signed in; the header
   shows the account; the demo note shows while the code is on the screen].
2. **Client profile** (slice 1): edit the name and photo, log out, log in again [changes kept].
3. **Business sign-in** (slice 1): business app → number → code [the workspace switcher, an invite card or the
   "Continue setting up" card].
4. **My account** (slice 1): open it from the shell, edit, leave a workspace [the confirm says what it touches].
5. **Phone layout**: flows 1 and 3 at 390 px [no horizontal scroll; sheets instead of dialogs].

## Report

A short table: flow · result (ok / bug) · what happened · screenshot or console line. Fix obvious bugs found in the same
session if the user asked for fixes; otherwise list them and ask.
