# The business page's other parts (P4 slice 3, C2; feat/client-business-tabs)

- Changed (`apps/client/src/pages/business`, Venue, Mobile 4, book C-06, C-07):
  - **Section nav** (`ui/sections.tsx`): Services · Specialists · Reviews · About, sticky at the top of the column (28
    apart, 24 on phones), the part being read underlined (`aria-current`, read from the scroll); a press scrolls there
    (smoothly unless motion is reduced) and moves the focus into the part, without a history entry; plain `#links`
    before the script. No Specialists part (nor link) for a page with nobody to pick. `Section` gives every part its
    `h2`, 48 / 40 apart and the line between; Services moved into it (`#services`).
  - **Specialists** (`ui/specialists.tsx`, COMPONENTS StaffCard): a card each at 170 (avatar 64, name, specialization,
    rating, «Next free:» from the api's new `specialists[].nextFree` (#220), past midnight on the next day, or «No free
    times soon»), «Book» → `/b/{slug}/book?staff={id}` (the booking keeps them once they do the picked services). The
    preview shows the times with Book off (Q-153); paused and phone-only show neither.
  - **Reviews** (`ui/reviews.tsx`, COMPONENTS ReviewCard): U2's `RatingDistribution` with the average beside the
    newest reviews (avatar 40, how long ago by calendar days `model/ago.ts`, stars 14, what it was for, the grey line
    for one Ýeral is checking, the words, «Reply from …» in a `Quote`), 12 at a time with «All reviews» for the next
    page (gone at the end), «Only clients who booked and came can leave a rating.»; none yet: «No reviews yet» (not
    drawn). The route's loader reads the first page with the page, so it's server-rendered.
  - **About** (`ui/about.tsx`): the description, the week (`weekRows()` in `model/when.ts`, tested: Monday to Sunday as
    the coming days have them, today 600 with «Today», 24:00 kept, a break as two stretches, a special day's name),
    the map (`MapFrame`, a still preview with the hot pin and dot, a home-based business's approximate circle), the
    address with floor, entrance note and distance, «Directions» (`directionsUrl()` in `shared/lib`, tested: Apple
    Maps on an iPhone, the app chooser on Android, Google Maps on a computer, book Q-108; not for an approximate place)
    and the number to call, the amenities with their icons, the booking rules (free cancel window or any time, late
    limit, paying at the place, cash or card when it takes cards, the business's note) and how it confirms (the card's
    words; no SMS promise: «You'll see the answer in My bookings», round 3).
  - **Places nearby** (`ui/nearby.tsx`, COMPONENTS VenueCard): `similar` (up to 4 of the kind, nearest) as link cards
    at 260: photo 4 / 3, name with «Example», «category · distance», rating with its count, today's first 3 times and
    «from …».
- Stories (`Client/Pages/Business`, 10 new or extended, 24 in all, axe included): SectionNav, Specialists, Reviews,
  ReviewsPaging, NoReviews, About, Midnight, HomeBased, Nearby, PhoneSections; Paused, OwnerPreview, Closed and Example
  check the new parts. `REVIEWS` and paging (`?cursor`) in `shared/storybook`'s `businessApi`; `GLOW`'s Leýli has no
  free time soon, as the specialist step's fake answers.
- Not built (rule 10a): «See all» beside Places nearby (the search comes with slice 5); the photo viewer («All
  photos»); Russian-length stories (the client site has only English messages so far); `VenueCard` stays in the page
  until Home or Favourites need it (then `entities/venue`).
