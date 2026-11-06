# 2026-11-06 — business app: seven fixes from the owner's review

Branch `fix/business-review-fixes`, the business app only (`apps/business` and its messages). The owner's problem
numbers are the review's (`review-a.md` #2, #12, #13; `review-b.md` #37, #44, #46, #47).

## What's there

- **#46 the invite link opened «Page not found».** The api's `inviteLink` is `${urls.business}/invite/${token}`, and the
  business app had no route for it. Now `routes/invite/$token.tsx` → `InvitePage` (`pages/login/ui/invite-page.tsx`,
  the login slice owns the invite step already). `GET /v1/invites/{token}` is public (the api reads the session only
  for the language) and answers the InviteCard with its `state`, or 404. States: signed out → the invite's head
  (business mark, who invited, the level) with the sign-in form in the same card (`InviteSignInStep`); a new number →
  the name step; signed in and the invite is among `GET /me/invites` (matched by id) → the usual `InviteStep`; signed
  in with another number → `InviteOtherNumberStep` with «Log in with another number»; expired / accepted or declined /
  cancelled / unknown token → `InviteGoneStep` with a button to `/login`. Accept opens the workspace's calendar;
  Decline toasts «You declined …» and goes to `/login`, which knows where the person belongs. `InviteMedia` and
  `InviteBy` were lifted out of `invite-step.tsx` for the shared head. Stories: `LoginFlow` → «Invite link · …» (seven),
  with `GET /invites/:token` in the fake api (`LINKS`). `routeTree.gen.ts` regenerated with `@tanstack/router-generator`
  (`new Generator({ config: getConfig(vite's options, root), root }).run()`), since the vite plugin only runs with dev/build.
- **#12 «Show more» on the client card jumped to the top:** `go(patch, { keepScroll: true })` passes `resetScroll: false`
  for the history change only; the card query already keeps the old rows (`keepPreviousData`). The `MoreHistory` story
  now scrolls down first and checks the page stayed there.
- **#13 the alert note** on the client card is the plain note row (B-Client `.note`): TriangleAlert in
  `text-st-pending-dot`, ink text, author · date, a warning-tone (pending colours) «Shown when booking» pill; no Callout.
- **#37 the Requests tab's Answer column** stays on one line: the column is `minmax(200px,1fr)`, the cell
  `flex-row flex-nowrap items-center`, the timer pill and the ✓ ✕ buttons `flex-none`.
- **#47 examples per category:** `settings.services.drawer.namePlaceholder` and `settings.profile.aboutPlaceholder`
  are ICU `select`s on the category id (the 13 launch ids + `other`). The profile page passes its form's `categoryId`;
  the service drawer asks `sdk.settings.profile(slug)` (cached when the profile was opened; `other` until it's known).
- **#2 «Remove from the team»** keeps the button's own padding (the `-ml-1.5 px-1.5` override is gone). The quiet
  destructive style itself is the design round's.
- **#44 «demo» out of the business app's copy:** the workspace banner («A workspace to try {brand}. Changes reset every
  night.»), the sign-in code note («While {brand} is being tried out, the sign-in code shows here instead of coming by
  SMS…»), the `/try` page's opening and off titles. Keys kept their names (`demoNote`, `shell.demo`, `phoneHintDemo`).

## Traps

- `useTranslations('login')` is typed: a template key like `` t(`invite.link.${reason}Title`) `` fails when one member
  of the union has no key; a `const WORDS = {…} as const` map of literal keys is the way.
- The business app has only `messages/en.json` today (the market's languages come with the native review), so the
  i18n CI check has nothing to compare; when `tk`/`ru` arrive, the two ICU `select`s need all 14 branches each.
- Prettier wants `await expect(window.scrollY)…` in a story (`no-floating-promises` on storybook's `expect`).

## What's left

- The masked invited number on «sent to another number» needs a field on the InviteCard (`packages/contract` + the
  api, a hot spot): the card doesn't carry the phone, so the step names no number.
- No e2e spec covers the team invite flow, so none was extended; the states are stories.
- The shared error texts `not_in_demo` and `demo_number` (`packages/i18n`) still say «demo» (shared with the client site).
- The services page's stories don't answer `GET …/settings/profile`: the drawer's placeholder falls to `other` there.
