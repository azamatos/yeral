---
'@yeral/api': minor
'@yeral/contract': minor
---

Reported reviews in the admin tool (book ROUND6 F2, Q-261, Q-262): the queue of reports waiting, kept (it counts and
can't be reported again) or removed (gone from the page, the business's list and the rating; its author still sees it).
Migration 0037 adds `reviews.removed_at` and `removed_reason`.
