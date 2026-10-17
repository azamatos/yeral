# 9. Decisions

Every decision that shapes Ýeral, newest first, with who made it and where it's written down. When the owner answers a
question in this book, the answer is added here with its date, and the chapters are updated to match.

## Answered in this book

None yet. Answers from the page land here first.

## How we work

| Date | Decision | By | Source |
|---|---|---|---|
| 17.10.2026 | The plan is reset: first a complete product book with no open questions, then the design, then components in Storybook, then code | owner | this book, chapter 1 |
| 17.10.2026 | Claude Code writes every prompt for Claude Design; the owner reviews, pastes and submits it; Claude Code reads the result from the canvas and checks it against the book | owner | this book, README |
| 17.10.2026 | The book lives as Markdown in `docs/product`; a published page is built from it for reading, answering and commenting | owner | this book, README |
| 16.10.2026 | Every pull request gets a code review before it's merged | owner | memory bank |
| 16.10.2026 | Only two environments: local and production; no staging | owner | ADR 0020 |
| 13.10.2026 | Infrastructure first; several agents may work in parallel, each in its own branch | owner | ADR 0014 |

## Product

| Date | Decision | By | Source |
|---|---|---|---|
| 17.10.2026 | Round 6, part B: the client side of declines, expiries and moves is drawn; tables and classes can't be moved (cancel and book again); a move never swaps the specialist silently; undo works for 5 minutes; search gets a party-size filter for restaurants; tables can be combined when creating a reservation; hours may end at 24:00; no back-dated bookings; unverified business links show "not open yet"; reviews under moderation are shown but not counted; login codes go to mobile numbers only | owner, through design v0.5 | `ROUND6-ANSWERS.md`, client spec §14, business spec §26 |
| 16.10.2026 | Round 6, part A: one account for client and business; a person can be in several workspaces with a level in each; a workspace is one address (no branches); three fixed access levels and a permission matrix; a setting for who answers requests; invites by SMS link for 7 days; ownership transfer; every status has an icon; optional team-only internal statuses; the business app works fully on phones; native apps later | owner, through design v0.5 | business spec §25 |
| 16.10.2026 | Ýeral is free for now: no plans, commission or invoices; the paid model is kept for later | owner | activeContext, business spec §25 |
| 14.10.2026 | Only verified businesses are public; they use the workspace from the first minute | business design round 4 | ADR 0018 |
| 14.10.2026 | Manual confirmation is the default; a business can switch on instant confirmation; requests expire after the business's hold time (default 30 minutes) with 3 other times for the client | owner, through business design round 4 | ADR 0017 |
| 14.10.2026 | Declines carry a reason and up to 3 offered times; complaints replace a "came" button; after N no-shows a client books only by phone | business design round 4 | ADR 0017 |
| 14.10.2026 | One booking engine with appointment, table and class types (resource later) and five statuses | design v0.3 | ADR 0017 |
| 14.10.2026 | Turkmen first, then Russian and English; every client address carries its language | owner | ADR 0016 |
| 14.10.2026 | The marketplace lives on yeral.app; there's no separate landing site; businesses use business.yeral.app | owner | ADR 0015 |
| 14.10.2026 | Maps: MapLibre with OpenFreeMap tiles | owner | activeContext |
| 14.10.2026 | The old mobile designs are removed: the web has its own design and logic | owner | activeContext |
| 14.10.2026 | Ýeral is for any business that sells its time, not only beauty | design v0.3 | projectbrief |

## Technology

| Date | Decision | Source |
|---|---|---|
| 14.10.2026 | Our own phone-code login and sessions stored in the database | ADR 0019 |
| 14.10.2026 | Each business has its own team, access and client records | ADR 0018 |
| 13.10.2026 | One repository for all apps and packages (pnpm and Turborepo) | ADR 0001 |
| 13.10.2026 | Vite and TanStack instead of Next.js | ADR 0002 |
| 13.10.2026 | Feature-Sliced Design inside the apps | ADR 0004 |
| 13.10.2026 | A TypeScript api in the same repository, on Postgres from the start | ADR 0005 |
| 13.10.2026 | One shared contract for the api and a client library generated from it | ADR 0006 |
| 13.10.2026 | Cloudflare now; the team's own server with Docker and nginx later | ADR 0007 |
| 13.10.2026 | Translations with use-intl | ADR 0008 |
| 13.10.2026 | Versions and releases with Changesets | ADR 0009 |
| 13.10.2026 | Checks and deploys on GitHub Actions | ADR 0010 |
| 13.10.2026 | Every kind of app state has one owner | ADR 0011 |
| 13.10.2026 | The design system lives in `@yeral/ui` and is tested in Storybook | ADR 0012 |
| 13.10.2026 | Testing strategy: unit, story, api and end-to-end tests | ADR 0013 |
