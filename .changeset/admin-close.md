---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
---

Closing a workspace (book Q-213): the Ýeral team closes it as its owner asks; its bookings ahead and waiting requests are
cancelled ("The business has closed", each client told by SMS), its page hidden from everyone and the workspace out of
its team's switcher; the data stays, and it can be opened again. Migration 0038 adds `businesses.closed_at`,
`closed_reason` and the cancel reason `business_closed`.
