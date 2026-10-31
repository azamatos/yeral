/**
 * "Senenama" (book B-16, B-17): a day or a week of the business as the reader may see it. Columns for the bookable team
 * (a specialist: their own), each day's working stretch, breaks and why someone's off; the bookings with their status
 * as people see it now and the team's markers; a client's waiting move as its ghost where it asks to be; blocked time;
 * time taken in another workspace with no details; each day's line, with the money the reader may see. One booking on
 * its own by its code, the same block, for the list's drawer, the client card's rows and a notification's "Open".
 */
import type { CalendarBooking, calendarQuerySchema, CalendarView } from '@yeral/contract/calendar'
import type { Locale } from '@yeral/contract/common'
import type { InternalStatus } from '@yeral/contract/settings'
import { DAY_MINUTES, staffDay, staffOffReason, type BusinessHours } from '@yeral/domain/hours'
import { effectiveStatus } from '@yeral/domain/lifecycle'
import { canOn, scopeOf, type Actor } from '@yeral/domain/permissions'
import { businessTotal, daySummary } from '@yeral/domain/pricing'
import { addDays } from '@yeral/domain/time'
import { and, eq, gte, inArray, isNotNull, isNull, lte } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { groupBy } from '../../lib/group'
import { bookingItems, bookings, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { loadBusiness, loadElsewhere } from '../availability/context'
import { photoOf } from '../catalog/map'
import { awaitingAnswer, itemsOf, itemsOfBookings, stateOf, type BookingRow, type ItemRow } from '../bookings/repo'
import { teamItemOf, teamPriceOf } from '../bookings/team-view'
import { statusesOf } from '../settings/statuses'
import { teamPhotos } from '../team/service'
import { alertNotesOf } from '../clients/facts'
import { blocksBetween } from './blocks'
import { staffOf, type Business } from './repo'

type CalendarQuery = z.infer<typeof calendarQuerySchema>

const priceOf = (i: Pick<ItemRow, 'priceType' | 'priceAmount'>) => ({ type: i.priceType, amount: i.priceAmount })

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

/** What a booking block needs besides its row: the language, the markers switched on, the alerts, who filed what. */
interface BlockContext {
  lang: Locale
  enabled: readonly InternalStatus[]
  alerts: ReadonlyMap<string, string[]>
  authors: ReadonlyMap<string, string>
}

/** A booking block: the row with its status as people see it now, its items, and its client's waiting move if any. */
function bookingBlock(
  row: BookingRow,
  { status, cancelledBy }: Pick<ReturnType<typeof effectiveStatus>, 'status' | 'cancelledBy'>,
  items: readonly ItemRow[],
  move: BookingRow | undefined,
  ctx: BlockContext,
): CalendarBooking {
  return {
    code: row.code,
    type: row.type,
    date: row.date,
    start: row.start,
    end: row.end,
    status,
    cancelledBy,
    source: row.source,
    client: { id: row.clientId, name: row.clientName, phone: row.clientPhone },
    items: items.map((i) => ({ ...teamItemOf(i, ctx.lang), bufferAfter: i.bufferAfter })),
    price: teamPriceOf(row),
    internalStatusId: row.internalStatusId && ctx.enabled.some((s) => s.id === row.internalStatusId) ? row.internalStatusId : null,
    alert: !!row.clientId && ctx.alerts.has(row.clientId),
    clientNote: row.clientNote,
    internalNote: row.internalNote,
    holdUntil: status === 'pending' ? (row.holdUntil?.getTime() ?? null) : null,
    complaint: complaintOf(row, ctx.authors),
    // the asked time for the line under the block; its ghost is in `moves` when that time is in view
    move: move
      ? { code: move.code, date: move.date, start: move.start, end: move.end, holdUntil: move.holdUntil?.getTime() ?? null }
      : null,
  }
}

/**
 * One booking by its code, as the calendar draws it (slice 4's gap 2): whatever its status, for the list's drawer and
 * a notification's "Open". One the reader doesn't see in the calendar is 404, as is a move request's own code (the
 * requests carry those).
 */
export async function calendarBooking(deps: Deps, business: Business, actor: Actor, code: string, lang: Locale): Promise<CalendarBooking> {
  const { db } = deps
  const now = deps.now()
  const [row] = await db
    .select()
    .from(bookings)
    .where(and(eq(bookings.businessId, business.id), eq(bookings.code, code), isNull(bookings.rescheduleOf)))
  if (!row) throw new ApiError('not_found')
  const items = await itemsOf(db, row.id)
  if (!canOn(actor, 'calendar', staffOf(items))) throw new ApiError('not_found')
  const [[move], alerts, statuses, authors] = await all(db, [
    () =>
      db
        .select()
        .from(bookings)
        .where(and(eq(bookings.rescheduleOf, row.id), awaitingAnswer(now))),
    () => alertNotesOf(db, row.clientId ? [row.clientId] : []),
    () => statusesOf(db, business.id),
    () => complaintAuthors(db, [row]),
  ])
  const enabled = statuses.filter((s) => s.enabled)
  return bookingBlock(row, effectiveStatus(stateOf(row), now), items, move, { lang, enabled, alerts, authors })
}

export async function calendarView(deps: Deps, business: Business, actor: Actor, q: CalendarQuery): Promise<CalendarView> {
  const { db } = deps
  const now = deps.now()
  const from = q.date
  const to = addDays(from, q.days - 1)
  const dayBefore = addDays(from, -1)
  // in view: from `from` to `to`, and the night before's part past midnight (book Q-105)
  const inRange = (r: { date: string; end: number }) => r.date <= to && (r.date >= from || (r.date === dayBefore && r.end > DAY_MINUTES))
  const dates = Array.from({ length: q.days }, (_, i) => addDays(from, i))
  if (q.staff && !canOn(actor, 'calendar', [q.staff])) throw new ApiError('forbidden')
  // whose time the reader sees: everyone bookable, or a specialist their own; "Bir işgär" narrows it to one
  const own = scopeOf(actor, 'calendar') === 'own'
  const narrowTo = q.staff ?? (own ? actor.staffId : null)
  const sees = (staffId: string) => !narrowTo || staffId === narrowTo
  const withStaff = (staffId: string) =>
    db.select({ id: bookingItems.bookingId }).from(bookingItems).where(eq(bookingItems.staffId, staffId))
  const between = and(eq(bookings.businessId, business.id), gte(bookings.date, dayBefore), lte(bookings.date, to))
  const ofReader = narrowTo ? inArray(bookings.id, withStaff(narrowTo)) : undefined

  // the business, the bookings with someone the reader sees, the waiting moves asked onto them (the ghosts), their
  // time elsewhere and the team's markers, at once
  const [lb, found, askedHere, elsewhere, statuses] = await all(db, [
    () => loadBusiness(db, business.id),
    () =>
      db
        .select()
        .from(bookings)
        .where(and(between, isNull(bookings.rescheduleOf), ofReader)),
    () =>
      db
        .select()
        .from(bookings)
        .where(and(between, isNotNull(bookings.rescheduleOf), awaitingAnswer(now), ofReader)),
    () => loadElsewhere(db, [business.id], from, to, narrowTo ? [narrowTo] : undefined),
    () => statusesOf(db, business.id),
  ])
  const hours: BusinessHours = { hours: lb.business.hours, exceptions: lb.business.exceptions }
  const shown = found
    .map((row) => ({ row, ...effectiveStatus(stateOf(row), now) }))
    .filter(({ row, status }) => inRange(row) && (q.cancelled || status !== 'cancelled'))
  const ids = new Set(shown.map((s) => s.row.id))
  // a waiting move of a booking in view (its line "→ Sat, 17 Oct · 11:30?"), wherever it asks to go
  const [ofShown, alerts, authors] = await all(db, [
    async () =>
      ids.size
        ? db
            .select()
            .from(bookings)
            .where(and(inArray(bookings.rescheduleOf, [...ids]), awaitingAnswer(now)))
        : [],
    () =>
      alertNotesOf(
        db,
        shown.flatMap((s) => (s.row.clientId ? [s.row.clientId] : [])),
      ),
    () =>
      complaintAuthors(
        db,
        shown.map((s) => s.row),
      ),
  ])
  const ghosts = askedHere.filter(inRange)
  const originals = ghosts.filter((m) => !ids.has(m.rescheduleOf!)).map((m) => m.rescheduleOf!)
  const [items, extra] = await all(db, [
    () => itemsOfBookings(db, [...ids, ...ghosts.map((m) => m.id)]),
    async () => (originals.length ? db.select().from(bookings).where(inArray(bookings.id, originals)) : []),
  ])
  const itemsBy = groupBy(items, (i) => i.bookingId)
  const moveOf = new Map(ofShown.map((m) => [m.rescheduleOf!, m]))
  const originalOf = new Map([...found, ...extra].map((b) => [b.id, b]))
  const enabled = statuses.filter((s) => s.enabled)
  const ctx: BlockContext = { lang: q.lang, enabled, alerts, authors }
  const itemView = (i: ItemRow) => ({ ...teamItemOf(i, q.lang), bufferAfter: i.bufferAfter })

  // the columns: the bookable team the reader sees (a specialist always their own), and anyone removed whose kept
  // bookings show here
  const team = lb.staff.filter((s) => (s.bookable || (own && s.id === actor.staffId)) && sees(s.id))
  const onTeam = new Set(team.map((s) => s.id))
  const others = [...new Set(items.flatMap((i) => (i.staffId && sees(i.staffId) && !onTeam.has(i.staffId) ? [i.staffId] : [])))]
  const gone = others.length ? await db.select().from(staff).where(inArray(staff.id, others)) : []
  const people = [...team.map((s) => ({ row: s, removed: false })), ...gone.map((s) => ({ row: s, removed: s.status !== 'active' }))]
  const photos = await teamPhotos(
    db,
    people.map((p) => p.row),
  )
  const columns = people.map(({ row, removed }) => ({
    staffId: row.id,
    name: row.name,
    photo: photos.has(row.id) ? photoOf(deps, photos.get(row.id)!, q.lang, row.name) : null,
    level: row.level,
    hasApp: row.hasApp,
    removed,
    days: dates.map((date) => {
      const day = removed ? null : staffDay(hours, row, date)
      // why they're off only when they are
      const off = removed || day ? null : staffOffReason(hours, row, date)
      return {
        date,
        working: day ? { open: day.open, close: day.close } : null,
        breaks: day?.breaks ?? [],
        off: off ? { kind: off.kind, name: 'name' in off ? (off.name ?? null) : null } : null,
      }
    }),
  }))
  const visible = new Set(columns.map((c) => c.staffId))
  const blocks = await blocksBetween(db, business.id, [...visible], dayBefore, to)

  // the money the reader may see: everything, their own work (a specialist's earnings), or none; one person's view
  // counts that person's part of a shared booking
  const revenue = scopeOf(actor, 'revenue')
  const counted = revenue === 'own' ? actor.staffId : q.staff
  const byDate = groupBy(shown, (s) => s.row.date)
  const summary = dates.map((date) => {
    // what the business earns from each, hidden prices included (`businessTotal`)
    const line = daySummary(
      (byDate.get(date) ?? []).map(({ row, status }) => ({
        status,
        price: businessTotal((itemsBy.get(row.id) ?? []).filter((i) => !counted || i.staffId === counted).map(priceOf)),
      })),
    )
    return { date, count: line.count, requests: line.requests, revenue: revenue === 'none' ? null : line.plannedRevenue }
  })

  return {
    from,
    to,
    columns,
    bookings: shown.map(({ row, status, cancelledBy }) =>
      bookingBlock(row, { status, cancelledBy }, itemsBy.get(row.id) ?? [], moveOf.get(row.id), ctx),
    ),
    // the ghosts at the asked time, in the columns in view
    moves: ghosts.flatMap((m) => {
      const of = originalOf.get(m.rescheduleOf!)
      const mine = itemsBy.get(m.id) ?? []
      return of && mine.some((i) => !i.staffId || visible.has(i.staffId))
        ? [
            {
              code: m.code,
              date: m.date,
              start: m.start,
              end: m.end,
              items: mine.map(itemView),
              holdUntil: m.holdUntil?.getTime() ?? null,
              of: { code: of.code, date: of.date, start: of.start, end: of.end },
              client: { name: m.clientName, phone: m.clientPhone },
            },
          ]
        : []
    }),
    blocks: blocks.filter(inRange),
    elsewhere: elsewhere
      .filter((b) => visible.has(b.staffId))
      .map((b) => ({ staffId: b.staffId, date: b.date, start: b.start, end: b.end - (b.buffer ?? 0) }))
      .filter(inRange),
    summary,
    internalStatuses: enabled,
  }
}
