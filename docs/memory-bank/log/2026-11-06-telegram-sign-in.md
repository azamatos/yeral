# The sign-in screens for the Telegram code (feat/telegram-sign-in, design v0.7 round 7.1, B10)

- Changed: `SignInCodeStep` draws the Telegram code step (`telegram-step.tsx`, DS-Lists → 06 · B10) when `delivery` is
  `telegram` / `telegram_link`: boxes 52 (56 under 768) without a label or Confirm, the 32 px resend slot («Send a new
  code in 0:42» → «Send a new code», «Checking…»), Secondary «Open Telegram» (Primary «Send a new code» once the code
  expired), the «No Telegram on this number?» help (popover: the text, Call / Telegram from `site.support`, «Link
  again»), the three linking steps above the boxes for `telegram_link`, «Signed in» (`success`), «Telegram didn't
  answer» (`sendFailed`). The phone step says «Get the code» with the caption «We'll send a code to your Telegram.»
  when `/auth/mode` says `telegram`; the code step's lead is «We sent the code to your Telegram, +993 •• •• •• 10»
  (`maskPhone(…, 'last')`). The on-screen code's demo notes are gone from both apps (`SignInDemoNote`,
  `login.demoNote`, `login.phoneHintDemo`); the `screen` path keeps «Your code: 4821» for local dev and CI. The model
  (`sign-in.ts`) carries `delivery`, `link`, `sendFailed`; `useSignIn` / `useCodeSteps` add `relink()`; the contract
  takes `relink` on the code request and names `telegram_unavailable` (503). `CodeInput` gains `success` and
  `responsive="up"`.
- Left (this PR's follow-ups): the api side of `relink` (answer `telegram_link` although a link is stored) and of
  `telegram_unavailable` (a Telegram error other than 403 must not 500 `/auth/code`), with tests; the Telegram
  stories (every B10 state at 1440 and 390 in Inputs/SignInCodeStep, the client modal + sheet, the business login) —
  the fakes answer `sms`/`screen` today; the help as a bottom sheet on 390 (a popover everywhere for now); the
  `success` moment wired from a right code; the `telegram` answer could carry the bot's link so «Open Telegram» opens
  the chat (today `tg://`); Turkmen and Russian for `login.telegram.*`.
