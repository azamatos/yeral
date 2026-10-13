# 0003. Four sites on subdomains, short links on the apex

- Status: Accepted 2026-10-13
- Decided by: owner (site map) + Claude (short links, shared session, demo server)

## Context

The owner wants a landing that lets people choose "client" or "business", with each product on its own site.

## Decision

| Host | App |
|---|---|
| `yeral.app` | landing |
| `client.yeral.app` | client marketplace |
| `business.yeral.app` | business workspace |
| `cms.yeral.app` | internal admin + content |
| `api.yeral.app` | API |

- **Short salon links stay on the apex**: `yeral.app/{slug}` answers `301 → client.yeral.app/{slug}`. Salons print it on QR
  codes and in bios. Salon slugs can't take reserved landing paths (`for-business`, `tk`, `about`, …).
- The landing carries a search box straight into the client app, so most visitors (clients) lose no step.
- One session cookie on `.yeral.app` for client and business (a person can be both). The CMS has separate accounts and a separate cookie.
- Different origins can't share browser storage, so the in-browser mock becomes a **demo server** (`apps/api`) that both apps talk to.

## Consequences

- Each app deploys and versions independently.
- CORS on the api for `*.yeral.app`; cookies `SameSite=Lax` + Origin check.
- Staging hosts are one level deep (`client-stage.yeral.app`) so one wildcard certificate covers them.
- SEO for the marketplace lives on `client.yeral.app`; the landing links to it and its category pages.

## Alternatives considered

- **Marketplace on the apex, business on a subdomain** (Fresha's model): one less click for clients, but the owner wants an explicit choice on the entry page. Short links and the landing search keep the cost low.
- **All apps on one origin by path** (`/business`): shared storage without a server, but couples deploys and mixes concerns.
