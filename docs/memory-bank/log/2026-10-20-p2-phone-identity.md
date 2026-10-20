# Linking by phone and the phone change (feat/p2-3-phone-identity)

- Changed: P2 step 3 (book Q-270, Q-171). Sign-in links a phone's bookings only if upcoming or from the last 183
  days, and client records only if made in that time or through a booking that joined (`linkPhone`, shared by sign-in
  and the phone change). `users.last_seen_at` (migration 0017, backfilled from sessions) is set at every sign-in and
  session renewal; an account with a name unused for 183 days gets "Is this you?" first: `/auth/verify` and
  `/links/{token}/verify` answer 202 `{ isThisYou: { name, ticket } }`, and `POST /v1/auth/identity` takes the answer
  within 10 minutes (`identity_checks`, hashed one-time tickets, pruned by the jobs pass).
- "No" and deleting the account share `releaseAccount()` (`me/account.ts`): team rows leave, invites to the number
  are cancelled, links stop, bookings are marked `account_deleted_at`; deletion also cancels the bookings ahead, "No"
  leaves them to the business without SMS. A workspace owner's account can't go either way (`owns_workspace`): the
  ticket stays, and the Ýeral team sorts the number out (admin tool, step 5).
- The phone change (`changePhone()`): client records follow the account; a business's record for the new number is
  merged into the person's (bookings and notes move, tags add up, marks stay, the no-show restart is the earlier one);
  the new number's recent phone bookings join; bookings ahead take the new number; team rows carrying the old number
  take the new one; invites to the old number are cancelled (not moved: the inviter would see a number it wasn't given).
- Known: a business's stale record for a recycled number (older than 6 months) still applies its marks when the new
  holder books there, since bookings find their client record by phone (`clientFor`); the business can change them.
- Follow-ups: the design draws the "Is this you?" step (07a C-18, 07c); the admin tool (step 5) needs a way to free an
  owner's number. Next in step 3: code limits (Q-267), then deleting an account (Q-172; the shared path is in place).
