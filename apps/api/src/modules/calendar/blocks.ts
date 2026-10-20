/**
 * Blocked time (book B-18, Q-204): "Wagty ýap" closes part of a day for one person ("Ýapyk · Okuw"), so nobody books
 * it, optionally every week up to a date. The same people who add bookings block time, a specialist only their own;
 * a block can't cover a booking. It's busy time wherever free times are worked out (`loadBusy`), and a booking being
 * made checks it under the business's lock (`assertStaffFree`), which a block's save holds too.
 */
import type { BlockOverBookingsDetails } from '@yeral/contract/errors'
import type { Block, blockInputSchema } from '@yeral/contract/calendar'
import { BLOCK_REPEAT_DAYS, blockDates } from '@yeral/domain/hours'
import { canOn, type Actor } from '@yeral/domain/permissions'
import { addDays, diffDays, epochOf } from '@yeral/domain/time'
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, staff, staffBlocks } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import { emit } from '../../notify'
import { loadHours } from '../availability/context'
import type { Business } from './repo'
import { assertMayBook } from './service'

type BlockInput = z.infer<typeof blockInputSchema>
type BlockRow = typeof staffBlocks.$inferSelect

const viewOf = (b: BlockRow): Block => ({
  id: b.id,
  staffId: b.staffId,
  date: b.date,
  start: b.start,
  end: b.end,
  reason: b.reason,
  seriesId: b.seriesId,
})

/**
 * Block time for one person: on `date`, and every week after it up to `repeatUntil` (a year at most). Refused when it
 * lies wholly in the past, or covers a booking of theirs that's waiting or confirmed, its buffer after included (409
 * `block_over_bookings`, the bookings in the way). Saved under the business row, as a booking takes it.
 */
export async function addBlock(deps: Deps, business: Business, actor: Actor, userId: string, input: BlockInput): Promise<Block[]> {
  assertMayBook(actor, input.staffId)
  if (input.repeatUntil && input.repeatUntil < input.date) throw invalid({ path: ['repeatUntil'], code: 'invalid' })
  // "a year at most": a later end is refused, not cut short
  if (input.repeatUntil && diffDays(input.repeatUntil, input.date) > BLOCK_REPEAT_DAYS)
    throw invalid({ path: ['repeatUntil'], code: 'too_big' })
  const now = deps.now()
  if (epochOf(input.date, input.end) <= now) throw invalid({ path: ['date'], code: 'past' })
  const dates = blockDates(input.date, input.repeatUntil)
  return deps.db.transaction(async (tx) => {
    await loadHours(tx, business.id, { lock: 'no key update' })
    const [person] = await tx
      .select({ id: staff.id })
      .from(staff)
      .where(and(eq(staff.id, input.staffId), eq(staff.businessId, business.id), eq(staff.status, 'active')))
    if (!person) throw invalid({ path: ['staffId'], code: 'not_found' })
    const inTheWay = await bookingsUnder(tx, business.id, input.staffId, dates, input)
    if (inTheWay.length) throw new ApiError('block_over_bookings', { bookings: inTheWay } satisfies BlockOverBookingsDetails)
    const seriesId = dates.length > 1 ? randomUUID() : null
    const rows = await tx
      .insert(staffBlocks)
      .values(
        dates.map((date) => ({
          businessId: business.id,
          staffId: input.staffId,
          date,
          start: input.start,
          end: input.end,
          reason: input.reason || null,
          seriesId,
          createdBy: userId,
          createdAt: new Date(now),
        })),
      )
      .returning()
    // the calendar and the free times refresh
    await emit(tx, { type: 'business.updated', businessId: business.id })
    return rows.map(viewOf)
  })
}

/**
 * The person's waiting and confirmed bookings whose visit or buffer after it overlaps the block on any of its dates (past
 * midnight too), read on those dates and the days either side.
 */
async function bookingsUnder(
  db: Queryable,
  businessId: string,
  staffId: string,
  dates: readonly string[],
  block: { start: number; end: number },
): Promise<BlockOverBookingsDetails['bookings']> {
  // the absolute minutes `bookings.span` uses, so a night past midnight overlaps the next day's morning
  const spans = sql.join(
    dates.map(
      (d) =>
        sql`int4range((${d}::date - date '2000-01-01') * 1440 + ${block.start}, (${d}::date - date '2000-01-01') * 1440 + ${block.end})`,
    ),
    sql`, `,
  )
  const rows = await db
    .selectDistinct({ code: bookings.code, date: bookings.date, start: bookings.start, end: bookings.end })
    .from(bookingItems)
    .innerJoin(bookings, eq(bookings.id, bookingItems.bookingId))
    .where(
      and(
        eq(bookings.businessId, businessId),
        eq(bookingItems.staffId, staffId),
        eq(bookingItems.active, true),
        inArray(bookingItems.date, [...new Set(dates.flatMap((d) => [addDays(d, -1), d, addDays(d, 1)]))]),
        sql`int4range((${bookingItems.date} - date '2000-01-01') * 1440 + ${bookingItems.start}, (${bookingItems.date} - date '2000-01-01') * 1440 + ${bookingItems.end} + ${bookingItems.bufferAfter}) && any (array[${spans}])`,
      ),
    )
    .orderBy(asc(bookings.date), asc(bookings.start))
  return rows
}

/**
 * Take a block away: this one, or with `series` this one and the later ones of its weekly repeat. Someone who may block
 * that person's time may take it away.
 */
export async function removeBlock(deps: Deps, business: Business, actor: Actor, id: string, scope: 'one' | 'series'): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const [block] = await tx
      .select()
      .from(staffBlocks)
      .where(and(eq(staffBlocks.id, id), eq(staffBlocks.businessId, business.id)))
    if (!block) throw new ApiError('not_found')
    assertMayBook(actor, block.staffId)
    const which =
      scope === 'series' && block.seriesId
        ? and(eq(staffBlocks.seriesId, block.seriesId), gte(staffBlocks.date, block.date))
        : eq(staffBlocks.id, block.id)
    await tx.delete(staffBlocks).where(which)
    await emit(tx, { type: 'business.updated', businessId: business.id })
  })
}

/** The blocks from–to at the business the reader may see in the calendar: everyone's, or a specialist their own. */
export async function blocksFor(db: Queryable, business: Business, actor: Actor, from: string, to: string): Promise<Block[]> {
  if (diffDays(to, from) > 62) throw invalid({ path: ['to'], code: 'too_big' })
  const people = await db.select({ id: staff.id }).from(staff).where(eq(staff.businessId, business.id))
  const visible = people.map((p) => p.id).filter((id) => canOn(actor, 'calendar', [id]))
  return blocksBetween(db, business.id, visible, from, to)
}

/** The blocks between two dates at the business, for the people the actor may see in the calendar. */
export async function blocksBetween(
  db: Queryable,
  businessId: string,
  staffIds: readonly string[],
  from: string,
  to: string,
): Promise<Block[]> {
  if (!staffIds.length) return []
  const rows = await db
    .select()
    .from(staffBlocks)
    .where(
      and(
        eq(staffBlocks.businessId, businessId),
        inArray(staffBlocks.staffId, [...staffIds]),
        gte(staffBlocks.date, from),
        sql`${staffBlocks.date} <= ${to}`,
      ),
    )
    .orderBy(asc(staffBlocks.date), asc(staffBlocks.start))
  return rows.map(viewOf)
}
