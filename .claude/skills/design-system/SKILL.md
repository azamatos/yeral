---
name: design-system
description: Work on Yeral's design system — DS v2 tokens, @yeral/ui components (Radix + cva), Storybook stories and their tests, and checking screens against the Claude Design export. Use when adding or changing a component, a token or a style, writing stories, or when something looks off against the design.
---

# Design system

Decision: ADR 0012. Package: `packages/ui` (tokens `src/styles/tokens.css`, components `src/components/<name>/`).
Docs and tests: `apps/storybook` → `storybook.yeral.app`. Visual source: `Yeral Design System v2.dc.html` (+ Client App,
Business App) in the design export (`/Users/azamatos/www/yeral/design`). Before M1 the tokens are in `src/app/globals.css`
of the Next app.

## DS v2 in one screen

- White working surface; grey (`group`, `group-2`) only behind grouped rows; neutral dividers (`line`) instead of cards.
- One violet accent: `acc` #5a3ff0, text on tint `acc-ink` #4429d6, tint `acc-tint` #efecfe. Graphite `ink` #101014, greys `ink-2..4`.
- Status colours: green = confirmed/done, amber = needs attention (pending, proposal), red = declined/cancelled/no-show,
  slate = neutral/past. One badge shape for every status, in every app.
- Primary button: vertical gradient (`--grad`) + inner highlight + 1 px shadow (`--shadow-btn`). Radii by size: xs/sm 9–10,
  md 12, lg 14 px. Dark (`ink`) is secondary emphasis, not the main CTA.
- Radii: inputs 12, cards 16, sheets 22. Shadows only on floating layers (`--shadow-pop`, `--shadow-sheet`).
- System fonts (SF Pro / Roboto / Segoe). Icons: lucide-react, `strokeWidth={1.75}`, 18–20 px in rows, 16 in chips.
- Changing numbers (times, prices) use `tabular-nums`.

## Adding a component

1. **Is it domain-free?** Yes → `@yeral/ui`. It mentions salons, bookings or masters → an entity's `ui/` (skill `fsd`).
2. **Scaffold**: `pnpm gen ui-component <name>` → `src/components/<name>/{<name>.tsx, <name>.stories.tsx, <name>.test.tsx, index.ts}`
   and the `exports` entry. Interactive primitives (dialog, popover, menu, select, tabs, tooltip) start from Radix:
   `pnpm dlx shadcn@latest add <name>` inside `packages/ui`, then restyle to the tokens. We own the code.
3. **API**: variants with `cva` (`variant`, `size`, booleans like `block`); `cn()` so a passed `className` wins; `ref` is a
   normal prop (React 19); spread rest props on the root; no text inside (labels, `aria-label`s, empty-state copy come as props).
4. **Responsive**: design at 360–390 px first. Dialog = bottom sheet on phones, centred dialog from `sm`.
5. **States**: default, hover, focus-visible, active (`scale-[0.98]`), disabled, loading (`Skeleton` for content), empty, error, long text.
6. **A11y**: real `<button>`/`<a>`; visible focus ring; Radix `aria-*`; touch targets ≥ 40 px; contrast on tints.
7. **Stories** (`<name>.stories.tsx`, CSF3): one story per variant and state, a `Playground` with controls, a phone-width
   story. Interactions as `play` functions (keyboard, open/close). Stories are the component's tests (skill `testing`).
8. **Docs**: a short description at the top of the story file (what it's for, when not to use it) + the design screen it comes from.
9. **Forms**: field components (`TextField`, `PhoneField`, `SelectField`, `Checkbox`, `Switch`) are bound into
   `useAppForm` (`@yeral/ui/form`, TanStack Form `createFormHook`), so app forms stay short.

## Changing tokens

Tokens are a hot spot (ADR 0014): a separate small PR, announced. Update `tokens.css`, the "Tokens" docs page in
Storybook, and check screenshots of affected stories.

## Checking against the design

Open the matching screen in the `.dc.html` export and the story side by side at 390 and 1280 px: spacing, radius,
colour token, icon size and stroke, copy. Use Claude in Chrome for screenshots (skill `qa-flows`). The owner may run
`/design-sync` to sync this library with a Claude Design design-system project; don't start it yourself.
