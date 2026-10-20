# Deleting an account (feat/p2-3-account-deletion)

- Changed: P2 step 3 (book Q-172). Deleting an account also deletes its reviews, and each business's stored rating
  (rating, count, breakdown) drops them (`refreshRating(…, { remove })`, `releaseAccount(…, 'deleted')`). The rest of
  Q-172 came with #52: upcoming bookings cancelled with the businesses told, favourites gone with the account, the
  businesses' visit records kept without a link to an account.
- "Is this you?" answered "No" keeps the earlier holder's reviews (they didn't ask to go).
- `refreshRating` now locks the business row, so two reviews at once can't both count from the same figures.
- Follow-ups: the design adjusts the delete copy (07a C-47).
