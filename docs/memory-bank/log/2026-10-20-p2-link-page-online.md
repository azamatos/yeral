# Phone-only clients and paused businesses on every page (feat/p2-3-link-page-online)

- Changed: P2 step 3 (book A7, Q-154). The business page carries `bookOnline` for whoever is looking: false while the
  business has paused online booking and for a signed-in client who may book it only by phone, so the page and the
  booking flow show the "Jaň et" card before anything is sent; signed out it follows `onlineEnabled`. The booking
  detail and the SMS link page already carried it (#46, #49); all three use `bookOnlineFor` (`clients/online.ts`, with
  `onlineRefusal`, which moved there from `bookings/create.ts`).
- The business page answers `Cache-Control: private` and `Vary: Cookie, Authorization`: no shared cache keeps one
  person's answer for another.
- The sdk refreshes the business pages in the background whenever the viewer changes (`viewerChanged`: sign-in,
  sign-out, a phone change; "Is this you?" and the link page reset everything anyway), and a send refused with
  `online_blocked` or `online_disabled` refreshes that business's page.
- `errors.online_blocked` now says what the card says ("Bu biznese telefon arkaly ýazylyp bilersiňiz.").
