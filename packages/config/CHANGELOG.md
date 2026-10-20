# @yeral/config

## 0.1.0

### Minor Changes

- [#99](https://github.com/azamatos/yeral/pull/99) [`4422c06`](https://github.com/azamatos/yeral/commit/4422c0613686e64027ffc944863ac29358896d5d) Thanks [@azamatos](https://github.com/azamatos)! - The business app starts: `apps/business`, a Vite single-page app with TanStack Router file routes, TanStack Query
  through `@yeral/sdk`, the design system's Tailwind theme, use-intl with English as the source
  (`apps/business/messages/en.json` beside the shared namespaces) and Feature-Sliced Design layers. It runs on
  `PORT_BASE + 2` (`pnpm dev --filter=@yeral/business`), takes its hosts from `@yeral/lib/site`, serves `/version.json`
  and is never indexed. For now `/` is a placeholder and every other address shows "Page not found"; the sign-in comes
  next. Its screens have stories that Storybook runs (`Business/Pages/…`). The local production-like stack
  (`pnpm docker:up`) serves it at http://business.yeral.localhost from its own image (`infra/docker/business.Dockerfile`).
  `@yeral/config` adds the Steiger preset (`@yeral/config/steiger`) that `pnpm lint:fsd` runs. `@yeral/ui`'s `Toaster`
  takes a `label` for the toasts' region, so screen readers name it in the person's language.

## 0.0.2

### Patch Changes

- [#6](https://github.com/azamatos/yeral/pull/6) [`8236f8c`](https://github.com/azamatos/yeral/commit/8236f8c18fb51bcf3472da792ca0fb64f7aede7f) Thanks [@azamatos](https://github.com/azamatos)! - The Ýeral design system (web DS v0.3.1): tokens, the Onest font and 40+ components in `@yeral/ui`, documented and tested in Storybook at storybook.yeral.app.

## 0.0.1

### Patch Changes

- [#1](https://github.com/azamatos/yeral/pull/1) [`76a218b`](https://github.com/azamatos/yeral/commit/76a218b1a8833a3ef623d1d581d90faee6657b70) Thanks [@azamatos](https://github.com/azamatos)! - The marketplace now builds and deploys from the monorepo (`apps/legacy`); yearly closures that span New Year (31 Dec – 1 Jan) now close the salon as they should; `/version.json` shows the deployed build.
