# Yeral API — contract for the backend

> Planned: this moves to `apps/api` (Hono) with zod schemas in `@yeral/contract` and a generated OpenAPI document
> ([ADR 0005](decisions/0005-typescript-backend-in-monorepo.md), [ADR 0006](decisions/0006-contract-and-sdk.md)).
> Paths gain the `/v1` prefix. Until then this file describes the endpoints the mock implements.

The web app talks to the backend only through the `Api` interface in `apps/legacy/src/api/contract.ts`.
Today it's served by the in-browser mock (`apps/legacy/src/api/mock`). In the new apps it's replaced by `apps/api` and `@yeral/sdk` (ADR 0005/0006).

This file maps every method to a REST endpoint. JSON field names are exactly the TypeScript types in
`apps/legacy/src/api/contract.ts` and `apps/legacy/src/domain/types.ts`. Dates are salon-local `YYYY-MM-DD`; times are minutes
from midnight (`870` = 14:30); all salon logic runs in `Asia/Ashgabat` (UTC+5). Money is in manats (TMT), integers.

## Auth

Phone + SMS code (OTP). The session is an HTTP-only cookie (or a bearer token for the mobile apps).

| Method | Endpoint | Notes |
|---|---|---|
| `auth.requestCode(phone)` | `POST /auth/code` `{ phone }` → `{ sent: true }` | rate-limit per phone & IP; code valid 5 min |
| `auth.verify(phone, code)` | `POST /auth/verify` `{ phone, code }` → `{ session: { user }, isNew }` | 400 `{ error: 'code' }` on a wrong code |
| `auth.session()` | `GET /me` → `{ user } \| 401` | |
| `auth.updateMe(patch)` | `PATCH /me` | name, birthday, gender, notif toggles |
| `auth.logout()` | `POST /auth/logout` | |

## Catalogue (public, cacheable)

| Method | Endpoint | Notes |
|---|---|---|
| `catalog.districts()` | `GET /districts` | reference data |
| `catalog.search(p)` | `GET /salons?q=&category=&district=&date=&openNow=&instant=&sort=&bounds=n,s,e,w` → `{ items: SalonCard[], total }` | `date` keeps only salons with free windows that day; `services` on each card = the 3 most booked, or the ones matching `q`/`category` |
| `catalog.salon(slug)` | `GET /salons/:slug` → `SalonDetail` | 404 when unknown; old slugs answer `301` to the new one (slug can change once in 30 days, per the business deck) |
| `catalog.slugs()` | `GET /salons/slugs` | sitemap |
| `catalog.reviews(id)` | `GET /salons/:id/reviews` | only from finished visits; newest first |
| `catalog.similar(id)` | `GET /salons/:id/similar` | same categories, nearest first |
| `catalog.suggest(q)` | `GET /suggest?q=` → `{ services: {name, salons}[], salons: SalonCard[] }` | search-as-you-type |

## Availability (public, not cached)

Computed by the backend with the same rules as `src/domain/logic.ts`: opening hours and exceptions,
staff schedule and exceptions, **buffer** after each visit, **minimum lead time**, **booking window**,
active bookings and slots held by reschedule proposals.

| Method | Endpoint | Notes |
|---|---|---|
| `availability.day(q)` | `GET /salons/:id/availability?services=a,b&staff=&date=&exclude=` → `{ date, closed, slots: { start, staff[] }[] }` | `staff` omitted = any master; `exclude` = booking being moved |
| `availability.days(q)` | `GET /salons/:id/availability/days?services=&staff=&from=&days=` → `{ date, count, closed }[]` | calendar dots |
| `availability.nextFree(id, staff?)` | `GET /salons/:id/next-free?staff=` → `{ date, start, staffId } \| null` | |
| `availability.nextFreeMany(ids, date?)` | `GET /availability/next?salons=a,b,c&date=` → `{ [salonId]: number[] }` | search cards |

## Bookings (client)

| Method | Endpoint | Notes |
|---|---|---|
| `bookings.mine()` | `GET /me/bookings` → `BookingView[]` | matched by the user's phone across salons (a salon may have booked them by phone) |
| `bookings.get(id)` | `GET /me/bookings/:id` | |
| `bookings.create(inp)` | `POST /me/bookings` `{ salonId, staffId, serviceIds, date, start, comment?, channel, replaceId? }` → `{ id, status }` | **409** `{ reason: 'taken', alternatives: number[] }` when the slot went meanwhile; `status` is `confirmed` when the salon has instant confirmation, else `pending`; `channel` = `marketplace` \| `direct` (salon's own link — no commission) |
| `bookings.cancel(id, reason)` | `POST /me/bookings/:id/cancel` `{ reason }` | server sets `late` when inside the salon's free-cancellation window |
| `bookings.acceptProposal(id)` | `POST /me/bookings/:id/proposal/accept` | |
| `bookings.declineProposal(id)` | `POST /me/bookings/:id/proposal/decline` | |
| `bookings.confirmAttendance(id)` | `POST /me/bookings/:id/attend` | the «confirm the day before» rule after two no-shows |
| `bookings.notMe(id)` | `POST /me/bookings/:id/not-me` | phone booking made by the salon with a wrong number |

## Reviews, favourites, notifications

| Method | Endpoint |
|---|---|
| `reviews.mine()` | `GET /me/reviews` |
| `reviews.create(bookingId, …)` | `POST /me/bookings/:id/review` `{ rating, text, tags }` (only for `done` visits, one per booking) |
| `reviews.update(id, …)` | `PATCH /me/reviews/:id` |
| `reviews.remove(id)` | `DELETE /me/reviews/:id` |
| `favorites.list()` / `toggle(id)` | `GET /me/favorites`, `PUT/DELETE /me/favorites/:salonId` |
| `notifications.list()` / `markRead(id?)` | `GET /me/notifications`, `POST /me/notifications/read` `{ id? }` |

## Notifications the backend sends (mirror screens)

Every salon action has a client-side screen; every client action reaches the salon. The mock's
`notify(...)` calls in `apps/legacy/src/api/mock/index.ts` list them; in production they go out as push + SMS:

- salon confirms / declines (with reason) / proposes another time / cancels / books by phone / marks a no-show → **client**
- client sends a request / cancels (late or not) / accepts or declines a proposal / says «это не я» / confirms the visit / leaves a review → **salon**

## Not yet in the contract (phase 2, business workspace)

Salon-side endpoints: calendar (`GET /biz/calendar?staff=&from=&to=`), requests, manual booking,
drag-to-move (proposal for app clients, direct move for phone clients), complaints / no-show, clients & notes,
services, team & roles & schedules with conflict resolution, booking rules, hours & exceptions, reviews & answers,
analytics. The prototype's `app/src/data/actions.ts` is the reference for each of them.
