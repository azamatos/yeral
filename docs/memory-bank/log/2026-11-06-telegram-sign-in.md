# The sign-in screens for the Telegram code (feat/telegram-sign-in, design v0.7 round 7.1, B10)

- Changed: `SignInCodeStep` draws the Telegram code step (`telegram-step.tsx`, DS-Lists → 06 · B10) when `delivery` is
  `telegram` / `telegram_link`: boxes 52 (56 under 768) without a label or Confirm, the 32 px resend slot («Send a new
  code in 0:42» → «Send a new code», «Checking…»), Secondary «Open Telegram» (Primary «Send a new code» once the code
  expired), the «No Telegram on this number?» help (a popover above the button from 768: the text, Call / Telegram from
  `site.support`, «Link again»; a bottom sheet under 768: `DrawerHeader`, the text, full-width «Call Ýeral» / «Write on
  Telegram», Tertiary «Back to the code», «Link again»), the three linking steps above the boxes for `telegram_link`,
  «Signed in» (`success`), «Telegram didn't answer» (`sendFailed`). The phone step says «Get the code» with the caption
  «We'll send a code to your Telegram.» when `/auth/mode` says `telegram`; the code step's lead is «We sent the code to
  your Telegram, +993 •• •• •• 10» (`maskPhone(…, 'last')`). The on-screen code's demo notes are gone from both apps
  (`SignInDemoNote`, `login.demoNote`, `login.phoneHintDemo`); the `screen` path keeps «Your code: 4821» for local dev
  and CI. `CodeInput` gains `success` and `responsive="up"`.
- The model (`sign-in.ts`) carries `delivery`, `link`, `sendFailed`, `verified`; `useSignIn` / `useCodeSteps` add
  `relink()` and `showSuccess` (the sign-in only): a right code says «Signed in» for `SUCCESS_MS` (0.6 s) before the
  request's own `onSuccess` puts `me` in the cache — that cache write is what moves both screens on, so the hook holds
  it in the mutation's `onSuccess`, not with a timer of its own.
- Api: `relink: true` on `POST /auth/code` answers `telegram_link` with a fresh nonce although a link is stored (a lost
  Telegram account, a recycled number); the contact shared in the new chat replaces the link, the same limits apply.
  A Telegram error other than 403 answers `telegram_unavailable` (503): the code row just saved is deleted so «Try
  again» isn't told to wait, the log line names the method, status and Telegram's words — `TelegramError` never
  carries the token, and a network error's message is scrubbed of it (`ports/telegram.ts`; a test proved a fetch
  failure's message can carry the URL). The `telegram` answer carries `link: https://t.me/<bot>` so «Open Telegram»
  opens the chat. `memoryTelegram` has `down` for the tests.
- Stories (every B10 state at 1440 and 390): Inputs/SignInCodeStep → Telegram* (phone, code sent, on a phone, linking,
  typing, resend ready, checking, wrong, expired, too many codes, unavailable, success, help popover, help sheet);
  Client/Features/LogIn → Telegram, TelegramLinking, TelegramUnavailable, TelegramLinkAgain, TelegramSheet;
  Business/Access/LoginFlow → Telegram, TelegramLinking, TelegramUnavailable, TelegramPhone; the workspace shell's
  ChangeNumberTelegram. The fakes take `telegram: { linked, down }` (`authApi`, the business login's `fakeApi`) and
  `telegram: true` (the shell's account). The step's hidden live region repeats every message: a text check uses the
  visible match (`onScreen` / `shown`), and the boxes' input isn't visible (`toBeInTheDocument`, not `toBeVisible`).
- Languages: the client and business apps ship `en.json` only (English for the first launch, ADR 0022), so the new
  `login.telegram.*` keys have no tk/ru yet; the error code `telegram_unavailable` got its tk/ru/en message in
  `@yeral/i18n` (the contract test wants every code in all three).
- Left: the number change in the workspace shell (`layout="inline"`) doesn't draw the Telegram step, so a
  `telegram_link` answer there has nowhere to show the link; the business app's «Signed in» on the setup page (it uses
  the same `SignInForm`, untested); tk/ru for the apps' `login.telegram.*` when the apps get those languages.
