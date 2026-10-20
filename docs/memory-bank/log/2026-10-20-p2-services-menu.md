# The services menu (feat/p2-4-services)

- Changed: P2 step 4 (book B-38, Q-210, F-110). New module `menu` (`apps/api/src/modules/menu`, paths
  `/v1/w/{slug}/services…`) and contract `@yeral/contract/services`; `requireServices` = `requireMember` + the
  `services` permission. The menu returns every language as written, hidden amounts, offline services, `staffIds` and
  `futureBookings` (active bookings from today that hold the service, for the delete warning).
- Rules: `serviceErrors` (`@yeral/domain/services`): 5–240 min in 5-min steps; fixed and "from" 1–99 999, free 0,
  hidden 0–99 999; own buffer null or 0/5/10/15/20/30. A group must be the business's, people its team rows not
  removed; wrong fields come back as `issues`.
- Deleting archives (`DELETE`, undo `POST …/restore`, last in its group, as the order may have changed); a group goes only without services
  (`group_not_empty`, new error code with en/tk/ru texts) and deletes its archived services with it. `PUT …/order`
  takes every group and service once and may move a service between groups. Every change writes `business.updated`.
- Picking people keeps `staff.bookable` in step (any service makes a row bookable, as on the team screen); removed
  people keep their links for a reactivation and don't show on the menu. Menu writes lock the business row (`no key
  update`). A service deleted from the menu can't be booked again, also through an offered time (`not_bookable`).
- The first-launch market is English only: a name in another language is refused by `localizedSchema`.
- Follow-ups: the business profile (B-37) next, then requests and bookings, then hours and special days (their
  keep-or-cancel choice reuses the business's cancel with offered times).
