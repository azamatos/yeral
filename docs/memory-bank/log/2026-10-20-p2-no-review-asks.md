# No review asks (feat/p2-3-no-review-asks)

- Changed: P2 step 3 (book Q-259). The api queues no review-ask SMS any more; asks queued before are dropped when they
  come due. The text (`sms.reviewAsk`), the client's switch (`notifications.reviewAsk`, `users.notify_review_ask`,
  migration 0016) and the job's checks for it are gone: the profile has three SMS switches. Clients review from my
  bookings and the link page (`canReview`, Q-170).
- Tests: the link tests that used the review ask send a "confirmed" SMS instead; their helper finds the first free day
  from Thursday on.
- Follow-ups: activeContext: next in step 3, linking by phone (Q-270) with the phone change (Q-171).
