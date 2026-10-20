/**
 * "Ýazylyşlar" (book B-30, B-31): the business's bookings by tab, searched and filtered, paged; and the same rows (or
 * the ones ticked) as a CSV file for the owner and administrators. A specialist sees only the bookings with them. A
 * move isn't a row of its own (the requests tab shows it); a request that ran out unanswered is cancelled, as people
 * see it. "Today" is the business day: a business open past midnight keeps last night's late bookings on it.
 */
import type { bookingExportQuerySchema, bookingFiltersSchema, bookingListQuerySchema, bookingRowSchema } from '@yeral/contract/calendar'
import { currentBusinessDate } from '@yeral/domain/hours'
import { effectiveStatus } from '@yeral/domain/lifecycle'
import { canOn, scopeOf, type Actor } from '@yeral/domain/permissions'
import { formatPhone } from '@yeral/domain/phone'
import { createFmt, createT } from '@yeral/i18n/fmt'
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lt, lte, not, or, sql, type SQL } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingItems, bookings, clients } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { groupBy } from '../../lib/group'
import { loadHours } from '../availability/context'
import { itemsOfBookings, ranOutAt, stateOf, type BookingRow } from '../bookings/repo'
import { teamItemOf, teamPriceOf } from '../bookings/team-view'
import { text } from '../catalog/map'
import { likeOf, phoneLike } from '../catalog/search'
import { clientFacts, withStaff } from '../clients/facts'
import type { Business } from './repo'

type Filters = z.infer<typeof bookingFiltersSchema>
type ExportQuery = z.infer<typeof bookingExportQuerySchema>
type ListQuery = z.infer<typeof bookingListQuerySchema>
type Row = z.infer<typeof bookingRowSchema>

/** The most rows one export holds, in the tab's order; the response says how many matched (`X-Total-Count`). */
export const EXPORT_MAX = 10_000

/** The booking has an item of this service. */
const withService = (serviceId: string) =>
  sql`exists (select 1 from ${bookingItems} where ${bookingItems.bookingId} = ${bookings.id} and ${bookingItems.serviceId} = ${serviceId})`

/**
 * A booking code, a client's name (as on the booking, or as the team keeps it on the card now), or digits of their
 * number.
 */
function searchOf(q: string | undefined): SQL | undefined {
  if (!q) return undefined
  return or(
    ilike(bookings.code, likeOf(q)),
    ilike(bookings.clientName, likeOf(q)),
    sql`exists (select 1 from ${clients} where ${clients.id} = ${bookings.clientId} and ${clients.name} ilike ${likeOf(q)})`,
    phoneLike(bookings.clientPhone, q),
  )
}

/** The tab, the reader's reach and the filters; a specialist asking for someone else's is refused. */
async function whereOf(db: Queryable, business: Business, actor: Actor, q: Filters & { codes?: string[] }, now: number): Promise<SQL> {
  if (q.staff && !canOn(actor, 'calendar', [q.staff])) throw new ApiError('forbidden')
  const today = currentBusinessDate(await loadHours(db, business.id), now)
  const cancelled = sql`(${bookings.status} = 'cancelled' or ${ranOutAt(now)})`
  const tab = {
    today: and(eq(bookings.date, today), not(cancelled)),
    upcoming: and(gt(bookings.date, today), not(cancelled)),
    past: and(lt(bookings.date, today), not(cancelled)),
    cancelled,
  }[q.tab]
  const own = scopeOf(actor, 'calendar') === 'own' ? actor.staffId : null
  return and(
    eq(bookings.businessId, business.id),
    isNull(bookings.rescheduleOf),
    tab,
    own ? withStaff(own) : undefined,
    q.staff ? withStaff(q.staff) : undefined,
    q.service ? withService(q.service) : undefined,
    q.from ? gte(bookings.date, q.from) : undefined,
    q.to ? lte(bookings.date, q.to) : undefined,
    q.codes ? inArray(bookings.code, q.codes) : undefined,
    searchOf(q.q),
  )!
}

/** Today's and those ahead the soonest first; the past and the cancelled the newest first. */
const orderOf = (tab: Filters['tab']) =>
  tab === 'today' || tab === 'upcoming'
    ? [asc(bookings.date), asc(bookings.start), asc(bookings.code)]
    : [desc(bookings.date), desc(bookings.start), asc(bookings.code)]

/** The rows of one page or export, and how many match in all (counted again when the page is past the end). */
async function rowsOf(db: Queryable, where: SQL, tab: Filters['tab'], limit: number, offset: number) {
  const found = await db
    .select({ b: bookings, total: sql<number>`(count(*) over ())::int` })
    .from(bookings)
    .where(where)
    .orderBy(...orderOf(tab))
    .limit(limit)
    .offset(offset)
  if (found[0] || !offset) return { rows: found.map((f) => f.b), total: found[0]?.total ?? 0 }
  const [counted] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(where)
  return { rows: [], total: counted?.n ?? 0 }
}

export async function bookingList(
  deps: Deps,
  business: Business,
  actor: Actor,
  q: ListQuery,
): Promise<{ items: Row[]; total: number; cursor: string | null }> {
  const { db } = deps
  const now = deps.now()
  const offset = Number(q.cursor ?? 0)
  const { rows, total } = await rowsOf(db, await whereOf(db, business, actor, q, now), q.tab, q.limit, offset)
  const clientIds = [...new Set(rows.flatMap((b) => (b.clientId ? [b.clientId] : [])))]
  const [items, facts] = await all(db, [
    () =>
      itemsOfBookings(
        db,
        rows.map((b) => b.id),
      ),
    async () =>
      clientIds.length
        ? (await clientFacts(db, business.id, actor, now, { where: inArray(clients.id, clientIds), scope: 'business' })).rows
        : [],
  ])
  const itemsBy = groupBy(items, (i) => i.bookingId)
  // the client tag: a first visit in the last 30 days, none before a first visit (the owner's rule in design round 3)
  const isNew = new Set(facts.filter((f) => f.segments.includes('new')).map((f) => f.client.id))
  return {
    items: rows.map((b) => {
      const { status, cancelledBy } = effectiveStatus(stateOf(b), now)
      return {
        code: b.code,
        type: b.type,
        date: b.date,
        start: b.start,
        end: b.end,
        status,
        cancelledBy,
        source: b.source,
        client: { id: b.clientId, name: b.clientName, phone: b.clientPhone, isNew: !!b.clientId && isNew.has(b.clientId) },
        items: (itemsBy.get(b.id) ?? []).map((i) => teamItemOf(i, q.lang)),
        price: teamPriceOf(b),
        holdUntil: status === 'pending' ? (b.holdUntil?.getTime() ?? null) : null,
        complaint: b.complaintType && b.complaintAt ? { type: b.complaintType, at: b.complaintAt.getTime() } : null,
      }
    }),
    total,
    cursor: offset + q.limit < total ? String(offset + q.limit) : null,
  }
}

/**
 * A cell: quoted when it holds the separator, a quote or a line break; one a spreadsheet would read as a formula (a
 * name typed as "=…") starts with an apostrophe.
 */
function cellOf(separator: string) {
  return (value: string, typed = false): string => {
    const v = typed && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
    return v.includes(separator) || /["\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
  }
}

/**
 * "Eksport (CSV)" (B-31): the rows the filters find, or the ones ticked, in the reader's language; the owner and
 * administrators (prices are booking information, the team's to read row by row). Spreadsheets in languages that
 * write decimals with a comma split on semicolons, so those files use them.
 */
export async function exportBookings(
  deps: Deps,
  business: Business,
  actor: Actor,
  q: ExportQuery,
): Promise<{ csv: string; total: number }> {
  if (scopeOf(actor, 'calendar') !== 'all') throw new ApiError('forbidden')
  const { db } = deps
  const now = deps.now()
  const { rows, total } = await rowsOf(db, await whereOf(db, business, actor, q, now), q.tab, EXPORT_MAX, 0)
  const itemsBy = groupBy(
    await itemsOfBookings(
      db,
      rows.map((b) => b.id),
    ),
    (i) => i.bookingId,
  )
  const t = createT(q.lang)
  const fmt = createFmt(q.lang)
  const separator = fmt.number(1.5, 1).includes(',') ? ';' : ','
  const cell = cellOf(separator)
  const head = [
    'code',
    'date',
    'time',
    'client',
    'phone',
    'services',
    'specialists',
    'source',
    'status',
    'cancelledBy',
    'price',
    'amount',
  ] as const
  const line = (b: BookingRow) => {
    const { status, cancelledBy } = effectiveStatus(stateOf(b), now)
    const mine = itemsBy.get(b.id) ?? []
    const price = teamPriceOf(b)
    return [
      cell(b.code),
      cell(b.date),
      // past midnight it reads 01:00, on the business day it belongs to
      cell(fmt.timeRange(b.start, b.end)),
      cell(b.clientName ?? t('bookingsExport.unnamed'), true),
      // without its "+", which a spreadsheet would read as a sum
      cell(b.clientPhone ? formatPhone(b.clientPhone).replace(/^\+/, '') : ''),
      cell(mine.map((i) => text(i.serviceName, q.lang)).join(', '), true),
      cell([...new Set(mine.flatMap((i) => (i.staffName ? [i.staffName] : [])))].join(', '), true),
      cell(t(`sources.${b.source}`)),
      cell(t(`status.${status}`)),
      cell(cancelledBy ? t(`cancelledBy.${cancelledBy}`) : ''),
      cell(price ? fmt.price(price) : ''),
      cell(price ? String(price.amount) : ''),
    ].join(separator)
  }
  // a byte-order mark, so spreadsheets read the letters right
  const csv = `\uFEFF${[head.map((h) => cell(t(`bookingsExport.${h}`))).join(separator), ...rows.map(line)].join('\r\n')}\r\n`
  return { csv, total }
}
