# 2026-11-07 · buttons, control sizes and focus rings (design v0.7 · A3, A4, A11)

Branch `feat/ui-buttons-sizes`, from the owner's review notes #2, #6, #7, #16, #22, #28, #36, #41 (buttons that don't
look like buttons, uneven padding, controls of different heights in one row, the tab focus ring on the underline).
Source: `docs/design/screens/system/DS-Controls.dc.html` → 01 Sizes, 02 Buttons, 06 Focus ring; `COMPONENTS.md` Part 0.

## What's there

- **Button** (`packages/ui/src/components/button/button.tsx`): sizes S 32 / M 40 / L 48 with radii 8 / 10 / 12, side
  padding 12 / 16 / 20, text 13/16 · 14/20 · 15/20, icons 16 / 18 / 20 (`h-8/10/12`, `rounded-ctl-*`, `text-ctl-*`).
  Variants `tertiary` (n-100 fill, no border) and `danger-quiet` (white, danger-line, danger-ink; hover error-tint,
  active danger-line) added; `ghost` and `danger-ghost` retired, `danger` folded into `danger-quiet`; `plain` is the
  icon-only look for rows and toolbars. Disabled is one look for every boxed variant (n-100 fill, n-400 text, no
  border). Loading keeps the label: a 16 px spinner takes the leading icon's place (a button without an icon grows by
  the spinner — give Save / Send a `min-w-*`).
- **IconButton** (`icon-button.tsx`): `label` = aria-label + tooltip (`variant="label"`), `outline` (secondary look)
  or `plain`, square 32 / 40 / 48.
- **Segmented** s 32 / m 40 / l 48 (items 5 / 7 / 9 radius inside the 3 px frame); **Chip** s 32 / m 40 (default m).
- **Tabs** (A11): the label has 12 px of side padding, the list gap is 4, the focus ring is an `::after` box
  (y 4–36, radius 8) that stops 2 px above the underline. **Links**: `outline-2 outline-offset-2 outline-a-400`
  (breadcrumbs, the client's name in the booking drawer). **TableRow**: the inset ring on focus and on a focused link
  inside.
- The retired radius tokens (`--radius-input/s/m/l`) are gone from `theme.css` and `cn.ts`; every caller is on
  `rounded-ctl-s / ctl-m / ctl-l` (`rounded-l` 14 → `rounded-card` 16: v0.7 has no 14).
- Callers migrated by `scratchpad/buttons/migrate.py` (collect first, write last): ghost → tertiary (plain when
  icon-only), danger / danger-ghost → danger-quiet. Restyled by hand: the booking drawer's Call + Book again (two
  equal Secondary M, flex 1, gap 8) with the client's name as the link (no «Open the client's card»); Clear filters
  → tertiary S (clients, bookings, search, the filters drawer); the new booking's «Show all services» → Segmented M;
  «By phone number» → a tertiary S button (the digit detection is B7's ClientCombobox, round 7.2).
- Stories: Button Variants / Sizes / IconOnly / Disabled / Loading / WhichButton, Chip Sizes, Segmented Sizes / Large,
  Tabs KeyboardFocus.

## Traps

- A Python edit script that calls `edit()` twice on one file reads the file from disk the second time and the second
  write wins: the first edit vanished silently (the lint caught an unused import). One `edit()` per file.
- `rounded-l-xs` is the left side; `rounded-l` alone was the 14 radius. The migration regex uses `(?![\w-])`.

## Left (owner's list, this piece didn't reach)

- Team table: «Turn off» and «New setup link» as row buttons (danger-quiet S / secondary S) — today they sit in the
  row's menu; the TeamTable redraw is round 7.2 (B8/B9).
- New booking: «Create a new client» as the combobox's last option row and digits detected in one field (B7, 7.2).
- 404 «Home» → secondary L: the sent view's Home is secondary L already; the client 404 page keeps its own layout.
- `tokens.test.ts` doesn't list the retired tokens, so nothing to update there.
