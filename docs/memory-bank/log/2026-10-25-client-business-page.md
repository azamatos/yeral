# The client site's business page (P4 slice 3, C1; feat/client-business-page)

- Changed: `/{lang}/b/{slug}` (`pages/business`, route `$lang/_site/b/$slug.tsx`), server-rendered with the visitor's
  cookie: the path, the name with «Example» and the example line (book Q-004; «bookings are confirmed at once» only
  for an instant example, a shorter line for a manual one), rating, reviews, category, the open line (`model/when.ts`),
  the address with its city, floor and distance, «New address» for 30 days (Q-215), the approximate-area note for a
  home-based business, the heart (signed out: the login first, then saved; States 10) and Share (the phone's share
  sheet, else the link copied); the photos (one large and up to four, the first alone with «1 / 5» under 768); the
  services with group chips that filter and «Select» / «Selected» kept in `?services=id,id` (`model/selection.ts`,
  tested); the booking card beside them from 1024 (the next free time and Book, or the picked services, their total
  through `priceTotal`, Continue and Clear) and the bar under 1024; the owner's preview banner with Book disabled
  (Q-153, Q-274), the paused card (C-09, States 05: no Select, Call, the heart) and the phone-only call card (C-11,
  first under 1024, the bar to call).
- The loader: an unknown, closed or hidden business is the 404 page; one in review is a friendly 404, «This page hasn't
  opened yet» (C-10, States 11: `NotFoundPage notOpen`, from `notFound({ data: NOT_OPEN })` through the root); an old
  address redirects with 301 to the new one (#201). `/b/{slug}`, the link and QR a business shares, opens the page in
  the visitor's language (`routes/b/$slug.tsx`, as `/` picks it; not permanent); `/b/YR-…` (SMS booking links, slice 7)
  is a 404 until then.
- `/{lang}/b/{slug}/book` is a stand-in (`pages/booking`: the way back to the page) until C3 builds the steps and moves
  it to the focused header.
- Stories: `Client/Pages/Business` (13: picking and the total, chips, hidden and mixed prices, example, preview,
  paused, phone-only, closed, the heart, phone widths) with `GLOW` and `businessApi()` in `shared/storybook` for the
  next client PRs; `Client/Pages/NotFound` › NotOpen.
- Review (one round, 15 findings, 13 fixed): the card and bar switch at 1024 (`md`; this theme's `lg` is 1280), the
  drawn 18 and 16 px sizes (no `text-lg`/`text-base` here), an address the api refuses (`validation_error`) is a 404
  and `/b/` lowers its case, the card's hours through `currentBusinessDate` / `businessDay` with the special days
  (closed: «Closed today · Holiday»), no heart on the owner's preview (favourites take public pages only), Share
  catches a refused clipboard, a chip whose group went falls back to All, the not-open words promise no 24 hours
  (the api answers `in_review` for a rejected page too), the card's «Today» from `useClock()` like the header, the
  booking route's not-open page and old-address redirect, `{brand}` in the six new messages, the description, the
  next free time and the photo count as messages, «New address» straight from `movedAt` (the api sends it for the 30
  days only), the photo count's words for screen readers in a hidden span. Not fixed: the heart reads the person's
  whole favourites list (`GET /me/favorites`) to know one page; a `favourite` flag on the business page's answer would
  do it in one request (an api change, follow-up); and Venue's own words for a closed day's line stay as drawn.
- Departs from the board: «This page hasn't opened yet» says the page opens once approved, not «usually 24 hours».
- Next: U2's `Price` (#212) can replace the card's price lines in C2.
- Left for C2 (needs U3): the tabs, specialists, reviews, about (hours, map, rules), nearby places, the photo viewer
  («All photos»); the search header with its query bar (slice 5); JSON-LD (slice 5's search-engine pages).
