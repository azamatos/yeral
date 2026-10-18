# Project brief

**Ýeral** — "ýer al", Turkmen for *take a place* — is a booking marketplace for anyone who sells their time: barbers
and beauty salons, dentists (home practices too), physio, restaurants and cafés, gyms and yoga studios, tutors, mechanics,
groomers, home services. Every booking is a place: a chair, a table, a mat, a court. Launch market: Turkmenistan,
Ashgabat first. The name and domain are working titles (a move to `yeral.com` or a rebrand is possible), so both are
configuration.

Design and product spec: [`docs/design/`](../design) (client site fully designed 14.10.2026; business workspace round 4
— daily work and setup, appointment type — designed 14.10.2026 in `docs/design/business/`; analytics, reviews, billing,
the B2B page, table/class management and the CMS come in the designer's next rounds). Logic reference: Fresha — copy its flows, never its visuals.

## Sites

| Site | App | For whom | What it does |
|---|---|---|---|
| `yeral.app` | `apps/client` | clients | the marketplace: home, search with map, category pages, business pages, booking (appointment, table, class), account; `/tk` `/ru` `/en` |
| `business.yeral.app` | `apps/business` | businesses and their staff | workspace: multi-staff calendar, bookings, clients, services, team, analytics, settings; the B2B pricing page |
| `cms.yeral.app` | `apps/cms` | the Ýeral team | admin + content: businesses, users, complaints, category catalogue (icons, TK/RU/EN names, booking types, starter services), content |
| `api.yeral.app` | `apps/api` | all of the above | REST API `/v1` on Postgres |
| `storybook.yeral.app` | `apps/storybook` | the team and agents | the design system |

## Product rules that never break (from the design spec)

1. By default the business confirms every booking by hand: a client never sees "booked" until then, the first state is
   *Garaşylýar* (Pending) and the copy says the request was *sent*. A business may switch on instant confirmation;
   unanswered requests expire after the business's hold time.
2. Five statuses with one meaning everywhere (web, apps, business, CMS): Pending · Confirmed · Completed · Cancelled · No-show.
3. A visit is Completed by default after it ends unless the business marks No-show.
4. A phone booking (entered by the business) is Confirmed + a phone icon, not a separate status.
5. Cancelled by the client or by the business: same colour, an icon and label tell them apart.
6. The category decides how a business is found and booked: booking type, search filters, suggested services.
7. One gradient primary button per view.
8. No city name in UI copy; everything is relative to the user's location ("Ýakynymda", "golaýyňyzda").
9. No online payment yet: "Töleg ýerinde" (pay at the place); a hidden deposit row is reserved in summaries.

## Business model (as shown on the public for-business page)

Free for a solo specialist → subscription per business (not per seat) → commission only for a new client from the
catalogue → payments and deposits later. Bookings through the business's own link are free. Every booking records its
source (`web` | `app` | `phone` | `walkin` | `ai`). Manat prices for plans and commission are open.

## Market and constraints

- Built in English; each market adds its languages (Turkmenistan: Turkmen, Russian; ADR 0022). Turkmenistan: money in
  manats, shown as `40 TMT`; formats follow the language (`4,9` in Turkmen and Russian, `4.9` in English); phones `+993`.
- Business-local time: `Asia/Ashgabat` (UTC+5, no daylight saving) for every business today.
- **Hosting:** Cloudflare now; later an own server (likely in Turkmenistan, where Cloudflare is reported filtered) running
  everything in Docker behind nginx, with Cloudflare kept for DNS
  ([ADR 0007](../decisions/0007-hosting-cloudflare-now-docker-later.md)).
- The repository is public by the owner's choice until the product is ready; it will go private then. Never commit secrets.

## Goals

- **Now:** infrastructure first — design system with Storybook (M1), platform with the multi-category model on Postgres
  (M2) — then the client site exactly as designed (M3), replacing the first Next.js version on yeral.app.
- **Next:** business workspace and CMS once their designs exist; SEO and growth.
- **Then:** production SMS, push notifications, the own server.

## Non-goals for now

- Native mobile apps (designed separately). Logic packages (`domain`, `contract`, `sdk`, `i18n`) stay DOM-free so they can be reused.
- Online payment and deposits, the resource booking type, waitlists, gift cards, loyalty, in-app chat, AI bookings, paid promotion.
