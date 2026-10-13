---
name: ui-component
description: Build or change Yeral UI following Design System v2 — tokens, cva variants, Radix primitives, accessibility, phone-first layouts. Use when adding a component to @yeral/ui or a slice's ui segment, restyling a screen, or when something looks off against the design.
---

# UI components

Visual source: `../design/Yeral Design System v2.dc.html` (+ Client App, Business App) next to the repo.
Tokens: `@theme` in `packages/ui` (today `src/app/globals.css`).

## Design system in one screen

- White working surface; grey (`group`, `group-2`) only behind grouped rows; neutral dividers (`line`) instead of cards.
- One violet accent: `acc` #5a3ff0, text on tint `acc-ink` #4429d6, tint `acc-tint` #efecfe. Graphite `ink` #101014, greys `ink-2..4`.
- Status colours: green = confirmed/done, amber = needs attention (pending, proposal), red = declined/cancelled/no-show,
  slate = neutral/past. One badge shape for every status, in every app.
- Primary button: vertical gradient (`--grad`) + inner highlight + 1 px shadow (`--shadow-btn`); radii 10/12/14 px by size
  (xs/sm 9–10, md 12, lg 14). Dark (`ink`) is secondary emphasis, not the main CTA.
- Radii: inputs 12, cards 16, sheets 22. Shadows only for floating layers (`--shadow-pop`, `--shadow-sheet`).
- System fonts (SF Pro / Roboto / Segoe). Icons: lucide-react, `strokeWidth={1.75}`, 18–20 px in rows, 16 in chips.
- Numbers that change (times, prices) use `tabular-nums`.

## Building a component

1. Domain-free? → `packages/ui`. Mentions salons/bookings/masters? → an entity's `ui/` (see skill `fsd`).
2. Interactive (dialog, popover, menu, select, tabs, tooltip) → start from Radix (`radix-ui`), scaffolded with
   `pnpm dlx shadcn@latest add <name>` into `packages/ui`, then restyle to the tokens above. We own the code.
3. Variants with `cva` (`variant`, `size`, booleans like `block`); merge classes with `cn()` so a passed `className` wins.
4. No text inside `@yeral/ui`: labels, `aria-label`s and empty-state copy come in as props (i18n lives above).
5. `ref` is a normal prop in React 19; spread the rest props onto the root element.
6. Responsive: design at 360–390 px first. Dialog pattern: bottom sheet on phones, centred dialog from `sm`.
7. A11y: real `<button>`/`<a>`; visible focus ring; `aria-*` from Radix; touch targets ≥ 40 px; contrast on tints checked.
8. States: hover, active (`scale-[0.98]`), disabled, loading (`Skeleton`, not spinners, for content), empty (`Empty`), error.
9. Once Storybook exists (business milestone), add a story with every variant.

## Checking against the design

Open the matching screen in the `.dc.html` export and compare at phone width (390) and desktop (1280): spacing, radius,
colour token, icon stroke, copy. Use the browser (skill `qa-flows`) for a screenshot comparison.
