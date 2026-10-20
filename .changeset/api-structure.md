---
'@yeral/api': patch
'@yeral/domain': minor
---

A time a booking can't take because the business just changed its hours comes back as 409 `slot_taken` with the
nearest free times, as a time taken by another booking does. Two team endpoints (a team member's services, resending
an invite) answer a refused value in the `validation_error` shape every other endpoint uses (`issues`). The domain
drops `checkPlan` (`planRefusal` gives the same answer with its details).
