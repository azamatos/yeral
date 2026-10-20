# The sdk forgets the last person (fix/p4-sdk-person-change)

- Changed: P4 slice 1 (Accounts), PR 1 of 3. `@yeral/sdk` and `apps/business`.
- `keys.ts`: `audienceOf(queryKey)` says whose a query's answer is. `anyone`: the catalogue (`categories cities search
  suggest places`). `viewer`: anyone may ask but the answer depends on who asks (`business reviews availability`, the
  invite behind a link): the page says whether they may book online (Q-154), a business in review shows its page, free
  times and reviews only to its team, a move leaves the person's own booking out of the busy times. `person`:
  everything else, so a new key is the person's until it's listed (the safe default).
- `sdk.ts`, one place for every change of person:
  - Signing in (`auth.verify`, `auth.answerIdentity`, `links.verify`): a `/me` on its way is cancelled, `me` is set,
    the person's queries reset (on screen they ask again as the new person); over someone else the viewer's answers
    reset too, else they refresh in the background. The catalogue is never touched (the client site signs in
    mid-booking).
  - Signing out (`auth.logout`, `me.remove`): `/me` cancelled, `me` null, the person's queries back to empty without
    asking again (observers see it; nobody may ask now), the viewer's answers reset and ask again as a visitor.
  - A 401 anywhere (query or mutation; every 401 the api gives means the session or the account is gone): the same as
    a log-out, once, while someone is signed in; `me` itself answering 401 empties the person's queries with it. No
    app has to remember a `sessionEnded()`.
  - `team.leave(slug)`: that workspace's queries (every workspace key names it second) and its viewer answers go;
    `team.accept` refreshes the viewer's answers; `me.phoneVerify` also refreshes the invites (sent to a phone).
- `apps/business`: `shared/api/use-sign-out.ts` is gone; the login page and the calendar stand-in use
  `sdk.auth.logout()`; the entry step's 401 effect is gone (the sdk forgets the person and the page shows the sign-in);
  "You declined …" belongs to the person who declined.
- Review (12 findings, all fixed): reviews and move-mode free times answer per viewer; viewer answers no longer
  survive a log-out; the sdk handles 401s itself; observers are told (reset, not remove); `/me` cancelled before it's
  written; leave and accept; `me.remove`; the invite link isn't the person's; one table for the classes; key helpers
  instead of literals; no wasted 401 on log-out.
- Second review (12 findings; 11 fixed): the SMS link page is a viewer's (it shows more to the booking's account);
  answers that land after a log-out don't write the person back (`me.update`, `me.phoneVerify`, a booking's detail);
  a 401 for a request sent before the latest sign-in here changes nothing (`signedInAt` against the mutation's
  `submittedAt`; the person's queries are cancelled at sign-in anyway); the person's queries on screen reset and the
  rest leave the cache (a reset query is never garbage-collected); leaving matches the workspace keys by name
  (`inWorkspace`), not any key whose second part is the slug; the first 401 of a retried request counts; the login's
  "You declined …" goes when the person is signed out; a workspace page goes to the sign-in when `me` turns null;
  a sign-out removes the finished mutations (their numbers, names, notes); an accept refreshes only that business's
  pages; `/me`'s 401 goes the same way as any other. Not taken: the audience as each query's `meta` instead of a key
  table (it would touch every query definition; the table is tested key by key and names its two exceptions).
- Tests: `sdk.test.ts` "who is signed in" (the audience of every key; each sign-in path over someone else, from
  nobody and as the same person; "Is this you?"; log out and delete; a 401 from a query, a mutation and `/me`; a 401
  while signed out; a `/me` in flight; leave; another phone).
