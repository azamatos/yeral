---
'@yeral/api': patch
'@yeral/domain': minor
---

Lateness is a fixed 15 minutes at every business in the MVP (book Q-118): `LATE_MINUTES` in `@yeral/domain/rules`,
shown in each business page's rules whatever a business had stored; `BookingRules` no longer carries a lateness.
