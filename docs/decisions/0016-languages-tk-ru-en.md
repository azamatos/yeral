# 0016. Turkmen first, then Russian and English; every client URL carries its language

- Status: Accepted 2026-10-14 — amends [0008](0008-i18n-use-intl.md) (the library stays use-intl)
- Decided by: the web design spec (14.10.2026), accepted by the owner

## Context

ADR 0008 planned Russian now and Turkmen later, with the unprefixed-URL question open. The design makes Turkmen the
default, adds English, and prefixes every route.

## Decision

- Locales: `tk` (default), `ru`, `en`.
- Client site: every route starts with the language (`/tk/…`, `/ru/…`, `/en/…`); `/` redirects to the saved language
  (cookie, then the user's profile), else `tk`. `hreflang` alternates on every public page.
- Business workspace and CMS: language from the user's setting, no prefix.
- Turkmen copy in the screens is final draft: copy it verbatim into `tk` messages. Russian and English are written for
  every key (Russian runs ~30% longer: buttons hug content, labels may wrap to two lines). All Turkmen copy gets a native
  review before launch.
- Formats: dates `Penşenbe, 15 oktýabr` / short `15 okt.`, relative `Şu gün` / `Ertir`; 24-hour time; decimal comma;
  `40 TMT`; ICU plurals (Russian needs one/few/many; Turkmen and English are simple).
- CI checks that every key exists in all three locales.

## Consequences

- The message catalogue triples; `@yeral/i18n` ships `tk`, `ru`, `en` from M2.
- The Russian strings of `apps/legacy` are a starting point for `ru` only where wording still fits the multi-category product.
