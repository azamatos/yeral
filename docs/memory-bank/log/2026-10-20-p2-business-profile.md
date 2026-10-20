# The business profile (feat/p2-4-profile)

- Changed: P2 step 4 (book B-37, Q-215, F-099, F-100). `GET`/`PATCH /v1/w/{slug}/settings/profile` in the settings
  module (`requireSettings`); contract `businessProfile`, `businessProfileUpdate`, `location` in
  `@yeral/contract/settings`. Name, description per language (`localizedSchema`, so the market's languages only),
  contact phone (any number of the market, stored E.164), amenities from `AMENITIES` (`@yeral/domain/model`, the
  demo's four), women-only, entrance note, the home-based switch, and `location` (city, address, street line, pin)
  given whole.
- A new category must offer the business's first booking type; the card's `kind` is cleared so the page names the
  category. A new address keeps everything and writes a `verification_history` row (`address changed`, same status)
  for the admin tool (step 5) to list. The row is locked while it changes; every change writes `business.updated`.
- Limits picked (chapter 5, "Claude (delegated)"): name 1–80, description 1 000 per language, address 200, street
  120, entrance note 200.
- Follow-ups: the logo and photos with the storage port (F-084, F-101); the address search on the map (F-014); the
  design names the full amenity list; the admin tool lists "address changed" entries (step 5).
