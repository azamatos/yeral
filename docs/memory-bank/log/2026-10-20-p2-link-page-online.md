# Phone-only clients and paused businesses on every page (feat/p2-3-link-page-online)

- Changed: P2 step 3 (book A7, Q-154). The business page carries `bookOnline` for whoever is looking: false while the
  business has paused online booking and for a signed-in client who may book it only by phone (`onlineRefusal`), so the
  page and the booking flow show the "Jaň et" card before anything is sent; signed out it follows `onlineEnabled`. The
  booking detail and the SMS link page already carried it (#46, #49). The sdk refreshes business pages at sign-in and
  sign-out.
- The responses aren't cached publicly (no Cache-Control), so a per-viewer field is safe; a cache in front of the
  business page must keep varying on the session.
