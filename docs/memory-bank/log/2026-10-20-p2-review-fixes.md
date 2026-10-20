# The backend review's fixes (20.10.2026)

The owner asked for a review of the backend api (best practices, architecture, patterns, the decisions) over #78–#80.
It found 15 issues; all hold. The plan, one PR each, reviewed before merging, in this order:

1. **The first SMS** (fix/p2-first-sms, this note's PR). A specialist change inside the undo window sent "booked"
   twice; Maral → Jeren → Maral before the jobs ran sent "now with Maral" twice; a move 11–60 s after saving made
   "moved" the client's first SMS; an undo at the deadline could still leave "booked" sent. Now:
   - one first SMS per booking waits at a time (`queueBookingSms` → `queueFirstSms` in `bookings/confirm.ts`): a
     confirmation (`confirmed`, `booked`) replaces any still waiting and tells the booking as it is when it goes (the
     jobs no longer drop it after a move); a change (`moved`, `staffChanged`) gives way to a confirmation still
     waiting, replaces an earlier change, carries `from` (what the client knew) and isn't queued when the booking is
     back to it; one being sent right now (locked) counts as gone. Replaced jobs settle unsent, never tried, with
     `dropped: a later SMS tells the booking as it is`;
   - a change SMS goes only while the booking has the staff it names (`staff` in the payload, checked by the jobs);
   - a team booking's first SMS goes at `NEW_BOOKING_SMS_AFTER_MS` (the 10 s undo + 5 s);
   - migration 0024: a partial index on the jobs' booking id while unsent.
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
