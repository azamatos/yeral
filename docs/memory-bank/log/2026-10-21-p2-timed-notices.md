# The timed notices (feat/p2-timed-jobs)

- Changed: P2 step 4's timed jobs, book S-01, S-13 (chapter 9 how-row, 21.10.2026, Claude (delegated)). Stacked on
  the photos PR (migration 0033 after its 0032).
  - `warnExpiringRequests` (`jobs/run.ts`): requests and moves still waiting with 5 minutes or less of their answer
    time (`EXPIRY_WARNING_MINUTES`) and no mark are marked in the statement that finds them (`expiry_warned_at`) and
    each sends `request.expiring` with its booking (so its specialist hears it too).
  - `tellExpiredInvites`: pending invites past their 7 days with no mark are marked (`expiry_told_at`) and
    `team.changed` tells the business and the invitee.
  - `runDueJobs` returns `warned` and `invitesExpired`; the tick logs any non-zero count.
  - Contract event `request.expiring`; sdk refreshes the requests and the calendar on it.
- Tests: `jobs/warnings.test.ts` (not at 10 minutes, once at 5, heard by the owner; an invite's expiry heard by the
  invitee once, its card expired); sdk.
- The typical answer time (Q-113) already counts declines: both confirm and decline stamp `answered_at`.
- Follow-ups: quiet hours (S-18); the business app's toasts, sound and browser notifications (F-170).
