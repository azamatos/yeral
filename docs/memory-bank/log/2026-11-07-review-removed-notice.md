# 2026-11-07 · The «Ýeral removed a review you reported» notice, and the demo columns dropped

- Changed: left by `log/2026-11-07-business-reviews.md` (the notice needed the api to say it) and by #316 (the columns
  `users.demo` and `businesses.sandbox` left in the database after the schema dropped them).
- Built (api): `GET /w/{slug}/reviews` answers `removed: [{ id, author, at }]` on the first page, to the owner and
  administrators (`reviewsReply: all`, who report): the reviews the business reported and Ýeral removed in the last
  `REVIEW_REMOVED_NOTICE_DAYS` (30, `@yeral/domain/lifecycle`), the newest first; `[]` for a specialist and on later pages.
  Not in it: a review Ýeral removed without the business's report (no news to the business), what the review said and
  its stars (hidden; the team's record keeps them), the team's `removedReason` (the schema calls it the team's own note,
  and the board shows none). The author still isn't told (Q-262). `teamReviews()` takes `deps` now (the clock).
  Contract: `removedReviewSchema` / `RemovedReview`; `teamReviewsSchema.removed`. The sdk needed no change (the type
  flows through `sdk.reviews.list`; `review.updated` already refreshes the list, so the notice appears live).
- Built (business): `pages/reviews/ui/removed-notice.tsx`, a neutral `Callout` as the board draws it (trash icon,
  «**Ýeral removed a review you reported.** Merdan K.’s review no longer shows on your page or counts in your rating.»,
  a plain Close IconButton S as the callout's `action`, `role="status"`), one per removed review, above the filter
  row; `model/removed-notices.ts` (`useRemovedNotices`): a notice stays until closed, and this browser remembers the
  closed ids under `yeral.reviews.removed.<slug>` (pruned to what the api still sends), so it doesn't come back on the
  next visit; another browser shows it again until closed there too. Decided so: no "seen" state on the server for a
  notice that the api stops sending after 30 days anyway (keep it simple, 10a). Strings under `reviews.removed`.
- Tests: `team.test.ts` (the owner and an administrator hear it, the specialist doesn't, not on page 2, gone after 30
  days, not for a review removed without a report, present for one reported, kept, reported again and removed);
  `removed-notices.test.ts` (reading and pruning the closed ids); story `Business/Reviews` → Removed (two notices, Close
  hides one and remembers it). Checks: `turbo lint typecheck test` for api, business, contract, sdk, domain against a
  scratch Postgres; `lint:fsd`; Prettier; the reviews stories in Chromium.
- Migration `0051_drop_demo_columns.sql`: `alter table users drop column demo; alter table businesses drop column
  sandbox;` and nothing else (the 0051 snapshot differs from 0050 by those two columns only). `businesses.demo`
  (the Example flag, book Q-004) stays: it's another column. The server's rows were already deleted (#316); the deploy
  runs it as any other.
- Left: a Turkmen and Russian wording for `reviews.removed.*` (with the rest of tk/ru); a notice closed in one browser
  shows again in another until closed there (by design, above); the design's Callout says "no dismiss" while this
  board draws a Close: the board won for this notice.
