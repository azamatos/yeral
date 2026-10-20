/** A review as the page and the team read it: what the visit was, and the business's reply. */
import type { Locale } from '@yeral/domain/model'
import { asc, inArray } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, type reviews } from '../../db/schema'
import { groupBy } from '../../lib/group'
import { visitWhat } from '../catalog/map'

type ReviewRow = typeof reviews.$inferSelect

/** Each review's visit ("Aýal saç kesimi · Aýna") from its booking's services, else what it saved when written. */
export async function visitsOf(db: Queryable, rows: readonly ReviewRow[], lang: Locale): Promise<Map<string, string>> {
  const items = rows.length
    ? await db
        .select()
        .from(bookingItems)
        .where(
          inArray(
            bookingItems.bookingId,
            rows.map((r) => r.bookingId),
          ),
        )
        .orderBy(asc(bookingItems.sort))
    : []
  const byBooking = groupBy(items, (i) => i.bookingId)
  return new Map(rows.map((r) => [r.id, visitWhat(byBooking.get(r.bookingId) ?? [], lang) || r.what]))
}

/** The reply everyone sees: written and not taken away. */
export const replyOf = (r: ReviewRow) => (r.replyText && r.replyAt && !r.replyDeletedAt ? { text: r.replyText, at: r.replyAt } : null)
