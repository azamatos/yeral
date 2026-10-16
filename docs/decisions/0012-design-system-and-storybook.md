# 0012. Design system in `@yeral/ui`, documented and tested in Storybook

- Status: Accepted 2026-10-13; revised 2026-10-14 (web DS v0.3.1) and 2026-10-16 (DS v0.4 + component map)
- Decided by: owner (design system with components, Storybook) + Claude

## Context

Four apps share one visual language (Design System v2 from the Claude Design export). The first web version kept
tokens in one CSS file and a handful of hand-rolled components. Several agents will build screens in parallel; without
one documented component library they'll each invent buttons and spacing.

## Decision

- **`packages/ui` is the design system**: tokens (`src/styles/tokens.css`, Tailwind `@theme`), base styles, and
  domain-free components. Each component is a folder: `button.tsx`, `button.stories.tsx`, optional `button.test.tsx`,
  exported by subpath (`@yeral/ui/button`).
- **Built on Radix primitives**, scaffolded with the shadcn CLI and restyled to DS v2 (we own the code); variants with
  `cva`; classes merged with `cn()`; no text inside components (labels come as props).
- **`apps/storybook`** (Storybook 10, React + Vite) collects stories from `packages/ui`, `packages/entities`,
  `packages/features` and app slices. Addons: docs (autodocs), a11y (axe), vitest, viewport. Published to
  `storybook.yeral.app` from `main`.
- **Every component ships with stories** for each variant and state (default, hover/focus via play, disabled, loading,
  long text, phone width). Stories are tests (ADR 0013).
- **Scaffolding is generated**: `pnpm gen ui-component <name>` (Turborepo generators) creates the folder, story,
  test stub and export entry, so every agent produces the same shape.
- **Design ↔ code**: the design export is the reference; component docs link to the matching design screen. Optional:
  the owner can start the `/design-sync` skill to keep this library in sync with a Claude Design design-system project,
  one component at a time.
- Tokens stay in CSS (single source). If a native app arrives, they move to DTCG JSON with generated CSS/TS.
- The skill `design-system` is the working guide.

## Revision 2026-10-14

The source is now the web design system v0.3.1 in `docs/design/` (`tokens.css`, `screens/system/*.dc.html`), not the
mobile DS v2. Tokens are mapped one to one into Tailwind `@theme` (same names: `n-*`, `a-*`, `st-*`, radii, sizes, type
scale); exact values from the screens, no rounding to a framework scale. Font: Onest, self-hosted
(`@fontsource-variable/onest`, latin, latin-ext, cyrillic, cyrillic-ext) rather than loaded from Google Fonts.

## Revision 2026-10-16

Design export v0.4 adds tokens v0.4 (aliases for values the screens already used, no new colours), two boards
(`DS-Patterns`: domain-free product components; `DS-Business`: domain components) and `docs/design/COMPONENTS.md`, the map
from every drawn component to its package or FSD slice, Storybook title and states. Rule: before a screen is built, each
piece of it is looked up there; missing components and variants are built first, with stories for every state on the
board, and the board wins where screens drifted. Domain components keep their stories in their FSD slice.

## Consequences

- New UI starts in Storybook, then goes into screens.
- Visual changes are reviewable as screenshots in PRs.
- Some upfront work (M1) before screens move fast.

## Alternatives considered

- **Ready-made kits** (MUI, Mantine, Chakra): fast, but fighting their look to match DS v2, heavier runtime.
- **Ladle / Histoire**: lighter than Storybook, but without the test, a11y and docs integration.
- **Tokens in JSON + Style Dictionary now**: extra build step with one platform to serve.
