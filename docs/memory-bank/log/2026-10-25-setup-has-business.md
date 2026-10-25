# «You already have a business» before the setup wizard (#195, feat/setup-has-business)

- Changed: `pages/setup/ui/has-business.tsx` (`HasBusiness`, on `AuthPage` like the login's choices): someone already in a
  workspace (any level) who opens `/setup/…` with no draft sees their businesses (Avatar logo or letter, name,
  «level · city» from `shell.where`) each with «Open» (`/w/{slug}/calendar`), «Create another business» (a link to
  `/setup/business?another=true`) and the sign-in's account line («Log in with another number» signs out; the wizard's
  step 1 opens). `Wizard` (`setup-page.tsx`) shows it before the business step and before waiting for the categories;
  the route validates `another` with `setupSearch` (`pages/setup/model/search.ts`, unit-tested); the sign-in redirect,
  the step redirect and the wizard's own moves keep it. The switcher's «Create a business» and Business profile's
  «create a business» link pass `another: true`. A draft reopens as before (#155). The tab title follows the page
  (the choice names itself; the steps and step 1 say «Set up your business»). `AccountLine` moved from `pages/login`
  to `features/sign-in` (two users now); the round icon tile is `iconTile` in `shared/ui`.
- Decided: the owner asked for it after trying business.yeral.app (25.10.2026); chapter 9, 25.10.2026 (B-02, B-10, how);
  the book's B-02 (flowchart, edge case) and B-10 (step 4) updated.
- Review (one round, 13 findings): fixed the account line, the flag kept through the sign-in redirect and the wizard's
  moves, the choice not waiting on categories, «Create another business» as a link, the copied caption and icon tile,
  the validator's test, the tab title, a story for a draft with a business already (`ReopensWithBusiness`), the book.
  Kept: the explicit flag (the design's `fromSwitcher`) rather than deciding only at step 1, so an old link or
  bookmark gets the choice too.
- Follow-ups: focus lands on the page after «Create another business», as after every step change in the wizard
  (the frame moves focus nowhere); the workspace row (logo, name, «level · city») is drawn three times (the switcher in
  `@yeral/ui`, My account, here) and could be one component; the choice could name a business's page state (in review,
  hidden); the login's «Start free» could skip the phone step for someone already signed in.

## The done step's link and QR as Settings shows them (fix/setup-done-qr)

- Changed (#199): the owner found the wizard's last step's link and compact QR unclear (25.10.2026); it now shows them
  as Settings → Link and QR does, full width under the preview card: «Your page link» with the field, Copy and Share
  (`PageLinkField`) and the language note where the market has several, then «QR code» with the large card
  (`PageQrCard`, new in `shared/ui`: the code at 200, the business name, the link, the note, Download PNG / SVG, «PNG for
  printing, SVG for designers.»), which Settings uses too. The step keeps saying they open after the review (its
  caption and the card's `note`). The shared words moved to `pageLink.*`; `SettingsSectionTitle` takes `as="h2"` for
  the step's titles; `QrBlock`'s compact variant has no screen now. Chapter 9 and B-06 updated.
- Review (one round, 10 findings): fixed the half-width link, the lost after-review words, the book row, the language
  note, the copied title style (now `as`), techContext's row, QrBlock's stale docs, a phone story and the whole-address
  check, the long comment. Kept: the download status reads as Settings' («QR code downloaded · PNG»).
