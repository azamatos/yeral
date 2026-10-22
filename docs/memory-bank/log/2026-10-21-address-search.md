# 2026-10-21 · The address search (F-099; ADR 0027)

- `ports/geocoder.ts`: `GeocoderPort` (`search`, and `cached` for an answer it keeps), `photonGeocoder()` (Photon at
  `GEOCODER_URL`, the public one by default, a path allowed: the market's country, near the city, a User-Agent with
  the site's address and the api's version, 3 s, a day's cache keyed by the language Photon answers in, a minute's
  pause after a failure; real addresses only: a street of its own or a street's name), `memoryGeocoder()`,
  `noGeocoder`.
- `GET /v1/w/{slug}/settings/address-search?q=&cityId=&lang=` (owner, administrators, the wizard's drafts): up to 6
  places (`label`, `line`, `street`, `lat`, `lng`); only searches that reach the geocoder count, 120 an hour per account
  (not the demo's shared owner) and 240 per address; `address_search_unavailable` (503) when it's off, paused or
  failing, and the app lets the pin be placed by hand. sdk: `settings.addressSearch(slug, params)`, keyed apart from
  the settings (`keys.addressSearch`) and never retried.
- The apps' address step and "Salgyny üýtget" come with slice 2, with "© OpenStreetMap contributors" under the list.
- Why Photon: the public Nominatim forbids type-ahead; paid geocoders need the owner's account. See ADR 0027.

Review (one round, 23.10): the demo's shared account and the per-address limit; no retries in the sdk; cities and
shops without a street left out; the pause after a failure; `GEOCODER_URL` with a path, http(s) only; the sdk key out
of the settings prefix; cached answers not counted; the cache keyed by Photon's language, without the list's length;
the cache's eviction; the User-Agent from the site config.
