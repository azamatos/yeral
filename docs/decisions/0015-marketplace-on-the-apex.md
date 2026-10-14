# 0015. The marketplace lives on yeral.app; no separate landing

- Status: Accepted 2026-10-14 — supersedes [0003](0003-four-sites-on-subdomains.md)
- Decided by: owner (follow the design) + Claude

## Context

ADR 0003 put a choose-client-or-business landing on `yeral.app` and the marketplace on `client.yeral.app`. The web
design (v0.3, 14.10.2026) draws the marketplace itself on `yeral.app/tk` with a "Biznes üçin" link in the header and a
business block on Home, and gives the B2B pricing page to `business.yeral.app`. SMS templates link to `yeral.app/b/{id}`.

## Decision

| Host | App |
|---|---|
| `yeral.app` | `apps/client` — the marketplace, every route under `/tk` `/ru` `/en` (ADR 0016) |
| `business.yeral.app` | `apps/business` — workspace + B2B pricing page |
| `cms.yeral.app` | `apps/cms` |
| `api.yeral.app` | `apps/api` |
| `storybook.yeral.app` | `apps/storybook` |

- No `apps/landing`. The client site replaces `apps/legacy` on the apex at the end of M3.
- Business links: `yeral.app/b/{slug}` redirects to `/{saved language or tk}/b/{slug}`. Old legacy links (`yeral.app/{slug}`)
  redirect the same way while they still exist.
- One session cookie on the parent domain for the client site and the business workspace; the CMS keeps its own.

## Consequences

- One less app to build and deploy; the roadmap's landing milestone (M4) is folded into M3.
- `client.yeral.app` isn't used. Staging for the client site is `stage.yeral.app`.

## Alternatives considered

- **Keep ADR 0003** (landing + `client.`): an extra click for the majority (clients) and an extra app, with no design for it.
