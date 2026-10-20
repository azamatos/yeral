---
'@yeral/client': minor
'@yeral/ui': patch
---

The client site starts: `apps/client`, TanStack Start with server-rendered public pages and browser-only account and
login pages, TanStack Query through `@yeral/sdk` (what the server fetched goes into the page), the design system's
Tailwind theme, use-intl with English as the source (`apps/client/messages/en.json`) and Feature-Sliced Design
layers. Every address starts with its language (`/en/…`); `/` opens the signed-in person's language, else the
browser's when the site has it, else the market's main one (book Q-132). Pages get their title, description,
canonical address and hreflang links. The header (logo, For business, Log in, or the avatar with the person's name,
phone and Log out; a bottom sheet on phones) and the footer come from the boards; Home is a stand-in until P4 slice
5; unknown addresses get the 404 page with HTTP 404. It runs on `PORT_BASE + 1` next to `apps/legacy`
(`pnpm dev --filter=@yeral/client...`), serves `/version.json`, and the local production-like stack (`pnpm docker:up`)
serves it at http://yeral.localhost from its own Node image (`infra/docker/client.Dockerfile`). yeral.app still serves
`apps/legacy`. `@yeral/ui`: `LanguageSwitcher` renders nothing with one language (with stories), `cn()` knows the
layout widths (a passed `w-[260px]` replaces a menu's `w-popover`), and `useMediaQuery` is exported
(`@yeral/ui/use-media-query`).
