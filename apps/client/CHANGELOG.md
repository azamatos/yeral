# @yeral/client

## 0.1.0

### Minor Changes

- [#114](https://github.com/azamatos/yeral/pull/114) [`5c3985e`](https://github.com/azamatos/yeral/commit/5c3985edb0176f57e2d7446359ac5ed7a5500d61) Thanks [@azamatos](https://github.com/azamatos)! - Log in on the client site (book C-19): «Log in» in the header opens a 400 modal (a bottom sheet on phones) over the
  page with the phone and the code (the code shows on the screen at the first launch), "Is this you?" for an account
  unused for 6 months, and the name for a new account; then the header shows the avatar, which gets the focus.
  `/{lang}/login` opens the same modal and goes back to `?redirect=` (this site only) once signed in. `@yeral/ui`'s
  `ModalHeader` takes `media` (the login's brand icon above the title), and `textLink` moves in from the business app
  (`@yeral/ui/text-link`, with stories).

- [#110](https://github.com/azamatos/yeral/pull/110) [`cee0027`](https://github.com/azamatos/yeral/commit/cee0027cfc549cac9826fd37c41b2f77423a6952) Thanks [@azamatos](https://github.com/azamatos)! - The client site starts: `apps/client`, TanStack Start with server-rendered public pages and browser-only account and
  login pages, TanStack Query through `@yeral/sdk` (what the server fetched goes into the page), the design system's
  Tailwind theme, use-intl with English as the source (`apps/client/messages/en.json`) and Feature-Sliced Design
  layers. Every address starts with its language (`/en/…`); `/` opens the signed-in person's language, else the
  browser's when the site has it, else the market's main one (book Q-132). Pages get their title, description,
  canonical address and hreflang links. The header (logo, For business, Log in, or the avatar with the person's name,
  phone and Log out; a bottom sheet on phones) and the footer come from the boards; Home is a stand-in until P4 slice
  5; unknown addresses get the 404 page with HTTP 404. It runs on `PORT_BASE + 1` next to `apps/legacy`
  (`pnpm dev --filter=@yeral/client...`), serves `/version.json`, and the local production-like stack (`pnpm docker:up`)
  serves it at http://yeral.localhost from its own Node image (`infra/docker/client.Dockerfile`). yeral.app still serves
  `apps/legacy`. `@yeral/ui`: `LanguageSwitcher` renders nothing with one language (with stories), and `cn()` knows the
  layout widths (a passed `w-[260px]` replaces a menu's `w-popover`).

### Patch Changes

- Updated dependencies [[`5c3985e`](https://github.com/azamatos/yeral/commit/5c3985edb0176f57e2d7446359ac5ed7a5500d61), [`cee0027`](https://github.com/azamatos/yeral/commit/cee0027cfc549cac9826fd37c41b2f77423a6952), [`bca2eb6`](https://github.com/azamatos/yeral/commit/bca2eb668c596ffdab97a57d8a20ab197eb1917c), [`dae89a4`](https://github.com/azamatos/yeral/commit/dae89a4e3520e44bfa334519168a09c82551c067)]:
  - @yeral/ui@0.5.0
  - @yeral/domain@0.4.0
  - @yeral/features@0.1.0
  - @yeral/contract@0.3.1
  - @yeral/i18n@0.3.1
  - @yeral/sdk@0.3.1
