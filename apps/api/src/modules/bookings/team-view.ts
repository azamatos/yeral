/** A booking as the team reads it (the requests list, the calendar): the same items and price everywhere. */
import type { CalendarBooking } from '@yeral/contract/calendar'
import type { Locale } from '@yeral/domain/model'
import { inArray } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { staff } from '../../db/schema'
import { text } from '../catalog/map'
import type { BookingRow, ItemRow } from './repo'

/** An item: its service in the reader's language, who does it, when. */
export const teamItemOf = (i: ItemRow, lang: Locale) => ({
  serviceId: i.serviceId,
  service: text(i.serviceName, lang),
  staffId: i.staffId,
  staff: i.staffName,
  start: i.start,
  end: i.end,
})

/** What the team charges for it, a hidden price included. */
export const teamPriceOf = (b: Pick<BookingRow, 'priceType' | 'priceAmount'>) =>
  b.priceType ? { type: b.priceType, amount: b.priceAmount ?? 0 } : null

/** Who filed the complaints among these bookings, by id: the team's rows stay after someone leaves, so the name is kept. */
export async function complaintAuthors(db: Queryable, rows: readonly Pick<BookingRow, 'complaintBy'>[]): Promise<Map<string, string>> {
  const ids = [...new Set(rows.flatMap((r) => (r.complaintBy ? [r.complaintBy] : [])))]
  if (!ids.length) return new Map()
  const people = await db.select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, ids))
  return new Map(people.map((p) => [p.id, p.name]))
}

/** The complaint on a booking as the team sees it (B-28), with who filed it. */
export const complaintOf = (
  row: Pick<BookingRow, 'complaintType' | 'complaintText' | 'complaintAt' | 'complaintBy'>,
  authors: ReadonlyMap<string, string>,
): CalendarBooking['complaint'] =>
  row.complaintType && row.complaintAt
    ? {
        type: row.complaintType,
        text: row.complaintText,
        by: row.complaintBy && authors.has(row.complaintBy) ? { staffId: row.complaintBy, name: authors.get(row.complaintBy)! } : null,
        at: row.complaintAt.getTime(),
      }
    : null
