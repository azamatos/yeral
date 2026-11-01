# Search, category pages and Home (P4 slice 5, D1 and D2; feat/d1-search)

Book C-02, C-03, C-05, F-243, boards Search, Home. `log/2026-11-01-slice-5-plan.md` has the slice.

## What's there

- `pages/search`: `/{lang}/search` and `/{lang}/c/{category}` are one `SearchPage`. Its address is `model/search.ts`
  (`searchAddress`, `apiSearch`); both routes prefetch on the server. `FiltersDrawer` changes nothing until «Show results».
- `entities/business`: `BusinessRow` (Search), `BusinessTile` (Home), `TimeChips`, `useCardLine`. The name's link covers the card
  (`after:`), and the chips sit above it, so no link is inside a link.
- `pages/home`: the hero with `SearchCard`, the mosaic, `HowWasItCard`, the places, the tiles, how it works, the business block.
  The footer has a For clients column. The write-review steiger override is gone: Home is its second user.

## Traps

- The routes' search types merge: a key two routes type differently breaks `(prev: X) =>` (`modal` on the client card, `date`
  here). A new page takes its own key.
- `fmt.price` already says «from» for a `from` price: only a `fixed` one takes the card's own «from».
- `Select`'s `className` goes on its wrapper; the box is on the `select` inside.
- Category icons are listed one by one in `category-icon.tsx`, as lucide's whole set would come with the page. A new icon name
  in the catalogue shows a plain one until it's listed.

## Left

- «Try the business app» on the business block and the footer's About, Help, Contact and legal links: slice 7.
- The empty state's rows for tomorrow and «See all», the skeleton's 300 ms wait, suggestions in «What?»: D4 or later.
- «Where?» is a list of cities until D4.
