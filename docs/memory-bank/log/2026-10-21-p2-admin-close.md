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
- The review's findings, fixed: every booking path that holds the hours (`lockedHours`: a new booking, an offered time,
  a move, an undo) refuses a closed business, read after a close in progress commits; a closed business's bookings
  show no offered times; the close reads its bookings plainly and holds each booking before its move (every path's
  order), cancels those ahead, and settles a move asked of a visit under way as lapsed (`dropPendingMove`; its hold
  ran out at the visit's start); its cancelled invites tell their invitees; an owner whose workspace is closed may let
  their account go (a reopen then refuses: nobody to open it to). The SMS go as each client's switches allow. Tests:
  an offered time and an undo refused, the invitee told, the owner leaving, the reopen refused; not the move of a visit
  under way.
- The last review's: a booking gone meanwhile (the team's undo) is skipped, not a refusal of the whole close; every
  undo holds the hours, so a class or a table doesn't come back at a closed business; the reopen holds the owner's row
  (share), so an account let go at that moment and the reopen can't pass each other.
- Follow-ups: adding a business for its owner (F-238) finishes step 5.
