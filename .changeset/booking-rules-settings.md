---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/sdk': minor
---

Business settings start with the booking rules (book B-41, B-42): `GET`/`PATCH /v1/w/{slug}/settings/rules` for the
owner and administrators, with the screen's options checked per field and lateness read-only. A change writes
`business.updated`, which the whole team hears; the sdk's `settings.rules`/`settings.updateRules` refresh the page,
free times and the switcher.
