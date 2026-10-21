# Reported reviews in the admin tool (feat/p2-admin-reviews)

- Changed: P2 step 5's third part, book ROUND6 F2, Q-261, Q-262, S-06 (chapter 9 how-row 21.10.2026, Claude
  (delegated)). Stacked on the admin businesses PR (migration 0037 after its 0036).
  - Schema `reviews.removed_at`, `removed_reason` (migration 0037): a removal is kept, so the author can't write the
    same review again for that visit (`review_exists`).
  - `notRemoved()`, and `isCounted()` false for a removed review (`reviews/rating.ts`): the public list, the team's
    list and its summary, a reply or report on one (404), the 48-hour recount and every rating shift leave them out;
    the author's own booking still shows theirs.
  - `modules/admin/reviews.ts`: the lists (`reported`, the longest waiting first, with who reported it, why, when it
    counts again; `cleared`; `removed`), `clearReview` (it counts again if it was waiting within its 48 hours; can't be
    reported again), `removeReview` (out of the rating if it counted; what it said kept in `admin_actions`). The review
    row first, then the business's rating, as every rating change takes them. The business's screens hear
    `review.updated` (Q-262); the author isn't told.
  - Routes `/v1/admin/reviews`, `…/{id}/clear`, `…/{id}/remove`.
- Tests: `reviews/team.test.ts` (the queue, kept and never reported again, removed and gone but to its author, removed
  after the 48 hours out of the rating, only the team).
- The review's findings, fixed: a decision also tells the visit's specialist (`review.updated` with the booking); an
  author's edit after Ýeral kept a review clears the report (it stays counted, and the business may report the new
  words); every decision holds its actor. A removed review stays editable by its author, out of every count. The scope
  table's F-162 and F-180 say so. Tests: a never-reported or kept review removed (−1), the author's edit of a removed one
  moving nothing, an edit after keeping reportable again.
- Follow-ups: closing a workspace (Q-213) and adding a business for its owner (F-238) finish step 5.
