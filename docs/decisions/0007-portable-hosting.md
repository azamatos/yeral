# 0007. Portable hosting, no third-party hosts at runtime

- Status: Accepted 2026-10-13
- Decided by: Claude, pending the owner's reachability test

## Context

Yeral's users are in Turkmenistan, where internet access is heavily filtered by the single provider:

- "They are entirely filtered but a few specific addresses", about general CDNs like Cloudflare and Azure
  (Tor relays forum, 2026-01-12, https://forum.torproject.org/t/tor-relays-turkmenistan-censorship/21075).
- Turkmentelecom blocks sites by DNS spoofing, IP blocking and HTTP host inspection; whole `/16` subnets are blacklisted
  (turkmen.news, https://en.turkmen.news/news/dozens-of-foreign-websites-social-networks-blocked-in-turkmenistan/).
- Blocks change over time: a large unblocking in June 2024 was followed by firewall testing
  (Cloudflare blog, https://blog.cloudflare.com/fresh-insights-from-old-data-corroborating-reports-of-turkmenistan-ip/).

`yeral.app` is on Cloudflare today. It may be unreachable for the people it's built for.

## Decision

- **Keep every runtime portable.** Apps build to static files or a Node server; the api runs on Node. Cloudflare-specific
  code is limited to deploy config, `entry/worker.ts` and the demo store adapter.
- **No third-party hosts at runtime.** System or self-hosted fonts; self-hosted map tiles (PMTiles extract of Turkmenistan)
  before launch; error reports and analytics through our own endpoints or self-hosted tools; no Google Fonts, Analytics,
  Tag Manager or external CDNs. CSP enforces it.
- **Choose the production host after a test from Ashgabat** (home internet and mobile, without VPN): Cloudflare,
  a Turkmen data centre, or a foreign VPS whose range is reachable. Production ships as Docker images + Postgres.
- Cloudflare stays for the demo and staging meanwhile.

## Consequences

- We lose some managed conveniences (Durable Objects, D1, KV) outside the demo.
- Map tiles, fonts and error tracking need a little self-hosting work (M8).
- If Cloudflare proves reachable, we can keep it with no code change.

## Alternatives considered

- **Go all-in on Cloudflare** (D1, Durable Objects, Workers-only APIs): cheapest and simplest, but a block in Turkmenistan would mean rewriting storage and runtime.
