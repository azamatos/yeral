# 2026-11-07 · The business's reviews page (B-Reviews, book B-53, B-54)

- Changed: the owner's fix plan, 04.11, #45 («Reviews page fully does not work»): `/w/{slug}/reviews` was the `SectionPage`
  stand-in; the api (`GET /w/{slug}/reviews`, the reply, the report) and the sdk's `reviews.*` calls were there since P2.
- Built: `apps/business/src/pages/reviews/` — `model/search.ts` (the address: `filter=unanswered` or `stars=1…5`, `staff`,
  `order=oldest|lowest|highest`; `order`, because the router's search types are one union across routes and the clients'
  `sort` holds other values), `ui/reviews-page.tsx` (the summary as clients see it — score, stars, count, the «N more
  aren't counted while Ýeral checks them» line as `total − summary.count`, the bars from `RatingDistribution`, the «Not
  answered · N» pill-button that applies the chip, «See it on your page» from `pageLink`; the chips, the specialist
  `Select`, the order `Select`; the list; Show more with «Showing 20 of 97»; the footnote), `ui/review-item.tsx` (avatar,
  name · how long ago, stars with «service · specialist», the words, the moderation line for `checking` / `cleared` /
  `counted`, the reply as a `Quote` with Change / Delete, the Reply button, the «…» menu with Report), `ui/reply-composer.tsx`
  (`Field` with hint and counter, «Too long» over 500, Post reply / Save), `ui/report-review-modal.tsx` (the quote, five
  `Radio` reasons, the explanation needed with «Another reason», the 48-hour caption). Toasts: Reply posted / updated /
  deleted + Undo (posts the old words again) / Report sent.
- Permissions mirror the api (`reviewsReply: all` = owner and administrators): a specialist sees no summary, no Not
  answered chip, no specialist filter, no Reply / Change / Delete / Report, no footnote; the intro line «Reviews about you…»
  instead. A reported review (any state) can't be reported again: its menu goes. The sidebar's count already followed
  `workspace.reviewsToAnswer`; the sdk's `reviewsChanged` refreshes it after a reply.
- `ago()` moved from the client's `pages/business/model/ago.ts` to `@yeral/domain/time` (a second app needed it; tests moved
  with it; `techContext.md` row added). `@yeral/contract/reviews` exports `TeamReview` / `TeamReviews` types.
- Stories (`reviews-page.stories.tsx`, `Business/Reviews`, 21): Summary, Filters, Reply, EditReply, DeleteReply (Undo),
  ReplyTooLong, Report, Reported, ShowMore, ShowMoreFailed, NoReviews, AllAnswered, NoMatch, Loading, Specialist, Phone,
  PhoneReport, RussianLength. Axe: the «Not answered · 4» button keeps its visible words as its name (an aria-label «Show 4
  not answered» fails `label-content-name-mismatch`).
- Checks: `turbo lint typecheck test --filter=@yeral/business... --filter=!@yeral/api` green (the api's tests need Postgres,
  CI runs them); the client's typecheck and lint; `lint:fsd`; the reviews stories in Chromium; Prettier.
- Left: the «Ýeral removed a review you reported» notice (`removed`) needs the api to say it (no field today); the
  specialist filter is the native `Select` until PR #310's own Select / MultiSelect merges (the board draws a chip popover
  with several specialists; the api takes one `staff`); the first-load error goes to the route's error page as on Clients
  (no story: the story router has no `errorComponent`); «Showing N of M» shows for the owner and admins whenever the api
  sends `total`; the low-rating placeholder leaves out the sample phone number (the workspace has none to show).
