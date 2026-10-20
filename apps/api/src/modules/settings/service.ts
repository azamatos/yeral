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

const viewOf = (r: BookingRules): RulesView => ({ ...r, lateMinutes: LATE_MINUTES })

/** The rules as stored; `lock` holds the row until the change commits, so two saves at once can't answer stale rules. */
async function storedRules(db: Queryable, businessId: string, opts: { lock?: boolean } = {}): Promise<BookingRules> {
  const query = db.select().from(bookingRules).where(eq(bookingRules.businessId, businessId))
  const [row] = opts.lock ? await query.for('update') : await query
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
    const stored = await storedRules(tx, businessId, { lock: true })
    const next = { ...stored, ...change }
    const issues = Object.keys(rulesErrors(next))
      .filter((field) => field in change)
      .map((field) => ({ path: [field], code: 'invalid' }))
    if (issues.length) throw new ApiError('validation_error', { issues })
    // nothing new (an empty save, or the same values): no write, no event
    const changed = Object.entries(change).filter(([field, value]) => stored[field as keyof BookingRules] !== value)
    if (!changed.length) return viewOf(stored)
    await tx.update(bookingRules).set(Object.fromEntries(changed)).where(eq(bookingRules.businessId, businessId))
    await emit(tx, { type: 'business.updated', businessId })
    return viewOf(next)
  })
}
