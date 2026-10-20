# @yeral/ui

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
