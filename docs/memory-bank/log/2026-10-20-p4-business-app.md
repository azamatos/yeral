# The business app, P4 slice 1 (feat/business-app)

- Changed: book chapter 10, P4 slice 1 (Accounts) starts; ADR 0021 as amended 20.10.2026 (components and apps from the
  book and the drawn design).
- PR 1, the app (`apps/business`):
  - Vite 8 + React 19 with the React Compiler (`@vitejs/plugin-react` 6 + `@rolldown/plugin-babel`), TanStack Router
    file routes (`src/app/routes`, the tree in `src/app/routeTree.gen.ts`, committed, left out of Prettier), TanStack
    Query through `@yeral/sdk` (`shared/api`: `createApi()`, `SdkProvider`/`useSdk()`, also the router context; a
    refusal (4xx) is never retried), Tailwind with `@yeral/ui/styles.css`, use-intl through `@yeral/i18n` with
    `messages/en.json` (`shared/i18n`: `appLocale()`, `messagesFor()`, typed keys via `AppConfig`).
  - FSD layers app · pages · widgets · features · entities · shared; `app/entrypoint` holds `main.tsx`, the providers
    and the router (Steiger refuses a `providers` segment). `/` is a placeholder; `notFoundComponent` and
    `errorComponent` on the root route (the empty-state pattern; not drawn).
  - Dev port `PORT_BASE + 2` in the scripts like Storybook's; hosts from `siteFromEnv(import.meta.env, 'VITE_')` with
    `envPrefix: ['VITE_', 'PORT_BASE']`. Title per page (`useDocumentTitle`, "A · B"), the brand icon from
    `@yeral/ui/brand`, `noindex` in the page, `robots.txt` and the static server.
  - Docker: `infra/docker/business.Dockerfile` (turbo prune → vite build with `YERAL_ENV`/`YERAL_DOMAIN` build args
    → `caddy:2-alpine` with `static.Caddyfile`: SPA fallback, hashed assets cached a year, `X-Robots-Tag`);
    `compose.yml` + `Caddyfile` serve it at http://business.yeral.localhost; CI's Docker job asks it for
    `/version.json` and `/login`. Not on the server yet (P2 step 7).
  - Steiger runs for the first time: catalog `steiger` 0.7 (0.8 is younger than pnpm's 1-day minimum) and
    `@feature-sliced/steiger-plugin` 0.8; preset `@yeral/config/steiger` (recommended rules, generated files, tests and
    stories left out). Checked: an upward import and a cross-slice import both fail.
  - Catalog additions: `@tanstack/react-router`, `@tanstack/router-plugin`, `@vitejs/plugin-react`,
    `@rolldown/plugin-babel`, `@babel/core` 7, `babel-plugin-react-compiler`, `steiger`,
    `@feature-sliced/steiger-plugin`.
- PR 1's review (15 findings; 11 fixed): a missing `/assets/*` file is a 404 and only an existing one is cached a
  year (`static.Caddyfile` `handle` blocks); the root error page lets failed queries go
  (`useQueryErrorResetBoundary`) and Try again is `router.invalidate()`; `robots.txt` allows crawling so the noindex
  is read; `PORT_BASE` joins the build hash (`turbo.json` build `env`); no domain default in the image (empty = the
  one `@yeral/lib/site` defaults to); the screens have stories (Storybook loads `apps/business/src/**/*.stories.tsx`
  and resolves `@/` per app; `PageStory` in `shared/storybook`); `Toaster` takes a translated `label`;
  `usePageTitle()` adds the app's name; no manual `useMemo`; slimmer public APIs; the helpers in techContext. Not
  taken: Node types out of the app's tsconfig (they come in anyway through the sdk's type import of the api);
  shipping only one language's shared messages (`@yeral/i18n` imports all three; a package change); one key-flattener
  for tests; `createApi`/`useSdk` in `@yeral/sdk` (another session owns it; move it with the second app).
- Follow-ups: the main bundle is ~178 kB gzip (zod comes in with `@yeral/lib/site`; routes split automatically as they
  arrive); the business app's typecheck takes ~50 s because the sdk's types reach into the api's routes.
- PR 2, the sign-in (`/login`, B-Login; book B-07–B-09):
  - `@yeral/ui` `AuthCard` (Display/AuthCard): header, centred card (max 440, pad 32, r16), `media`, `eyebrow`,
    `title` (26/32, 24/30 on phones, focused on `focusKey` changes), `lead`, children, `footer`; frameless on phones.
  - `pages/login`: `model/sign-in.ts` (a reducer of the phone and code steps: the tries left, the lock and the code
    dead after it, the resend timer, 5 codes an hour per number, `resend_too_soon` back to the code step; the waits in
    seconds and minutes from the api's `retryAfterSec`), `use-sign-in.ts` (`auth.sendCode`/`verify`, one ticker),
    `entry.ts` (a waiting invite, oldest first → the last used workspace → an expired invite when there's no
    workspace → no workspace). Steps: phone and code (SignInCodeStep, boxes 56, the code callout from the typed
    `code` of #98), "Is this you?" (Q-270; not drawn: the invite card's pattern), the name (`me.update`), the invite
    (Accept → that workspace opens; Decline asks in place), expired, no workspace, opening (1.5 s, then
    `/w/{slug}/calendar`; `team.open` when it wasn't the last used). The entry step owns the invite answers, since the
    card goes as soon as the invites reload.
  - Routes: `/` → `/login`; `/login`; `/w/$slug` (signed in, else `/login`) with a stand-in calendar (name, level,
    Log out); `/setup/$step` stand-in. «Log in with another number» signs out and drops the cache but `me`.
  - Tests: unit (the reducer, the entry, the phone checks), stories `Business/Pages/Login` (12, over a contract-shaped
    fake api: phone checks, member with a wrong code, no code on screen, new person, invite declined and accepted,
    expired, the lock and a new code, too many codes, "Is this you?", offline), `Display/AuthCard` (10); checked end
    to end against the local api (`SIGN_IN_CODE_ON_SCREEN=true`): owner → Glow Studio, new person → name → no
    workspace, landline refused.
  - Missing pieces (not built in the api): where an unfinished setup stopped (Q-200, ContinueSetupCard), the photo
    upload for the name step (P2 step 4), the demo workspace behind "Try the business app" (P2 step 6), the legal
    pages the "By tapping Send code…" line links to (P4 slice 7). `auth.verify` in the sdk doesn't refresh
    `workspaces`/`invites` and `auth.logout` leaves them cached; the page drops everything but `me` on sign-out.
