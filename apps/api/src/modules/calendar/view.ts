/**
 * "Senenama" (book B-16, B-17): a day or a week of the business as the reader may see it. Columns for the bookable team
 * (a specialist: their own), each day's working stretch, breaks and why someone's off; the bookings with their status
 * as people see it now and the team's markers; a client's waiting move as its ghost where it asks to be; blocked time;
 * time taken in another workspace with no details; each day's line, with the money the reader may see.
 */
import type { calendarQuerySchema, CalendarView } from '@yeral/contract/calendar'
import { DAY_MINUTES, staffDay, staffOffReason, type BusinessHours } from '@yeral/domain/hours'
import { effectiveStatus } from '@yeral/domain/lifecycle'
import { canOn, scopeOf, type Actor } from '@yeral/domain/permissions'
import { businessTotal, daySummary } from '@yeral/domain/pricing'
import { addDays } from '@yeral/domain/time'
import { and, eq, gte, inArray, isNotNull, isNull, lte } from 'drizzle-orm'
import type { z } from 'zod'
import { all } from '../../db/client'
import { bookingItems, bookings, clientNotes, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { loadBusiness, loadElsewhere } from '../availability/context'
import { photoOf } from '../catalog/map'
import { awaitingAnswer, itemsOfBookings, stateOf, type ItemRow } from '../bookings/repo'
import { teamItemOf, teamPriceOf } from '../bookings/team-view'
import { statusesOf } from '../settings/statuses'
import { blocksBetween } from './blocks'
import type { Business } from './repo'

type CalendarQuery = z.infer<typeof calendarQuerySchema>

/** Rows in their lists by a key, in their order. */
function groupBy<T>(rows: readonly T[], key: (r: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>()
  for (const r of rows) {
    const list = out.get(key(r))
    if (list) list.push(r)
    else out.set(key(r), [r])
  }
  return out
}

const priceOf = (i: Pick<ItemRow, 'priceType' | 'priceAmount'>) => ({ type: i.priceType, amount: i.priceAmount })

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
  const [ofShown, alerts] = await all(db, [
    async () =>
      ids.size
        ? db
            .select()
            .from(bookings)
            .where(and(inArray(bookings.rescheduleOf, [...ids]), awaitingAnswer(now)))
        : [],
    () =>
      clientIdsWithAlert(
        deps,
        shown.flatMap((s) => (s.row.clientId ? [s.row.clientId] : [])),
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
  const itemView = (i: ItemRow) => ({ ...teamItemOf(i, q.lang), bufferAfter: i.bufferAfter })

  // the columns: the bookable team the reader sees (a specialist always their own), and anyone removed whose kept
  // bookings show here
  const team = lb.staff.filter((s) => (s.bookable || (own && s.id === actor.staffId)) && sees(s.id))
  const onTeam = new Set(team.map((s) => s.id))
  const others = [...new Set(items.flatMap((i) => (i.staffId && sees(i.staffId) && !onTeam.has(i.staffId) ? [i.staffId] : [])))]
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
    bookings: shown.map(({ row, status, cancelledBy }) => {
      const move = moveOf.get(row.id)
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
        items: (itemsBy.get(row.id) ?? []).map(itemView),
        price: teamPriceOf(row),
        internalStatusId: row.internalStatusId && enabled.some((s) => s.id === row.internalStatusId) ? row.internalStatusId : null,
        alert: !!row.clientId && alerts.has(row.clientId),
        clientNote: row.clientNote,
        internalNote: row.internalNote,
        holdUntil: status === 'pending' ? (row.holdUntil?.getTime() ?? null) : null,
        complaint:
          row.complaintType && row.complaintAt ? { type: row.complaintType, text: row.complaintText, at: row.complaintAt.getTime() } : null,
        // the asked time for the line under the block; its ghost is in `moves` when that time is in view
        move: move
          ? { code: move.code, date: move.date, start: move.start, end: move.end, holdUntil: move.holdUntil?.getTime() ?? null }
          : null,
      }
    }),
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

/** The clients among these with a note "shown when they book" ("Ýazylanda görkez"). */
async function clientIdsWithAlert(deps: Deps, clientIds: readonly string[]): Promise<Set<string>> {
  if (!clientIds.length) return new Set()
  const rows = await deps.db
    .selectDistinct({ id: clientNotes.clientId })
    .from(clientNotes)
    .where(and(inArray(clientNotes.clientId, [...new Set(clientIds)]), eq(clientNotes.alert, true)))
  return new Set(rows.map((r) => r.id))
}
