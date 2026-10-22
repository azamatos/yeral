# 0027. The address search goes through a geocoder port: Photon over OpenStreetMap

- Status: Accepted 2026-10-21
- Decided by: the product book (F-099 MVP: "address search, draggable pin"; B-04's address step: "Search for the
  address, then fine-tune the pin on the map", "Pick the address from the list") + Claude (how, delegated: free, no
  account; a paid geocoder would be the owner's call)

## Context

A business sets its address by searching it, picking one from a list, and dragging the pin onto the entrance (B-04,
B-37). That needs a geocoder with type-ahead. The maps are MapLibre with OpenFreeMap (owner, 14.10.2026), so the data is
OpenStreetMap's. The public Nominatim forbids type-ahead ("you must not implement such a service on the client side")
and allows at most 1 request a second. Photon (komoot) is built for type-ahead over the same data; its public server is
free with fair use ("extensive usage will be throttled"), with no guarantee. Paid geocoders (MapTiler, LocationIQ,
Geoapify) need an account and a key. Turkmenistan's OpenStreetMap streets are fair and its house numbers sparse.

## Decision

- **A port** (`apps/api/src/ports/geocoder.ts`, like the storage port, ADR 0007's "portable code"): `search(q, { near,
  country, lang, limit })` → places (`label`, `line`, `street`, `lat`, `lng`). Adapters: Photon at `GEOCODER_URL` (the
  public `https://photon.komoot.io` by default), a memory one for tests; `GEOCODER_URL=off` turns the search off.
- **The api asks, never the browser:** `GET /v1/w/{slug}/settings/address-search?q=&cityId=` (the owner,
  administrators and the setup wizard's drafts, as the profile). It keeps the market's country only (`MARKET.code`)
  and real addresses (a street of its own, or a street's name: no city, district or shop without a street), asks near
  the chosen city's centre, names itself (a User-Agent with the site's address from config and the api's version), waits
  3 s at most, keeps each answer a day in the process (the same letters typed again, in any language Photon answers the
  same, don't reach it) and, after a failure, doesn't ask Photon for a minute. Only searches that reach Photon count:
  120 an hour per account and 240 per internet address (the demo workspace's visitors share one account, so the
  address tells them apart). The app asks after a pause in the typing, from 3 letters, without retrying.
- **Down or off, the pin still works:** the api answers `address_search_unavailable` (503) and the app lets the person
  place the pin by hand and type the line; the address step's "Pick the address from the list" gives way then.
- **Attribution:** the list shows "© OpenStreetMap contributors" (ODbL), as the maps do.

## Consequences

- No account, no cost, no key to keep. The public Photon has no SLA: at the first launch's volume it's enough; for the
  Turkmenistan launch, a self-hosted Photon with the country's extract (a small one) on the server, or a paid geocoder,
  is a config change (`GEOCODER_URL`, which may carry a path) with no code change.
- Addresses typed by businesses reach a third party (komoot, Germany). They're the businesses' public addresses, so
  nothing private leaves.
- Where OpenStreetMap has no house number, the list has the street, and the person types the number into the line.
