# 0022. Built in English, not bound to one country; each market adds its languages

- Status: Accepted 2026-10-18 — supersedes the Turkmen default and "Turkmen first" of [0016](0016-languages-tk-ru-en.md)
- Decided by: owner (English first, languages per market, no language in workspace links: product book Q-100, Q-101,
  Q-104, 18.10.2026) + Claude (why public links keep the language; the market model, which is still open as Q-131)

## Context

ADR 0016 made Turkmen the default language, with Russian and English, and design v0.5 is drawn in Turkmen. On
18.10.2026 the owner decided that Ýeral isn't a Turkmen platform: it launches in Turkmenistan first but mustn't be bound
to it. Only the English version is built now; when Ýeral lands in a country, that country's languages are added
(Turkmenistan: Turkmen and Russian; a later Uzbekistan: Uzbek and Russian, or whatever is common there). English also
because Claude writes it and translates from it best (owner's note on Q-101). The owner also asked whether links need a
language at all when a cookie could hold it (Q-100).

## Decision

- **English is the source language** for the design, the copy and the code. Future design boards are drawn in English;
  design v0.5's Turkmen is the reference for the Turkmen translation.
- **A market is one country with its own settings,** added when Ýeral launches there: languages, currency and money
  format, phone code and number rules, time zone, SMS provider, legal texts. Nothing country-specific is hard-coded.
  How markets are separated (one deployment per country or one site for all) is product book question Q-131.
- **Every text goes through translations from day one** (use-intl, ADR 0008), so a new language is a translation, not
  a rewrite. Claude writes the translations; the owner checks them before a market launches.
- **Public pages carry the language in the link** (`/en/…` now, `/tk/…` and `/ru/…` for Turkmenistan): a search
  engine indexes a language only at its own address (hreflang), a shared link opens in the same language for everyone,
  and pages can be cached. **Apps behind a login** (business workspace, CMS) carry no language in links; each person's
  setting decides.
- **Number formats follow the language:** English `4.9`, `1,410`; Turkmen and Russian `4,9`, `1 410`.
- Kept from ADR 0016: prefixed client URLs, `hreflang`, one language per person saved in the profile, every key in
  every locale of a market (checked in CI).

## Consequences

- Easier: one language while building; a new country is settings and translation, not a rewrite.
- Harder: Turkmen and Russian must be translated and checked before the Turkmenistan launch; future design boards are
  drawn in English (whether v0.5's boards are redrawn is book question Q-133).
- Code differs, fixed when coding resumes (ADR 0021): `@yeral/i18n` and the apps default to `tk` and ship tk, ru and
  en; Turkmenistan's values (TMT, +993, Asia/Ashgabat) are constants in `@yeral/domain` and `@yeral/i18n`; business
  texts require Turkmen.
- Updated with this record: `AGENTS.md` rules 4–5, the `i18n` skill, product book chapters 1, 2, 4, 6, 7a, 7b, 8 and 9,
  the memory bank (`activeContext`, `progress`, `projectbrief`, `systemPatterns`, `productContext`).

## Alternatives considered

- Keep Turkmen first (ADR 0016): ties the product to one country, and every Turkmen text Claude writes needs a native
  check.
- Language from a cookie only, no language in links: public pages couldn't be indexed per language, and a shared link
  would change language for each reader.
