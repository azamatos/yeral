# The team's reviews: reply and report (feat/p2-reviews)

- Changed: P2 step 4, book B-53, B-54, Q-261, F-160–F-162 (chapter 9 how-row, 21.10.2026, Claude (delegated)).
  - Migration 0030: `reviews.reply_by`, `reply_deleted_at`, `report_reason` (enum `review_report_reason`), `report_text`, `reported_at`,
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
- Review (15; 13 fixed, 2 kept): `review.updated` didn't reach the visit's specialist (now with the booking, also
  per recounted review) and the client's edit wrote no event (now it does); a reply undone was re-signed (now taken
  away softly, `reply_deleted_at`, and its undo brings it back as it was); the cursor is digits (with #104's
  contract); the book's "Code differs" in chapter 4; one `shiftReviews` for the recount and an account's deletion,
  which now hold reviews in id order (no deadlock between them); the jobs' result counts recounts; a page past the
  end counts again; the summary only with the first page; a reply refreshes no business page; one review view
  (`visitsOf`, `replyOf`) for the page and the team; `withStaff` takes the booking column; the report's dead check.
  Kept: a booking deleted outright would take its review without a shift (bookings aren't deleted once completed;
  a team booking's undo has no review), and the "> Open question Q-261" lines stay as the book links decided
  questions elsewhere too.
- Follow-ups: Ýeral's keep or remove, and the reports queue, come with the admin tool (step 5).
