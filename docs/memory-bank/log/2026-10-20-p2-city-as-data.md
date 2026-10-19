# The city as data (feat/p2-3-city-as-data)

- Changed: P2 step 3, part 4 (book Q-107, F-240). A `cities` table (seeded per market from
  `apps/api/src/db/seed/cities.ts`, like the categories, in production too) and `MARKET.mainCity`; every business and
  place has a `cityId` (migration 0008 puts existing rows in the main city). `GET /v1/cities?lat&lng` gives the list,
  the main city and the one a position is in (`nearestCity()`, centre within 50 km). Search takes `?city=`: the list
  keeps to the chosen city, or the main one (also for an unknown city); a position (near me, or a picked place) and the
  map area cross city lines; the response says which city (`city`). "Näme?" and "Nirede?" suggestions take `?city=`
  too. Cards, the business page, the booking detail, the workspace switcher and invites carry `city: { id, name }`; a
  reminder SMS names the city outside the main city (`smsCityOf()`, `fmt.addressIn()`). `setup` brings the cities and
  categories up to date even when it keeps a demo (`seedCatalogue()`). The sdk has `catalog.cities()` (position rounded
  to ~1 km in the key) and a city on `catalog.places()`.
- Decided (Claude, delegated; chapter 9): the search rules above and the SMS rule.
- Follow-ups: the business settings and the admin tool set a business's city (step 4–5); the client site shows the
  choice and compares cities (P4); activeContext: Q-107 done, next offered times tied to one specialist (Q-159).
