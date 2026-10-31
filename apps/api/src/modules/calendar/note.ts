/**
 * The team's note on a saved booking (book B-16 step 5, F-127; slice 4's gap 1): the drawer autosaves it, whole, and
 * clears it with null. Whoever sees the booking in the calendar writes it (a specialist on their own), whatever the
 * booking's status; the client never sees it, so the change reaches only the team.
 */
import { canOn, type Actor } from '@yeral/domain/permissions'
import { and, eq } from 'drizzle-orm'
import { bookings } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { itemsOf } from '../bookings/repo'
import { staffOf, type Business } from './repo'

export async function setTeamNote(deps: Deps, business: Business, actor: Actor, code: string, note: string | null): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const [b] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.businessId, business.id), eq(bookings.code, code)))
      .for('update')
    if (!b) throw new ApiError('not_found')
    if (!canOn(actor, 'calendar', staffOf(await itemsOf(tx, b.id)))) throw new ApiError('not_found')
    await tx
      .update(bookings)
      .set({ internalNote: note || null, updatedAt: new Date(deps.now()) })
      .where(eq(bookings.id, b.id))
    await emit(tx, { type: 'booking.updated', businessId: business.id, bookingId: b.id, bookingCode: b.code, userId: null })
  })
}
