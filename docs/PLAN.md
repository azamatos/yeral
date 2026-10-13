# Yeral web — plan

yeral.app: the web version of Yeral (booking at beauty & wellness salons in Ashgabat).
Built from the mobile prototype (`../app`) and the Claude Design export (`../design`), with UX patterns from Fresha.

Decisions (Oct 2026): client marketplace first · Russian now, Turkmen later (all strings in `messages/`) · hosting on Cloudflare.

## Phases

| # | Scope | Notes |
|---|---|---|
| 0 | **Foundation**: Next.js 16 + OpenNext (Cloudflare Workers), Tailwind 4 tokens from Design System v2, typed API contract + in-browser mock, domain rules ported from the prototype (Ashgabat time, UTC+5), seed of 24 salons / 7 categories / 8 districts | |
| 1 | **Client marketplace**: home + search bar, search (list + map + day rail), salon page `/{slug}`, full-page booking `/{slug}/book`, phone + code login, my bookings + detail (cancel, move, accept proposal, review, «это не я»), favourites, profile, notifications | demo panel plays the salon until phase 2 |
| 2 | **Business workspace** `/business/*`: sidebar, calendar (staff columns, day / 3 days / week, drag & drop, side drawer), requests, clients, services, team & schedules, analytics, reviews, settings (profile, address, hours, rules, link & QR, notifications) | same mock DB → client ↔ salon live in two tabs |
| 3 | **For business**: `/for-business` landing with the deck's pricing layers, salon sign-up wizard | |
| 4 | **Turkmen + SEO**: `/tk/...`, city × category pages (`/ashgabat/barbershops`), JSON-LD (HealthAndBeautyBusiness, OfferCatalog, ReserveAction), sitemap, OG images, PWA | |
| 5 | **Backend**: `src/api/http` implements the same `Api` interface; real SMS OTP; SSR with real data | `docs/API.md` is the backend spec |

## Architecture

- `src/domain` — pure TypeScript: types, time (Ashgabat), booking rules (slots, buffer, lead time, window, statuses). Moves to the backend later.
- `src/api/contract.ts` — the only thing the UI depends on. `src/api/mock` implements it in the browser (localStorage, simulated latency, cross-tab sync, synthetic but deterministic occupancy per master/day). Later `src/api/http`.
- `src/api/hooks.ts` — TanStack Query hooks; pages never call the mock directly.
- Pages: server components render the public catalogue (SEO-shaped from day one); availability, account and bookings are client-side.
- i18n: next-intl, `messages/ru.json`; no locale prefix until Turkmen ships.

## Product rules kept from the prototype

- Salon confirms requests manually unless it turned instant confirmation on; statuses are the same for client and salon.
- «Мне не важно кто — сначала время» path; services → master → time → review.
- Cancellation free until N hours before; after two no-shows the client confirms the day before.
- Booking channel is recorded: marketplace / the salon's own link (free forever) / phone.

## Open questions

- Reachability of Cloudflare from Turkmenistan — test the preview URL from Ashgabat early.
- yeral.app vs yeral.tm (deck uses yeral.tm in links).
- Prices for subscription/commission in manats; online payments availability.
- Real salon photos and texts (mock uses Unsplash/Pexels stock).
