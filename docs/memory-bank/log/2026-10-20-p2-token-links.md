# SMS token links (feat/p2-3-token-links)

- Changed: P2 step 3, part 9 (book Q-168, Q-169, Q-170 for the api, F-068). SMS links are `yeral.app/l/{token}`: one
  random token per SMS (`newBookingLink()`), stored hashed in `booking_links` (migration 0013), valid `LINK_DAYS` (90).
  The SMS texts take the link instead of the booking code. `GET /v1/links/{token}` reads the booking signed out (the
  card, offers, refused move, waiting move; no note, no actions) with `maskedPhone` (`maskPhone()` in
  `@yeral/domain/phone`) and `owner` (Q-169). `POST /v1/links/{token}/code` sends a login code only to the booking's
  phone; `…/verify` signs in with it (`signIn()`, shared with `/auth/verify`). sdk: `links.view/sendCode/verify`.
  ADR 0015 amended.
- Decided (Claude, delegated; chapter 9): one token per SMS, 90 days, the page's fields.
- Follow-ups: the client site's `/l/{token}` page (P4); the `yr-` slug rule can go with the `/b/{code}` links; next in
  step 3: no review asks (Q-259).
