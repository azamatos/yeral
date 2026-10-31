# 0021. Product book first; Claude Code writes the design prompts

- Status: Accepted 2026-10-17 — changes the order of the roadmap in `progress.md` and how ADR 0012 gets its designs;
  amended 2026-10-19: with the book closed, the backend runs alongside the design; amended 2026-10-20: small design
  iterations, then design only where it's needed (see the last Decision bullets)
- Decided by: owner ("we need to fully reorganize the strategy … after we finish all possible scenarios, when there is no
  any questions/dilemmas we move to making the full prepared design and components/storybook. We will move to real
  coding") + Claude (how)

## Context

Product rules kept changing after code was built from them: manual-only confirmation became a business setting (round 4),
editable roles became fixed access levels and branches disappeared (round 6), billing became "free for now" (owner,
2026-10-16). Logic gaps found in code went back to the designer as long request files (round 6: 18 items), and the owner
prompted Claude Code and Claude Design separately, which caused miscommunication. Open questions were spread across
`activeContext.md`, the design READMEs and request files. The owner called the state "very very chaotic" and stopped all
work on 2026-10-17.

## Decision

- **Order:** (1) a complete product book with no open question, (2) the full design, (3) components and Storybook,
  (4) code. Nothing is designed or built from a chapter that still has open questions.
- **The book** lives in `docs/product/` as Markdown: vision, norms, roles, rules, limits, scope (MVP / later / never),
  every client, business and system flow, notifications, decisions, and one question register (`questions.md`). It is
  the single source of product rules; specs in `docs/design` are inputs to it.
- **Reading and answering:** a page is built from the Markdown (`docs/product/tools/build.mjs`) and published as a
  private claude.ai artifact. The owner reads it, answers questions, places features and comments there; Claude reads
  the answers (artifact database) and writes them back into the book and its decisions chapter.
- **Pairing with design:** Claude Code writes every prompt for Claude Design from closed chapters; the owner reviews,
  pastes and submits it; Claude Code reads the result straight from the "Ýeral Web" canvas
  (claude.ai artifact `Hkq5oyUnRVrRV3XSs7EAtt`) and checks it against the book. Mismatches become the next prompt.
  The owner no longer writes separate prompts for Claude Design.
- **Existing code** (M0–M2: monorepo, CI, `@yeral/ui`, domain, contract, sdk, api) is kept, frozen and adjusted to the
  book once it is closed. yeral.app keeps serving `apps/legacy` until the new client site replaces it.
- **Amended 2026-10-19 (owner: "why can't we do backend async, we are not depending on design, all business
  decisions are already done"):** the book closed on 2026-10-18, so the backend that implements its rules (domain,
  api, jobs, market settings, access model, admin, first-launch mode) runs alongside the design pass. Only what a
  screen shows (the exact fields of an endpoint's response) follows the design, and the contract is adjusted when
  the export lands. Components in Storybook and the apps still wait for the design.
- **Amended 2026-10-20 (owner, after design round 3 took about three hours: "We should make decomposition with
  smaller iterations"):** design work goes in small iterations: one Claude Design prompt draws one main board, or two
  small ones, with its own phone frames and design-system pieces, in about ten instructions; fixes a check finds get
  their own short prompt; each iteration is checked before the next is written (product book chapter 10, P1).
- **Amended 2026-10-20, later (owner: "Do we really need all this detailed design? … we design when it's really
  necessary for critical details"):** the full redraw stops after round 3.4. The book holds every decision, the
  design system and the business app are drawn in English (export v0.6, rounds 1–3.4), and every client screen is
  drawn in export v0.5 (Turkmen; the layout holds in any language), apart from a few states the book lists as
  undrawn (the hourly code limit, the finished visit on the link page, "Is this you?"), which follow the nearest drawn
  pattern. Components in Storybook and the apps start now
  and no longer wait for an export: they follow the book for behaviour and words, then the drawn boards (v0.6 where
  drawn, else v0.5) and the nearest drawn pattern for visuals. Claude Design is used only for a critical detail with
  no drawn pattern, or a key screen where the owner wants to see options, one small prompt each. The owner reviews
  built screens in Storybook and the local app instead of the canvas; "how" decisions made while building are
  recorded as "Claude (delegated)" rows in the book's chapter 9. The Russian-length check (Q-101) moves from the
  design prompts to the build: a Russian-length story for every component and a check of each slice's screens.

## Consequences

- No new product code until the relevant chapters are closed; the roadmap milestones M3/M5 are paused and re-planned from
  the book's scope chapter.
- Every product question has one home (`docs/product/questions.md`) and one ID; the old activeContext open-questions
  table is history (`progress.md`, 2026-10-17).
- The design canvas becomes something Claude Code checks, not only something exported; exports still land in
  `docs/design/` unchanged.
- Since 2026-10-20 the screens are reviewed where they're built (Storybook, the local app), and the client site's
  English words are written in the code's English source, not drawn first; the old boards' Turkmen stays the
  reference for `tk` (ADR 0022).
- The book must be kept in step with every answer, or it stops being the source of truth; Claude updates it in the same
  session an answer arrives.

## Alternatives considered

- **Keep building screen by screen from each design export** (the old M3 plan): fast to start, but rules kept changing
  under built code.
- **Let the design export stay the rulebook** (design README wins on behaviour): the export replaces its folder each
  time and can silently drop or flip a rule; code and tests are where rules execute.
- **A Claude Doc instead of Markdown + page:** comfortable to read, but a second copy that agents can't use directly
  and that drifts from the repo.
