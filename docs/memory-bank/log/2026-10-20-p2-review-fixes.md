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
   - migration 0024 also adds a partial index on the jobs' booking id while unsent;
   - second review: 0024 and the seed fill `told` for the bookings made before (`newsSms` tells a null one as queued);
     the 15 s wait is worked out in `queueBookingSms` from the booking (`isTeamSource`), so every caller gets it; a
     reminder updates `told`'s time; `told` is written only if unchanged since the job read it; `bookedWith` (new text)
     names who does it when that changed after the call; a job a runner has picked up never counts as waiting, while
     `clientUnaware` counts any confirmation not done; a cancel names the time the client knows; a `staffChanged` job
     from an older api is worded as news; the news kinds live in the domain (`NEWS_QUEUED`, `isConfirmationNews`); the
     share lock is taken for news only; `Object.hasOwn` in the jobs (from PR 3).
2. **Races and rules** (fix/p2-booking-races): every path that makes a booking active checks the hours as they
   stand (`lockedHours`, `assertOpenAt` in `availability/context.ts`: `for share` on the business row, taken before any
   booking's lock, the order an hours save takes them in): `insertBooking` (a new booking, an offered time taken, a
   client's move), `insertTeamBooking`, the client's restore, the team's move (its plan checked against those hours),
   and the client's reschedule takes it before locking its booking; a listed booking undone during a mass cancel is
   skipped (`StaleBooking` per row); `cancelByBusiness` reads the booking and the specialist's right again under the
   lock; a waiting request on a closed day is declined (`declineForBusiness` in `bookings/business-cancel.ts`, shared
   with the requests' decline): `other` with the day's name or `slot_busy`, the same offers, `answered`; a yearly special
   day is checked against every weekday (`yearlyNightOverlaps`); migration 0025 adds `clients.name_set_by`, the team's
   booking that gave a nameless record its name, which its undo takes back.
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
