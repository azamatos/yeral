# 2026-11-07 · The search's result rows: status, times, nothing found (design v0.7 · C7-Home C4 `VenueResultRow`, C1 `SearchNoResults`)

Branch `feat/client-result-cards`. Round 7's result card as the C7-Home board draws it, from what the search api already
sends; the no-results page with «Search further away».

## What changed

- **`entities/business/ui/business-row.tsx`** — the drawn row: photo 200 × 150 r 12, name 18/24 with the rating on the
  baseline, «Category · 3.0 km» (A7: two short items; the street is gone, the category alone without a position), the
  StatusPill, the price from, then the times. Under 768 the photo is 88 square beside the text and the times run under
  both. Rows sit on 1 px `n-200` dividers (`className` from the page); the pin-hover tint is `n-50` as drawn (was `a-50`).
- **`entities/business/ui/time-chips.tsx`** — TimeSlots: three chips S 32 / r 8 / 13 on 16 (M 40 / r 10 / 14 on 20 under
  768), white with an `n-300` line, `n-50` + `n-400` on hover, proportional figures; «+N» is a real Tertiary S/M link
  (`aria-label` «32 more times») into the booking on that day (`?date=&step=time`: the flow lands on its first open
  step with the date kept). Over a week's search the first chip of a later day carries the muted weekday («Thu 10:15»;
  `from` = the day searched, from the page); its label reads «Book Barber Loft, Thu 10:15» (axe wants the visible text
  in the name).
- **`entities/business/ui/status-pill.tsx`, `model/open-line.ts`** — the business page's StatusPill and `openLine`
  moved down from `pages/business` (FSD: an entity can't import a page) so the row and the page share one pill; the
  closes-soon rule (amber in the last hour, business-local minute from the shared clock) comes with it. The page's
  `hero.tsx` and `about.tsx` import it from `@/entities/business`; `when.ts` keeps `confirmLine` and `weekRows`.
- **`pages/search`** — nothing found for words (`what` set): the C7 `SearchNoResults` copy «No places for “hairx”» («…
  near you» around a position), «Check the spelling, or try one of these.», «Search further away» (Secondary M with
  the pin, around a position short of the widest radius → `r` = 25 km in one step, `WIDEST_RADIUS_KM` / `canWiden`
  replace `widerRadius`), «Clear search» (Tertiary M: clears `what` and the box), «Clear filters» when a filter is on;
  the toolbar hides then, as the board says. Nothing found with no words keeps «No free time here» with its hint,
  «Search further away», «Try tomorrow» and «Clear filters», all at M; the empty state has no dashed border, as drawn.
- Stories: `Client/Search/ResultRow` (Open, ClosesSoon, Closed, NoPosition, AnyTime, Phone) new;
  `Client/Pages/Search` Results, WiderArea and NoMatch (new) updated. `e2e/tests/discovery.spec.ts`: the words-no-place
  test reads the new title («No places for “zzzzzz”»); nothing it clicks moved.

## Decisions

- **The service line «Women’s haircut · 60 min · 80 TMT» isn't built:** the search api's `BusinessCard` carries no
  matched service (only `priceFrom`); no api change in this piece. The price from stands in its place (the older
  board's «40 TMT-den»), so the card keeps a price until the api says which service matched.
- **«Did you mean»** isn't built: the api has no spelling suggestion (`/suggest` completes a prefix).
- **«Search further away» = the widest radius** (25 km) in one step, the nearest thing to the board's «Distance to any»
  in the existing `r` filter; only around a position (a city search has no distance).
- The row stays in `entities/business` (COMPONENTS.md says `entities/venue/ui/result-row`): the repo's name for it.
- The Home tile shares the line change (category · distance, no street) and the chips, as the board lists Home among
  the row's uses.

## Left

- The service line and «Did you mean» wait for the api (which service matched a query; a spelling suggestion).
- A visual check against C7-Home at 1440 / 390 (screenshots) wasn't done in this run.
- tk/ru strings for the new keys (`businessCard.bookOn`, `moreTimes`; `search.noPlacesFor*`, `checkSpelling`,
  `furtherAway`, `clearSearch`) with the rest of round 7's.
