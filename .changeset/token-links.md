---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/sdk': minor
---

SMS links carry a long random token (`yeral.app/l/{token}`) instead of the booking code (book Q-168). The link page reads
the booking signed out (`GET /v1/links/{token}`) with the phone masked, and signs in only with the booking's own phone
(`POST /v1/links/{token}/code`, `/verify`).
