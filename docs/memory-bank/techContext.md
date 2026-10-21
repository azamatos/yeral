# Tech context

Versions checked on npm on 2026-10-13. Every dependency is pinned once in `pnpm-workspace.yaml` (`catalog:`) and
referenced as `"catalog:"` from packages, so all apps run the same versions. Status: *planned* until the milestones in
`progress.md` land; the live Next.js app uses a subset. The "why" for the big choices is in `docs/decisions`.

## Foundation

| Tool | Version | Why | Instead of |
|---|---|---|---|
| Node.js | 24 LTS | tooling, SSR and api in Docker; pinned in `.node-version` | 26 once it becomes LTS |
| pnpm | 12 | workspaces; strict `node_modules` (an undeclared import fails); catalogs pin one version per dependency | npm, yarn (no strictness), Bun (edge cases in tooling) |
| Turborepo + @turbo/gen | 2.11 | task graph (packages before apps), local and CI cache, `--affected`; generators for consistent scaffolding | Nx: more than we need, heavier config |
| TypeScript | 6.0 | strict; typescript-eslint supports `< 6.1` today | 7.0 (native, much faster) once typescript-eslint supports it |
| Vite | 8 | dev server and build for every frontend; Storybook, Vitest and TanStack Start all run on it, so one config world | webpack / Rspack |
| React | 19.3 + React Compiler 1.0 | compiler (via `@rolldown/plugin-babel`) memoises for us; rules-of-React lint | — |

## Frontend

| Library | Version | Why | Instead of |
|---|---|---|---|
| TanStack Start | 1.169 | SSR for the client site: explicit loaders and `head()`, SSR on/off per route, builds for Cloudflare or Node | Next.js (ADR 0002), React Router 7, Astro |
| TanStack Router | 1.170 | typed routes and zod-validated search params: filters, wizard and calendar live in the URL | React Router (weaker search-param typing) |
| TanStack Query + router SSR integration | 5.104 / 1.167 | server state: cache, de-dupe, refresh, invalidation, optimistic updates, SSR hydration | SWR (fewer features), RTK Query (needs Redux) |
| TanStack Form | 1.33 | typed forms with zod validators; compiler-friendly; `createFormHook` binds our field components | React Hook Form (ADR 0011) |
| Zustand | 5 | small client-only stores in a slice's `model/` (calendar, selection) | Redux, Jotai, MobX (ADR 0011) |
| zod | 4.6 | one schema language: API input/output, forms, search params, env | valibot, arktype (smaller ecosystem around forms/OpenAPI) |
| use-intl | 4.14 | ICU messages and typed keys for `tk`, `ru`, `en` (ADR 0016) | Paraglide, i18next, Lingui (ADR 0008) |
| Tailwind CSS | 4.3 | `docs/design/tokens.css` mapped one to one into `@theme` (same names); exact design values; no runtime CSS-in-JS | CSS Modules (the design's suggestion), vanilla-extract, Panda |
| Onest (`@fontsource-variable/onest`) | 5 | the design's font, self-hosted (latin, latin-ext, cyrillic, cyrillic-ext): Turkmen letters + Cyrillic, no Google Fonts request | Google Fonts link |
| class-variance-authority + tailwind-merge + clsx | 0.7 / 3.7 / 2.1 | component variants; `cn()` merges classes so a passed `className` wins | tailwind-variants (fine too; cva matches shadcn output) |
| Radix UI (`radix-ui`) | 1.8 | accessible primitives: dialog, popover, menu, select, tabs, tooltip | Base UI (newer), React Aria (heavier API) |
| (shadcn CLI) | — | not used in M1: components are written directly on Radix from DS-Components; the CLI stays an option for complex primitives | ready-made kits (MUI, Mantine) that fight the design |
| lucide-react | 1.56 | icons, stroke 1.75 (design system) | — |
| sonner | 2 | toasts | our hand-rolled toast |
| TanStack Table / Virtual | 9 / 3 | data tables and long lists in business and cms | AG Grid (heavy) |
| react-day-picker | 10 | date pickers in business and cms | — |
| dnd-kit (`@dnd-kit/core`) | 6.3 | calendar drag and drop; re-check `@dnd-kit/react` (0.x) at the business milestone | pragmatic-drag-and-drop |
| Recharts | 3 | analytics charts | visx (lower level), ECharts (heavy) |
| MapLibre GL | 6 | maps, restyled to the design; OpenFreeMap tiles now (owner's decision 2026-10-14), self-hosted tiles on the own server | Google, Yandex (keys, billing, third-party scripts) |

## Backend

| Tool | Version | Why | Instead of |
|---|---|---|---|
| Hono + @hono/node-server | 4.13 / 2.1 | one web-standard `fetch` handler, served by Node in Docker (ADR 0024); typed RPC client | Fastify/Express (Node only), NestJS (heavy) |
| @hono/zod-openapi + @scalar/hono-api-reference | 1.6 / 0.12 | routes declared with zod → validation + OpenAPI 3.1 + docs page | hand-written OpenAPI |
| PostgreSQL | 18 | relational data, exclusion constraints against double booking, full-text search; in Docker beside the api on the own server (ADR 0024) | D1/SQLite (ADR 0005), Neon (dropped 2026-10-19) |
| Drizzle ORM / drizzle-kit | 0.45 / 0.31 | TypeScript schema, SQL-like queries, SQL migrations in git | Prisma 7, Kysely |
| node-postgres (`pg`) | 8 | driver for Drizzle; one pool per process | postgres.js |
| Own phone login + sessions | — | 4-digit SMS code with the design's attempts/lock/resend rules, hashed session tokens in Postgres, cookie on the parent domain; teams, roles and invitations are our own tables too (ADR 0018, 0019) | Better Auth (phone plugin rules and e-mail-based users don't fit; its organization plugin: phone-only staff, SMS invites) |
| tsx / esbuild | 4.23 / 0.28 | run the api and its scripts from TypeScript in dev; bundle the Node entry into one file for Docker | ts-node; tsup (one more layer over esbuild) |
| jobs table + `runDueJobs()` | — | reminders and expiry without a queue service; Cron Trigger now, a container loop later | pg-boss (needs a long-running process) |
| pino | 10 | structured logs on Node | — |

## Quality and tests

| Tool | Version | Role |
|---|---|---|
| ESLint | 10 | flat config in `@yeral/config`: typescript-eslint 8 (type-aware), react-hooks 7 (incl. compiler rules), TanStack Query/Router plugins |
| Steiger + @feature-sliced/steiger-plugin | 0.7 / 0.8 | FSD rules per app (`pnpm lint:fsd`) |
| Prettier + prettier-plugin-tailwindcss | 3.9 / 0.8 | formatting and class order (Biome is faster but lacks the compiler/TanStack lint rules) |
| Vitest | 5 | unit tests; browser mode (`@vitest/browser-playwright`) for component tests and screenshots |
| Storybook + addon-vitest, addon-a11y | 10.6 | design-system docs; stories run as tests (interactions, a11y, screenshots) |
| MSW + msw-storybook-addon | 3.0 | contract-shaped API mocks in stories and component tests |
| Playwright | 1.64 | end-to-end flows across apps (several origins in one test) |
| lefthook | 2 | git hooks: format + lint staged files, commit message check |
| commitlint | 21 | Conventional Commits |
| Renovate | — | grouped dependency PRs |

## Infrastructure

| Tool | Why |
|---|---|
| The own server (netcup VPS 1000, EU) | runs the api, its jobs, Postgres and later the apps in Docker (ADR 0024; `infra/server`) |
| Docker + Compose | the server's stacks and the local production-like stack: one image per deployable (`turbo prune --docker`, multi-stage) |
| Caddy 2 | the front door on the server (shared by the owner's projects) and locally: HTTPS certificates by itself, reverse proxy, compression |
| Cloudflare: DNS, Workers + wrangler 4, R2 | DNS (not proxied); Storybook and the legacy site as Workers; R2 for backups |
| GitHub Actions | CI/CD; deploys to the server over SSH from P2 step 7 |
| Sentry or similar (free tier) | error tracking and alerts, decided with P2 step 7 |
| Cloudflare Web Analytics | privacy-friendly page analytics now; Umami on the own server later |

## Where shared things live

| Need | Use | From |
|---|---|---|
| class names | `cn()` (tailwind-merge that knows the design's scales) | `@yeral/ui/cn` |
| design-system components | `import { Button } from '@yeral/ui/button'` (subpath per component folder) | `@yeral/ui/*` |
| an inline text link, or a button that reads as one («Change number», «Start free») | `textLink` (classes; size and layout from the caller) | `@yeral/ui/text-link` |
| a form's unsaved changes: «Save your changes?» Discard · Save, sticky at the bottom | `SaveBar` (shown only while the form is dirty; `form` to submit a form; a toast after) | `@yeral/ui/save-bar` |
| logo, brand images | `Logo`, `brand` | `@yeral/ui/brand` |
| app-wide providers | `UIProvider` (Lucide stroke 1.75, tooltip delay), `Toaster` | `@yeral/ui/provider`, `@yeral/ui/toast` |
| the market's settings: languages, currency, phone rules, time zone, Ýeral's support line (ADR 0023) | `MARKET` (one per deployment); what a mobile number starts with, the one source for the check and the screens' «starting with 6 or 7»: `MARKET.phone.mobilePrefixes` (`phoneRules()` builds `mobile` from it); the support line (Contact Ýeral, the examples' phone): `MARKET.support`, written and linked by `SUPPORT_LINE` and `supportLinks()` in `@yeral/features/contact-yeral`, opened with `LinkMenu` (`@yeral/ui`) | `@yeral/domain/market` |
| business today / now, date maths | `today() nowMin() localOf() epochOf() addDays() diffDays() dow() parseYmd() hm() parseHm()` (pass `now` for a fixed clock) | `@yeral/domain/time` |
| enums shared with the contract and the database, `Localized` text | `BOOKING_STATUSES BOOKING_SOURCES CONFIRM_MODES …`, `localized()` (asked language → market's main → any written), `isOnlineSource() isTeamSource()`, a reason's words `reasonWords()`, `isBusinessSideCancel()` | `@yeral/domain/model` |
| `Localized` jsonb in SQL | `textIn(col, lang)` (same fallback), `anyTextLike(col, …patterns)` (search in every language) | `apps/api/src/db/localized.ts` |
| booking rules: defaults, option lists, validation | `DEFAULT_RULES RULE_OPTIONS rulesErrors()` | `@yeral/domain/rules` |
| opening hours, special days, staff shifts and breaks (a day may run past midnight to `MAX_DAY_END`) | `businessDay() staffDay() workingIntervals() staffOffReason() openState() openStretches() weekHoursErrors()` | `@yeral/domain/hours` |
| busy time across midnight | `busyOn(busy, date)` | `@yeral/domain/availability` |
| free times: appointment, table, class | `appointmentSlots() findAppointmentSlot() nearestSlots() nextFreeSlot() planRefusal() shiftPlan() busyOf() tableSlots() assignTable() maxSeats()`; one named specialist: `oneSpecialist`/`preferStaffId` on the query, `slotStaffId()` | `@yeral/domain/availability` |
| a business, its busy time and hours from the database (api); the hours held against a save | `loadBusiness() loadBusinesses() loadBusy() appointmentContext()`, `loadHours(db, id, { lock })` `lockedHours()` `assertOpenAt()` `assertStaffFree()`; busy elsewhere alone: `loadElsewhere()` | `apps/api/src/modules/availability/context.ts` |
| a booking as the team reads it (api): its items and price | `teamItemOf() teamPriceOf()` | `apps/api/src/modules/bookings/team-view.ts` |
| offered times as the client sees them: specialist, free / taken / past; where taking one books (api) | `offeredTimes() offerTarget()` | `apps/api/src/modules/bookings/offers.ts` |
| SMS links to a booking: make one per SMS, read the booking by its token (api) | `newBookingLink() bookingOfLink() LINK_DAYS` | `apps/api/src/modules/bookings/links.ts` |
| sign a phone in after its code (the plain login and the link page's) (api) | `signIn(c, phone, lang)` | `apps/api/src/modules/auth/sign-in.ts` |
| the booking engine both sides share (api): items and price, the transaction that turns a lost time into 409 with the nearest ones, a booking's services, who a re-booked time goes to, the client's waiting move, the business's decline and cancel | `appointmentPrice() itemRows() inTransaction() bookedServices() bookedServicesOf() rebookQuery() dropPendingMove() declineForBusiness() cancelForBusiness() clientUnaware()` | `apps/api/src/modules/bookings/engine.ts` |
| why a phone can't book online (api) | `onlineRefusal()` (`clients/online.ts`), `assertOnlineBooking() assertWaitingRoom()` | `apps/api/src/modules/bookings/create.ts` |
| a booking's status change, lock, lifecycle view (api) | `setStatus()` (with a decline, offered times or other `fields` in the same write) `lockBooking() stateOf() guard() StaleBooking` | `apps/api/src/modules/bookings/repo.ts` |
| what a confirm counts: a visit ahead or a waiting request (book B-15, Q-172) | `aheadAs()` (`@yeral/domain/lifecycle`); over rows, a move counted once: `countAhead()` (`apps/api/src/modules/bookings/repo.ts`); the answers' shapes `bookingsAheadSchema` (`@yeral/contract/common`), `deletionCountsSchema` (`@yeral/contract/account`) | as listed |
| statuses, hold time, who may do what with a booking, when its SMS may go | `initialStatus() holdUntil() reminderPlan() offerPast() effectiveStatus() dueTransition() cancelDeadline() clientActions() canAnswerRequest() canComplain() canRemoveComplaint() statusWithoutNoShow() firstSmsFrom() …` | `@yeral/domain/lifecycle` |
| the calendar (book B-16, B-17): a day or a week as a reader sees it (api) | `calendarView()` (`apps/api/src/modules/calendar/view.ts`); the day's line `daySummary() businessTotal()` (`@yeral/domain/pricing`) | api |
| a team booking the actor may change (api): found, items, 404 or 403 by the permission it needs | `teamBooking(db, business, actor, code, { lock, permission })` | `apps/api/src/modules/calendar/repo.ts` |
| the team's bookings list and its CSV (api): tabs, search, filters | `bookingList() exportBookings()`, `EXPORT_MAX` | `apps/api/src/modules/calendar/list.ts` |
| a request run out before the jobs settle it, in SQL; the span's minute scale | `ranOutAt(now)` (beside `awaitingAnswer`), `spanMinuteAt(now)` | `apps/api/src/modules/bookings/repo.ts` |
| a phone's digits in a search (api) | `phoneLike(column, q)` (beside `likeOf`) | `apps/api/src/modules/catalog/search.ts` |
| rows grouped by a key, in their order | `groupBy()` | `apps/api/src/lib/group.ts` |
| reviews as the team keeps them (api): list, reply, report, the 48-hour recount; whether one counts in the rating | `teamReviews() replyToReview() deleteReply() reportReview() recountReviews()` (`modules/reviews/team.ts`); `isCounted() shiftRating() shiftReviews()` (`modules/reviews/rating.ts`); `visitsOf() replyOf()` (`modules/reviews/view.ts`, the page and the team) | `apps/api/src/modules/reviews/` |
| setting a business up: the steps, a page address from a name | `SETUP_STEPS SETUP_NEEDS slugFrom() cutAtWord()` (`@yeral/domain/setup`); `startSetup() mySetup() saveStep() finishSetup()` | `apps/api/src/modules/setup/service.ts` |
| a workspace in the switcher, and a route that takes a draft | `inSwitcher` `hasWorkspace()` (`modules/team/members.ts`); `requireMember(c, slug, { draft: true })` (`modules/team/service.ts`) | `apps/api/src/modules/team/` |
| photos people upload: the store, a photo's kind, keeping and dropping one | `StoragePort diskStorage() memoryStorage() typeOfKey()` (`ports/storage.ts`); `photoKind() cleanPhoto() PHOTO_MAX_BYTES GALLERY_MAX` (`@yeral/domain/photos`); `savePhoto() replacePhoto() dropPhoto() dropPhotos() photoIdOf() uploadGuard` (`modules/media/photos.ts`); `teamPhotos()` (`modules/team/service.ts`); `photoUploadSchema` (`@yeral/contract/common`) | `apps/api/src/` |
| what visitors may see: verified, not hidden (book Q-012), not closed (Q-213), not the demo workspace (F-242) | `isPublic()` (SQL) `publicRow()` (`modules/catalog/map.ts`) | `apps/api/src/` |
| a page's state for its team's banner (live, in review, not approved, hidden, demo) and the reason | `pageStateOf()` | `apps/api/src/modules/catalog/map.ts` |
| the account a number the team types in joins (none in the demo workspace, F-242; none unused for 6 months, Q-270) | `accountFor(db, business, phone, now)` (`modules/auth/sign-in.ts`) | `apps/api/src/` |
| the business app's demo workspace (F-242): made and remade by the jobs; its seed | `keepSandbox()` `lastRemakeAt()` (`modules/demo/sandbox.ts`); `seedSandbox()` `demoPhones()` `SANDBOX_SLUG` (`db/seed`) | `apps/api/src/` |
| when a Ýeral SMS to a business may go (not at night, Q-279) | `businessSmsAt()` | `@yeral/domain/lifecycle` |
| reviews that show and count: none Ýeral removed | `notRemoved()` (SQL), `isCounted()` (`modules/reviews/rating.ts`) | `apps/api/src/` |
| reviews waiting for a reply per business ("Jogapsyz"): the reviews page's and the switcher's | `unansweredCounts()` | `apps/api/src/modules/reviews/team.ts` |
| the Ýeral team's sign-in pieces (ADR 0026) | `hashPassword() checkPassword() sameBytes()` (`lib/password.ts`); `totpAt() matchTotp() otpauthUri() base32()` (`lib/totp.ts`); `adminKeys() keyedHash() sealingKey() seal() unseal()` (`lib/sealed.ts`); `under()` (a limit's count without a try, `lib/rate-limit.ts`); `requireAdmin()` (`modules/admin/session.ts`); `recordAction()` (`modules/admin/accounts.ts`) | `apps/api/src/` |
| complaints (book B-28, api) | `fileComplaint() removeComplaint()` | `apps/api/src/modules/calendar/complaints.ts` |
| internal statuses (book B-29): the presets, the limits, the lists (api) | `MAX_INTERNAL_STATUSES INTERNAL_STATUS_PRESETS INTERNAL_STATUS_ICONS INTERNAL_STATUS_COLORS` (`@yeral/domain/model`); `statusesOf() addStatus() updateStatus() deleteStatus() setInternalStatus()` (`apps/api/src/modules/settings/statuses.ts`) | `@yeral/domain/model`, api |
| blocked time (book B-18): the dates a weekly one falls on; add, take away, list (api) | `blockDates() BLOCK_REPEAT_DAYS` (`@yeral/domain/hours`); `addBlock() removeBlock() blocksFor()` (`apps/api/src/modules/calendar/blocks.ts`); busy time: `loadBusy()` gives blocks as `blocked` | `@yeral/domain/hours`, api |
| a business that moves (book Q-215): what counts, what a client reads, who hears it, when | `addressOf() sameAddress() showsExactAddress() addressAsShown() sameAddressShown() hearsOfMove() addressSmsAt() newAddressSince()`; queued by `queueAddressSms() retimeAddressSms() addressSmsForNewBooking()` (`apps/api/src/modules/bookings/address-sms.ts`) | `@yeral/domain/lifecycle` |
| access levels and the permission table | `LEVELS PERMISSION_TABLE scopeOf() can() canOn() canManageTeam() canAnswerRequest()` | `@yeral/domain/permissions` |
| invites | `INVITE_DAYS inviteState() inviteExpiresAt()` | `@yeral/domain/team` |
| who is on which team (api) | `signsIn` condition, `teamsOf() workspaceIdsOf() hasSignedInTeam()` | `apps/api/src/modules/team/members.ts` |
| a workspace route's member and actor (api) | `requireMember(c, slug)` (404 when not on the team), `teamRow() issueInvite() members()` | `apps/api/src/modules/team/service.ts` |
| client stats, segments, online block | `clientStats() clientSegments() segmentsOf() isOnlineBlocked() reachesNoShowLimit()` | `@yeral/domain/clients` |
| a business's clients from their bookings (api): visits, totals, the next booking, in one query | `clientFacts()` (chips, order and pages in SQL; `scope: 'business'` for every booking) `avgCheckOf() phoneOnlyOf() alertNotesOf()`; SQL `doneAt() aheadAt() withStaff()`, `ownOnly(actor)` | `apps/api/src/modules/clients/facts.ts` |
| keeping clients (api): add, edit and switches, notes, delete | `addClient() updateClient() addNote() deleteClient()`; limits `CLIENT_TAGS_MAX CLIENT_TAG_MAX TEAM_NOTE_MAX` (`@yeral/domain/clients`) | `apps/api/src/modules/clients/write.ts` |
| the phone-only block and the no-show count (api) | `isPhoneBlocked() setOnlineBlocked() noShowsSinceReset()`; when a no-show was marked: `noShowMarkedAt` (`bookings/repo.ts`) | `apps/api/src/modules/clients/online.ts` |
| price totals, calendar day summary | `priceTotal() daySummary()` | `@yeral/domain/pricing` |
| distances, radius box, the city a position is in | `distanceM() boundingBox() popularity() nearestCity()`; the market's main city: `MARKET.mainCity` | `@yeral/domain/geo` |
| the market's cities, a business's city in the reader's language (api) | `loadCities() cityRefOf()` | `apps/api/src/modules/catalog/cities.ts` |
| a person's name: first name and optional surname (book Q-156) | `splitName() fullName() reviewName() PersonName`; an account's: `nameOf(user)` (`apps/api/src/modules/me/me.ts`) | `@yeral/domain/names` |
| phones by the market's rules (`+993`) | `isPhone() isMobile() isUnusedNumber() toE164() formatPhone() formatNational() maskPhone() E164 COUNTRY_PREFIX` (the unused range, `MARKET.phone.unusedPrefix`, is no mobile: the demo's numbers); a person's language: `marketLocaleSchema`, texts per language: `localizedSchema(max)` (`@yeral/contract/common`) | `@yeral/domain/phone` |
| ids, booking codes | `newId() bookingCode()` | `@yeral/domain/id` |
| money, prices, durations, distances, dates on screen | `useFmt()` in components, `createFmt(locale)` elsewhere (`money price rating duration distance time timeRange dayMonth shortDate weekdayDate monthYear relativeDay addressIn phone`) | `@yeral/i18n` |
| locales, shared messages (`common`, `status`, `fmt`, `sms`) | `LOCALES` (translated) `MARKET_LOCALES` (offered) `DEFAULT_LOCALE` (market's main) `isLocale() messages` | `@yeral/i18n` |
| site URLs, cookie domain and prefix, allowed origins, demo flag | `siteConfig({ env, domain, portBase })`, `siteFromEnv(env, 'VITE_')` | `@yeral/lib/site` |
| add to calendar *(M3)* | `buildIcs() downloadIcs()` | `@yeral/lib/ics` |
| directions, call *(M3)* | `directionsUrl() telHref()` | `@yeral/lib/links` |
| local/session storage that never throws *(M3)* | `safeStorage` | `@yeral/lib/storage` |
| env vars | `parseEnv(schema, source)` (names bad variables, never values) → `shared/config/env.ts` per app, `config.ts` in the api | `@yeral/lib/env` |
| api: rate limits, the caller's IP (only from `TRUSTED_IP_HEADER`), hashes and random digits | `hit() clientIp()`, `sha256Hex() randomDigits()` | `apps/api/src/lib/{rate-limit,crypto}.ts` |
| api: a value a rule refuses (400 `validation_error` with `issues`), the error class | `invalid(...issues)`, `Issue`, `ApiError` | `apps/api/src/http/errors.ts` |
| api: independent queries that may run in a transaction (one after another there; pg 9 refuses overlapping ones) | `all(db, [() => …, () => …])` | `apps/api/src/db/client.ts` |
| a yes or no in a query string | `boolQuery` | `@yeral/contract/common` |
| request/response schemas, error codes and their HTTP status | `createBookingSchema`, `businessDetailSchema`, `ERROR_STATUS` … | `@yeral/contract/{common,errors,catalog,availability,bookings,account,events}` |
| API data | `createApi({ baseUrl: site.urls.api })` (`@yeral/sdk`: the client, the query cache with its retry rule `shouldRetry`, and the sdk) once per app, or once per request when a server renders; `SdkProvider` above the screens and `useSdk()` in them (`@yeral/sdk/react`), the same `Api` as the router context; then `useQuery(sdk.catalog.business(slug, lang))`, `useMutation(sdk.bookings.cancel(lang))`; `startEvents(client, queryClient)` for live updates; errors are `ApiError` (`isApiError(e, 'slot_taken')`); whose each query is (`audienceOf()` in `keys.ts`: anyone · viewer · person) decides what signing in, out, as another person, a 401 anywhere (the session ended) and leaving a workspace do to it: the sdk does it by itself | `@yeral/sdk` |
| forms | `useAppForm()` with `TextField`, `PhoneField`, `SelectField` … | `@yeral/ui/form` |
| the client site's plumbing: a page's head (title, description, canonical, hreflang), the page width, the site's languages and `/`'s choice (Q-132), the words outside React, a failed request's words, the header and footer, the account aside, logging out, the login (a modal any trigger can open; where it goes back to), a screen in a story (with a `fetch` that answers like the api) | `pageHead(locale, { path, title, description, noindex })` (`shared/lib`), `wrap` (`shared/ui`), `SITE_LOCALES isSiteLocale() siteLocale() pickLocale() acceptedLanguages() translatorFor() I18nProvider useErrorText()` (`shared/i18n`), `apiUrl()` (`shared/config`: `API_INTERNAL_URL` on the server), `SiteLayout` (`widgets/site-layout`), `AccountLayout` (`widgets/account-layout`: Home once nobody is signed in), `useLogOut()` (`features/log-out`), the code step `CodeStep` and the person's mark `PersonMark` (`shared/ui`), `LoginModal` (`features/log-in`), `returnTo()` (`pages/login`), `PageStory authApi() fakeFetch() person() AYJEMAL` (`shared/storybook`) | `apps/client/src` |
| logging in with a phone and a code (every app's sign-in: book C-18, C-19, B-07; Q-157): the steps' state and waits, the requests behind them, the market's phone rules for the step | `signInReducer() signInView()`, `useSignIn({ onVerified, onFailed })`, the same steps over any pair of requests (the phone change) `useCodeSteps({ sendCode, verify, onVerified, onFailed, done })`, a request's `lang` from the screen's language `useRequestLanguage()`, `PHONE_RULES phoneProblem()`; each app draws the steps (`SignInCodeStep`) in its own frame and words | `@yeral/features/auth-by-phone` |
| the business app's plumbing: the language, a failed request's words, tab titles, the sign-in page's frame, a screen in a story (with a `fetch` that answers like the api) | `shared/api` (passes on `createApi` and the sdk context), `appLocale()` `I18nProvider` `useErrorText()` (`shared/i18n`), `usePageTitle()` (`shared/lib`), `AuthPage` (`shared/ui`), `PageStory` (`shared/storybook`); move them to a package when the client or cms app needs them | `apps/business/src/shared` |

Before writing a helper, look here and in the package; add new shared helpers to the right package and to this table.

## Code conventions

- TypeScript `strict` + `noUncheckedIndexedAccess`; no `any`; `unknown` + zod at every boundary (API, URL, storage, env).
- Files kebab-case (`booking-card.tsx`); components PascalCase; hooks `useX`; zod schemas `xSchema` with `type X = z.infer<…>`.
- Named exports only (route files export `Route`, as TanStack expects).
- Prettier: no semicolons, single quotes, `printWidth` 140, trailing commas.
- Comments explain a non-obvious *why*; product rules name their source (design spec section, ADR).
- No user-visible string in code, `aria-label` included: everything through i18n.
- Mobile first: works at 360 px wide, touch targets ≥ 40 px, keyboard and screen reader friendly.
- Imports: packages by name and subpath (`@yeral/ui/button`); inside an app via `@/` = `src/`.
- Tests sit next to the code (`rules.test.ts`, `button.stories.tsx`).

## Local development

```bash
pnpm install
pnpm db:up && pnpm db:setup     # Postgres 18 in Docker; creates the database from apps/api/.env.local, migrates, seeds the demo if empty
pnpm db:seed                    # starts the demo over on today's date (wipes the database; operations.md)
pnpm dev                        # api + all apps + Storybook through turbo
pnpm dev --filter=@yeral/client...  # one app and what it depends on
pnpm gen package                # scaffold an internal package
pnpm gen ui-component           # scaffold a design-system component + stories; slice (M3), endpoint (M2) follow
pnpm check                      # lint, FSD lint, types, tests, format — same as CI
pnpm test:stories               # every Storybook story as a Chromium test (render, play, axe)
pnpm dev --filter=@yeral/storybook   # Storybook on :3005 (PORT_BASE + 5)
pnpm dev --filter=@yeral/business --filter=@yeral/api   # the business app on :3002 (PORT_BASE + 2) with the api on :3004
pnpm dev --filter=@yeral/client --filter=@yeral/api     # the client site on :3001 (PORT_BASE + 1, beside legacy's +0) with the api
pnpm --filter @yeral/client build && pnpm --filter @yeral/client start   # the built site on Node (PORT, default 3000)
pnpm e2e                        # (M3) Playwright against the local stack
pnpm docker:up                  # production-like stack (Caddy + images) on *.yeral.localhost
```

| client | business | cms | api | storybook | — |
|---|---|---|---|---|---|
| :3000 (:3001 while legacy lives) | :3002 | :3003 | :3004 (`/docs`) | :3005 | |

Storybook dev generates Tailwind classes as stories load; if a new component looks unstyled, reload. If the port is
busy, an old server is still running: `pkill -f "storybook/dist/bin/dispatcher"`. The static build (`pnpm build`) is
what CI tests and deploys.

Ports are `PORT_BASE` + offset (`PORT_BASE=3100` in a second worktree). Cookies on `localhost` are shared across ports,
so one login works in every app locally.

**Today**: `pnpm dev` runs `apps/legacy` on :3000. `apps/client` takes :3000 when it replaces legacy (end of M3); until
then it runs on :3001 next to legacy.
`pnpm --filter @yeral/legacy run deploy` builds with OpenNext and publishes to Cloudflare by hand (or Actions → Deploy from `main`; releases are paused, ADR 0009).
