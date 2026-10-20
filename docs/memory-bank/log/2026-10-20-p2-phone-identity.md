# Linking by phone and the phone change (feat/p2-3-phone-identity)

- Changed: P2 step 3 (book Q-270, Q-171). Sign-in links a phone's bookings only if upcoming or from the last 183
  days, and client records only if made in that time or through a booking that joined (`linkPhone`, shared by sign-in
  and the phone change). `users.last_seen_at` (migration 0017; existing accounts count from the release) is set at
  every sign-in and once a day while a session is in use. A stale account (183 days) with a name, or a booking, team
  row or client record to take one from, gets "Is this you?" first (one with none of them starts afresh unasked): `/auth/verify` and `/links/{token}/verify` answer 202
  `{ isThisYou: { name, ticket } }`, and `POST /v1/auth/identity` takes the answer within 10 minutes
  (`identity_checks`, hashed one-time tickets; an answer locks the account's row, clears all its tickets and is
  refused if the account was used meanwhile; pruned by the jobs pass).
- `releaseAccount(tx, user, now, 'deleted' | 'passedOn')` (`me/account.ts`): both remove team rows (and cancel an
  invite that brought one back), mark the bookings `account_deleted_at`, stop the account's links. Deletion also
  cancels the bookings ahead, invites to the number and the links of unlinked phone bookings; the businesses' records
  keep the number (the person may come back with it). "No" (`passedOn`) keeps those for the number's new holder, and
  takes the number off the old account's client records (`clients.phone` is nullable now) and app team rows, so they
  never join the new holder, block them or come back for an invite; recent unlinked phone bookings filed under its
  records move to a new record of the number. A workspace owner's account can't go either way (`owns_workspace`): the ticket stays, and the Ýeral
  team sorts the number out (admin tool, step 5).
- The phone change (`changePhone()`): links the old number's recent items first; client records follow the account;
  a business's recent record for the new number is merged into the person's (bookings and notes move, tags add up,
  marks stay; the no-show count runs from the latest restart), an older one loses the number (one recency rule,
  `recentRecord()`, for sign-in and phone change); the new number's recent phone bookings join; bookings ahead take the new number; active team rows carrying
  the old number take the new one; invites to the old number are cancelled (not moved: the inviter would see a number
  it wasn't given).
- Known: a business's stale record for a recycled number, at a business the new holder never visited, still applies
  its marks when they book there, since bookings find their record by phone (`clientFor`): it may as well be the same
  person returning after a year, so the business decides. A business-made record for the new number created during a
  phone change can make that change fail once (one record per phone); business-made records come with step 4.
- Follow-ups: the design draws the "Is this you?" step (07a C-18, 07c); the admin tool (step 5) needs a way to free an
  owner's number. Next in step 3: code limits (Q-267), then deleting an account (Q-172; the shared path is in place).
