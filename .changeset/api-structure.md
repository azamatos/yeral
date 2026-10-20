---
'@yeral/api': patch
'@yeral/domain': minor
---

A new booking (online or by the team) whose time the business's hours closed just then comes back as 409
`slot_taken` with the nearest free times, as one taken by another booking does; a move or an offered time asks for
that one time and still comes back without times. Two team endpoints (a team member's services, resending
an invite) answer a refused value in the `validation_error` shape every other endpoint uses (`issues`). The domain
drops `checkPlan` (`planRefusal` gives the same answer with its details).
