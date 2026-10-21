# Closing a workspace (feat/p2-admin-close)

- Changed: P2 step 5's fourth part, book Q-213 (chapter 9 how-row 21.10.2026, Claude (delegated)). Stacked on the
  reported reviews PR (migration 0038 after its 0037).
  - Schema `businesses.closed_at`, `closed_reason`; the cancel reason `business_closed` ("The business has closed",
    tk, ru, en) in `BUSINESS_CANCEL_REASONS` and the business-side ones (migration 0038 adds the enum value).
  - A closed business: `isPublic()` false, `visibleBusiness` `not_found` for everyone (its team too), out of
    `inSwitcher` and `requireMember`; the admin lists leave it out but for `closed` and `all`; any other admin action
    on it is `invalid_status`.
  - `closeBusiness` (`modules/admin/businesses.ts`): the business row, then its pending and confirmed bookings ahead
    (bookings before their move requests), each through `cancelForBusiness` (its client's SMS); a move its booking's
    cancel took along is skipped (`StaleBooking`); open invites cancelled; `business.updated` and `team.changed`; the
    owner's SMS (`sms.pageClosed`). `reopenBusiness`: back in the switcher and public as before (`sms.pageReopened`).
  - Routes `POST /v1/admin/businesses/{id}/close` (`{ cancelled }`) and `…/reopen`; the list view `closed`.
- Tests: `modules/admin/businesses.test.ts` (every booking ahead cancelled and told, hidden from its team too, out of
  the switcher, nothing else done to it, opened again).
- Follow-ups: adding a business for its owner (F-238) finishes step 5.
