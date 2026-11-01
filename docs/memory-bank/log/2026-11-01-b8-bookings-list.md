# The bookings list (P4 slice 4, PR B8; feat/b8-bookings-list)

Slice 4's B8 (`log/2026-10-31-slice-4-plan.md` → "PRs, three lanes"): book B-30, board B-Bookings.

## What's there

- `pages/bookings`: `model/search.ts` (`?tab=&q=&staff=&service=&when=&booking=&request=`, `rangeOf`), `ui/bookings-page.tsx`
  (tabs, filters, Show more, Export CSV, the drawers), `ui/bookings-table.tsx` (rows, row menu, a list under 768).
- The same `BookingDrawer` and `RequestDrawer` as the calendar; `steiger.config.js` no longer needs its override.
- «Move to another time» and «Book again» go to the calendar by its address (`?move=`, `?panel=new`).
- `BookingRow` type exported from `@yeral/contract/calendar`.

## B9, the Requests tab (same page)

`ui/requests-tab.tsx`: reads `/requests`, the Answer column, a move's two times, ticks and the BulkBar, `BulkDecline`
(one reason, no offers), a list under 768. The tab is first and the page's default; `filters.tab` stays a real list tab.

## For B11

B11 adds «Open the client's card» to `RowMenu` and the drawer, and the row's name can link it.

## Traps

- A Radix tab names its panel in `aria-controls`: a `TabsList` without a `TabsContent` per tab fails axe
  (`aria-valid-attr-value`).

## Seen, not done here

- The phone list has only the search; the filters are hidden there.
