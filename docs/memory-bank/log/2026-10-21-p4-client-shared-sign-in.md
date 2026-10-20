# The sign-in and the api plumbing shared by the apps, P4 slice 1 (refactor/shared-sign-in)

- Why: the client site (`apps/client`, P4 slice 1) logs in with the same phone and code steps as the business app
  (book C-18, C-19, B-07; one shared code step, Q-157) and needs the same api client and cache. A package never
  imports an app (ADR 0004), so the domain-free parts move down instead of being copied (techContext said: move them
  with the second app).
- `@yeral/sdk`: `createApi()` (client + query cache + sdk, and the client for `startEvents`; a refusal
  is never retried, `shouldRetry`), `type Api`; `@yeral/sdk/react` (new subpath; `react` joins the sdk's peers and its
  lint runs the React rules): `SdkProvider`, `useSdk()`. The business app's `shared/api` passes them
  on, so its screens keep importing from `@/shared/api`; `useSignOut()` stays there.
- `@yeral/features` (new package, one subpath per FSD feature slice, as systemPatterns planned):
  `@yeral/features/auth-by-phone` = `model/sign-in.ts` (the reducer and its view), `model/use-sign-in.ts` (the
  requests and the clock; the screen's language only when the market offers it, since the api refuses others; use-intl
  is a peer, so the hook reads the app's provider), `lib/phone.ts` (`PHONE_RULES`,
  `phoneProblem()`, `mobileStarts()`), moved with their tests from `apps/business/src/pages/login`. The steps' UI stays
  in each app: the business app draws them in `AuthPage`, the client site in its login modal.
- No behaviour changes; no changeset (nothing a user sees).
