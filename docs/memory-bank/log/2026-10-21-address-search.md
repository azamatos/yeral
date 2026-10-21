# 2026-10-21 · The address search (F-099; ADR 0027)

- `ports/geocoder.ts`: `GeocoderPort`, `photonGeocoder()` (Photon at `GEOCODER_URL`, the public one by default: the
  market's country, near the city, a named User-Agent, 3 s, a day's cache), `memoryGeocoder()`, `noGeocoder`.
- `GET /v1/w/{slug}/settings/address-search?q=&cityId=&lang=` (owner, administrators, the wizard's drafts): up to 6
  places (`label`, `line`, `street`, `lat`, `lng`); 120 an hour per account; `address_search_unavailable` (503) when
  it's off or Photon fails, and the app lets the pin be placed by hand. sdk: `settings.addressSearch(slug, params)`.
- The apps' address step and "Salgyny üýtget" come with slice 2, with "© OpenStreetMap contributors" under the list.
- Why Photon: the public Nominatim forbids type-ahead; paid geocoders need the owner's account. See ADR 0027.
