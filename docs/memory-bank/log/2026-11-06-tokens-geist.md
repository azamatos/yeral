# Design v0.7, piece 1: the tokens and Geist (PR #305, `docs/design-v0.7-r7.1`)

- What's there: `packages/ui/src/styles/theme.css` carries `docs/design/tokens.css` v0.7 — the heading tracking eased
  for Geist (display −0.03, h1 −0.025, h2 −0.02, h3 −0.01 em), the control scale (A3) as `rounded-ctl-s/m/l` 8 / 10 / 12,
  `text-ctl-s/m/l` 13 / 14 / 16 and `rounded-popover` 12 in the theme, with the heights, paddings, icons, option rows,
  tags and the popover's padding and height as spacing classes (`h-8 / h-10 / h-12`, `px-3 / px-4 / px-5`,
  `size-4 / size-4.5 / size-5`, `h-9` / `h-12`, `h-7` / `h-6`, `p-1.5 max-h-80`; the theme's header and the skill
  `design-system` list them), and `shadow-bar` (round 7.3's home SearchBar). `tokens.test.ts` maps the new names,
  checks half-unit sizes (18, 6) and that no design token is left unmapped. The retired `rounded-input / s / m / l`
  stay in the theme (208 usages) until the components move to the control scale.
- Geist replaces Onest (A1, the owner's decision on digits): `@fontsource-variable/geist` 5.3.0 through the catalog,
  imported in `base.css`, family `'Geist Variable'` in `--font-sans`. Its five subset files (latin, latin-ext, cyrillic,
  cyrillic-ext, vietnamese) are variable 100–900 and load by unicode-range; checked glyph by glyph with fontkit: Ä Ç Ö Ü Ý
  in latin, Ň Ş Ž in latin-ext, the whole Russian alphabet with Ё in cyrillic, `tnum` and `pnum` present. CSP: the
  files are bundled under `/assets/`, so `font-src 'self'` in `csp.ts` and the Caddy headers stays as it is.
- Checked: `pnpm turbo run lint typecheck test --filter=@yeral/ui...` green (121 token cases); three stories at 1440
  (Data/Table, Client/Pages/Booking Services, Data/StatTile) screenshotted with Onest and with Geist and their text
  boxes compared — nothing moved vertically (0 of 264 elements), text widths differ by 5 px at most, as the changelog's
  «~2 % narrower» promises. The business app's production build carries the font files under `dist/assets/`.
- The owner's round 7.3 export (the client site's C7 boards, one token) sat uncommitted in the main checkout on 06.11
  21:13; it's committed unedited on this branch as `docs(design): export v0.7 round 7.3, the client site`, with the
  same snapshot kept in a stash on `main` (`owner's design export round 7.3`) in case it should move to its own PR.
- What's left (the next pieces of round 7): A1's second half — `tabular-nums` off everywhere but numeric table
  columns, the time grid and timers (78 files today) and phones as `+993 69 90 11 22`; A3 — every control on
  S 32 / M 40 / L 48 and `rounded-ctl-*`, then the retired radii go; A4 — Tertiary and Danger quiet buttons, the ghost
  retired; A2 — our own Select and the TimeField; then A5–A11 and the B and C boards per `CHANGELOG.md`.
