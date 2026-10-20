/**
 * "Ýazylyşlar" (book B-30, B-31): the business's bookings by tab, searched and filtered, paged; and the same rows as a
 * CSV file for the owner and administrators. A specialist sees only the bookings with them. A move isn't a row of its
 * own (the requests tab shows it); a request that ran out unanswered is cancelled, as people see it.
 */
import type { bookingFiltersSchema, bookingListQuerySchema, bookingRowSchema } from '@yeral/contract/calendar'
import { effectiveStatus } from '@yeral/domain/lifecycle'
import { canOn, scopeOf, type Actor } from '@yeral/domain/permissions'
import { COUNTRY_PREFIX, formatPhone, nationalDigits } from '@yeral/domain/phone'
import { hm, localOf } from '@yeral/domain/time'
import { createFmt, createT } from '@yeral/i18n/fmt'
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lt, lte, not, or, sql, type SQL } from 'drizzle-orm'
import type { z } from 'zod'
import { all } from '../../db/client'
import { bookingItems, bookings, clients } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { itemsOfBookings, stateOf, type BookingRow, type ItemRow } from '../bookings/repo'
import { teamItemOf, teamPriceOf } from '../bookings/team-view'
import { likeOf } from '../catalog/search'
import { text } from '../catalog/map'
import { clientFacts, spanMinuteOf, withStaff } from '../clients/facts'
import type { Business } from './repo'

type Filters = z.infer<typeof bookingFiltersSchema>
type ListQuery = z.infer<typeof bookingListQuerySchema>
type Row = z.infer<typeof bookingRowSchema>

/** The most rows one export holds, in the tab's order. */
export const EXPORT_MAX = 10_000

/** The booking has an item of this service. */
const withService = (serviceId: string) =>
  sql`exists (select 1 from ${bookingItems} where ${bookingItems.bookingId} = ${bookings.id} and ${bookingItems.serviceId} = ${serviceId})`

/** A booking code, a client's name, or digits of their number (typed with "+" and the code, read from after it). */
function searchOf(q: string | undefined): SQL | undefined {
  if (!q) return undefined
  const digits = /^[\d\s()+-]+$/.test(q) ? (q.startsWith('+') ? nationalDigits(q) : q.replace(/\D/g, '')) : ''
  return or(
    ilike(bookings.code, likeOf(q)),
    ilike(bookings.clientName, likeOf(q)),
    digits ? sql`substr(${bookings.clientPhone}, ${COUNTRY_PREFIX.length + 1}) like ${likeOf(digits)}` : undefined,
  )
}

/** The tab, the reader's reach and the filters; a specialist asking for someone else's is refused. */
function whereOf(business: Business, actor: Actor, q: Filters, now: number): SQL {
  if (q.staff && !canOn(actor, 'calendar', [q.staff])) throw new ApiError('forbidden')
  const today = localOf(now).date
  // a request whose answer time ran out, before the jobs settle it
  const ranOut = sql`(${bookings.status} = 'pending' and (${bookings.holdUntil} <= ${new Date(now)}
    or (${bookings.holdUntil} is null and lower(${bookings.span}) <= ${spanMinuteOf(now)})))`
  const cancelled = sql`(${bookings.status} = 'cancelled' or ${ranOut})`
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
    searchOf(q.q),
  )!
}

/** Today's and those ahead the soonest first; the past and the cancelled the newest first. */
const orderOf = (tab: Filters['tab']) =>
  tab === 'today' || tab === 'upcoming'
    ? [asc(bookings.date), asc(bookings.start), asc(bookings.code)]
    : [desc(bookings.date), desc(bookings.start), asc(bookings.code)]

export async function bookingList(
  deps: Deps,
  business: Business,
  actor: Actor,
  q: ListQuery,
): Promise<{ items: Row[]; total: number; cursor: string | null }> {
  const { db } = deps
  const now = deps.now()
  const offset = Number(q.cursor ?? 0) || 0
  const found = await db
    .select({ b: bookings, total: sql<number>`(count(*) over ())::int` })
    .from(bookings)
    .where(whereOf(business, actor, q, now))
    .orderBy(...orderOf(q.tab))
    .limit(q.limit)
    .offset(offset)
  const total = found[0]?.total ?? 0
  const rows = found.map((f) => f.b)
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
        items: items.filter((i) => i.bookingId === b.id).map((i) => teamItemOf(i, q.lang)),
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
 * A cell: quoted when it holds a comma, a quote or a line break; one a spreadsheet would read as a formula (a name typed
 * as "=…") starts with an apostrophe.
 */
function cell(value: string, typed = false): string {
  const v = typed && /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
  return /[",\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
}

/** "Eksport (CSV)" (B-31): the rows the filters find, in the reader's language; the owner and administrators. */
export async function exportBookings(deps: Deps, business: Business, actor: Actor, q: Filters): Promise<string> {
  if (scopeOf(actor, 'calendar') !== 'all') throw new ApiError('forbidden')
  const { db } = deps
  const now = deps.now()
  const rows = await db
    .select()
    .from(bookings)
    .where(whereOf(business, actor, q, now))
    .orderBy(...orderOf(q.tab))
    .limit(EXPORT_MAX)
  const items = await itemsOfBookings(
    db,
    rows.map((b) => b.id),
  )
  const byBooking = new Map<string, ItemRow[]>()
  for (const i of items) {
    const list = byBooking.get(i.bookingId)
    if (list) list.push(i)
    else byBooking.set(i.bookingId, [i])
  }
  const t = createT(q.lang)
  const fmt = createFmt(q.lang)
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
    const mine = byBooking.get(b.id) ?? []
    const price = teamPriceOf(b)
    return [
      cell(b.code),
      cell(b.date),
      cell(`${hm(b.start)}–${hm(b.end)}`),
      cell(b.clientName ?? t('bookingsExport.unnamed'), true),
      cell(b.clientPhone ? formatPhone(b.clientPhone) : ''),
      cell(mine.map((i) => text(i.serviceName, q.lang)).join(', '), true),
      cell([...new Set(mine.flatMap((i) => (i.staffName ? [i.staffName] : [])))].join(', '), true),
      cell(t(`sources.${b.source}`)),
      cell(t(`status.${status}`)),
      cell(cancelledBy ? t(`cancelledBy.${cancelledBy}`) : ''),
      cell(price ? fmt.price(price) : ''),
      cell(price ? String(price.amount) : ''),
    ].join(',')
  }
  // a byte-order mark, so spreadsheets read the letters right
  return `\uFEFF${[head.map((h) => cell(t(`bookingsExport.${h}`))).join(','), ...rows.map(line)].join('\r\n')}\r\n`
}
