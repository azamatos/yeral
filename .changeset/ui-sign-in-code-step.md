---
'@yeral/ui': minor
---

The sign-in code step (DS-Patterns → 05 Inputs), the one phone + code step of the client login, the booking flows,
the business login and the SMS link page:

- `SignInCodeStep` (`@yeral/ui/sign-in-code-step`, Storybook Inputs/SignInCodeStep): a controlled, presentational form
  with the phone step (empty, sending, incomplete, not mobile, too many codes, masked) and the code step (empty,
  typing, checking, wrong code, locked, lock over, resend ready, new code, too many codes). The first-release code on
  screen ("Your code: 4821", a neutral Callout S) is the default; `sms` hides it. It checks on the 4th digit and keeps
  Confirm visible, focuses the first empty box, selects the digits after a wrong code, counts the resend down
  (`formatCountdown`), boxes 48 or 56 and 52 on phones. Every word comes from `copy` and the state props.
- `PhoneInput`: `size` 48 / 44, the prefix box on n-50, 16 px text on phones, and `masked` for a known number shown
  read-only with a lock.
- `CodeInput`: `size` 48 / 52 / 56, `responsive` (52 under 768), a read-only checking look, and a paste with spaces or
  words keeps all four digits.
- `Field`: `status` (`error` · `warning` · `success`) with `message`, each with a 14 px icon; the hint stays under the
  message; warning turns the control's line amber; `messageLive={false}` for a message that ticks. `FieldMessage` for
  a message outside a field.
- `Button`: `loadingText` shows words beside the spinner while loading ("Sending…").
