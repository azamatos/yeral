---
'@yeral/business': minor
'@yeral/config': minor
---

The business app starts: `apps/business`, a Vite single-page app with TanStack Router file routes, TanStack Query
through `@yeral/sdk`, the design system's Tailwind theme, use-intl with English as the source
(`apps/business/messages/en.json` beside the shared namespaces) and Feature-Sliced Design layers. It runs on
`PORT_BASE + 2` (`pnpm dev --filter=@yeral/business`), takes its hosts from `@yeral/lib/site`, serves `/version.json`
and is never indexed. For now `/` is a placeholder and every other address shows "Page not found"; the sign-in comes
next. The local production-like stack (`pnpm docker:up`) serves it at http://business.yeral.localhost from its own
image (`infra/docker/business.Dockerfile`). `@yeral/config` adds the Steiger preset (`@yeral/config/steiger`) that
`pnpm lint:fsd` runs.
