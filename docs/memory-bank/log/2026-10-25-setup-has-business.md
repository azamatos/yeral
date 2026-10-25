# «You already have a business» before the setup wizard (feat/setup-has-business)

- Changed: `pages/setup/ui/has-business.tsx` (`HasBusiness`, on `AuthPage` like the login's choices): someone already in a
  workspace (any level) who opens `/setup/…` with no draft sees their businesses (Avatar logo or letter, name,
  «level · city») each with «Open» (`/w/{slug}/calendar`) and «Create another business», which opens
  `/setup/business?another=true`. `Wizard` (`setup-page.tsx`) shows it before the business step; the route validates
  `another` (`{ another?: true }`), and the redirect to the right step keeps it. The switcher's «Create a business» and
  Business profile's «create a business» link pass `another: true`. A draft reopens as before (#155). Messages under
  `setup.hasBusiness`. Stories `HasBusiness`, `HasBusinesses`, `CreateAnother` (with `?another=true`); the shell's
  `CreateBusiness` checks the flag.
- Decided: the owner asked for it after trying business.yeral.app (25.10.2026); chapter 9, 25.10.2026 (B-02, B-10, how).
- Follow-ups: the choice could name a business's page state (in review, hidden) as the switcher's banner does; the
  login's «Start free» could skip the phone step for someone already signed in.
