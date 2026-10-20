# The sign-in code on the screen (feat/p2-code-on-screen)

- Asked by the design/build session (web-b2): the business app's `/login` shows the code callout (design §28.2) when
  the answer has `code`, the plain code step otherwise.
- Changed: P2 step 6's code on the screen, book Q-036, F-200 (chapter 9 how-row, 20.10.2026, Claude (delegated)).
  - `SIGN_IN_CODE_ON_SCREEN` (`config.ts`, `Deps.codeOnScreen`): off unless `true`; `createDeps` refuses it with an
    SMS port that delivers (`SmsPort.delivers`: `false` for `logSms`). The server's `compose.yml` keeps it `false`.
  - `sendCode` (`auth/codes.ts`) answers with `code` only for `onScreen` (the plain sign-in) while it's on and no SMS
    delivers; `sendCodeResponseSchema` has an optional `code`. A booking link's code never shows.
  - While it's on: `/me/phone/code` and `/verify` refuse (`phone_change_unavailable`, 409); `afterCode` signs an
    unused account in as it is (no "Is this you?"), and an old question's "No" is refused.
  - The code is saved only while the last one may be replaced (`setWhere` on the upsert): two sends at once make one
    code and one SMS, the other `resend_too_soon` (this also settles the follow-up "two send-code taps can send two
    codes").
- Tests: `auth.test.ts` (off: no code; on: 1234; on with a delivering gateway: none; production's random code, two
  sends at once, the shown code signing in), `links.test.ts` (no code from a link even when on), `me.test.ts` (no
  phone change when on), `identity.test.ts` (an unused account signs in as it is when on).
- Review (9; 8 fixed, 1 to the owner): it was on everywhere, decided by the SMS adapter (now an explicit switch, off
  unless set); a link's code, a phone change and "Is this you?" leaned on the number proving the person (now not
  shown, refused, not asked); two sends at once could show a code another replaced (one code now); tests for every
  route; chapter 8 and operations.md; the test app takes `demo` and `codeOnScreen` instead of changing `deps.site`.
  To the owner: Q-036's concern, since anyone who knows a real workspace member's number signs in as them once it's
  on. The race of two sends has no forcing test (it needs a concurrency harness, like the others listed).
- Follow-ups: the admin tool's sign-in (step 5) must not rely on it (second factor, F-178); the Turkmenistan launch's
  gateway sets `delivers: true` (P6); the apps hide "change number" when the answer says `phone_change_unavailable`.
