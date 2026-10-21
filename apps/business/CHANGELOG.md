# @yeral/business

## 0.2.0

### Minor Changes

- [#119](https://github.com/azamatos/yeral/pull/119) [`950cc1b`](https://github.com/azamatos/yeral/commit/950cc1b125c6e21d8c443d2ab1b7cedffad823db) Thanks [@azamatos](https://github.com/azamatos)! - The workspace shell: every page under `/w/{slug}` sits in the sidebar (from 1024), the icon rail (from 768) or the
  tab bar with More (phones), with the workspace switcher (the same section in another workspace, which becomes the last
  used; "Create a business"), the account menu (Open as a client, Log out), the requests count the api gives, and a note
  when an invite waits. A workspace that isn't the person's, or Settings for a Specialist, opened by its address, goes
  to the last used workspace or the calendar with "This section is closed to you". Calendar, Bookings, Clients, Reviews
  and Settings are stand-ins until their slices.

### Patch Changes

- [#111](https://github.com/azamatos/yeral/pull/111) [`bca2eb6`](https://github.com/azamatos/yeral/commit/bca2eb668c596ffdab97a57d8a20ab197eb1917c) Thanks [@azamatos](https://github.com/azamatos)! - The market names what a mobile number starts with (`MARKET.phone.mobilePrefixes`, Turkmenistan `['6', '7']`), the one
  source of the rule: `MARKET.phone.mobile` is built from it (`startsWithOneOf()`), so the api's `isMobile` checks the same
  list the screens name. The business login's «Codes go to mobile numbers only. Enter a number starting with 6 or 7.»
  reads the list instead of parsing the rule (`mobileStarts()` and the message without the digits are gone). A market
  writes its phone rules through `phoneRules()`, which makes `mobile` from the prefixes.
- Updated dependencies [[`5c3985e`](https://github.com/azamatos/yeral/commit/5c3985edb0176f57e2d7446359ac5ed7a5500d61), [`cee0027`](https://github.com/azamatos/yeral/commit/cee0027cfc549cac9826fd37c41b2f77423a6952), [`bca2eb6`](https://github.com/azamatos/yeral/commit/bca2eb668c596ffdab97a57d8a20ab197eb1917c), [`dae89a4`](https://github.com/azamatos/yeral/commit/dae89a4e3520e44bfa334519168a09c82551c067)]:
  - @yeral/ui@0.5.0
  - @yeral/domain@0.4.0
  - @yeral/features@0.1.0
  - @yeral/contract@0.3.1
  - @yeral/i18n@0.3.1
  - @yeral/sdk@0.3.1

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

- [#102](https://github.com/azamatos/yeral/pull/102) [`b8bf3a9`](https://github.com/azamatos/yeral/commit/b8bf3a93f00b780f19f454a039ad10fea02a239e) Thanks [@azamatos](https://github.com/azamatos)! - Signing in to the business app (`/login`, B-Login): the phone number and the 4-digit code in the shared sign-in step,
  with the code shown on the screen when the api hands it out (the first launch, no SMS), a wrong code with the tries
  left, the 60-second lock and a new code after it, "Get a new code" after 0:59, too many codes in an hour (the wait in
  minutes), a landline or a short number refused before a code is asked for. Then "Is this you?" for an account unused
  for 6 months, the name for someone without one (first name required, surname optional), and where the person goes:
  an invite to accept or decline, the workspace they used last ("Opening Glow Studio…"), an expired invite, or "You
  don't have a workspace yet". `/` leads to the sign-in; the calendar and the setup wizard are stand-ins until their
  slices. `@yeral/ui` adds `AuthCard` (Display/AuthCard): the sign-in page's layout with header, a centred card (title,
  lead, the step) and a footer link, frameless on phones; the title takes the focus when the step changes.

### Patch Changes

- [#107](https://github.com/azamatos/yeral/pull/107) [`85472bc`](https://github.com/azamatos/yeral/commit/85472bc28d4e00cf440636f495551919b165ef60) Thanks [@azamatos](https://github.com/azamatos)! - Nothing of the last person shows after a sign-in, a log-out, a sign-in as someone else or a session that ended on its
  own: the sdk empties their workspaces, invites, team, calendar, clients, bookings and favourites, and what they saw as
  a team member, by itself (any 401 counts). Leaving a workspace forgets it; a phone change refreshes the invites.
- Updated dependencies [[`46a5546`](https://github.com/azamatos/yeral/commit/46a55461a72145e74900610f8714ea24eeb88cdc), [`29643e6`](https://github.com/azamatos/yeral/commit/29643e63fe576a087fd96a138c6f3ab329270d15), [`d5603a8`](https://github.com/azamatos/yeral/commit/d5603a8f5b7c69ab3c803738cc9a73e99ea81a19), [`7bfaf2b`](https://github.com/azamatos/yeral/commit/7bfaf2b093fea7ad3885342de2fe6d9960f417bd), [`4422c06`](https://github.com/azamatos/yeral/commit/4422c0613686e64027ffc944863ac29358896d5d), [`bbcdae5`](https://github.com/azamatos/yeral/commit/bbcdae53e05deadb98abc119b138abaeded262b3), [`b8bf3a9`](https://github.com/azamatos/yeral/commit/b8bf3a93f00b780f19f454a039ad10fea02a239e), [`88677dd`](https://github.com/azamatos/yeral/commit/88677dd6d62df9c597aac96d5684ffa4233e1150), [`ee5e856`](https://github.com/azamatos/yeral/commit/ee5e8561cf10c5579ff808f16c8802923aa610af), [`d5c9ac2`](https://github.com/azamatos/yeral/commit/d5c9ac2a4cfe6ee174e0840841de068ac4624795), [`a362d86`](https://github.com/azamatos/yeral/commit/a362d86e0857e5ef51e738344a791c53820c9613), [`124e33c`](https://github.com/azamatos/yeral/commit/124e33cfab8800f95ffbe97b625fe6b33bcf7899), [`029a2d8`](https://github.com/azamatos/yeral/commit/029a2d8cbfa77836a727251c1ea80396259f677e), [`d4afcd0`](https://github.com/azamatos/yeral/commit/d4afcd0e1c97367c74ade23a8fdbca741df1e815), [`85472bc`](https://github.com/azamatos/yeral/commit/85472bc28d4e00cf440636f495551919b165ef60), [`25fb650`](https://github.com/azamatos/yeral/commit/25fb65064a4439a10840735885a50c0298b8d621), [`97064a6`](https://github.com/azamatos/yeral/commit/97064a613171e073aa311513f4291b8d4becd40a), [`102a407`](https://github.com/azamatos/yeral/commit/102a4074b93826147211f361a0526cc484186514), [`ef9410f`](https://github.com/azamatos/yeral/commit/ef9410f61ba500fdf33ea5ac4f10b8ad37ac341a)]:
  - @yeral/contract@0.3.0
  - @yeral/domain@0.3.0
  - @yeral/i18n@0.3.0
  - @yeral/sdk@0.3.0
  - @yeral/ui@0.4.0
  - @yeral/features@0.0.1
  - @yeral/lib@0.2.0
