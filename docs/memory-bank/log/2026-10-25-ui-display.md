# Slice 3's shared ui, U2: Price, KeyValueList, Timeline, ChangeSummary, Quote (feat/ui-display)

- Changed (`@yeral/ui`, DS-Patterns, COMPONENTS.md rows):
  - **Price** (`price`, Display/Price): the caller's formatted price (`fmt.price`) drawn by `type` (fixed · from ·
    free · hidden) and `size` (inline 14/20: ink 600, hidden n-600 500 · total 19/24 700 · bar 17/22 700; a hidden
    total 15/22 600 n-600 that wraps). Totals come from `priceTotal` (`@yeral/domain/pricing`: mixed → «from» the
    priced sum, hidden only → hidden); the component never makes up an amount.
  - **KeyValueList** (`key-value`, Data/KeyValueList): a `dl` of `items: { key, value, muted? }`, `variant` default
    (140 key column, 110 on phones, a line between rows) · compact (value right) · facts (three columns, caps labels,
    one line each). A value is never blank: «—» or a quiet word with `muted`.
  - **Timeline** (`timeline`, Display/Timeline): an `ol`. `status` items `{ tone, title, caption }` with tone names
    (accent, success, current, todo, slate, danger; a tick, a cross or a ring), 20 markers and a 2 px line;
    `numbered` items `{ done?, title, caption }`, 28 markers (a tick on the accent tint once done, the line accent
    after it). Tone names, not booking statuses: the booking entity maps them.
  - **ChangeSummary** (`change-summary`, Display/ChangeSummary): `from`, `to`, `labels`, `moved` (the old one struck),
    `variant` bar (two halves and an arrow, stacked with the arrow down on phones) · rows (a quiet panel, a caps
    `title`, one grid so both rows share a label column of 92 or wider for a longer label).
  - **Quote** (`quote`, Display/Quote): a `figure` on n-50 with a caps `label` or a `meta` line (who, stars, when) in
    its `figcaption` and the words in a `blockquote`.
- Stories (as the boards name them, Russian-length words for each): Price Fixed, From, Hidden, TotalMixed,
  TotalHiddenOnly, ActionBar; KeyValueList Default, Compact, Facts, Phone; Timeline StatusMarkers, Ends, Numbered;
  ChangeSummary Bar, BarInstant, Rows, Phone; Quote Note, WithMeta. 24 pass in Chromium (axe included).
- Departures: ChangeSummary rows' label column grows past 92 for a longer label (the Russian check); Price takes the
  formatted text, not `amount` and `from` (formatting is `fmt.price`'s).
