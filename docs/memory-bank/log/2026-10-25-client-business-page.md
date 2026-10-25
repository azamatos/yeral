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
- Left for C2 (needs U3): the tabs, specialists, reviews, about (hours, map, rules), nearby places, the photo viewer
  («All photos»); the search header with its query bar (slice 5); JSON-LD (slice 5's search-engine pages).
