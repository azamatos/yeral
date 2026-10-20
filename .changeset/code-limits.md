---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/i18n': minor
---

Login code limits (book Q-267): one internet address may ask for 100 codes an hour instead of 20, since mobile
operators put many phones behind one address; one phone still 5. Too many codes answers `rate_limited` with the wait in
minutes too (`retryAfterMin`), and the message says how many minutes to wait.
