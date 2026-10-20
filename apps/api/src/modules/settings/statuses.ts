/**
 * Internal statuses (book B-29, F-104, F-133): team-only markers for confirmed bookings. Settings → Booking rules →
 * "Ýazylyş ýagdaýlary" lists the presets (Arrived, Started; off at first, never deleted) and the business's own, five
 * in all; anyone who can open a confirmed booking puts one on it. Clients never see them, and the booking's status
 * doesn't change.
 */
import type { InternalStatus, internalStatusInputSchema, internalStatusUpdateSchema } from '@yeral/contract/settings'
import { effectiveStatus } from '@yeral/domain/lifecycle'
import { MARKET } from '@yeral/domain/market'
import { INTERNAL_STATUS_PRESETS, MAX_INTERNAL_STATUSES, type InternalStatusPreset } from '@yeral/domain/model'
import { canOn, type Actor } from '@yeral/domain/permissions'
import { createT } from '@yeral/i18n/fmt'
import { and, asc, eq, max, sql } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookings, businesses, internalStatuses } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import { emit } from '../../notify'
import { itemsOf, pgCode, stateOf } from '../bookings/repo'

type StatusRow = typeof internalStatuses.$inferSelect
type StatusInput = z.infer<typeof internalStatusInputSchema>
type StatusChange = z.infer<typeof internalStatusUpdateSchema>

/** The presets' look (the design's demo data): Arrived in green with a user-check, Started in violet with play. */
const PRESETS: Record<InternalStatusPreset, Pick<StatusRow, 'icon' | 'color'>> = {
  arrived: { icon: 'user-check', color: '#066a41' },
  started: { icon: 'play', color: '#4429d6' },
}

const viewOf = (r: StatusRow): InternalStatus => ({
  id: r.id,
  preset: r.preset,
  name: r.name,
  icon: r.icon as InternalStatus['icon'],
  color: r.color as InternalStatus['color'],
  enabled: r.enabled,
})

/** The presets are made the first time a business's statuses are read, named in the market's main language. */
async function withPresets(db: Queryable, businessId: string): Promise<void> {
  const t = createT(MARKET.defaultLanguage)
  await db
    .insert(internalStatuses)
    .values(
      INTERNAL_STATUS_PRESETS.map((preset, sort) => ({
        businessId,
        preset,
        name: t(`internalStatuses.${preset}`),
        sort,
        ...PRESETS[preset],
      })),
    )
    .onConflictDoNothing()
}

export async function statusesOf(db: Queryable, businessId: string): Promise<InternalStatus[]> {
  await withPresets(db, businessId)
  const rows = await db
    .select()
    .from(internalStatuses)
    .where(eq(internalStatuses.businessId, businessId))
    .orderBy(asc(internalStatuses.sort), asc(internalStatuses.createdAt))
  return rows.map(viewOf)
}

/** "Bu at eýýäm bar — başga at saýlaň": a name another status has, whatever its case. */
const nameTaken = (e: unknown) => pgCode(e) === '23505'

/** "Ýagdaý goş": one more of the business's own, after the others; the sixth is `statuses_full`. */
export async function addStatus(db: Queryable, businessId: string, input: StatusInput): Promise<InternalStatus> {
  return db.transaction(async (tx) => {
    await withPresets(tx, businessId)
    // one change of the list at a time: two adds can't both be the fifth
    await tx.select({ id: businesses.id }).from(businesses).where(eq(businesses.id, businessId)).for('no key update')
    const [counted] = await tx
      .select({ n: sql<number>`count(*)::int`, last: max(internalStatuses.sort) })
      .from(internalStatuses)
      .where(eq(internalStatuses.businessId, businessId))
    if ((counted?.n ?? 0) >= MAX_INTERNAL_STATUSES) throw new ApiError('statuses_full')
    try {
      const [row] = await tx.transaction((sp) =>
        sp
          .insert(internalStatuses)
          .values({ businessId, ...input, sort: (counted?.last ?? 0) + 1 })
          .returning(),
      )
      await emit(tx, { type: 'business.updated', businessId })
      return viewOf(row!)
    } catch (e) {
      if (nameTaken(e)) throw invalid({ path: ['name'], code: 'taken' })
      throw e
    }
  })
}

async function statusRow(db: Queryable, businessId: string, id: string): Promise<StatusRow> {
  const [row] = await db
    .select()
    .from(internalStatuses)
    .where(and(eq(internalStatuses.id, id), eq(internalStatuses.businessId, businessId)))
  if (!row) throw new ApiError('not_found')
  return row
}

/** Switch it on or off, or give it another icon, colour or (its own, not a preset's) name. */
export async function updateStatus(db: Queryable, businessId: string, id: string, change: StatusChange): Promise<InternalStatus> {
  const row = await statusRow(db, businessId, id)
  if (row.preset && change.name !== undefined && change.name !== row.name) throw invalid({ path: ['name'], code: 'preset' })
  if (!Object.keys(change).length) return viewOf(row)
  try {
    const [saved] = await db.update(internalStatuses).set(change).where(eq(internalStatuses.id, row.id)).returning()
    await emit(db, { type: 'business.updated', businessId })
    return viewOf(saved!)
  } catch (e) {
    if (nameTaken(e)) throw invalid({ path: ['name'], code: 'taken' })
    throw e
  }
}

/** Only the business's own are deleted; the bookings carrying one lose it. A preset is switched off instead. */
export async function deleteStatus(db: Queryable, businessId: string, id: string): Promise<void> {
  const row = await statusRow(db, businessId, id)
  if (row.preset) throw invalid({ path: ['id'], code: 'preset' })
  await db.delete(internalStatuses).where(eq(internalStatuses.id, row.id))
  await emit(db, { type: 'business.updated', businessId })
}

/**
 * "Içerki ýagdaý" in the booking drawer: one of the enabled statuses on a confirmed booking, or none. Anyone who sees
 * the booking in the calendar may set it; a booking they can't see is 404.
 */
export async function setInternalStatus(
  deps: Deps,
  business: { id: string },
  actor: Actor,
  code: string,
  statusId: string | null,
): Promise<void> {
  const { db } = deps
  const [b] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.businessId, business.id), eq(bookings.code, code)))
  if (!b) throw new ApiError('not_found')
  const staffIds = (await itemsOf(db, b.id)).flatMap((i) => (i.staffId ? [i.staffId] : []))
  if (!canOn(actor, 'calendar', staffIds)) throw new ApiError('not_found')
  if (effectiveStatus(stateOf(b), deps.now()).status !== 'confirmed') throw new ApiError('invalid_status')
  if (statusId) {
    const [status] = await db
      .select()
      .from(internalStatuses)
      .where(and(eq(internalStatuses.id, statusId), eq(internalStatuses.businessId, business.id), eq(internalStatuses.enabled, true)))
    if (!status) throw invalid({ path: ['statusId'], code: 'not_found' })
  }
  await db.update(bookings).set({ internalStatusId: statusId }).where(eq(bookings.id, b.id))
  await emit(db, { type: 'booking.updated', businessId: business.id, bookingId: b.id, bookingCode: b.code, userId: null })
}
