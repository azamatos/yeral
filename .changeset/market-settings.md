---
'@yeral/api': minor
'@yeral/contract': minor
'@yeral/domain': minor
'@yeral/i18n': minor
'@yeral/ui': minor
---

Market settings and English as the source language (book chapter 10, P2 step 1; ADR 0022, ADR 0023).

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
