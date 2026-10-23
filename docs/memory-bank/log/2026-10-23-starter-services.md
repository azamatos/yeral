# The starter services in groups (feat/api-starter-services)

- Changed: `GET /v1/categories` gives each category's `starterGroups` (`[{ id, name, services: [{ id, name,
  durationMin, price: { type, amount } }] }]`; ids are slugs unique in the category), in the asked language, groups in the catalogue's order (contract `categorySchema`;
  `starterGroups()` in `apps/api/src/modules/catalog/map.ts`). The seed's starter services (`db/seed/categories.ts`) are
  B-Onboarding's `starter(cat)` lists with their groups, minutes, TMT and "from" prices; `StarterService` gained `id`
  and `group: { id, name }` (jsonb data, no migration). `db/seed/categories.test.ts` checks every starter against the
  menu's limits (`serviceErrors`) and the ids. The seed upserts the catalogue, so the next deploy brings them to the server.
- Decided: chapter 9, 23.10.2026, F-098 / B-04 (how), Claude (delegated). TK/RU names are drafts for the native review.
- What the services step (wizard step 5) can read now: `sdk.catalog.categories(lang)` → the draft's category by
  `setup.categoryId` → `starterGroups` (every row on at first, "Select all" / "Clear" per group); an empty list means
  "Add your services". Creating them: with the services step, an api call that takes the picked starter ids and the
  owner's edits and makes the groups and services in one transaction (planned): the browser would otherwise send a
  POST per group and service (a half-built menu on a failure, duplicates on a retry), and only the api has every
  language of a starter's name (the categories list gives the asked one).
- Follow-ups, from the review (not done here): the public categories list now carries about 40 starter rows the
  client site doesn't read (a `?with=starters` or a per-category endpoint if it grows); the category seed is
  Turkmenistan's (TMT prices, tk/ru/en names) like the rest of the catalogue until the CMS (M6), and the seed's upsert
  overwrites the catalogue on every setup. The setup page's story mock (`pages/setup/ui/setup-page.stories.tsx`, `GET /categories`) has no
  `starterGroups` yet; the services step adds it with its stories.
