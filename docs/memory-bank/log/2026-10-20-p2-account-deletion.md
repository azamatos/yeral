# Deleting an account (feat/p2-3-account-deletion)

- Changed: P2 step 3 (book Q-172). Deleting an account also deletes its reviews, and each business's stored rating
  (rating, count, breakdown) drops them, with a `review.deleted` event per business (the sdk refreshes its reviews and
  page). The rest of Q-172 came with #52: upcoming bookings cancelled with the businesses told, favourites gone with the
  account, the businesses' visit records kept without a link to an account.
- "Is this you?" answered "No" keeps the earlier holder's reviews (they didn't ask to go).
- The stored rating changes in one UPDATE per business (`shiftRating`, `modules/reviews/rating.ts`), worked out from
  the row it changes: reviews written, edited or deleted at once each count from the latest figures, with no lock that
  could deadlock against a review's foreign-key share lock. `editReview` reads and changes the review under its lock;
  the deletion locks the account row first, so a review written meanwhile lands before it or not at all.
- Known: the public reviews list pages by offset, so a review deleted while someone pages may shift the next page by
  one.
- Follow-ups: the design adjusts the delete copy (07a C-47).
