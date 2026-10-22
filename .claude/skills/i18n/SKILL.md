---
name: i18n
description: Add or change user-visible text, numbers, prices, dates, durations, distances or plurals in Ýeral apps — English as the source, each market's languages (Turkmenistan: Turkmen, Russian) as translations. Use for every new string or aria-label, for plural forms, for formatting money, dates and distances, and when translating.
---

# Strings and formats

References: ADR 0022 (English first, languages per market), ADR 0008 (use-intl), ADR 0016 (prefixed URLs), `docs/design/README.md` §8 (formats) and §9
(Turkmen glossary). Library: `use-intl`.

## Where strings go

- Shared namespaces (`common`, `status`, `errors`, `fmt` = units, months, weekdays) → `packages/i18n/src/messages/{tk,ru,en}.json`.
  Category names are not messages: they live in the CMS catalogue (`name{tk,ru,en}` in the database).
- Everything else → `apps/<app>/messages/{tk,ru,en}.json`, one namespace per screen or slice (`home`, `search`,
  `business`, `booking`, `account`).
- Keys camelCase, grouped by where they appear; reuse `common.*` before adding a duplicate. Every key exists in all three
  locales in the same change (CI checks).

## Rules

- **English is the source (ADR 0022).** For screens still drawn in Turkmen, the Turkmen in the design screens
  (`docs/design/screens/**/*.dc.html`) is the reference for `tk`: don't reword it; use the glossary (Ýazylmak, Ýazylyş,
  Hünärmen, Boş wagt, Garaşylýar…). The owner checks every translation before a market launches. English is the
  default and the source of the keys (`messages/en.json`); the sites offer the market's languages (`MARKET_LOCALES`,
  English only for the first launch).
- **Nothing country-specific in a message:** the currency comes in as `{currency}` (`useFmt().money`), the brand as
  `{brand}` (`common.brand`), phones through `fmt.phone` (the market's rules).
- Translations: write every key in each market language (Turkmenistan: Turkmen, Russian) from the English, natural and
  short; Russian runs ~30% longer, so never rely on fixed widths.
- No city names written into copy ("Ýakynymda", "golaýyňyzda" instead); a city comes from data (book Q-107).
- No literal user-visible text in TSX, `aria-label`, `title`, `alt` and toasts included: `t('key')`.
- Call `useTranslations` at the top of the component, never after an early return or inside a condition.
- Plurals: Russian needs one/few/many/other — `"{count, plural, one {# место} few {# места} many {# мест} other {# места}}"`.
  Turkmen (`one`/`other`): nouns after a numeral stay singular («3 ýer galdy»). English: one/other.
- Variables, not concatenation: `"{business} ýazylyşyňyzy tassyklady"`.
- Requests are *sent*, never *booked*, until the business confirms ("Ýazylyş ugradyldy").

## Numbers, money, dates, distances

Use `useFmt()` (`@yeral/i18n`). Never `toLocaleString` or raw `Intl` in components.

| Need | TK example |
|---|---|
| price | `40 TMT`, from `250 TMT-den`, free `Mugt` (no average bill: book Q-103) |
| rating | `4,9` (decimal comma) |
| distance | `1,2 km`, under 1 km `850 m` |
| duration | `60 min`, `1 sag 30 min` |
| date | `Penşenbe, 15 oktýabr` (weekday capitalised, month lower-case), short `15 okt.`; relative `Şu gün`, `Ertir` |
| weekdays short | Du Si Ça Pe An Şe Ýe (Monday first) |
| time | 24-hour `14:30` |
| phone | `+993 65 12 34 56` |

Dates are business-local `YYYY-MM-DD` strings formatted in UTC on purpose (no day shift).
