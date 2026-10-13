# Project brief

**Yeral** is online booking for beauty and wellness services in Turkmenistan, Ashgabat first.

## Products and sites

| Site | App | For whom | What it does |
|---|---|---|---|
| `yeral.app` | `apps/landing` | everyone | entry point: «Я клиент» / «Я бизнес», search box straight into the marketplace, for-business pricing and sign-up, short salon links `yeral.app/{slug}` → client app |
| `client.yeral.app` | `apps/client` | clients | marketplace: search, salon pages, booking wizard, my visits, reviews, favourites, notifications |
| `business.yeral.app` | `apps/business` | salons and masters | workspace: calendar, requests, manual booking, clients, services, team and schedules, booking rules, hours, analytics, reviews, settings |
| `cms.yeral.app` | `apps/cms` | the Yeral team | admin + content: salon onboarding and moderation, users, complaints and no-shows, reference data (categories, districts), landing texts, banners, SEO texts |
| `api.yeral.app` | `apps/api` | all of the above | REST API `/v1`; today the demo backend, later the real one |

**Core principle** (from the Project Brief): every salon action has a mirror screen for the client, booking statuses are
the same in both apps, and the salon confirms requests manually unless it turned on instant confirmation.

## Business model (as shown on the public for-business page)

1. Free for a solo master.
2. Subscription for a team: priced per business, not per seat.
3. Commission only for a *new* client who came from the catalogue.
4. Online payments and deposits later, when local online payment matures.

Bookings through the salon's own link (`yeral.app/{slug}`, QR code) are free forever. Every booking records its channel:
`marketplace` | `direct` | `phone`.

## Market and constraints

- People: Ashgabat; Russian and Turkmen speakers; phones `+993`; money in manats (TMT, whole numbers);
  time zone `Asia/Ashgabat` (UTC+5, no daylight saving).
- **Internet in Turkmenistan is heavily filtered.** Cloudflare and most foreign CDNs are reported blocked
  (Tor forum, Jan 2026), as are Telegram, Instagram and YouTube. Production must work from inside the country
  without a VPN. The production host is not chosen yet; until then the architecture stays portable and
  nothing at runtime depends on third-party hosts. See [ADR 0007](../decisions/0007-portable-hosting.md).
- UX reference: Fresha. Visual source: the Claude Design export (Design System v2, Client App, Business App,
  Business Clients and Analytics, Product Deck, Business Deck) kept next to the repository in `../design`.
- The first prototype (mobile PWA): github.com/azamatos/yeral_proto. Its `src/data/actions.ts` is the reference for
  every business action not yet built here.

## Goals

- **Now:** a full demo on a mock backend: book as a client, answer as the salon, and see both sides update live.
- **Next:** business workspace, landing, CMS; Turkmen language; SEO.
- **Then:** the real backend in this monorepo (TypeScript), SMS codes, push notifications, production hosting reachable in Turkmenistan.

## Non-goals for now

- Native mobile apps. Packages that hold logic (`domain`, `contract`, `sdk`, `i18n`) stay DOM-free so an Expo app can reuse them later.
- Online payments.
