# 2026-11-07 · The compact SearchBar in the site header (design v0.7 · C1)

Branch `feat/client-header-searchbar`. Round 7's "On Search and Venue the header keeps a compact SearchBar" (README §15
C1; C7-Home `.hdr.sr2` / `.sbc`, the 390 results frame). The last of the on-page search controls go with it, as
`2026-11-07-client-search-filterbar.md` left it.

## What changed

- **`SearchBar` `compact`** (`widgets/search-bar`): the same fields and panels as Home's bar in the header's skin —
  600 × 48, r 999, 1px n-200 + the board's `0 1px 2px` shadow, segments 38 high (icon 18 + value 14/20, no label shown;
  What flexible, Where and When 170), 1 × 20 dividers, the round ink M button (`variant="ink"`, the one place it goes).
  The focused segment lifts into the white pill as on Home. `what` / `when` start it with the address's values;
  `onSearch` takes the draft instead of going to `/search` (`model/draft.ts`: `SearchDraft`, `draftOf`). `SearchSheet`
  takes `onSearch` the same way.
- **`HeaderSearch`** (`widgets/search-bar/ui/header-search.tsx`): the compact bar for the site header, reading the
  address itself (`useSearch({ strict: false })`) and the kept place (`usePlace`). Mode `results` (Search, a category's
  page): a search refines the address **in place** (`to: '.'`): the words, the place and the When replace the address's;
  the category, the filters and the sort stay; a new place drops `r` and `area`, which were the old one's. Mode `new`
  (the business page): the bar starts empty and a search goes to `/search`. The bar remounts on a new address (`key`).
- **`HeaderSearchPhone`**: the results page's bar under 768 (C7-Home 390 · Search results): Back (plain L: the page
  before, or Home when this page was the first one opened — the business page's rule) + the summary field (L 48,
  n-300: the words 15/20 600 over «Near me · Tomorrow» 13/18 n-600; the placeholder in n-500 with nothing typed) that
  opens the existing `SearchSheet` with the address's values; «Show N places» refines in place too.
- **`SiteHeader` / `SiteLayout`**: `search` (the bar after the logo, which is 28 there; 32 apart), `phoneSearch` (takes
  the row's place under 768) and `wide` (80 high, the whole width, 32 at the sides — `.hdr.sr2`, as the list + map
  page runs the whole width). The `_site` layout route composes them from `staticData.searchHeader` (`results` on
  `/search` and `/c/$category`, `new` on `/b/$slug`, which keeps `phoneHeader: 'none'`), so the site-layout widget never
  imports the search-bar widget (FSD: no imports between widgets).
- **The search page**: the What box, the `WhereField` and the day Segmented are gone (the day lives in the bar's
  When; a calendar `date` shows there as «Thu, 12 Nov»); the category chips, the heading, the toolbar and the banner
  stay. «I'll type an address» on the banner now asks the header through `features/pick-place`'s `askToEditPlace` /
  `useEditPlaceRequest` (the desktop bar focuses its Where; under 768 the phone bar opens the sheet at Where).
  `WhereField` and its `location.where / nearMe / list / nothing` and `search.box / day / days` strings are deleted.
- Stories: `Client/Search/SearchBar` Compact, CompactPlace, CompactNew, PhoneSummary; `Client/Pages/Search` renders
  the header's bar over the page (Tomorrow, CalendarDay, PickACity now go through it; TypeAnAddress added);
  `Client/Widgets/SiteLayout` SearchHeader, PhoneSearchHeader (the slots).
- e2e `discovery.spec.ts` unchanged: it opens the search by address and reads the count copy, which stayed.

## Decisions

- **The business page's header**: C7-Venue's `.chdr` draws no bar, README §15 C1 and COMPONENTS.md say the header
  keeps it on Venue too. Built as the README says; the Venue header keeps its 72 / `wrap` layout (the bar fits), only the
  results page takes the drawn 80 / whole-width header.
- **In place, the filters kept** on the results page (today's on-page controls patched the address the same way);
  Home's and the business page's bar start a fresh `/search`. Between 768 and 1023 the bar shrinks with its row (not
  drawn; the segments keep their proportions and truncate).
- **No «apply at once»** from When on the results page: as on Home, Done closes and the round button searches.
- The summary field's name is its text with a read-only «Edit search:» in front (axe: the visible text must be part of
  the name — the board's `aria-label` with commas isn't).

## Left

- The phone sheet's live count («Show 24 places») counts the draft without the page's filters.
- The 390 results page still shows its heading and the category chips under the summary field (the board draws
  neither; not in this piece's scope).
- The no-results page with «Search further away», the result cards (C4 VenueResultRow, another agent), `tod` as a
  filter, tk/ru strings.
