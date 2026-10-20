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
- Third and fourth reviews: each link records the phone it went to (`booking_links.sent_to`) and works only while that
  is still the booking's phone (`bookingRecipient()`: the account's phone now, else the booking's; none after an
  account deletion or the client's removal), which also closes a late job's race. Booking SMS go to that phone; the
  booking detail's `bookOnline` checks it too. A failed send strips its token from the error itself (any encoding);
  job errors and logs also pass `hideLinkTokens()`, and Caddy's default log (handler errors) hides `/l/…` paths. The
  link check reads the link, booking and account in one query. Migrations: 0013 links, 0014 `account_deleted_at`,
  0015 `sent_to` (older links stop working). A phone-only client's expiry SMS asks them to call (`sms.expiredCall`). The phone change's
  wider rework (client records, the old number's phone bookings, invites) went back out of this PR: it is Q-171's own
  step, with shared helpers for sign-in, phone change and deletion.
- Server: the next deploy copies `infra/server/edge/Caddyfile` to `/srv/edge/Caddyfile` and reloads Caddy (the
  default-log filter); `yeral.caddy` goes with PUBLIC=1 as before.
- Left for Q-171 and Q-270: a phone change moving the person's client records, the old number's phone bookings and
  invites; a deleted account's business client records joining whoever signs in with the number next.
- Decided (Claude, delegated; chapter 9): one token per SMS bound to its phone, 90 days after the visit, the page's
  fields.
- Follow-ups: the client site's `/l/{token}` page (P4); the `yr-` slug rule can go with the `/b/{code}` links; next in
  step 3: no review asks (Q-259).
