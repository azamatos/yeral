# Project brief

**Yeral** is online booking for beauty and wellness services in Turkmenistan, Ashgabat first.
The name and domain are working titles: the owner may move to `yeral.com` or rebrand, so both are configuration.

## Products and sites

| Site | App | For whom | What it does |
|---|---|---|---|
| `yeral.app` | `apps/landing` | everyone | entry point: «Я клиент» / «Я бизнес», search box straight into the marketplace, for-business pricing and sign-up, short salon links `yeral.app/{slug}` → client app |
| `client.yeral.app` | `apps/client` | clients | marketplace: search, salon pages, booking wizard, my visits, reviews, favourites, notifications |
| `business.yeral.app` | `apps/business` | salons and masters | workspace: calendar, requests, manual booking, clients, services, team and schedules, booking rules, hours, analytics, reviews, settings |
| `cms.yeral.app` | `apps/cms` | the Yeral team | admin + content: salon onboarding and moderation, users, complaints and no-shows, reference data (categories, districts), landing texts, banners, SEO texts |
| `api.yeral.app` | `apps/api` | all of the above | REST API `/v1` on Postgres |
| `storybook.yeral.app` | `apps/storybook` | the team and agents | the design system: every component, its variants and docs |

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
- **Hosting:** Cloudflare now. Later an own server (likely in Turkmenistan, where Cloudflare is reported filtered) running
  everything in Docker behind nginx, with Cloudflare kept for DNS. Not a focus until that server is bought; the code
  stays portable so the move is a deploy ([ADR 0007](../decisions/0007-hosting-cloudflare-now-docker-later.md)).
- UX reference: Fresha. Visual source: the Claude Design export (Design System v2, Client App, Business App,
  Business Clients and Analytics, Product Deck, Business Deck, Project Brief) in `docs/design/`.
- The first prototype (mobile PWA): github.com/azamatos/yeral_proto. Its `src/data/actions.ts` is the reference for
  every business action not yet built here.
- The repository is public by the owner's choice until the product is ready; it will go private then. Never commit secrets.

## Goals

- **Now:** infrastructure first — monorepo, tooling, design system with Storybook, tests, CI/CD, Docker — then a working
  product on a real API and database.
- **Next:** rebuild and polish the client app (the owner isn't satisfied with the first version), landing, business workspace, CMS; Turkmen; SEO.
- **Then:** production SMS codes, push notifications, the own server.

## Non-goals for now

- Native mobile apps. Packages that hold logic (`domain`, `contract`, `sdk`, `i18n`) stay DOM-free so an Expo app can reuse them later.
- Online payments.
- Optimising for network filtering in Turkmenistan before the own server exists.
