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
- Changed (business): the wizard's step 5 (`pages/setup/ui/services-step.tsx` `useServicesStep`, `model/services.ts`):
  the draft category's `starterGroups` (from the categories list the wizard already reads), every row picked,
  «Select all» / «Clear» per group, name (60), duration (15 min–4 h; another kept), price with «from» and TMT
  (`MARKET.currency`), «Add service» into «New services»; Continue sends `servicesInput(form)` when it changed or was
  never saved, and the step list says «3 services» (`GET …/services`). After a save, and back at the step, it shows the saved menu
  (`formFromMenu`): its rows go by id (they keep what Settings added), an edit is written over the app's language only. `Category`, `Menu` and
  `SetupServices` are types in the contract now. Stories: `Services`, `ServicesOwn`; the fake api answers
  `GET …/services` and `PUT …/setup/services`.
- Decided: chapter 9, 23.10.2026, B-04 / F-098 (how): the services step, Claude (delegated).
- Follow-ups: a category changed at the business step after the menu was saved keeps that menu at step 5 (Clear and
  add, or Settings; before a save the step swaps the starter list, own rows kept); the step list's count reads the
  whole menu (`GET …/services`) on the later steps, as the hours step reads the week (a count in `GET /v1/me/setup`
  would be lighter); the api keeps a starter's every catalogue language in the menu, and the step sends back the
  market's only; the team step decides who does which once there's a team (every service is done
  by everyone who takes bookings when it's saved).
