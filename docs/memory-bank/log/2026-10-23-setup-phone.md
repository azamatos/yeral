# The setup wizard's phone step (feat/setup-phone)

- Changed: signed out (or a new account without its name), every `/setup/{step}` address opens step 1 inside the
  wizard's frame (`pages/setup/ui/phone-step.tsx`): «Welcome to Ýeral Business», the number and the code in
  SignInCodeStep with the demo note, "Is this you?" as on the login, then «What's your name?» with the verified number
  and «Change number» (signs out, the number takes the focus). Continue appears once the number is verified and saves
  the name (`me.update`; Enter too); with a name
  the wizard's own routing opens the business step. The old «Log in or sign up first» card and its messages are gone.
- Shared with the login in `features/sign-in`: `SignInForm` (SignInCodeStep + the demo note + the number's focus after
  «Change number»), `CodeLead`, `NameFields`, `VerifiedNumber`, `IdentityStep` (moved from `pages/login`; it takes the
  page's «Contact Ýeral» link as a component, since a feature can't import another feature). The setup page asks the
  auth mode with the account, so step 1's demo note is there at once. `StepHeader` takes a `titleId`.
- Decided: chapter 9, 23.10.2026, B-02 (how).
- Review (one round): skipped «Continue later» on step 1 (no draft yet; chapter 9's row says why), "Is this you?"
  inside the wizard's frame (keeps the login's card), one `useSignInFlow()` for the login's and the wizard's wiring, and
  the verified number's 15/22 on B-Onboarding (the shared box keeps B-Login's 14/20).
- Follow-ups: the optional photo on the name (both pages; `PUT /v1/me/photo` exists); the terms line under the number
  with the policy pages (slice 7, Q-033); «Try the business app» on the login and here (`sdk.demo.start()`).
