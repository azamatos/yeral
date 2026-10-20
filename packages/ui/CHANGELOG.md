# @yeral/ui

## 0.4.0

### Minor Changes

- [#102](https://github.com/azamatos/yeral/pull/102) [`b8bf3a9`](https://github.com/azamatos/yeral/commit/b8bf3a93f00b780f19f454a039ad10fea02a239e) Thanks [@azamatos](https://github.com/azamatos)! - Signing in to the business app (`/login`, B-Login): the phone number and the 4-digit code in the shared sign-in step,
  with the code shown on the screen when the api hands it out (the first launch, no SMS), a wrong code with the tries
  left, the 60-second lock and a new code after it, "Get a new code" after 0:59, too many codes in an hour (the wait in
  minutes), a landline or a short number refused before a code is asked for. Then "Is this you?" for an account unused
  for 6 months, the name for someone without one (first name required, surname optional), and where the person goes:
  an invite to accept or decline, the workspace they used last ("Opening Glow Studio…"), an expired invite, or "You
  don't have a workspace yet". `/` leads to the sign-in; the calendar and the setup wizard are stand-ins until their
  slices. `@yeral/ui` adds `AuthCard` (Display/AuthCard): the sign-in page's layout with header, a centred card (title,
  lead, the step) and a footer link, frameless on phones; the title takes the focus when the step changes.

- [#92](https://github.com/azamatos/yeral/pull/92) [`102a407`](https://github.com/azamatos/yeral/commit/102a4074b93826147211f361a0526cc484186514) Thanks [@azamatos](https://github.com/azamatos)! - `Callout` (`@yeral/ui/callout`, Storybook Status/Callout) from DS-Patterns → 02 Feedback: six tones (neutral,
  accent, warning, danger, success, slate), sizes M and S, an optional icon and title, S actions under the text or one
  inline action on the right, and three layouts: `box` in the flow, `banner` (the full-width strip above a page header,
  never dismissed) and `card` (the calm info card with an icon tile, a big value and full-width actions). Screen readers
  hear a danger callout as an alert and a `live` one as a status; static notes stay silent.

- [#96](https://github.com/azamatos/yeral/pull/96) [`ef9410f`](https://github.com/azamatos/yeral/commit/ef9410f61ba500fdf33ea5ac4f10b8ad37ac341a) Thanks [@azamatos](https://github.com/azamatos)! - The sign-in code step (DS-Patterns → 05 Inputs), the one phone + code step of the client login, the booking flows,
  the business login and the SMS link page:
  
  - `SignInCodeStep` (`@yeral/ui/sign-in-code-step`, Storybook Inputs/SignInCodeStep): a controlled, presentational form
    with the phone step (empty, sending, incomplete, not mobile, too many codes, masked) and the code step (empty,
    typing, checking, wrong code, locked, lock over, resend ready, new code, too many codes). The first-release code on
    screen ("Your code: 4821", a neutral Callout S) is the default; `sms` hides it. It checks on the 4th digit and keeps
    Confirm visible, focuses the first empty box, selects the digits after a wrong code, counts the resend down
    (`formatCountdown`), boxes 48 or 56 and 52 on phones. Every word comes from `copy` and the state props.
  - `PhoneInput`: `size` 48 / 44, the prefix box on n-50, 16 px text on phones, and `masked` for a known number shown
    read-only with a lock.
  - `CodeInput`: `size` 48 / 52 / 56, `responsive` (52 under 768), a read-only checking look, and a paste with spaces or
    words keeps all four digits.
  - `Field`: `status` (`error` · `warning` · `success`) with `message`, each with a 14 px icon; the hint stays under the
    message; warning turns the control's line amber; `messageLive={false}` for a message that ticks. `FieldMessage` for
    a message outside a field.
  - `Button`: `loadingText` shows words beside the spinner while loading ("Sending…").

### Patch Changes

- [#99](https://github.com/azamatos/yeral/pull/99) [`4422c06`](https://github.com/azamatos/yeral/commit/4422c0613686e64027ffc944863ac29358896d5d) Thanks [@azamatos](https://github.com/azamatos)! - The business app starts: `apps/business`, a Vite single-page app with TanStack Router file routes, TanStack Query
  through `@yeral/sdk`, the design system's Tailwind theme, use-intl with English as the source
  (`apps/business/messages/en.json` beside the shared namespaces) and Feature-Sliced Design layers. It runs on
  `PORT_BASE + 2` (`pnpm dev --filter=@yeral/business`), takes its hosts from `@yeral/lib/site`, serves `/version.json`
  and is never indexed. For now `/` is a placeholder and every other address shows "Page not found"; the sign-in comes
  next. Its screens have stories that Storybook runs (`Business/Pages/…`). The local production-like stack
  (`pnpm docker:up`) serves it at http://business.yeral.localhost from its own image (`infra/docker/business.Dockerfile`).
  `@yeral/config` adds the Steiger preset (`@yeral/config/steiger`) that `pnpm lint:fsd` runs. `@yeral/ui`'s `Toaster`
  takes a `label` for the toasts' region, so screen readers name it in the person's language.

## 0.3.0

### Minor Changes

- [#39](https://github.com/azamatos/yeral/pull/39) [`c2e349a`](https://github.com/azamatos/yeral/commit/c2e349a373bb35b0312a176d00e96df5d1f658e8) Thanks [@azamatos](https://github.com/azamatos)! - Market settings and English as the source language (book chapter 10, P2 step 1; ADR 0022, ADR 0023).
  
  - `@yeral/domain/market`: `MARKET` holds the market's languages, currency, phone rules and time zone (Turkmenistan,
    English only for the first launch); time, phones and money read it.
  - The api answers in the market's main language (English) when no `?lang=` is given, creates new accounts in the
    language they signed in with or else that one, and sends SMS in it to people who never chose a language. Migration
    `0004` drops the database's `'tk'` default for `users.lang`.
  - Texts written per language need any one language: the asked language, else the market's main one, else whichever
    was written; search matches every language.
  - SMS texts take the brand from `common.brand`; money messages take the currency from the market.
  - `manatSchema` is `moneySchema`. `DEFAULT_LOCALE` comes from the market, and `MARKET_LOCALES` lists what the sites
    offer.
  - `PhoneInput` needs `prefix`, `maxDigits` and `format` (the market's: `COUNTRY_PREFIX`, `formatNational`) instead of defaulting to +993 and 8 digits. A person chooses only among the market's languages (`marketLocaleSchema`); `localizedSchema` requires one language at least.

## 0.2.1

### Patch Changes

- [#27](https://github.com/azamatos/yeral/pull/27) [`421ac7e`](https://github.com/azamatos/yeral/commit/421ac7e25c29df828f10b6c93436121dae1d71c3) Thanks [@azamatos](https://github.com/azamatos)! - Theme: `shadow-ring-selected` from design tokens v0.5, the ink ring around a selected calendar block or floor-plan table.

## 0.2.0

### Minor Changes

- [#22](https://github.com/azamatos/yeral/pull/22) [`d20be40`](https://github.com/azamatos/yeral/commit/d20be407f247f78c133bc9e1b7b05c72a113f9c7) Thanks [@azamatos](https://github.com/azamatos)! - Design tokens v0.4: `text-small` is 14/20 (business body, menus, table cells), new radii `rounded-xs` 4 and `rounded-sm` 6, shadows `shadow-control` (was `shadow-knob`), `shadow-focus-inset` and `shadow-input-warning`, the 560 modal width and the chart colours `chart-1…4`, `chart-area`, `chart-compare`, `chart-grid`, `chart-axis`. Foundations in Storybook list them.

## 0.1.0

### Minor Changes

- [#6](https://github.com/azamatos/yeral/pull/6) [`8236f8c`](https://github.com/azamatos/yeral/commit/8236f8c18fb51bcf3472da792ca0fb64f7aede7f) Thanks [@azamatos](https://github.com/azamatos)! - The Ýeral design system (web DS v0.3.1): tokens, the Onest font and 40+ components in `@yeral/ui`, documented and tested in Storybook at storybook.yeral.app.
