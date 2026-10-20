/**
 * "Senenama" (book B-16, B-17): a day or a week of the business as the reader may see it. Columns for the bookable team
 * (a specialist: their own), each day's working stretch, breaks and why someone's off; the bookings with their status
 * as people see it now, the team's markers and a client's waiting move as its ghost; blocked time; time taken in
 * another workspace with no details; each day's line, with the money the reader may see.
 */
import type { calendarQuerySchema, CalendarView } from '@yeral/contract/calendar'
import { DAY_MINUTES, staffDay, staffOffReason, type BusinessHours } from '@yeral/domain/hours'
import { effectiveStatus } from '@yeral/domain/lifecycle'
import { canOn, scopeOf, type Actor } from '@yeral/domain/permissions'
import { daySummary, priceTotal } from '@yeral/domain/pricing'
import { addDays } from '@yeral/domain/time'
import { and, eq, gte, inArray, isNull, lte } from 'drizzle-orm'
import type { z } from 'zod'
import { all } from '../../db/client'
import { bookingItems, bookings, clientNotes, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { loadBusiness, loadBusy } from '../availability/context'
import { photoOf, text } from '../catalog/map'
import { itemsOfBookings, stateOf, type BookingRow, type ItemRow } from '../bookings/repo'
import { statusesOf } from '../settings/statuses'
import { blocksBetween } from './blocks'
import type { Business } from './repo'

type CalendarQuery = z.infer<typeof calendarQuerySchema>

const priceOf = (i: Pick<ItemRow, 'priceType' | 'priceAmount'>) => ({ type: i.priceType, amount: i.priceAmount })

export async function calendarView(deps: Deps, business: Business, actor: Actor, q: CalendarQuery): Promise<CalendarView> {
  const { db } = deps
  const now = deps.now()
  const from = q.date
  const to = addDays(from, q.days - 1)
  const dates = Array.from({ length: q.days }, (_, i) => addDays(from, i))
  if (q.staff && !canOn(actor, 'calendar', [q.staff])) throw new ApiError('forbidden')
  const lb = await loadBusiness(db, business.id)
  const hours: BusinessHours = { hours: lb.business.hours, exceptions: lb.business.exceptions }
  // whose time the reader sees: everyone bookable, or a specialist their own; "Bir işgär" narrows it to one
  const own = scopeOf(actor, 'calendar') === 'own'
  const sees = (staffId: string) => (q.staff ? staffId === q.staff : !own || staffId === actor.staffId)

  // the bookings with someone the reader sees, the day before too when it runs past midnight (book Q-105)
  const found = await db
    .selectDistinct({ b: bookings })
    .from(bookings)
    .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.businessId, business.id),
        gte(bookings.date, addDays(from, -1)),
        lte(bookings.date, to),
        isNull(bookings.rescheduleOf),
        q.staff ? eq(bookingItems.staffId, q.staff) : own && actor.staffId ? eq(bookingItems.staffId, actor.staffId) : undefined,
      ),
    )
  const shown = found
    .map((r) => ({ row: r.b, ...effectiveStatus(stateOf(r.b), now) }))
    .filter(({ row, status }) => (row.date >= from || row.end > DAY_MINUTES) && (q.cancelled || status !== 'cancelled'))
  const ids = shown.map((s) => s.row.id)
  const [items, moves, alerts, statuses] = await all(db, [
    () => itemsOfBookings(db, ids),
    async () =>
      ids.length
        ? db
            .select()
            .from(bookings)
            .where(and(inArray(bookings.rescheduleOf, ids), eq(bookings.status, 'pending')))
        : [],
    () =>
      clientIdsWithAlert(
        deps,
        shown.flatMap((s) => (s.row.clientId ? [s.row.clientId] : [])),
      ),
    () => statusesOf(db, business.id),
  ])
  const moveItems = await itemsOfBookings(
    db,
    moves.map((m) => m.id),
  )
  const enabled = statuses.filter((s) => s.enabled)
  const itemView = (i: ItemRow) => ({
    serviceId: i.serviceId,
    service: text(i.serviceName, q.lang),
    staffId: i.staffId,
    staff: i.staffName,
    start: i.start,
    end: i.end,
    bufferAfter: i.bufferAfter,
  })

  // the columns: the bookable team the reader sees, and anyone removed whose kept bookings show here
  const team = lb.staff.filter((s) => (s.bookable || s.id === actor.staffId) && sees(s.id))
  const others = [
    ...new Set(items.flatMap((i) => (i.staffId && sees(i.staffId) && !team.some((s) => s.id === i.staffId) ? [i.staffId] : []))),
  ]
  const gone = others.length ? await db.select().from(staff).where(inArray(staff.id, others)) : []
  const people = [...team.map((s) => ({ row: s, removed: false })), ...gone.map((s) => ({ row: s, removed: s.status !== 'active' }))]
  const columns = people.map(({ row, removed }) => ({
    staffId: row.id,
    name: row.name,
    photo: row.photo ? photoOf(deps, row.photo, q.lang) : null,
    level: row.level,
    hasApp: row.hasApp,
    removed,
    days: dates.map((date) => {
      const day = removed ? null : staffDay(hours, row, date)
      const off = removed ? null : staffOffReason(hours, row, date)
      return {
        date,
        working: day ? { open: day.open, close: day.close } : null,
        breaks: day?.breaks ?? [],
        off: off ? { kind: off.kind, name: 'name' in off ? (off.name ?? null) : null } : null,
      }
    }),
  }))
  const visible = new Set(columns.map((c) => c.staffId))

  const [blocks, busy] = await all(db, [
    () => blocksBetween(db, business.id, [...visible], addDays(from, -1), to),
    () => loadBusy(db, [business.id], from, to),
  ])

  // the money the reader may see: everything, their own work (a specialist's earnings), or none
  const revenue = scopeOf(actor, 'revenue')
  const summary = dates.map((date) => {
    const day = shown.filter((s) => s.row.date === date)
    const line = daySummary(
      day.map(({ row, status }) => ({
        status,
        price:
          revenue === 'own'
            ? priceTotal(items.filter((i) => i.bookingId === row.id && i.staffId === actor.staffId).map(priceOf))
            : (row.priceAmount ?? 0),
      })),
    )
    return { date, count: line.count, requests: line.requests, revenue: revenue === 'none' ? null : line.plannedRevenue }
  })

  return {
    from,
    to,
    columns,
    bookings: shown.map(({ row, status, cancelledBy }) => {
      const move = moves.find((m) => m.rescheduleOf === row.id)
      return {
        code: row.code,
        type: row.type,
        date: row.date,
        start: row.start,
        end: row.end,
        status,
        cancelledBy,
        source: row.source,
        client: { name: row.clientName, phone: row.clientPhone },
        items: items.filter((i) => i.bookingId === row.id).map(itemView),
        price: row.priceType ? { type: row.priceType, amount: row.priceAmount ?? 0 } : null,
        internalStatusId: row.internalStatusId && enabled.some((s) => s.id === row.internalStatusId) ? row.internalStatusId : null,
        alert: !!row.clientId && alerts.has(row.clientId),
        clientNote: row.clientNote,
        internalNote: row.internalNote,
        holdUntil: status === 'pending' ? (row.holdUntil?.getTime() ?? null) : null,
        move: move ? moveView(move, moveItems.filter((i) => i.bookingId === move.id).map(itemView)) : null,
      }
    }),
    blocks,
    elsewhere: busy
      .filter((b) => b.elsewhere && visible.has(b.staffId) && b.date >= addDays(from, -1) && b.date <= to)
      .map((b) => ({ staffId: b.staffId, date: b.date, start: b.start, end: b.end - (b.buffer ?? 0) })),
    summary,
    internalStatuses: enabled,
  }
}

const moveView = (m: BookingRow, items: CalendarView['bookings'][number]['items']) => ({
  code: m.code,
  date: m.date,
  start: m.start,
  end: m.end,
  items,
  holdUntil: m.holdUntil?.getTime() ?? null,
})

/** The clients among these with a note "shown when they book" ("Ýazylanda görkez"). */
async function clientIdsWithAlert(deps: Deps, clientIds: readonly string[]): Promise<Set<string>> {
  if (!clientIds.length) return new Set()
  const rows = await deps.db
    .selectDistinct({ id: clientNotes.clientId })
    .from(clientNotes)
    .where(and(inArray(clientNotes.clientId, [...new Set(clientIds)]), eq(clientNotes.alert, true)))
  return new Set(rows.map((r) => r.id))
}
