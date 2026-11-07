# 2026-11-07 · business page: tabs as panels, cover hero, breadcrumbs (design v0.7 · C2, A7)

Branch `feat/business-page`; the owner's #38, #40, #20.

## Done
- **Tabs as panels** (`pages/business/ui/sections.tsx` `SectionTabs`): Services · Specialists · Reviews · About on
  Radix Tabs from `@yeral/ui/tabs`; the open tab in `?tab=` (route `validateSearch`, replaced so Back leaves the page);
  every panel renders on the server, the closed ones `hidden` (state kept, crawlers read all); the panel area keeps
  `100dvh` minus the bar; switching while the bar is stuck jumps instantly to the panel's start. Counts are visible
  text, so the tab's name is «Reviews 96» (an `aria-label` with a comma failed axe's label-content-name-mismatch).
  `Section` now renders an sr-only `h2` (the region stays, named by it).
- **Hero** (`hero.tsx`): option B cover 1200 × 420 r20 with the identity on the gradient, glass Favourite / Share,
  thumbnails 2–5 and «All photos» (a modal listing the photos); no photos → initial tile on white. Under 768 the
  cover folds into a 56 px sticky bar (`useCoverFold`: a scroll listener writing transform/opacity once a frame, parts
  found by `data-part`; reduced motion swaps the bar in at 160 px). The name on the cover hands over to an aria-hidden
  copy that travels; the `h1` stays in the cover for screen readers.
- **StatusPill** (slice-local, on `Pill`): «Open until 20:00» / «Closed · opens …»; on the cover and beside About's
  hours. The booking card lost its hours and address lines.
- **Breadcrumbs** (`@yeral/ui`): chevrons, link-looking parents, current page ink 600 with an ellipsis.

## Left
- The board's «Closes at 20:00» amber pill needs a closes-soon rule (now + business zone); not built.
- The phone keeps the site header above the cover (the board draws none and a Back button); no 390 bar for a
  business without photos (the identity sits on white).
- The booking card's confirmation callout per setting and the 390 compact callout at the top of Services (C2 list).
- Stuck booking card at 88 and the tab bar under a sticky header: the site header isn't sticky, so the bar sticks at 0.
- `dayHours` in `model/when.ts` is only used by its test now.
- Visual check against C7-Venue at 1440 / 390 (screenshots) wasn't done in this run.
