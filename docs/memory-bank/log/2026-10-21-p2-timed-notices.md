# The timed notices (feat/p2-timed-jobs)

- Changed: P2 step 4's timed jobs, book S-01, S-13 (chapter 9 how-row, 21.10.2026, Claude (delegated)). Stacked on
  the photos PR (migration 0033 after its 0032).
  - `expiryWarningAt()` (`@yeral/domain/lifecycle`, `EXPIRY_WARNING_MINUTES`): 5 minutes of answer time before the
    end, counted over the business's open stretches as the hold is (never while it's closed, never across a break);
    plain time when nothing is open before the visit; none when the whole answer time is 10 minutes or less.
  - `warnAt` on each request (`GET /w/{slug}/requests`, contract `requestSchema`): the business app's timer shows
    "Haýyşyň wagty gutarýar" then. A first draft sent a `request.expiring` event from the jobs with a mark on the
    booking; the review dropped it: a minute tick is late, plain minutes would warn while the business is closed, and
    the app already knows the time.
  - `tellExpiredInvites` (`jobs/run.ts`): pending invites past their 7 days with no mark, a batch at a time with rows
    another runner holds skipped (`SKIP LOCKED`), are marked (`expiry_told_at`) and `team.changed` tells the business
    and the invitee once per business and phone. Migration 0033 adds the column, a partial index for the untold ones,
    and marks the invites that ran out before it, so the first tick after the deploy doesn't tell them all.
  - `runDueJobs` returns `invitesExpired`; the tick logs any non-zero count.
- Tests: `lifecycle.test.ts` (across the night, before a break, plain, none when short), `jobs/warnings.test.ts`
  (`warnAt` on the list; an invite's expiry heard by the owner and the invitee once each, its card expired).
- The typical answer time (Q-113) already counts declines: both confirm and decline stamp `answered_at`.
- Follow-ups: quiet hours (S-18); the business app's toasts, sound and browser notifications (F-170).
