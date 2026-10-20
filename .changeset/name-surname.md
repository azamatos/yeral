---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
---

Name and surname as two fields (book Q-156): the profile has `firstName` and an optional `surname` beside the whole
`name`, `PATCH /v1/me` takes them (the old one-field `name` is split at the first space), and reviews are signed
"Aýjemal G.", or "Aýjemal" without a surname. `@yeral/domain/names` holds the rules.
