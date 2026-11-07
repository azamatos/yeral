# 0029. Sign-in codes through our own Telegram bot until SMS launches

- Status: Accepted 2026-11-06 — amends [0019](0019-own-phone-login-and-sessions.md) (how the code reaches the person)
  and [0023](0023-one-deployment-per-market.md) (the first launch's "no SMS")
- Decided by: owner ("Telegram for OTP by phone number… until we launch mobile number sms service", 2026-11-06) +
  Claude (how, delegated)

## Context

- The sign-in is a 4-digit code to the phone (ADR 0019). No SMS gateway exists yet for Turkmenistan (book Q-036), so
  the first launch shows the code on the screen (`SIGN_IN_CODE_ON_SCREEN=true`, F-200): a number proves nothing, and
  with it everything that needs the number to be the person's is held back: verifying a real business
  (`verify_unavailable`, ADR 0023), changing one's number, letting an unused account go ("Is this you?", Q-270).
  Real businesses can't join while it's on; the owner's review of the live platform (2026-11-06) made it the first
  thing to fix.
- Telegram is the messenger the market uses. Its Gateway API (`sendVerificationMessage`) would send our codes with
  no change to the screens, but it needs a $100 deposit and a prepaid balance, and it carries verification codes only:
  too much for a temporary way (the owner, 2026-11-06). The Login Widget returns a Telegram id, not a phone: it
  doesn't fit phone accounts.
- A bot of our own is free, reaches a phone once its person has shared their number with it (Telegram vouches for the
  number: a `contact` message whose `user_id` is the sender's own), and can carry any text, not only codes.

## Decision

Sign-in codes go to the person's Telegram through our own bot, **@yeral_app_bot** on the server, until an SMS gateway
comes. The api side (`apps/api/src/modules/telegram`, `ports/telegram.ts`, ADR 0005's ports):

- **Config:** `TELEGRAM_BOT_TOKEN` (from @BotFather), `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_BOT_USERNAME`. With the
  token set, the other two are required and `SIGN_IN_CODE_ON_SCREEN` must be `false` (the api refuses to start
  otherwise: codes reach phones, so the screen may not show them). Without the token nothing changes: local
  development, the tests and CI's stack keep the code on the screen or in the log.
- **Asking for a code** (`POST /v1/auth/code`, the phone change's and the booking link's codes too) answers one of four
  by `delivery`: `screen` (the code, the first launch), `sms` (a gateway, one day; the log today), `telegram` (the
  number is linked: the bot sent the code to its chat), `telegram_link` (not linked: the answer carries
  `https://t.me/<bot>?start=<nonce>`; the code waits). `GET /v1/auth/mode` says ahead which of the first three it
  will be. The code's limits (5 minutes, 59 s resend, 3 tries, 5 an hour) are the same whichever way it goes.
- **The first time** (what the user does): the sign-in screen shows the link; the person opens it, Telegram opens the
  bot with Start; the bot asks for the number with a "Share my number" button (`request_contact`); the person taps
  it; the bot links the number to the chat and sends the code; the person types it on the site. From then on the code
  arrives in the chat straight away.
- **Linking is strict:** the nonce lives 10 minutes, is single-use and is stored as a hash bound to the phone that
  asked; the bot accepts only the sender's own contact (`contact.user_id === from.id`), normalised by the market's
  phone rules, and only when it equals that phone. A different number gets a clear reply and no link. One chat holds
  one number: a new contact replaces the chat's old link (a Telegram account has one number, and the old one may be
  someone else's by now). Since only code hashes are stored, the code sent on linking is a fresh one for the same
  request.
- **The webhook** (`POST /v1/telegram/webhook`) checks `X-Telegram-Bot-Api-Secret-Token` in constant time (401
  otherwise), ignores a repeated `update_id` (Telegram repeats an update until it's answered) and always answers 200
  once the secret matches, because an update Telegram can't deliver holds every later one back. The api CLI's
  `telegram-webhook` registers it (`setWebhook` with the api's address, the secret, messages only); the deploy steps
  in `infra/server/README.md` say when.
- **Every other text on the SMS port** (booking notices to clients, ADR 0005) goes through the bot to a linked phone
  too; an unlinked phone keeps today's log-only delivery. A person who blocked the bot (403) loses the link, so their
  next sign-in asks them to link again, and that text counts as not sent.
- **Privacy:** the bot links a number only when Telegram vouches for it, so the Telegram account's number has to be
  the one typed on the site; the bot's replies show the typed number masked. The links are a table of their own
  (`telegram_links`: phone, chat id, Telegram user id), with no foreign key to accounts, since a number links before
  its account exists.

## Consequences

- `SIGN_IN_CODE_ON_SCREEN` goes off on the server once the bot is set up. With it off: the Ýeral team can verify real
  businesses; "Change number" works; the 6-month "Is this you?" check runs and "No" lets an account go;
  `make-example` refuses to open new examples (`--off` still works); `EXAMPLE_BUSINESSES` doesn't depend on it
  and stays as it is; e2e's `signInWithCode` keeps reading the code from the screen on CI's stack, which
  has no bot.
- The sign-in screens get two states (the link to open; the code on its way to Telegram) — the next PR, built on the
  `delivery` union; until then they treat `telegram` and `telegram_link` as "sent".
- The sign-in now depends on Telegram's reachability in the market; the owner knows it. When an SMS gateway comes,
  an adapter on the SMS port takes over sign-in codes and this bot stays as the channel for notices (and the
  notifications idea).
- Three tables (`telegram_links`, `telegram_link_requests`, `telegram_updates`; migration 0047); the jobs prune
  expired requests and day-old update ids every minute.
- Left: the screens (next PR); the owner creates the bot, puts its token, a secret and the username in
  `/srv/yeral/.env`, runs `telegram-webhook` and sets `SIGN_IN_CODE_ON_SCREEN=false`; SMS later (book Q-036).

## Alternatives considered

- **Telegram Gateway API** (`sendVerificationMessage`): no change to the screens and $0.01 a code, but a $100
  deposit and a prepaid balance for a temporary solution, and codes only (the owner, 2026-11-06).
- **Telegram Login Widget:** returns a Telegram id, not a phone; doesn't fit phone accounts.
- **Linking without the nonce** (any own contact links): simpler for a late person, but then a link could be made with
  no sign-in asked for; the nonce ties the link to a request from the site.
- **Keeping the code on the screen** until SMS: blocks real businesses (Q-036's concern).
