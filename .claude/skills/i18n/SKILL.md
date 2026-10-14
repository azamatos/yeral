---
name: i18n
description: Add or change user-visible text, numbers, prices, dates, durations, distances or plurals in Ýeral apps — Turkmen (default, verbatim from the design), Russian and English. Use for every new string or aria-label, for plural forms, for formatting money, dates and distances, and when translating.
---

# Strings and formats

References: ADR 0008 (use-intl), ADR 0016 (tk/ru/en, prefixed URLs), `docs/design/README.md` §8 (formats) and §9
(Turkmen glossary). Library: `use-intl` (today `next-intl` in `apps/legacy`, Russian only — not a reference for new copy).

## Where strings go

- Shared namespaces (`common`, `categories`, `status`, `errors`, units) → `packages/i18n/messages/{tk,ru,en}/`.
- Everything else → `apps/<app>/messages/{tk,ru,en}.json`, one namespace per screen or slice (`home`, `search`,
  `business`, `booking`, `account`).
- Keys camelCase, grouped by where they appear; reuse `common.*` before adding a duplicate. Every key exists in all three
  locales in the same change (CI checks).

## Rules

- **Turkmen is the default and comes verbatim from the design screens** (`docs/design/screens/**/*.dc.html`). Don't
  reword it; use the glossary (Ýazylmak, Ýazylyş, Hünärmen, Boş wagt, Garaşylýar…). It still needs a native review — don't "fix" it silently.
- Russian and English: write them for every key, natural and short; Russian runs ~30% longer, so never rely on fixed widths.
- No city names anywhere in copy ("Ýakynymda", "golaýyňyzda" instead).
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
| price | `40 TMT`, from `250 TMT-den`, free `Mugt`, average bill `≈ 150 TMT` |
| rating | `4,9` (decimal comma) |
| distance | `1,2 km`, under 1 km `850 m` |
| duration | `60 min`, `1 sag 30 min` |
| date | `Penşenbe, 15 oktýabr` (weekday capitalised, month lower-case), short `15 okt.`; relative `Şu gün`, `Ertir` |
| weekdays short | Du Si Ça Pe An Şe Ýe (Monday first) |
| time | 24-hour `14:30` |
| phone | `+993 65 12 34 56` |

Dates are business-local `YYYY-MM-DD` strings formatted in UTC on purpose (no day shift).
