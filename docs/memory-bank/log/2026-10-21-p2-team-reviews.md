# The team's reviews: reply and report (feat/p2-reviews)

- Changed: P2 step 4, book B-53, B-54, Q-261, F-160–F-162 (chapter 9 how-row, 21.10.2026, Claude (delegated)).
  - Migration 0030: `reviews.reply_by`, `report_reason` (enum `review_report_reason`), `report_text`, `reported_at`,
    `reported_by`, `recounted_at`, `cleared_at`, an index on the reports still waiting.
  - `reviews/rating.ts`: `isCounted()` (not reported, or recounted, or cleared), which every rating shift checks:
    the client's edit (`bookings/actions.ts`), the account's deletion (`me/account.ts`), the report.
  - `reviews/team.ts`: `teamReviews` (filters, sorts, pages, the summary from the business row and the unanswered
    count; a specialist's own visits, no summary), `replyToReview`, `deleteReply`, `reportReview` (once; out of the
    rating), `recountReviews` (the jobs tick, 48 hours: counted again with the stars it has now).
  - Routes `GET /w/{slug}/reviews`, `PUT`/`DELETE /w/{slug}/reviews/{id}/reply`, `POST …/{id}/report`; the public
    review's `underReview`; event `review.updated`.
  - Contract `contract/reviews.ts`; domain `REVIEW_REPORT_REASONS`, `REVIEW_REPLY_MAX`, `REVIEW_REPORT_HOURS`.
  - sdk `reviews.list/reply/deleteReply/report`; the team's list under the business's reviews key.
- Tests: `reviews/team.test.ts` (the summary, filters and sort, a specialist's own; the reply by owner and
  administrator, seen publicly, taken away, a specialist 403; a report out of the rating, once, under review in
  public, a reply still possible, an edit meanwhile counted at the recount, 48 hours on counted again; an account
  deleted while checked not taken out twice); sdk `review.updated`.
- Follow-ups: Ýeral's keep or remove, and the reports queue, come with the admin tool (step 5).
