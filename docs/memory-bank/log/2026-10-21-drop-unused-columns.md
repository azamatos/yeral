# 2026-10-21 · Two unused columns go (the planned cleanup)

Migration 0041 drops `users.notify_review_ask` (unused since review asks went, Q-259) and
`businesses.typical_confirm_minutes` (the page's answer time is worked out from the requests, Q-113). They were kept so
an older api image could still run beside a new database; with releases paused and the server not public, the next
deploy takes them out. An api image older than 0041 can't run on the database after it (`select *` names them).

Also: `mobileInputSchema`'s comment names the market's mobile prefixes and the demo's unused range, not 61–65, 71.
