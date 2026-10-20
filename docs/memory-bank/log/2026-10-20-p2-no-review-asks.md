# No review asks (feat/p2-3-no-review-asks)

- Changed: P2 step 3 (book Q-259). The api queues no review-ask SMS any more; migration 0016 settles the ones queued
  before unsent, and the job drops any it still meets. The text (`sms.reviewAsk`) and the job's checks are gone; the
  profile has three SMS switches. Expand, then contract: `users.notify_review_ask` stays in the schema, unused, so the
  previous api image still runs (a later release drops it), and `/v1` keeps `notifications.reviewAsk` as always false,
  ignored on update (it goes with `/v2`). A PATCH with nothing left to set answers the profile as it is. Clients review
  from my bookings and the link page (`canReview`, Q-170).
- Dropped asks are settled unsent the same way by migration 0016 and by the job runner: done, attempts 0, error
  `dropped: no review asks (book Q-259)`; a count of failed SMS uses attempts. Migration 0016 also puts the column back
  where an earlier draft of it had dropped it (local databases).
- Known: during this release's deploy, the old api's job runner may still send a review ask it had already claimed,
  or queue one; production has no bookings yet.
- Follow-up: a later release drops `users.notify_review_ask`.
- Tests: the link tests that used the review ask send a "confirmed" SMS instead; their helper finds the first free day
  from Thursday on.
- Follow-ups: activeContext: next in step 3, linking by phone (Q-270) with the phone change (Q-171).
