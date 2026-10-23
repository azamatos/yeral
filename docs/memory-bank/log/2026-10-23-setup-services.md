# The setup wizard's services step (feat/api-setup-services, feat/setup-services)

- Changed (api): `PUT /v1/w/{slug}/setup/services` (contract `setupServicesSchema`, `setupServices()` in
  `apps/api/src/modules/setup/service.ts`, `sdk.setup.services(slug)`) saves the draft's whole menu in one
  transaction: `groups: [{ starter?, name?, services: [{ starter?, name?, durationMin, priceType, priceAmount }] }]`.
  A starter id is one of the draft's category (`GET /v1/categories` → `starterGroups`); a starter's name stays in every
  language unless the owner changed it (a `name` equal to the starter's in its languages counts as unchanged); without
  `starter` the `name` is needed. It replaces the step's last save (no twins on a retry or a second visit), links every
  service to everyone on the draft's team who takes bookings, and answers the menu (`menuSchema`). The draft's owner
  only, while it's a draft (`invalid_status` after finishing); up to 100 services.
- Decided: chapter 9, 23.10.2026, B-04 / F-098 (how): making the menu, Claude (delegated).
