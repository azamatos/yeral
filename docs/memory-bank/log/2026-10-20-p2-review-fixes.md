# The backend review's fixes (20.10.2026)

The owner asked for a review of the backend api (best practices, architecture, patterns, the decisions) over #78–#80.
It found 15 issues; all hold. The plan, one PR each, reviewed before merging, in this order:

1. **The first SMS** (fix/p2-first-sms, this note's PR). A specialist change inside the undo window sent "booked"
   twice; Maral → Jeren → Maral before the jobs ran sent "now with Maral" twice; a move 11–60 s after saving made
   "moved" the client's first SMS; an undo at the deadline could still leave "booked" sent. The PR's own review
   showed a first design (the waiting job carrying what the client knew) missed more cases, so it keeps it on the
   booking instead:
   - `bookings.told` (migration 0024; `Told`, `toldOf`, `sameTold` in `@yeral/domain/lifecycle`): what the client
     knows, set when a booking is made (`insertBooking`, `insertTeamBooking`), when the client's own move is confirmed,
     and by the jobs after a news SMS goes;
   - one news SMS (`confirmed`, `booked`, `moved`) waits per booking (`queueNews` in `bookings/confirm.ts`, its waiting
     jobs read `for update`, claimed ones left out): a confirmation outranks a change, anything else asked for while one
     waits is covered by it;
   - the jobs word it when it goes (`newsSms` in the domain, with unit tests): a confirmation as the booking is, or the
     change for a booking the client chose online that changed before it went; a change as `moved`, `movedWith` (new
     text, en/tk/ru) or `staffChanged`, or nothing (`dropped: the client knows the booking as it is`); they read the
     booking `for share`, so a team's undo under way is waited for;
   - a team booking's first SMS goes at `NEW_BOOKING_SMS_AFTER_MS` (the 10 s undo + 5 s); a business cancel texts
     nothing while the client is unaware of a team booking (`clientUnaware`: within that time, or its confirmation still
     waiting);
   - migration 0024 also adds a partial index on the jobs' booking id while unsent.
2. **Races and rules:** every path that makes a booking active re-checks the hours under `FOR SHARE` on the business
   row (a new booking, a taken offer, a restore, the business's move), ordered with an hours save; a listed booking
   undone during a mass cancel is skipped (`StaleBooking` per row); `cancelByBusiness` re-checks the specialist's right
   under the lock; waiting requests on a closed day are declined (B-27), not cancelled, with the same offers and
   `answered`; yearly special days checked against every weekday; an undo restores the name it wrote on a nameless
   record.
3. **Contract:** a business cancel as `businessCancel: { reason, text }` (codes, the app translates; `cancelReason`
   only the client's words), its offered times a `cancel` source; `Object.hasOwn` in the jobs; the `{ tk: '' }` fallback
   to the market's language.
4. **Structure, no behaviour change:** `bookings/engine.ts` (items, price, `inTransaction`, waiting-move handling,
   `cancelForBusiness`), `actions.ts` client-only, `repo.ts` files for the calendar and hours queries, the team sources
   and the "heard" window in the domain with tests, one `invalid()`, techContext's "Where shared things live" and
   systemPatterns' module map, one write per cancel, booked services loaded together, `checkPlan` gone.
5. **SMS caps** (P2 step 7, before SMS go out): a daily cap and rate limit per business on the SMS its team sends to
   numbers it types in, none from a business in review. In chapter 10's step 7.

Then P2 step 4 goes on with staff schedules (B-47).
