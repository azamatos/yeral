---
name: design-system
description: Work on Ýeral's design system — web DS v0.3.1 tokens, @yeral/ui components (Radix + cva on Tailwind), Storybook stories and their tests, and matching the hi-fi screens in docs/design. Use when adding or changing a component, a token or a style, writing stories, building any screen, or when something looks off against the design.
---

# Design system

Decisions: ADR 0012 (+ revision 2026-10-14). Source of truth: `docs/design/` — read `docs/design/CLAUDE.md` first
(visual rules, how to read a `.dc.html`), then `tokens.css`, `screens/system/Main.dc.html` (foundations),
`screens/system/DS-Components.dc.html` (every component and state), `screens/README.md` (screens, states, dev notes).
Package: `packages/ui` (tokens `src/styles/tokens.css`, components `src/components/<name>/`). Docs and tests:
`apps/storybook` → `storybook.yeral.app`.

## The rules in one screen (web DS v0.3.1)

- White base; 1px `n-200` dividers instead of boxed cards; ink `n-900` text; secondary `n-600`, tertiary `n-500`;
  `n-400` is for disabled controls only, never text. Page background always white; `bg-group` only behind settings groups.
- One violet accent `a-500` for selection, status and the single primary action. Links / tinted text `a-600`.
- **One gradient primary button per view** (`--primary-bg`, inset highlight, `--primary-shadow`). Secondary = white +
  1px `n-300`. Ghost, Tint, Danger outline (`--danger-ink` / `--danger-line`); solid danger `--danger-solid` only for the
  final destructive confirm. The round search button in the header query bar is ink (`--ink-btn`).
- Sizes: buttons S 36 / r10 · M 44 / r12 · L 52 / r14; inputs 48 high, radius 8; cards radius 16; pills 999.
- Selection: tint (`a-50` bg, `a-line` border, `a-600` text) for chips, rows, tabs, cards; solid `a-500` for the chosen
  date and time slot. Hover rows `n-50`; pressed moves 1px down; disabled `n-100` fill + `n-500` text.
- Focus: `--focus-ring` on `:focus-visible` everywhere; inputs focus = border `a-500` + `--input-focus` halo; error = `#d9412f` + `--input-error`.
- Flat: shadows only on raised layers (`--shadow-raised`: popover, drawer, modal, toast; `--shadow-sheet` on phones).
- Overlays: modal 400 (login) / 480 / 640 · right drawer 480 · popover 280–360 · all become bottom sheets under 768.
  Toast: ink, bottom-left (bottom-centre on phones), 4–6 s, one at a time, one optional action ("Yzyna al" for undo).
- Statuses: `st-pending|confirmed|completed|cancelled|noshow` with `-bg/-line/-ink/-dot`; one badge shape everywhere;
  phone booking = confirmed + phone icon; cancelled-by-client vs by-business = same colour, icon + label.
- Type: Onest (self-hosted variable 400–800). Desktop scale display 64/68 · h1 44/48 · h2 32/38 · h3 22/28 · body-l 17/26 ·
  body 15/22 · dense 13/18 · button 15/20 · label 11/14 caps +0.07em; phones scale down below 768 (see `tokens.css`).
- Layout: breakpoints xl ≥1440 · lg 1280 · md 1024 · sm 768 · xs ≤767 (design at 390); grid 12/8/4; side margin 40/32/24/16;
  marketplace container 1200; app shell sidebar 248 → rail 72 → drawer.
- Icons: Lucide, stroke 1.75, sizes 16/20/24. No emoji, no gradient backgrounds, no left-border accent cards, no new colours.
- Touch targets ≥ 44 px (the `.hit` pseudo-element trick grows 36–40 px chips); text contrast ≥ 4.5:1.
- Copy exact numbers from the screens (padding, gaps, radii, font sizes, line heights). Don't round to a framework scale.

## Tokens in code

`packages/ui/src/styles/tokens.css` keeps the design's CSS variables with the same names and maps them into Tailwind
`@theme` (`--color-n-200`, `--color-a-500`, `--radius-btn-m`, `--text-h2`…), so classes read like the spec:
`border-n-200 text-n-600 bg-a-50 rounded-btn-m`. A value missing from the tokens is a question for the owner, not a new token.

## Adding a component

1. **Find it in `DS-Components.dc.html`** (and where screens use it). Port the helmet CSS classes (`.b .b-pri .chip
   .slot .tab .badge .st-*` …) into cva variants using the tokens; inline `style` values are exact.
2. **Domain-free?** → `@yeral/ui`. Mentions businesses, bookings, specialists → an entity's `ui/` (skill `fsd`).
3. **Scaffold**: `pnpm gen ui-component <name>` → `src/components/<name>/{<name>.tsx, <name>.stories.tsx, <name>.test.tsx, index.ts}`.
   Interactive primitives (dialog, popover, menu, select, tabs, tooltip) start from Radix (shadcn CLI scaffold), restyled to the tokens.
4. **API**: `cva` variants (`variant`, `size`, booleans); `cn()` so a passed `className` wins; `ref` as a normal prop;
   rest props on the root; no text inside (labels, `aria-label`s, empty-state copy come as props).
5. **States** from the sheet: default, hover, focus-visible, pressed, selected, disabled, loading (keeps width), error, empty, long text, RU (+30% length).
6. **Responsive**: check 1440, 1024, 768 and 390; overlays switch to bottom sheets under 768.
7. **A11y**: real `<button>`/`<a>`/`<input>` + `<label>`; Esc closes overlays and focus returns to the trigger; Radix `aria-*`.
8. **Stories** (CSF3): one per variant and state, a `Playground`, a phone-width story; `play` for keyboard and pointer.
   Stories are the component's tests (skill `testing`). The story file starts with what it's for and which design board it comes from.

## Checking against the design

Open the `.dc.html` (in a browser through the canvas, or read its markup) next to the story at the same width and
compare spacing, radius, colour token, type size, icon size and copy. Use Claude in Chrome for side-by-side screenshots
(skill `qa-flows`). The owner may run `/design-sync`; don't start it yourself.
