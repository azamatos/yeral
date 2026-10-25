# The page address a business chooses: the api (feat/page-address-api)

- Decided: chapter 9, 25.10.2026, F-115 / B-03 / B-43 (how): owner (choose the address), Claude (delegated) the rules:
  3–48 of a–z, 0–9 and single hyphens inside, not `yr-…`, not a reserved word (`RESERVED_SLUGS`), not another
  business's now or before; any time, by whoever changes the settings, never the shared demo workspace's; after the
  setup an old address keeps opening the page and stays the business's; a draft's isn't kept. The limits row (chapter 5)
  and B-43's edge cases say the same.
- Changed (domain, contract): `SLUG_MIN`, `RESERVED_SLUGS`, `slugProblem()` in `@yeral/domain/setup`;
  `pageAddressSchema` in `@yeral/contract/common`; `PAGE_ADDRESS_PROBLEMS`, `pageAddressCheckQuerySchema`,
  `pageAddressCheckSchema`, `pageAddressInputSchema`, `pageAddressResultSchema` in `@yeral/contract/settings`;
  `setupStartSchema` takes an optional `slug`. All additive.
- Changed (api): migration 0043 adds `business_old_slugs` (slug key, business, retired at; only a new table, so a
  rollback past it needs nothing). `modules/settings/page-address.ts`: `GET /v1/page-address?slug=&business=` (signed
  in; `business` = the asker's workspace, whose own addresses are free to it) answers `{ slug, problem, suggestion }`;
  `PUT /v1/w/{slug}/settings/page-address` (settings permission) moves the business, keeping the old address after the
  setup (5 moves a day, `PAGE_ADDRESS_MOVES_PER_DAY`, 429 past it), `invalid` or `taken` on `slug` (a race on the unique
  address too), its own address no change whatever rules came after it, 403 for the demo workspace; `POST /v1/setup`
  with `slug` uses it (`taken` when another business has it), without it `freeAddress()` makes one from the name (it
  now also skips old addresses and reserved words, and never runs out). The check: 300 an hour per account, the
  business's own address fine, a suggestion for a taken or reserved one. `businessAt()` (catalog/detail.ts) opens a
  business by an old address for `visibleBusiness()` (the page, its reviews, its free times) and `publicBusiness()`
  (booking, favourites): `GET /v1/businesses/{old}` answers the page with its new `slug`. The example seed skips an
  address a business had. Events: `business.updated`, so the team's switchers refresh.
- SDK: `sdk.settings.pageAddressCheck(params)` (`keys.pageAddress`) and `sdk.settings.setPageAddress(slug)`.
- Business app (feat/page-address-app): `features/page-address`: `usePageAddressCheck(slug, { business, own })`
  (`model/check.ts`: the rules at once, then the api after a 300 ms pause, a reserved one asked too for its suggestion;
  `unknown` when the check failed, the save asks again), `savable()`, `takenOnSave()` (a save another business beat:
  the toast says it and the checks ask again), `PageAddressField` (InputGroup with `pageLink('').display` as the
  prefix box, lower case and hyphens letter for letter as typed, the caret kept; «This address is free.» or the
  problem with «Use …»). The wizard's business step: a «Page address» field under the name (it replaces the drawn
  «Your page: …» line), the address the name gives as the api makes it (a taken or reserved one's free one like it)
  until the owner writes their own; Continue waits for a good one («Pick a page address that's free.»); a new draft
  gets `slug` only when written; a draft's good edits are saved on leaving, the address last (one still being checked
  too); `sdk.setup.step()` now takes the draft's address with the step, read from the refreshed draft, so a step saved
  after a move goes to the new address. Settings → Link and QR: «Change link» under the link (not for the demo
  workspace): the field, the note that old links and printed QR codes keep working, Cancel / Save link (Enter,
  Escape); after the move the page opens at `/w/{new}/settings/link` with «Your page's link is now …».
- Shell: a teammate's open tab at the old address goes to the new one at the same section once their workspaces
  refresh (the `business.updated` event), through `placeFor` (unit test), with no "closed" toast.
- Handoff:
  - The client site's business page (slice 3): when `GET /v1/businesses/{slug}` answers another `slug`, redirect
    permanently to `/b/{that}`.
  - Not done: `/v1/w/{old}/…` doesn't open the workspace (events name a business by its address as they're read); a
    bookmark or link to `/w/{old}/…` opened later goes to the person's last used workspace with "This section is closed
    to you", a wrong word for a workspace that moved (asking the public read for where an old address went would fix
    it).
