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
- Handoff:
  - The business app (next PR): the wizard's business step's editable address (`setup.start` with `slug` only when
    the owner wrote one; a draft's later change through `setPageAddress`) and Link and QR's «Change link»; after a
    change the app goes to `/w/{new}/…`.
  - The client site's business page (slice 3): when `GET /v1/businesses/{slug}` answers another `slug`, redirect
    permanently to `/b/{that}`.
  - Not done: `/v1/w/{old}/…` doesn't open the workspace: events name a business by its address as they're read, so
    another member's open tab at the old address learns nothing from them; its switcher's refresh (`workspaces`) has
    the new address, and the business app should move a workspace page whose address is gone to the one it has now
    (the business PR checks the shell does).
