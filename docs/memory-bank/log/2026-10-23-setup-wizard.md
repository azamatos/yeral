# 2026-10-23 · The setup wizard's frame and business step (P4 slice 2, first piece)

- `@yeral/ui` (#152): ProgressBar (goal, flow top bar; Radix Progress, `valueText`), WizardFooter (Back or a `start`
  slot, the hint describing the disabled primary, the primary L; Back waits while it saves), Stepper
  `orientation="vertical"` (summaries, `reached`, `canOpen`, `doneLabel`), Field `optional` and `counter`.
- The business app: `/setup/{step}` (`pages/setup`) is the wizard's frame (B-Onboarding: the 360 aside with the step
  list and summaries, «Continue later», the support line; under 1024 the header with «2 / 8 · Business» and the flow
  bar; the 736 column; WizardFooter) and its business step (the name with its 80 counter and the page address it gives,
  the CategoryPicker over the api's appointment categories with search over names and hints and «No category fits?
  Contact Ýeral.»). Someone signed in has done the phone step; without a draft the wizard is at the business step
  (`setup.start`), with one it opens any step up to the saved one (`stepFor`); going back to the business step edits the
  draft through `settings.updateProfile`; «Continue later» saves the step (`setup.step`) and says where it reopens.
  «Create a business» from the switcher (someone with a workspace): step 1 is «Account», the account box, Cancel.
- The CategoryPicker sits in `pages/setup` for now (FSD lint: a feature with one user merges into it); it moves to
  `features/pick-category` (COMPONENTS.md) when Settings → Business profile uses it too.
- Not built yet (handoff): the phone step inside the wizard (signed out, `/setup/phone` shows a short «Log in or sign
  up first» card with Log in; the login's «Start free» leads there): SignInCodeStep and the name, as the login has them,
  then the business step; the login's «Continue setting up …» card routing an unfinished setup to `/setup/{step}`
  (`entry.ts` still goes to the no-workspace card; the api's `GET /v1/me/setup` has the data, #141); the steps after the
  business one (address with the map pin and the address search, hours, services, team, rules, done with
  `setup.finish`), which show their header and a disabled Continue until each is built.
- Follow-up for the api: `GET /v1/me/setup` names the draft's category only (in the account's language), so the wizard
  finds its id by that name in a list asked in the account's language; a `categoryId` beside it would be cleaner.
- Next step: the address step (MapFrame, the address search endpoint when it merges), then hours.
