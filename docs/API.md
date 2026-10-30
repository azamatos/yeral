# Ýeral API — guide

The api is `apps/api` (Hono, M2). Request and response shapes are the zod schemas in `@yeral/contract`
(`packages/contract/src/<area>.ts`); the OpenAPI 3.1 document generated from the routes is the reference, served at
`/docs` ([ADR 0005](decisions/0005-typescript-backend-in-monorepo.md), [ADR 0006](decisions/0006-contract-and-sdk.md)).
Apps call it only through `@yeral/sdk`.

## Conventions

- Paths start with `/v1`; inside it changes are additive only (breaking changes ship as `/v2`). A business page,
  its free times and its reviews answer 404 `in_review` (not `not_found`) for a business still in review (book F-032);
  a client treats either 404 as "not here".
- Business-local dates `YYYY-MM-DD`, times of day in minutes from midnight (`870` = 14:30), instants in epoch ms,
  money in whole manats. Every business is in `Asia/Ashgabat` today.
- Text endpoints take `?lang=tk|ru|en` (default `tk`) and return resolved strings.
- Lists: `{ items, total?, cursor? }`; pass `cursor` back for the next page (`null` = last page).
- Errors: `{ error: { code, message?, details? } }` with the HTTP status from `ERROR_STATUS` (`@yeral/contract/errors`);
  apps show `errors.<code>` from `@yeral/i18n`. `409 slot_taken` carries `details.alternatives` (3 nearest times),
  `400 code_invalid` carries `details.attemptsLeft`, `429` codes carry `details.retryAfterSec`, and `429 rate_limited`
  also `details.retryAfterMin` (rounded up), which its message shows.
- Session: an httpOnly cookie on the parent domain (`@yeral/lib/site` names and scopes it); mutations check `Origin`.

## Client endpoints (M2)

| Area | Endpoint | Schemas (`@yeral/contract/…`) |
|---|---|---|
| Login | `GET /v1/auth/mode` · `POST /v1/auth/code` · `POST /v1/auth/verify` · `POST /v1/auth/logout` | `account`: `authMode` (the code on the screen: a demo), `sendCode`, `verifyCode` → `verifyCodeResponse` |
| Try the business app | `POST /v1/demo/session` | `demo`: `demoSession` (the demo workspace's owner for a day, in the demo's own cookie the business app reads first; a demo account reaches nothing else: `not_in_demo`, `demo_number`) |
| Me | `GET /v1/me` · `PATCH /v1/me` · `GET /v1/me/deletion` (what deleting touches) · `DELETE /v1/me` · `POST /v1/me/phone/code` · `POST /v1/me/phone/verify` | `account`: `me`, `updateMe`, `changePhone`, `deletionCounts` |
| Favourites | `GET /v1/me/favorites` · `PUT /v1/me/favorites/:slug` · `DELETE /v1/me/favorites/:slug` | `catalog`: `businessCard` |
| Categories | `GET /v1/categories` | `catalog`: `categoryList` |
| Cities | `GET /v1/cities?lat&lng` (the list, the market's main city, the one the position is in; book Q-107) | `catalog`: `citiesQuery` → `cityList` |
| Search | `GET /v1/search?city` (Home "Golaýyňyzda şu gün boş" too) · `GET /v1/search/suggest?city` | `catalog`: `searchQuery` → `searchResponse`, `suggest*` |
| Places | `GET /v1/places/suggest?city` | `catalog`: `placeList` |
| Business page | `GET /v1/businesses/:slug` · `GET /v1/businesses/:slug/reviews` | `catalog`: `businessDetail`, `reviewList` |
| Bookings | `POST /v1/bookings` · `GET /v1/me/bookings?tab=upcoming\|past` (its `total` is the tab's count whatever the page; each row carries its `review` as the detail does, null until reviewed) · `GET /v1/me/bookings/:code` · `GET /v1/me/how-was-it` · `POST /v1/me/bookings/:code/how-was-it/close` | `bookings`: `createBooking`, `myBookingList` (`MyBooking` rows), `bookingDetail`, `bookingReview`, `howWasIt` |
| Free times | `GET /v1/businesses/:slug/availability` (appointment; `?move={code}` in move mode: `services` and `staff` may be left out, the booking's own then; a booking a service of which is off the menu answers 409 `not_bookable`, as `…/reschedule` does) · `GET /v1/businesses/:slug/specialists/availability` (`move` the same way) · `GET /v1/businesses/:slug/tables` · `GET /v1/businesses/:slug/sessions` | `availability` |
| SMS link page | `GET /v1/links/:token` · `POST /v1/links/:token/code` · `POST /v1/links/:token/verify` (book Q-168, F-068) | `bookings`: `bookingLink`; `account`: `linkCode`, `linkVerify` |
| Booking actions | `POST /v1/me/bookings/:code/cancel` · `…/restore` · `PATCH …/note` · `POST …/reschedule` · `POST …/withdraw-move` · `POST …/accept-alternative` · `POST …/review` · `PATCH …/review` | `bookings` |
| Live updates | `GET /v1/events?after=` (a team member gets what their level sees) | `events` |

## Team endpoints (P2 step 2, ADR 0025)

| Area | Endpoint | Schemas (`@yeral/contract/…`) |
|---|---|---|
| Switcher | `GET /v1/me/workspaces` · `POST /v1/me/workspaces/:slug/open` | `team`: `workspaceList` |
| My invites | `GET /v1/me/invites` · `POST /v1/me/invites/:id/accept` · `POST /v1/me/invites/:id/decline` · `GET /v1/invites/:token` (the link, no sign-in) | `team`: `inviteList`, `inviteCard`, `workspace` |
| The team | `GET /v1/w/:slug/team` (owner, administrators) · `POST …/team/invites` · `POST …/team/phone-only` · `POST`/`DELETE …/team/:staffId/invite` · `PATCH …/team/:staffId` · `POST …/team/:staffId/remove` · `POST …/team/:staffId/reactivate` (owner) · `GET /v1/w/:slug/leave` (what leaving leaves for the owner) · `POST /v1/w/:slug/leave` | `team`: `team`, `teamMember`, `inviteInput`, `inviteSent`, `phoneOnlyInput`, `updateMember`; `common`: `bookingsAhead` (the leave confirm) |

Who may call: catalogue, search, places and free times are public (cacheable except free times); everything under
`/v1/me` and `POST /v1/bookings` needs a session. Login code requests are rate-limited per phone and IP.

## Business and CMS endpoints

The business workspace lives under `/v1/w/:slug/…` (P2 step 4): the team above, then settings, calendar, requests,
bookings, clients, services, hours and the profile, each checked against the fixed permission table (ADR 0025). The
CMS (`/v1/admin/...`, P2 step 5) follows. Their schemas join the contract as they're built.

| Area | Endpoint | Schemas (`@yeral/contract/…`) |
|---|---|---|
| Booking rules | `GET`/`PATCH /v1/w/:slug/settings/rules` (owner, administrators; book B-41, B-42) | `settings`: `bookingRules`, `bookingRulesUpdate` |
| Business profile | `GET`/`PATCH /v1/w/:slug/settings/profile` (owner, administrators; book B-37) · `PUT`/`DELETE /v1/w/:slug/settings/logo` (a photo form; the logo) · `/v1/w/:slug/settings/photos` (the gallery) | `settings`: `businessProfile`, `businessProfileUpdate`, `location`, `businessLogo`, `gallery` |
| Hours and special days | `GET`/`PUT /v1/w/:slug/settings/hours` (owner, administrators; book B-39, B-40; bookings left outside: 409 `bookings_affected`, then `affected: keep \| cancel`) | `settings`: `businessHoursSettings`, `businessHoursUpdate`, `businessHoursResult`; `errors`: `bookingsAffectedDetails` |
| Services menu | `GET`/`POST /v1/w/:slug/services` · `PATCH`/`DELETE …/services/:serviceId` · `POST …/services/:serviceId/restore` · `POST …/services/groups` · `PATCH`/`DELETE …/services/groups/:groupId` · `PUT …/services/order` (owner, administrators; book B-38) | `services`: `menu`, `menuGroup`, `menuService`, `serviceInput`, `serviceUpdate`, `groupInput`, `menuOrder` |
| Requests | `GET /v1/w/:slug/requests` · `POST …/requests/:code/confirm` · `POST …/requests/:code/decline` (who may answer: the "who answers" setting; book B-19–B-21) | `requests`: `request`, `requestList`, `declineInput` |
| Calendar | `GET /v1/w/:slug/free-times` · `POST /v1/w/:slug/bookings` · `POST …/bookings/:code/undo` · `POST …/bookings/:code/move` · `POST …/bookings/:code/cancel` (a specialist books, moves and cancels only their own; book B-23–B-27) | `calendar`: `freeTimes`, `newBooking`, `newBookingResult`, `moveBooking`, `businessCancel` |

A settings change writes `business.updated`, which everyone on the team hears.

## Notifications the api sends

Every business action reaches the client and every client action reaches the business, as an `events` row (open screens
refresh) and, for clients, an SMS from the design's templates (client spec §6): confirmed, declined with reason, expired
with 3 times, reminders 1 day and 2 h before, review ask 2 h after the end. No SMS when a request is sent.
