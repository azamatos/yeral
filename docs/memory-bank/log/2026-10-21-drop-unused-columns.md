# 2026-10-21 · Two unused columns go (the planned cleanup)

Migration 0041 drops `users.notify_review_ask` (unused since review asks went, Q-259), `businesses.avg_bill` (no
average bill, Q-103) and `businesses.typical_confirm_minutes` (the page's answer time is worked out from the requests,
Q-113). They were kept so
an older api image could still run beside a new database; with releases paused and the server not public, the next
deploy takes them out. An api image older than 0041 can't run on the database after it: Drizzle names every column its schema knows in its
selects and returns. operations.md's "Rollback" and the `ship` skill say so now. During the deploy that runs 0041 the
old container serves until compose recreates it, so a few of its requests and a jobs tick may fail (the server isn't
public; the jobs retry).

Also: `mobileInputSchema`'s comment names the market's mobile prefixes and the demo's unused range, not 61–65, 71.

Review (one round): `avg_bill` dropped too; the rollback runbook and the ship skill; the log's reason. Left as follow-ups:
`/v1/health` comparing the database's newest migration with the image's (a rollback past a contract migration passes
the health check today), and the jobs runner's `reviewAsk` drop branch, dead once the deploy carrying 0041 is out.
