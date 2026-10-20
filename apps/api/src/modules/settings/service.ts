/**
 * Business settings (book B-37–B-43): read and change what the owner and administrators set. Each change tells the
 * team's open screens (`business.updated`).
 */
import type { bookingRulesSchema, bookingRulesUpdateSchema } from '@yeral/contract/settings'
import { LATE_MINUTES, rulesErrors, type BookingRules } from '@yeral/domain/rules'
import { eq } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingRules } from '../../db/schema'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { toRules } from '../availability/context'

type RulesView = z.infer<typeof bookingRulesSchema>
type RulesChange = z.infer<typeof bookingRulesUpdateSchema>

const viewOf = (r: BookingRules): RulesView => ({
  onlineEnabled: r.onlineEnabled,
  confirmMode: r.confirmMode,
  requestAnswerers: r.requestAnswerers,
  holdMinutes: r.holdMinutes,
  leadMinutes: r.leadMinutes,
  windowDays: r.windowDays,
  bufferMinutes: r.bufferMinutes,
  slotStep: r.slotStep,
  cancelWindowMinutes: r.cancelWindowMinutes,
  askCancelReason: r.askCancelReason,
  blockAfterNoShows: r.blockAfterNoShows,
  lateMinutes: LATE_MINUTES,
})

async function storedRules(db: Queryable, businessId: string): Promise<BookingRules> {
  const [row] = await db.select().from(bookingRules).where(eq(bookingRules.businessId, businessId))
  if (!row) throw new ApiError('not_found')
  return toRules(row)
}

export async function rulesOf(db: Queryable, businessId: string): Promise<RulesView> {
  return viewOf(await storedRules(db, businessId))
}

/**
 * Change some of the booking rules (B-41). Only the settings screen's values pass (`rulesErrors`), checked for the
 * fields being changed. Requests already waiting keep their mode and timer (book Q-205): each one stored its own.
 */
export async function updateRules(db: Queryable, businessId: string, change: RulesChange): Promise<RulesView> {
  return db.transaction(async (tx) => {
    const next = { ...(await storedRules(tx, businessId)), ...change }
    const errors = Object.fromEntries(Object.entries(rulesErrors(next)).filter(([field]) => field in change))
    if (Object.keys(errors).length) throw new ApiError('validation_error', errors)
    await tx.update(bookingRules).set(change).where(eq(bookingRules.businessId, businessId))
    await emit(tx, { type: 'business.updated', businessId })
    return viewOf(next)
  })
}
