# SMS token links (feat/p2-3-token-links)

- Changed: P2 step 3, part 9 (book Q-168, Q-169, Q-170 for the api, F-068). SMS links are `yeral.app/l/{token}`: one
  random token per SMS (`newBookingLink()`, 16 bytes), stored hashed in `booking_links` (migration 0013), valid until
  `LINK_DAYS` (90) after the visit; a link whose SMS failed is dropped, expired ones are pruned every minute, and
  deleting the account drops its links. The SMS texts take the link instead of the booking code, and every text with a
  link is made when it's sent (the expiry and refused-move SMS are `booking.sms` jobs now), so no stored row holds a
  working link; the log adapter hides tokens (`hideLinkTokens`). `GET /v1/links/{token}` reads the booking signed out (the
  card, offers, refused move, waiting move; no note, no actions) with `maskedPhone` (`maskPhone()` in
  `@yeral/domain/phone`) and `owner` (Q-169). `POST /v1/links/{token}/code` sends a login code only to the booking's
  phone; `…/verify` signs in with it (`signIn()`, shared with `/auth/verify`). sdk: `links.view/sendCode/verify`.
  ADR 0015 amended.
- From review: deleting an account marks its bookings (and phone bookings for the number since the last sign-in)
  `account_deleted_at` (migration 0014): they never join whoever gets the number next and send no more SMS. A phone
  change moves the bookings ahead to the new number and ends the old links. Caddy's access logs show `/l/…` and
  `/v1/links/…` without tokens (both Caddyfiles; checked with the caddy image). A confirmed move extends its links. The
  expiry SMS offers no times when the page wouldn't (Q-154). The link page strips the detail to the contract's fields
  without failing on odd data. The sdk resets every query after a link sign-in, mounted screens reload for the new
  person.
- Third review: a link opens a booking of a living account only and names the person's phone now (the account's, not
  the booking's snapshot); booking SMS go to the account's phone; job errors hide tokens; Caddy's default log hides
  them too (handler errors, a 502), checked with the caddy image. Q-171 done along the way: a phone change moves the
  person's client records, bookings ahead and the old number's phone bookings, cancels invites to the old number and
  ends its links; a race for the number is `phone_taken`. A phone-only client's expiry SMS asks them to call
  (`sms.expiredCall`).
- Server: the next deploy copies `infra/server/edge/Caddyfile` to `/srv/edge/Caddyfile` and reloads Caddy (the
  default-log filter); `yeral.caddy` goes with PUBLIC=1 as before.
- Left for Q-270: a deleted account's business client records still join whoever signs in with the number next.
- Decided (Claude, delegated; chapter 9): one token per SMS, 90 days after the visit, the page's fields; Q-171.
- Follow-ups: the client site's `/l/{token}` page (P4); the `yr-` slug rule can go with the `/b/{code}` links; next in
  step 3: no review asks (Q-259).
