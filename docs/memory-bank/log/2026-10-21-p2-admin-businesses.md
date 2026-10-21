# The admin tool's businesses (feat/p2-admin-businesses)

- Changed: P2 step 5's second part, book F-179, S-17, B-11; Q-274, Q-275, Q-276, Q-012, Q-215 (chapter 9 how-row
  21.10.2026, Claude (delegated)). Stacked on the admin sign-in PR (migration 0036 after its 0035).
  - Schema: `businesses.sent_for_review_at` (the queue's order; set when the setup finishes and when the owner sends
    it again), `hidden_at`, `hidden_reason` (migration 0036).
  - `isPublic()` / `publicRow()` (`catalog/map.ts`): verified and not hidden, used by search, the suggestions, the
    page, similar places, favourites and online booking (`publicBusiness`). A hidden page answers visitors
    `not_found`; its own team gets a `preview` with the status `hidden` and, for the owner, the reason.
  - `modules/admin/businesses.ts`: the lists (`review`, `moved`, `rejected`, `hidden`, `verified`, `all`, a search, 200
    at most), a business to check (Q-276), verify (and a move checked again, Q-215: it stays public, nobody told),
    reject with a reason (a live one is un-verified, Q-275), hide and show with a reason (Q-012), and the owner's send
    again (`sendForReview`). Each writes `admin_actions`; verify, reject and send again write `verification_history`.
  - The owner hears it (`tellOwner`): `business.reviewed` for the workspace's screens (every team member; the sdk
    refreshes as for `business.updated`), and a Ýeral SMS in their language (`sms.pageVerified`, `pageRejected`,
    `pageHidden`, `pageShown`) that waits for 08:00 at night (`businessSmsAt`, Q-279).
  - Routes `/v1/admin/businesses[/{id}[/verify|/reject|/hide|/show]]`; the owner's `POST /v1/w/{slug}/verification`.
- Tests: `modules/admin/businesses.test.ts` (the queue without drafts, the check, verify and its SMS and event,
  sent back with the night SMS in the morning and sent again by the owner only, hidden out of search with the team's
  preview, a move checked again, only the team); `lifecycle.test.ts` (`businessSmsAt`); sdk.
- Follow-ups: closing a workspace (Q-213), reported reviews (Q-261, Q-262) and adding a business for its owner (F-238)
  come next in step 5.
