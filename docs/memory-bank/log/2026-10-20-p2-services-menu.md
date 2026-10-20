# The services menu (feat/p2-4-services)

- Changed: P2 step 4 (book B-38, Q-210, F-110). New module `menu` (`apps/api/src/modules/menu`, paths
  `/v1/w/{slug}/services…`) and contract `@yeral/contract/services`; `requireServices` = `requireMember` + the
  `services` permission. The menu returns every language as written, hidden amounts, offline services, `staffIds` and
  `futureBookings` (active bookings from today that hold the service, for the delete warning).
- Rules: `serviceErrors` (`@yeral/domain/services`): 5–240 min in 5-min steps; fixed and "from" 1–99 999, free 0,
  hidden 0–99 999; own buffer null or 0/5/10/15/20/30. A group must be the business's, people its team rows not
  removed; wrong fields come back as `issues`.
- Deleting archives (`DELETE`, undo `POST …/restore` to the same place); a group goes only without services
  (`group_not_empty`, new error code with en/tk/ru texts) and deletes its archived services with it. `PUT …/order`
  takes every group and service once and may move a service between groups. Every change writes `business.updated`.
- The first-launch market is English only: a name in another language is refused by `localizedSchema`.
- Follow-ups: the business profile (B-37) next, then requests and bookings, then hours and special days (their
  keep-or-cancel choice reuses the business's cancel with offered times).
