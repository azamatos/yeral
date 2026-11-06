# Sign-in codes through our Telegram bot, api side (feat/telegram-codes)

- Changed: `POST /v1/auth/code` (and the phone change's and booking link's codes) answers one of four by `delivery`
  (`screen` + `code`, `sms`, `telegram`, `telegram_link` + `link`), `GET /v1/auth/mode` adds `delivery`; a Telegram
  port over plain `fetch` (`ports/telegram.ts`), the links module and the webhook (`modules/telegram`), three tables
  (migration 0047), the SMS port through the bot for linked phones, the CLI's `telegram-webhook`, config
  `TELEGRAM_BOT_TOKEN` + `TELEGRAM_WEBHOOK_SECRET` + `TELEGRAM_BOT_USERNAME`, the i18n keys `telegram.*` (en, tk, ru).
  `use-sign-in.ts` reads `code` from the `screen` variant only, so the apps build; the screens don't show the new
  states yet.
- Decided: ADR 0029 (the bot, not the Gateway nor the Login Widget; strict linking through a nonce; the code sent on
  linking is a fresh one, since only hashes are stored; blocked bot → link dropped; other SMS texts through the bot).
- Follow-ups: the sign-in screens' PR (the link state, "the code is in your Telegram", `/auth/mode`'s `delivery`
  for the phone step's hint; the stories' fake api answers get `delivery`); the owner creates the bot, sets the three
  variables and `SIGN_IN_CODE_ON_SCREEN=false` on the server, runs `telegram-webhook` (`infra/server/README.md`);
  the product book's chapter 8 ("No SMS gateway in the code") and chapter 9's row for 2026-11-06 are the lead's, as the
  book is edited whole; `docs/API.md` doesn't list the webhook (Telegram's, not the apps').
