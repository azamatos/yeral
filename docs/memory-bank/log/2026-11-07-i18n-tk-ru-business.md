# 2026-11-07 · Turkmen and Russian for the business app and the api's texts

Branch `feat/i18n-tk-ru-business`. The owner (07.11): «Turkmen and Russian is okay, we really need this one. No need to
check anything, do as you can, then we will have a new iteration with translation fixes.» ADR 0022, skill `i18n`,
book Q-292.

## What's there

- **The market speaks three languages:** `TURKMENISTAN.languages = ['tk', 'ru', 'en']` (`@yeral/domain/market`, menu
  order: Turkmen first). `defaultLanguage` stays `en` until the client site has its Turkmen and Russian (see "Left for
  the client agent"). Everything that reads `MARKET.languages` / `MARKET_LOCALES` follows: `marketLocaleSchema`
  (`/v1/auth/code`, `PATCH /v1/me`, the admin tool's owner language) accepts `tk` and `ru`; the Telegram bot answers
  a Russian or Turkmen Telegram in it; `writtenIn` keeps a starter service's tk/ru names next to the business's edit.
- **Business app:** `apps/business/messages/tk.json` and `ru.json`, every key of `en.json` (2071), built from one
  translation table and checked for the same ICU arguments and tags as the English and for complete plural forms
  (`tk`: one/other, `ru`: one/few/many/other; `=0` branches kept). `BUSINESS_MESSAGES = { en, tk, ru }`, so
  `appLocale` speaks a signed-in person's `tk` or `ru` (the account's `lang`; the business app has no language
  switch of its own: the person chooses in the client site's profile, as `systemPatterns` "i18n" says).
  `messages.test.ts` now checks tk and ru against en (`it.each(MARKET_LOCALES)`).
- **The api's texts:** the shared namespaces of `@yeral/i18n` (`sms.*`, `telegram.*`, `errors.*`,
  `declineReasons`, `businessCancelReasons`, `undo`, `fmt`) already had every key in tk and ru; nothing was missing.
  The texts a client receives follow their `users.lang`; a client without an account gets `MARKET.defaultLanguage`
  (Q-292), English until the default flips.
- **Tests moved with the market:** `market.test.ts` (three languages, English the main one), the api's `auth`,
  `me`, `admin/businesses` and `telegram` tests (a language outside the market is now `de`, `ru`/`tk` are accepted;
  a Russian Telegram gets the Russian welcome), the business app's `written`, setup `services` and `service-form`
  tests (tk kept next to en).

## Terms chosen (tk / ru)

Reused from the shared namespaces, the design glossary (`docs/design/README.md` §9) and the product glossary:
booking «ýazylyş / запись», request «haýyş / запрос» (sent, never booked: «Ýazylyş ugradyldy / Запись отправлена»),
specialist «hünärmen / специалист» (the shared SMS say «мастер {staff}»; the UI says «специалист»), client
«müşderi / клиент», service «hyzmat / услуга», business «biznes / бизнес», workspace «iş ýeri / рабочее
пространство», calendar «senenama / календарь», reviews «teswirler / отзывы», settings «sazlamalar / настройки»,
hours «iş wagty / часы работы», break «arakesme / перерыв», buffer «ara wagt / буфер», special days «aýratyn günler /
особые дни», time off «dynç günleri / выходные», shift «çalşyk / смена», team «topar / команда», invite «çakylyk /
приглашение», access level «dereje / уровень доступа» (Eýesi · Administrator · Hünärmen; Владелец · Администратор ·
Специалист), permissions «rugsatlar / права», report (a client, a review) «arz / жалоба», no-show «gelmedi /
неявка», walk-in «gelip / без записи», «Phone only» «Diňe telefon / Только по телефону», trusted «ynamly /
надёжный», tags «tegler / теги», note «bellik / заметка», block time «wagty ýap / закрыть время», busy elsewhere
«başga ýerde meşgul / занят в другом месте», internal status «içerki ýagdaý / внутренний статус», Undo «Yzyna al /
Вернуть», Save «Ýatda sakla / Сохранить», Cancel (dismiss) «Ýatyr / Отмена», Close «Ýap / Закрыть», Back «Yza /
Назад», Continue «Dowam et / Продолжить», Log in «Giriş / Войти», Log out «Çykmak / Выйти». Lapsed clients «Köpden
bäri ýok / Давно не были». Proper nouns stay: Ýeral, «{brand} Business», Telegram, WhatsApp, Instagram, Logo.
Turkmen nouns after a numeral stay singular («3 ýazylyş»); Russian plurals carry all four forms. Units through
`fmt` as before (`40 TMT`, `min`/`мин`, `sag`/`ч`).

The owner's native check is still due (ADR 0022: before the market launches); the next iteration fixes wording.

## Left for the client agent

- `apps/client/messages/tk.json` and `ru.json` (every key of `en.json`); then `CLIENT_MESSAGES = { en, tk, ru }` so
  `SITE_LOCALES` offers `/tk` and `/ru` (hreflang, sitemap and the language switch follow from `SITE_LOCALES`).
- Restore the client's `messages.test.ts` to `it.each(MARKET_LOCALES)` and `expect(SITE_LOCALES).toEqual(MARKET_LOCALES)`
  (both carry a comment saying so).
- Flip `TURKMENISTAN.defaultLanguage` to `tk` (book Q-292: the market's main language for new visitors and for SMS
  to clients without an account), and with it `market.test.ts`, `model.test.ts` (`defaultLanguage` 'en'),
  `packages/i18n/src/index.test.ts` (`DEFAULT_LOCALE` 'en'); check the client's `pickLocale`/`siteLocale` fallbacks
  and `x-default`.
- The api's default internal statuses (`settings/statuses.ts`) and the seed name texts are written in
  `MARKET.defaultLanguage`: existing businesses keep their English «Arrived»/«Started».
