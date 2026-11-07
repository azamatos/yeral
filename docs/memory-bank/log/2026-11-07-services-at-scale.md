# 2026-11-07 · business page: services at scale, the phone's header (design v0.7 · C3, C2 leftovers)

Branch `feat/business-page-c3`; the owner's #42 and the C2 note's «Left» (`2026-11-07-business-page.md`).

## Done
- **ServicesBrowser** (`pages/business/ui/services.tsx`, rules in `model/services.ts`): the list is always whole and
  grouped, each group's count in its header (`h3`, «5 of 9» while searching). From 3 groups: at 1280 and wider a
  sticky **GroupIndex** (nav 200, rows 36, the current one in the tint, a click jumps; `aria-current`); narrower, a
  **GroupRail** stuck under the tab bar (56: «Groups» opening every group in a Select sheet / popover with counts and
  the check, chips M with counts that scroll sideways, the current one kept in view, a 40 px fade). From 9 services a
  **ServiceSearch** (M 360 beside the count line at 1280+, L full width with the count under it on the phone, `type=
  search`, × and Esc clear) in names and descriptions, case and accents aside (`matchIn`: «ý» = «y»); the index greys
  groups at 0 with `aria-disabled`, the rail shows only groups with matches; nothing → the `.empty` state in the
  list's place with Tertiary «Clear search» (back to the top of Services). One **Book** per row (S; M 40 on the
  phone, min-width 112 / 124) opens `/book?services={id}&step=staff`; the whole row is the target (a press outside the
  link navigates). The current group follows the scroll: the first section crossing the band from under the stuck
  bars to the top third of the window, measured once a frame (`useCurrentGroup`).
- **Nothing is picked on the page** (C3 «One service, then the booking»): `?services=` left the business route, the
  card and the bar are the same in every state (Next free time · Book · the confirmation callout), the specialists'
  Book carries only `staff` + `first=staff`. The booking flow's Back / Close go to the plain page. `features/
  pick-services` moved into `pages/booking` (its only user left; steiger's `insignificant-slice`).
- **Phone header (C2 left)**: under 768 the site header gives way to the cover (`staticData.phoneHeader = 'none'` on
  the business route, read by `SiteHeader` through `useMatches`); a **Back** glass button at the cover's top left (the
  page before, or Home when the page was opened first), plain in the folded bar; the round photo and the name moved
  right of it (name x 88). **No photos**: the same 56 px bar from the start, sticky (Back, the initial 32, the name as
  the phone's `h1`, Share and Favourite plain), the rest of the identity on white under it.
- The tab bar sets `--tabs-end` (where it stops: 60 · 52 + 56 on the phone · 60 + 56 with a cover up to 1024) for
  whatever sticks under it or jumps up to it; the panel's min-height uses it too.
- The compact callout at the top of Services on the phone now has the board's `.co.cp` numbers (10 / 12, icon 16).
- `dayHours` (only its test used it) deleted.
- e2e `chooseAndSignIn`: Book on the first row, Back to the services step for the second service.
- Stories (Client/Pages/Business): Services (100 / 15, jump, scroll-spy), ServicesSearch, ServicesNoMatch,
  ServicesSmall, PhoneServices (rail, sheet), PhoneServicesSearch, PhoneCover (Back), PhoneBack, PhoneNoPhotos;
  the picked-state stories went. Unit tests: `model/services.test.ts`.

## Decisions
- The current group is measured on scroll (rects against the window), not with an IntersectionObserver as the board
  suggests: inside Storybook's story iframe the observer's root is the top-level page, so the same code can't be
  tested; the rule is the board's (first section in the band from the stuck bars to the top third).
- The row's Book link is the only control in the row; the row itself is a click target but not focusable (no nested
  interactive elements).
- The Groups sheet uses `@yeral/ui/select`'s `SelectLayer` + `OptionList` (a popover between 768 and 1279, a sheet
  under 768) rather than a component of its own.
- The no-photo phone: the bar carries the `h1` (the identity's name is hidden there, so it isn't shown twice); the
  folded-cover bar was the nearest drawn pattern.

## Left
- The rail's and the tab bar's `.stuck` hairline (a 1 px line once stuck) isn't drawn in code; neither was the tab
  bar's before.
- The glass fill of the cover's buttons doesn't fade out as the bar forms (the icons are ink either way; C2 as it was).
- Between 768 and 1023 a business with a cover keeps the hero's transparent sticky strip above the stuck tab bar
  (C2 as it was; the `--tabs-end` value matches it).
- The «Closes at 20:00» amber pill was already built in C2 (`StatusPill`, last hour).
- Visual check against C7-Venue at 1440 / 390 with screenshots wasn't done in this run.
