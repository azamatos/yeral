# Ýeral API — guide

The api is `apps/api` (Hono, M2). Request and response shapes are the zod schemas in `@yeral/contract`
(`packages/contract/src/<area>.ts`); the OpenAPI 3.1 document generated from the routes is the reference, served at
`/docs` ([ADR 0005](decisions/0005-typescript-backend-in-monorepo.md), [ADR 0006](decisions/0006-contract-and-sdk.md)).
Apps call it only through `@yeral/sdk`. The frozen `apps/legacy` keeps its own in-browser mock.

## Conventions

- Paths start with `/v1`; inside it changes are additive only (breaking changes ship as `/v2`).
- Business-local dates `YYYY-MM-DD`, times of day in minutes from midnight (`870` = 14:30), instants in epoch ms,
  money in whole manats. Every business is in `Asia/Ashgabat` today.
- Text endpoints take `?lang=tk|ru|en` (default `tk`) and return resolved strings.
- Lists: `{ items, total?, cursor? }`; pass `cursor` back for the next page (`null` = last page).
- Errors: `{ error: { code, message?, details? } }` with the HTTP status from `ERROR_STATUS` (`@yeral/contract/errors`);
  apps show `errors.<code>` from `@yeral/i18n`. `409 slot_taken` carries `details.alternatives` (3 nearest times),
  `400 code_invalid` carries `details.attemptsLeft`, `429` codes carry `details.retryAfterSec`.
- Session: an httpOnly cookie on the parent domain (`@yeral/lib/site` names and scopes it); mutations check `Origin`.

## Client endpoints (M2)

| Area | Endpoint | Schemas (`@yeral/contract/…`) |
|---|---|---|
| Login | `POST /v1/auth/code` · `POST /v1/auth/verify` · `POST /v1/auth/logout` | `account`: `sendCode`, `verifyCode` → `verifyCodeResponse` |
| Me | `GET /v1/me` · `PATCH /v1/me` · `DELETE /v1/me` · `POST /v1/me/phone/code` · `POST /v1/me/phone/verify` | `account`: `me`, `updateMe`, `changePhone` |
| Favourites | `GET /v1/me/favorites` · `PUT /v1/me/favorites/:slug` · `DELETE /v1/me/favorites/:slug` | `catalog`: `businessCard` |
| Categories | `GET /v1/categories` | `catalog`: `categoryList` |
| Search | `GET /v1/search` (Home "Golaýyňyzda şu gün boş" too) · `GET /v1/search/suggest` | `catalog`: `searchQuery` → `searchResponse`, `suggest*` |
| Places | `GET /v1/places/suggest` | `catalog`: `placeList` |
| Business page | `GET /v1/businesses/:slug` · `GET /v1/businesses/:slug/reviews` | `catalog`: `businessDetail`, `reviewList` |
| Free times | `GET /v1/businesses/:slug/availability` (appointment) · `GET /v1/businesses/:slug/specialists/availability` · `GET /v1/businesses/:slug/tables` · `GET /v1/businesses/:slug/sessions` | `availability` |
| Bookings | `POST /v1/bookings` · `GET /v1/me/bookings?tab=upcoming\|past` · `GET /v1/me/bookings/:code` | `bookings`: `createBooking`, `bookingList`, `bookingDetail` |
| Booking actions | `POST /v1/me/bookings/:code/cancel` · `…/restore` · `PATCH …/note` · `POST …/reschedule` · `POST …/accept-alternative` · `POST …/review` · `PATCH …/review` | `bookings` |
| Live updates | `GET /v1/events?after=` (a team member gets what their level sees) | `events` |

## Team endpoints (P2 step 2, ADR 0025)

| Area | Endpoint | Schemas (`@yeral/contract/…`) |
|---|---|---|
| Switcher | `GET /v1/me/workspaces` · `POST /v1/me/workspaces/:slug/open` | `team`: `workspaceList` |
| My invites | `GET /v1/me/invites` · `POST /v1/me/invites/:id/accept` · `POST /v1/me/invites/:id/decline` · `GET /v1/invites/:token` (the link, no sign-in) | `team`: `inviteList`, `inviteCard`, `workspace` |
| The team | `GET /v1/w/:slug/team` (owner, administrators) · `POST …/team/invites` · `POST …/team/phone-only` · `POST`/`DELETE …/team/:staffId/invite` · `PATCH …/team/:staffId` · `POST …/team/:staffId/remove` · `POST …/team/:staffId/reactivate` (owner) · `POST /v1/w/:slug/leave` | `team`: `team`, `teamMember`, `inviteInput`, `inviteSent`, `phoneOnlyInput`, `updateMember` |

Who may call: catalogue, search, places and free times are public (cacheable except free times); everything under
`/v1/me` and `POST /v1/bookings` needs a session. Login code requests are rate-limited per phone and IP.

## Business and CMS endpoints

Business workspace (`/v1/biz/...`, M5): calendar, requests, bookings, clients, services, team, roles, rules, hours,
profile, branches — permissions and redaction per ADR 0018. CMS (`/v1/admin/...`, M6). Their schemas join the contract
with their milestones.

## Notifications the api sends

Every business action reaches the client and every client action reaches the business, as an `events` row (open screens
refresh) and, for clients, an SMS from the design's templates (client spec §6): confirmed, declined with reason, expired
with 3 times, reminders 1 day and 2 h before, review ask 2 h after the end. No SMS when a request is sent.
