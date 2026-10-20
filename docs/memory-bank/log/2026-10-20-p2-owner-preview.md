# The owner's preview of a page in review (feat/p2-3-owner-preview)

- Changed: P2 step 3 (book F-032, Q-153, Q-274). `GET /v1/businesses/{slug}` for a business not yet verified: 404
  `in_review` for visitors ("Bu sahypa entek açylmady", the app answers 404 + noindex), the page with
  `preview: { status, reason }` for a signed-in member of its own team (the latest rejection reason from
  `verification_history`), with `bookOnline` false. An unknown slug stays `not_found`. New error code with en, tk, ru.
- The other public routes (free times, reviews, booking) still take verified businesses only.
- Follow-ups: the workspace banner "Sahypaňyz barlagda…" (step 4), hiding a live business (step 5, Q-275).
