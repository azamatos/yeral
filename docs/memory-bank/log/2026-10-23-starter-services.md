# The starter services in groups (feat/api-starter-services)

- Changed: `GET /v1/categories` gives each category's `starterGroups` (`[{ name, services: [{ name, durationMin,
  price: { type, amount } }] }]`), in the asked language, groups in the catalogue's order (contract `categorySchema`;
  `starterGroups()` in `apps/api/src/modules/catalog/map.ts`). The seed's starter services (`db/seed/categories.ts`) are
  B-Onboarding's `starter(cat)` lists with their groups, minutes, TMT and "from" prices; `StarterService` gained a
  `group` (jsonb data, no migration). The seed upserts the catalogue, so the next deploy brings them to the server.
- Decided: chapter 9, 23.10.2026, F-098 / B-04 (how), Claude (delegated). TK/RU names are drafts for the native review.
- What the services step (wizard step 5) can read now: `sdk.catalog.categories(lang)` → the draft's category by
  `setup.categoryId` → `starterGroups` (every row on at first, "Select all" / "Clear" per group); an empty list means
  "Add your services". Creating them goes through the existing service-group and service endpoints (a group per
  starter group, then its picked services).
- Follow-ups: the setup page's story mock (`pages/setup/ui/setup-page.stories.tsx`, `GET /categories`) has no
  `starterGroups` yet; the services step adds it with its stories.
