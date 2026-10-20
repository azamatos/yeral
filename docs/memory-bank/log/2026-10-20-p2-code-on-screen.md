# The sign-in code on the screen (feat/p2-code-on-screen)

- Asked by the design/build session (web-b2): the business app's `/login` shows the code callout (design §28.2) when
  the answer has `code`, the plain code step otherwise.
- Changed: P2 step 6's code on the screen, book Q-036, F-200 (chapter 9 how-row, 20.10.2026, Claude (delegated)).
  - `SmsPort.delivers` (`ports/sms.ts`): `false` for `logSms`, the adapter every environment uses until a gateway
    comes; `memorySms({ delivers })` plays either in the tests (`testApp(db, { smsDelivers })`).
  - `sendCode` (`auth/codes.ts`) answers with `code` while the port doesn't deliver; `sendCodeResponseSchema` has an
    optional `code` (4 digits). The three routes that send codes (`/auth/code`, a booking link's code, a phone change)
    pass it on. The limits are the same; the SMS still goes to the log with the code hidden.
- Tests: `auth.test.ts` (the code in the answer with the log adapter; none with a delivering gateway; production's
  random code shown, rate-limited and signing in).
- Follow-ups: the admin tool's sign-in (step 5) must not rely on it (second factor, F-178); the Turkmenistan launch's
  gateway sets `delivers: true` (P6).
