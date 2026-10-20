# The owner's preview of a page in review (feat/p2-3-owner-preview)

- Changed: P2 step 3 (book F-032, Q-153, Q-274). `visibleBusiness` (`catalog/detail.ts`) decides who sees a business
  not yet verified, for the business page, its free times and its reviews alike: visitors and other teams get 404
  `in_review` ("Bu sahypa entek açylmady"; the app answers 404 + noindex), an unknown slug `not_found`; a signed-in
  member of its own team gets the page with `preview: { status, reason }` (the reason, `businesses.verification_reason`,
  for the owner only) and `bookOnline` false, which on a preview means booking off, not the "Jaň et" card.
- These answers vary by viewer: `Cache-Control: private, no-store` and `Vary: Cookie, Authorization`, on the 404 too.
- Booking and favourites still take verified businesses only. New error code `in_review` (en, tk, ru); API.md says
  the two 404s are both "not here".
- Follow-ups: the workspace banner "Sahypaňyz barlagda…" (step 4); the admin tool writes `verification_reason` with a
  rejection (step 5, Q-274, Q-275).
