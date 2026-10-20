# No average bill (feat/p2-3-no-average-bill)

- Changed: P2 step 3 (book Q-103, F-026). `avgBill` left the contract's business card and page, the api, the demo
  seed and `fmt.price`, whose hidden price now reads "Price at the place" (`fmt.priceHidden`; `priceApprox` is gone).
  Search: a place without a price passes `maxPrice` and sorts last by price, ties by popularity (the old `Infinity -
  Infinity` would have given NaN once no place had an average bill). The "how" is a 20.10.2026 row in chapter 9.
- The scope chapter's "code differs" list lost the items steps 2 and 3 fixed (invites, the move's specialist, the
  answer time, the city lookup); F-021, F-026 and F-060 say what's built.
- Follow-ups: a later release drops `businesses.avg_bill` with `users.notify_review_ask` and
  `businesses.typical_confirm_minutes`; the Russian text waits for the native review (Q-101); the price range filter
  (next) decides `minPrice` the same way.
