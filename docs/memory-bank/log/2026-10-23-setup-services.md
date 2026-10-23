# The setup wizard's services step (feat/api-setup-services, feat/setup-services)

- Changed (api): `PUT /v1/w/{slug}/setup/services` (contract `setupServicesSchema`, `SETUP_SERVICES_MAX`,
  `setupServices()` in `apps/api/src/modules/setup/service.ts` over `setMenu()` in `menu/service.ts`,
  `sdk.setup.services(slug)`, which puts the menu it gets back in the cache) saves the draft's whole menu in one
  transaction: `groups: [{ id?, starter?, name?, services: [{ id?, starter?, name?, durationMin, priceType, priceAmount }] }]`.
  A row saved before comes by `id` and keeps what the step doesn't show (description, buffer, online, who does it);
  what isn't sent goes (no twins on a retry or a second visit); a new row is a starter of the draft's category (its
  names in every language while the name sent is the same, each once) or has a name as written. New services are done
  by everyone on the team who takes bookings, or the owner when nobody does. The draft's owner only, while it's a
  draft (`invalid_status` after finishing); up to 100 services.
- Decided: chapter 9, 23.10.2026, B-04 / F-098 (how): making the menu, Claude (delegated).
