# 0002. Vite + TanStack instead of Next.js

- Status: Accepted 2026-10-13
- Decided by: owner (drop Next.js, use TanStack Start for SSR) + Claude

## Context

The first web version was Next.js 16 on Cloudflare via OpenNext. What it cost us:
`next` pinned to 16.3.8 because 16.4.0 broke on Workers; an adapter layer between Next and the host; server/client
component boundary bugs; `force-dynamic` to stop pages being frozen at build time. Most of our UI is client-side
anyway (availability, booking, account), and business/cms need no SEO at all.

Public marketplace pages still need server-rendered HTML: Google, and above all messenger link previews (Telegram,
IMO, WhatsApp, Instagram) read meta tags from the HTML without running JavaScript. A salon's own link is the
commission-free channel, so its preview card matters.

## Decision

- **Vite 8 + React 19 everywhere.**
- **TanStack Start** (SSR) for `apps/client` and `apps/landing` (landing prerendered to static files). SSR is on for
  public pages and off (`ssr: false`) for account, booking and login.
- **TanStack Router** (SPA) for `apps/business` and `apps/cms`.
- One router, one data layer (TanStack Query), one set of patterns across all four apps.

## Consequences

- No React Server Components and no `'use client'` boundary; data loads in explicit route loaders.
- SEO is explicit: each route's `head()` returns title, description, canonical, hreflang, OG tags and JSON-LD; sitemap and robots are server routes.
- Start builds for Node or Cloudflare, so the host can change (ADR 0007).
- The Next app is ported, not rewritten: domain, mock logic, components and messages carry over.

## Alternatives considered

- **Keep Next.js**: the problems above, plus lock-in to the OpenNext adapter on Workers.
- **Pure SPA + prerender / injected meta tags**: simpler, but new salons need a rebuild or edge logic before previews work, and indexing is less reliable.
- **React Router v7 framework mode**: comparable; TanStack wins on typed search params (our wizard and filters live in the URL) and on using one router in all four apps.
- **Astro for public pages**: great for static content, but the marketplace is interactive and would split into islands with a second mental model.
