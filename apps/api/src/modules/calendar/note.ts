/**
 * The team's note on a saved booking (book B-16 step 5, F-127; slice 4's gap 1): the drawer autosaves it, whole, and
 * clears it with null. Whoever sees the booking in the calendar writes it (a specialist on their own), whatever the
 * booking's status; the client never sees it, so the change reaches only the team.
 */
import type { Actor } from '@yeral/domain/permissions'
import { eq } from 'drizzle-orm'
import { bookings } from '../../db/schema'
import type { Deps } from '../../deps'
import { emit } from '../../notify'
import { teamBooking, type Business } from './repo'

export async function setTeamNote(deps: Deps, business: Business, actor: Actor, code: string, note: string | null): Promise<void> {
  await deps.db.transaction(async (tx) => {
    // a move request's own code is not a booking anyone opens: the note belongs on the original
    const { b } = await teamBooking(tx, business, actor, code, { lock: true, original: true, permission: null })
    const next = note || null
    if (b.internalNote === next) return // the drawer autosaves on every pause: the same text wakes nobody
    await tx
      .update(bookings)
      .set({ internalNote: next, updatedAt: new Date(deps.now()) })
      .where(eq(bookings.id, b.id))
    await emit(tx, { type: 'booking.updated', businessId: business.id, bookingId: b.id, bookingCode: b.code, userId: null })
  })
}
