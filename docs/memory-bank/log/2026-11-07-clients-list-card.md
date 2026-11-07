# 2026-11-07 · Clients list and card (design v0.7 · A6, A8, B5, B6)

Branch `feat/clients-list-card`. The owner's 04.11 notes #8, #9, #11, #14, #31 (sorting part), #32, #33.

## What's there

- **A6 in `@yeral/ui` Table:** `TableSortHeader` (`aria-sort`, chevrons: up-down on hover/focus only, up/down when
  sorted, ink when sorted; numeric columns put the chevron first), `TableRowLink` (the name's link stretches over the
  row with `after:inset-0`; the row gets `cursor-pointer` and the inset ring through `has-[a[data-row-link]]`),
  `TableIconAction` (IconButton S plain + tooltip, `relative z-1` so it sits above the row link), `TableTags` (two chips,
  then «+N» with a popover), `TruncatedText` (tooltip only when the text is cut — Tooltip is now controllable).
  `TableHeader` is sentence case 12/16 600 n-500 everywhere (was caps). `TagChip` in `@yeral/ui/chip` (own, automatic,
  reported, removable, 28/24, highlight).
- **B5:** Name · Phone (copy icon copies the grouped number) · Tags · Visits · Last visit · Total · Next booking, all
  sortable except Phone and Tags through `?sort&dir` (the first click is `CLIENT_SORT_DIR`, the natural direction is
  left out of the URL); the row opens the card; one «New booking» icon; Delete only in the card; chips carry the api's
  `counts`; DS-Lists empty («No clients yet» + Add a client) and no-results («No clients match “…”», Clear all); 390 =
  68-high list items with the sorted column's value on the right.
- **A8 + B6:** `TagEditor` in `@yeral/ui/tag-input` (dashed «Add tag» chip → field with suggestions and counts, Create
  last, Enter saves and stays open, Already added, length line, Backspace to the last ×, Esc). The card's head saves
  each change as a PATCH with `tags` alone (the api already took a partial body, tested in `write.test.ts`), Undo toast
  after a removal; labelled facts Client since / Source / Birthday; tags left the edit form. No api change.

## Traps

- `TableTags` counts its children: pass a flat array (`useClientTagChips()` in `entities/client`), not a fragment.
- A Storybook dev server from an earlier agent was already listening on 3205 in the shared worktree; it served this
  branch's files, so the screenshots used it.

## Left

- Tag suggestions come from the 50 most recent clients' tags (`clients.list` limit max 50): a
  `GET /clients/tags` with counts across the business would make them complete.
- A8 on phones: «+ Add tag» should open a sheet (Search L, 48 rows) — it opens the same inline field.
- Tag length: the contract allows 20 (`CLIENT_TAG_MAX`), the board says 24.
- A5 FilterBar (Tag, Upcoming booking, Specialist, Sort) and the skeleton rows (A6 loading) are separate pieces; the list
  keeps its search field and spinner.
- B6 head: New booking beside Call (it's in the top bar), Visits as a fact (it's in the key figures), the alert NoteRow
  and History «Show more» in place.
