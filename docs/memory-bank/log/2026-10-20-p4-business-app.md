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
- Follow-ups: the main bundle is ~178 kB gzip (zod comes in with `@yeral/lib/site`; routes split automatically as they
  arrive); the business app's typecheck takes ~50 s because the sdk's types reach into the api's routes.
