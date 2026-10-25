# 0028. Changes reach open pages through server-sent events nudged by a Postgres NOTIFY

- Status: Accepted 2026-10-25
- Decided by: owner (slice 3 needs new booking requests to show at once; the owner found updates not instant,
  25.10.2026) + Claude (how, delegated)

## Context

Open pages heard about changes by polling `GET /v1/events?after=<cursor>` every 10 s (systemPatterns.md "Live
updates"), which decides who sees what. Slice 3 (the booking loop) needs a business to see a new request at once, and a
client to see the answer. The api runs on the own server (ADR 0024) as one or more Node processes behind Caddy, with
Postgres beside it; every event is written in one place (`emit`, `apps/api/src/notify.ts`). Events show in the order of
the transaction that wrote them, once every older transaction has finished, so a committed event can be held back for a
while (a demo re-seed is a long transaction).

## Decision

- **A NOTIFY beside each event:** `emit` adds `pg_notify('yeral_events', { b, u })` with the event's business and user
  ids; Postgres sends it at commit, never on a rollback.
- **One LISTEN per api process** (`listenForEvents`, on a connection of its own, with keep-alive, a check every 30 s
  and a reconnect after 5 s, nudging every stream when it's back) hands each NOTIFY to `createLive` (`Deps.live`), which
  nudges the open streams of that user and of everyone on that business's team (asked in one query per 50 ms burst, only
  for accounts with a stream open there). An account keeps at most 10 streams; a new one ends its oldest.
- **`GET /v1/events/stream`** (signed in): server-sent events, `ready` at once, `changed` on each nudge, no data; a
  comment line every 25 s, when the session is checked again (the stream ends with it). It answers
  `Cache-Control: no-cache, no-transform`, so Caddy's `encode` leaves it alone and `reverse_proxy` flushes it at once.
- **The sdk** (`startEvents`) keeps one `EventSource` while someone is signed in and the tab is visible, for that
  account; on `ready` and `changed` it reads `GET /v1/events` as before, so who sees what stays decided in one place.
  `GET /v1/events` says `held` when an event of the person's is held back (or a full page has more behind it), and the
  sdk reads again in 1, 2, 4 … 30 s. A stream closed for good asks who is signed in and opens again after 10 s, doubling
  to 5 minutes. The poll stays as a 60-second fallback.

## Consequences

- New requests, answers and settings reach open pages within a moment instead of up to 10 s, and the poll's load drops
  sixfold.
- Each api process holds one more database connection (the LISTEN) and one socket per open, visible tab; through Caddy
  that's HTTP/2, so tabs don't run into the browser's 6-connection limit (local HTTP/1.1 can).
- A nudge carries nothing, so the person's own change still comes back as an event and refreshes its keys a second time;
  an event could name its session later to be skipped.
- More api processes need no change: each LISTENs and holds its own streams.
- The client site starts the same feed in slice 3 (C5).

## Alternatives considered

- **Polling faster** — cheap to build, but every open page asks every few seconds whether anything changed, and it's
  still not at once.
- **WebSockets** — two-way, which nothing here needs; a library and an upgrade path through Caddy for no gain over SSE.
- **The event's data in the stream** — would put who-sees-what in a second place; the nudge-then-read keeps it in one.
- **A NOTIFY from a trigger on `events`** — catches inserts that bypass `emit`, but there are none, and a trigger is one
  more place to look; `emit` is the one writer.
- **A message broker (Redis pub/sub)** — another service on the server for what Postgres already does.
