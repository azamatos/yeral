# 0008. i18n with use-intl

- Status: Accepted 2026-10-13 — locales and URL strategy amended by [0016](0016-languages-tk-ru-en.md)
- Decided by: owner (Russian now, Turkmen later) + Claude (library)

## Context

The Next app uses next-intl with ICU messages in `messages/ru.json` and typed keys. Leaving Next.js, we need the same
for four Vite apps, SSR included, with Russian plural rules (one / few / many) and Turkmen next.

## Decision

- **use-intl**: the framework-free core of next-intl. Same `useTranslations`, ICU syntax and typed keys, so the existing
  messages and call sites carry over unchanged.
- Shared namespaces (`common`, `categories`, `status`, `errors`, units) in `@yeral/i18n`; app namespaces in `apps/<app>/messages`.
- Formatting only through `useFmt()` and ICU, always in `Asia/Ashgabat`.
- Landing and client put the locale in the URL for SEO (`/tk/...`, with hreflang); business and cms use the user's setting.
  Which locale gets the unprefixed URLs is an open question (activeContext #3).
- UI strings stay in the repo (typed, reviewed in PRs). CMS-managed *content* (landing texts, banners, SEO texts) lives in the database.

## Consequences

- Zero rewrite of existing strings.
- Bundles include whole namespaces per page, not single messages; fine at our size.

## Alternatives considered

- **Paraglide JS**: compiled, tree-shaken per message, good TanStack Start integration; would mean rewriting every call site. Re-evaluate if bundle size becomes a problem.
- **i18next**: biggest ecosystem, weaker typing, different message format from what we have.
- **Lingui**: compile-time ICU; same rewrite cost as Paraglide.
