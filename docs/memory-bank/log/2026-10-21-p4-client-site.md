# The client site, P4 slice 1 (feat/p4-client-site)

- Changed: `apps/client` starts (book chapter 10, P4 slice 1 "Accounts"; ADR 0002, 0015, 0021 as amended 20.10.2026,
  0022, 0024). yeral.app still serves `apps/legacy`; nothing deploys the client yet.
- The app: TanStack Start 1.169 (`@tanstack/react-start`, `@tanstack/react-router-ssr-query` join the catalog) on
  Vite 8 + React 19 with the React Compiler, Tailwind on `@yeral/ui`, use-intl with `messages/en.json`, FSD layers
  (Steiger). `app/entrypoint/router.tsx` exports `getRouter()`: a router, `createApi()` and a query cache per request
  on the server, once in the browser, with the SSR query integration (what loaders fetched is dehydrated into the
  page). `site-api.ts` passes the visitor's cookie on when the server renders, so the root loader's `me` makes the
  header right from the first byte; `apiUrl()` uses `API_INTERNAL_URL` on the server when set.
- Addresses: `/` → 307 to `/{lang}` (Q-132: the signed-in person's language, else `Accept-Language`, else the market's
  main one; `pickLocale()`, unit-tested with a three-language market); `/$lang` checks the language
  (`SITE_LOCALES` = the market's languages with messages); `/$lang/_site` is the pathless layout with the header and
  footer; `/en` Home (a stand-in until slice 5); `/en/login` (`ssr: false`, noindex) opens Home until the login modal
  (next PR); every unknown address is the root 404 page (`notFoundMode: 'root'`, HTTP 404, its title and noindex
  rendered by React into the head). `pageHead()` gives title («Page · Ýeral», Home the brand alone), description,
  canonical, hreflang (+ x-default = the main language), OG.
- Chrome from the boards: the marketing header (Home: logo 30, For business, the language switcher, Log in S; 56 high
  with a 24 logo under 768, For business hidden; Mobile frame 1's search and menu icons wait for slice 5) and the
  avatar menu (Auth «Logged-in header»: avatar 32 + chevron pill, popover 260 with avatar 40, name, phone, Log out; a
  bottom sheet under 768). The footer (Home): logo + «Online booking for any service.», the For business column, the
  copyright; columns sit five across like the board's.
- Decisions ("how", for the book's chapter 9):
  - The search header (query bar) waits for Search (slice 5); every page uses the marketing header until then.
  - Only links to pages that exist: the avatar menu has Log out now (Profile joins in PR 3, My bookings and
    Favourites with their slices); the footer drops Search, Categories, My bookings, About, Help, Contact, the legal
    pages (slice 7) and Pricing (Ýeral is free); the 404's Search button joins with Search.
  - After Log out the page stays and the routes reload (a page that needs a sign-in sends the visitor on).
  - The login's own address renders Home with the modal over it (client spec §3: the address is the fallback).
  - The avatar shows the first name's initial (the boards' «A»), a person icon before a name exists.
  - The footer tagline in English: «Online booking for any service.» (the board's «Islendik hyzmata onlaýn
    ýazylyş.»); it is also Home's description.
  - The error page (not drawn) is States tile 07's inline block without the chrome (the failure may be in it).
- `@yeral/ui`: `LanguageSwitcher` renders nothing with one language (stories: Several, OneLanguage, Russian length,
  Phone); `cn()` knows the layout widths (`w-popover` was kept beside a passed `w-[260px]`, and CSS order decided).
- The avatar's menu and its phone sheet are both rendered and CSS shows one (`max-sm:hidden` / `sm:hidden`), so the
  server's HTML and the browser's agree (a media query is false on the server).
- The server render (review of PR 1): it asks the api who is signed in only when the session cookie came (else `me` is
  null at once), once (no retries) and for at most 1.5 s, so a slow api never holds a page; in the browser it asks in
  the background. A cookie the api renews on that call goes on to the browser with the page (else the 30-day renewal
  would be lost). Pages answer `Cache-Control: private, no-cache` and `Vary: Cookie` (they may carry the signed-in
  person); public caching comes with the public pages. `/` keeps the query string on its redirect. Log out drops every
  cached query but `me`. The Node server serves only `/assets/*` and `/version.json` from disk; everything else renders.
- Docker: `infra/docker/client.Dockerfile` (turbo prune → `vite build` with `ssr.noExternal` → esbuild bundles
  `server.mjs` into `dist/node.mjs` → `node:24-alpine` with `dist/` only, 170 MB); `compose.yml` `client` service
  (`API_INTERNAL_URL=http://api:3004`), `Caddyfile` `http://yeral.localhost` (the `/l/…` token filtered from the
  log); CI's Docker job asks for `/version.json`, `/` = 307, `/en` rendered, an unknown page = 404. Local dev:
  `PORT_BASE + 1` beside legacy's `+ 0` (both runnable; `pnpm dev` starts both).
- Tests: unit (`pickLocale`, `acceptedLanguages`, the messages, `pageHead`); stories `Client/Widgets/SiteLayout` (8),
  `Client/Pages/{Home,NotFound,Error}` over a fake api (`shared/storybook`); checked by hand: SSR with and without a
  session cookie, the built server without `node_modules`, the image.
- Follow-ups: the browser bundle is ~235 kB gzip (all three languages' shared messages, zod, the hono client; routes
  split as they arrive); robots.txt and the sitemap come with the public pages (slice 5); the server's stack and the
  deploy take the client with P2 step 7.
