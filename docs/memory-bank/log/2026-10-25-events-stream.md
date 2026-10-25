# The push channel: server-sent events on a Postgres NOTIFY (slice 3 U5, #211, feat/events-stream; ADR 0028)

- Changed (api): `emit` (`notify.ts`, the one place events are written) adds `pg_notify('yeral_events', {b, u})` with
  the event's business and user; Postgres sends it at commit (nothing on a rollback). `modules/events/live.ts`:
  `createLive(db)` (in `Deps` as `live`) keeps the open streams by user; `changed({ businessId, userId })` nudges that
  user's streams and those of everyone on the business's team as it is now (`signsIn`; nothing asked when no stream is
  open); `listenForEvents(url, live, log)` is the process's one LISTEN, on a connection of its own, back 5 s after a
  drop and then nudging every stream (started in `entry/node.ts`, stopped with the pool). `GET /v1/events/stream`
  (signed in): `event: ready` at once (with `retry: 5000`), `event: changed` on each nudge (no data), `: ping` every
  25 s; `Cache-Control: no-cache, no-transform` and `X-Accel-Buffering: no`, so nothing between buffers or compresses
  it. API tests: the NOTIFY at commit and not on a rollback, the nudges reaching exactly the user and the team, the
  payload parser, 401 signed out, and the whole path (emit → NOTIFY → LISTEN → the stream's `changed`). CI's Docker
  stack checks the stream through Caddy (signed in; `ready` at once, text/event-stream, not compressed).
- Changed (sdk): `startEvents` opens `EventSource(…/v1/events/stream, { withCredentials })` while someone is signed in
  (closed on sign-out and `stop`), reads `GET /v1/events` on `ready` and on each `changed` and once more 1 s later (an
  event shows once every older transaction has finished), opens it again 10 s after it closes for good (a refusal, the
  api restarting; a dropped connection comes back by itself); the poll is now a 60-second fallback. No `EventSource`
  (the server, Node) → no stream. sdk tests with a fake stream.
- Decided: the delegated details (Claude): the payload is the ids only (8 kB limit, nothing private); the team asked per
  event rather than kept per stream (someone who joins hears at once); the 25 s ping; the reopen after 10 s.
- Caddy: no change needed (`reverse_proxy` flushes text/event-stream; `encode` skips a no-transform answer); a comment
  in `yeral.caddy`.
- Follow-ups: the client site starts the feed in slice 3's C5 (its pages already build the sdk; `startEvents` there in
  the browser only); on HTTP/1.1 (local dev without Caddy) a browser keeps at most 6 connections to the api, so many
  open tabs could queue requests (through Caddy it's HTTP/2); the person's own change still refreshes twice (an event
  could name its session to be skipped).

## After the review (one round, 12 findings)

- Fixed: a stream follows the account signed in now (a sign-in over another account, the demo, opens one for the new
  account); `GET /v1/events` says `held` when an event of the person's is held back behind an older transaction (or a
  full page has more), and the sdk reads again in 1, 2, 4 … 30 s, in place of a fixed second look; the LISTEN has
  keep-alive, a connect and query timeout and a check every 30 s, nudges every stream whenever it's (back) up, and a
  stop during a connect ends it; the stream checks its session at each 25 s ping and ends with it (an `setInterval`, no
  growing promise chain); an account keeps at most 10 streams (`STREAMS_PER_USER`, the oldest ends); NOTIFYs within
  50 ms are asked about in one query, only for accounts with a stream open; a refused stream asks who is signed in and
  opens again after 10 s, doubling to 5 minutes; a hidden tab closes its stream (and opens it on coming back); the
  stream test fails on a stream that ends and waits for its emits; ADR 0028.
- Kept: the NOTIFY in `emit` rather than a trigger (one writer, ADR 0028's alternatives).
- Corrected: the local Docker stack's Caddy is HTTP/1.1 (`auto_https off`), so there many open tabs can reach the
  browser's 6 connections per host (each visible tab holds one); production is HTTP/2.
