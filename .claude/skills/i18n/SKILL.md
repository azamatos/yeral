---
name: i18n
description: Add or change user-visible text, numbers, prices, dates, durations or plurals in Yeral apps (Russian now, Turkmen next). Use for every new string or aria-label, for Russian plural forms, for formatting money and dates, and when adding Turkmen translations.
---

# Strings and formats

Reference: ADR 0008; `systemPatterns.md` (i18n). Library: `use-intl` (today `next-intl` in `apps/legacy` — same API).

## Where strings go

- Shared namespaces (`common`, `categories`, `amenities`, `status`, `errors`, units) → `packages/i18n/messages/<locale>/`.
- Everything else → `apps/<app>/messages/<locale>.json`, one namespace per screen or slice (`salon`, `booking`, `calendar`).
- Today: `apps/legacy/messages/ru.json`.
- Keys camelCase, grouped by where they appear; reuse `common.*` before adding a duplicate.

## Rules

- No literal user-visible text in TSX, `aria-label`, `title`, `alt` and toasts included: `t('key')`.
- Call `useTranslations` at the top of the component, never after an early return or inside a condition.
- Russian plurals need all four forms:
  `"{count, plural, one {# мастер} few {# мастера} many {# мастеров} other {# мастера}}"`.
- Turkmen (CLDR `one`/`other`): nouns after a numeral stay singular («3 ussa»), so most plurals are just `{count} …`.
- Variables, not concatenation: `"{name} подтвердил запись"`, never `name + ' подтвердил'`.
- Copy: friendly and short, «вы» in lowercase, no exclamation marks in errors, the same word for the same thing
  (glossary in `productContext.md`: запись, заявка, мастер, окно…).
- When `tk` exists, every key added to `ru` is added to `tk` in the same change (CI will check for missing keys).

## Numbers, money, dates

Use `useFmt()` (`@yeral/i18n`; today `apps/legacy/src/lib/format.ts`). Never `toLocaleString` or `Intl` in components.

| Need | Call |
|---|---|
| price | `fmt.money(120)` → «120 м» (manats); `fmt.price(service)` handles «от» |
| duration | `fmt.dur(90)` → «1 ч 30 мин» |
| date | `fmt.dayMonth(d)`, `fmt.weekdayShort(d)`, `fmt.longDay(d)`; `fmt.relDay(d)` → «Сегодня» / «Завтра» / null |
| date + time in a sentence | `fmt.whenInline(d, min)` (lowercase «завтра») vs `fmt.when(d, min)` at the start |
| time of day | `fmt.hm(870)` → «14:30» |

Dates are salon-local strings and are formatted in UTC on purpose (no day shift). Plain counts use the plural messages
in `common` (`reviews`, `masters`, `windows`…).
