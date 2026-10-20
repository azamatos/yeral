/**
 * A specialist away or leaving (book B-47, B-50): their schedule (shift, breaks, personal days off), and what happens to
 * their bookings ahead when a change leaves them outside their day or they leave the team. The owner chooses: each moved
 * to a colleague (the time and the service kept, the client told), kept, or cancelled with 3 other times offered. The
 * save holds the business row as an hours save does, so a booking being made for them waits for it and then checks
 * their day as it is (`assertStaffFree`).
 */
import type { BookingsAffectedDetails } from '@yeral/contract/errors'
import type { removeMemberSchema, StaffScheduleView, staffScheduleUpdateSchema } from '@yeral/contract/team'
import { busyOf, planRefusal, shiftPlan, staffDoingAll, type AppointmentContext, type PlannedItem } from '@yeral/domain/availability'
import { staffDayChangedOn, staffScheduleErrors, withinStaffDay, type DateException, type StaffSchedule } from '@yeral/domain/hours'
import { occupiesSlot } from '@yeral/domain/lifecycle'
import { addDays, epochOf, today } from '@yeral/domain/time'
import { and, asc, eq, gte, inArray, isNull, ne } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, invites, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import { emit } from '../../notify'
import { loadHours } from '../availability/context'
import { specialistAccounts } from '../calendar/repo'
import { queueBookingSms } from '../bookings/confirm'
import { bookedServicesOf, cancelForBusiness, declineForBusiness } from '../bookings/engine'
import { alternativesContext, pickAlternatives } from '../bookings/offers'
import { lockBooking, StaleBooking, stateOf, type BookingRow, type ItemRow } from '../bookings/repo'
import { teamChanged, teamRow, type StaffRow } from './service'

type ScheduleChange = z.infer<typeof staffScheduleUpdateSchema>
type RemoveInput = z.infer<typeof removeMemberSchema>
interface Business {
  id: string
}
export interface StaffBookingsResult {
  moved: number
  kept: number
  cancelled: number
}

/** The affected bookings the 409 lists one by one; the count covers them all. */
const LISTED = 50

const scheduleOfRow = (row: StaffRow): StaffSchedule => ({ shift: row.shift, breaks: row.breaks, daysOff: row.daysOff })

const viewOf = (s: StaffSchedule): StaffScheduleView => ({
  shift: s.shift ? s.shift.map((d) => (d ? { open: d.open, close: d.close } : null)) : null,
  breaks: s.breaks.map((b) => (b ? { start: b.start, end: b.end } : null)),
  daysOff: s.daysOff.map((d) => ({ name: d.name, from: d.from, to: d.to, yearly: d.yearly })),
})

export async function scheduleOf(db: Queryable, business: Business, staffId: string): Promise<StaffScheduleView> {
  return viewOf(scheduleOfRow(await teamRow(db, business.id, staffId)))
}

interface Ahead {
  b: BookingRow
  items: ItemRow[]
}

/**
 * The business's bookings ahead with an item of this specialist: waiting requests and confirmed visits that haven't
 * started, from yesterday's business day on (it may run past midnight, book Q-105); a waiting move is answered on its
 * own. Soonest first.
 */
async function bookingsAheadWith(db: Queryable, businessId: string, staffId: string, now: number): Promise<Ahead[]> {
  const rows = await db
    .selectDistinct({ b: bookings })
    .from(bookings)
    .innerJoin(bookingItems, eq(bookingItems.bookingId, bookings.id))
    .where(
      and(
        eq(bookings.businessId, businessId),
        eq(bookings.active, true),
        isNull(bookings.rescheduleOf),
        eq(bookingItems.staffId, staffId),
        gte(bookings.date, addDays(today(now), -1)),
      ),
    )
  const ahead = rows.map((r) => r.b).filter((b) => occupiesSlot(stateOf(b), now) && epochOf(b.date, b.start) > now)
  if (!ahead.length) return []
  const items = await db
    .select()
    .from(bookingItems)
    .where(
      inArray(
        bookingItems.bookingId,
        ahead.map((b) => b.id),
      ),
    )
    .orderBy(asc(bookingItems.sort))
  return ahead
    .sort((x, y) => epochOf(x.date, x.start) - epochOf(y.date, y.start))
    .map((b) => ({ b, items: items.filter((i) => i.bookingId === b.id) }))
}

/** "{dates}: N ýazylyş bar": the bookings one by one, with the colleagues who do each one's services when removing. */
function detailsOf(name: string, staffId: string, ahead: readonly Ahead[], colleagues?: StaffRow[]): BookingsAffectedDetails {
  return {
    count: ahead.length,
    byStaff: [{ staffId, name, count: ahead.length }],
    bookings: ahead.slice(0, LISTED).map(({ b, items }) => {
      const theirs = items.filter((i) => i.staffId === staffId).flatMap((i) => (i.serviceId ? [i.serviceId] : []))
      return {
        code: b.code,
        date: b.date,
        start: b.start,
        end: b.end,
        client: b.clientName,
        staff: [...new Set(items.flatMap((i) => (i.staffName ? [i.staffName] : [])))],
        ...(colleagues ? { colleagues: colleagues.filter((s) => doesAll(s, theirs)).map((s) => ({ staffId: s.id, name: s.name })) } : {}),
      }
    }),
  }
}

/** The active colleagues who take bookings, in the team's order. */
async function colleaguesOf(db: Queryable, businessId: string, staffId: string): Promise<(StaffRow & { serviceIds: string[] })[]> {
  const rows = await db
    .select()
    .from(staff)
    .where(and(eq(staff.businessId, businessId), eq(staff.status, 'active'), eq(staff.bookable, true), ne(staff.id, staffId)))
    .orderBy(asc(staff.sort))
  const { staffServices } = await import('../../db/schema')
  const links = rows.length
    ? await db
        .select()
        .from(staffServices)
        .where(
          inArray(
            staffServices.staffId,
            rows.map((r) => r.id),
          ),
        )
    : []
  return rows.map((r) => ({ ...r, serviceIds: links.filter((l) => l.staffId === r.id).map((l) => l.serviceId) }))
}

const doesAll = (s: { serviceIds?: string[] }, serviceIds: readonly string[]) => serviceIds.every((id) => s.serviceIds?.includes(id))

/** What to do with each booking: move (to a named colleague, or to whoever is free), keep, or cancel with offers. */
type Settle = { kind: 'keep' } | { kind: 'cancel' } | { kind: 'move'; to?: string; otherwise?: ReadonlyMap<string, 'keep' | 'cancel'> }

/**
 * Settle the specialist's bookings ahead, after the change is saved (the caller holds the business row): the context
 * is loaded from the transaction, so it already has them off or gone. A booking moved goes to a colleague who does its
 * services and is free then (the named one, or the first free in the team's order), at the same time, and the client
 * hears who does it now; one no colleague can take follows `otherwise`, else is cancelled with 3 other times, as is
 * one cancelled outright. A waiting request is declined instead ("no specialist", B-20). Each booking moved or
 * offered times takes them from the next, so no two clients are offered the same time.
 */
async function settleStaffBookings(
  tx: Queryable,
  deps: Deps,
  businessId: string,
  staffId: string,
  ahead: readonly Ahead[],
  settle: Settle,
): Promise<StaffBookingsResult> {
  const out: StaffBookingsResult = { moved: 0, kept: 0, cancelled: 0 }
  if (settle.kind === 'keep') return { ...out, kept: ahead.length }
  const now = deps.now()
  const at = new Date(now)
  let ctx: AppointmentContext | null = await alternativesContext(tx, businessId, now)
  const exclude = ahead.map((a) => a.b.id)
  const booked = await bookedServicesOf(tx, exclude)
  const leaving = await specialistAccounts(tx, [staffId])
  for (const { b } of ahead) {
    let row: BookingRow
    try {
      row = await lockBooking(tx, b.id)
    } catch (e) {
      if (e instanceof StaleBooking) continue
      throw e
    }
    // changed meanwhile: started, cancelled, given to someone else
    const items = await tx.select().from(bookingItems).where(eq(bookingItems.bookingId, row.id)).orderBy(asc(bookingItems.sort))
    if (!occupiesSlot(stateOf(row), now) || epochOf(row.date, row.start) <= now || !items.some((i) => i.staffId === staffId)) continue

    if (settle.kind === 'move' && ctx && row.type === 'appointment') {
      const plan = moveTo(ctx, row, items, staffId, settle.to)
      if (plan) {
        for (const [i, it] of items.entries()) {
          const to = plan[i]!
          if (to.staffId === it.staffId && to.bufferAfter === it.bufferAfter) continue
          const name = ctx.staff.find((s) => s.id === to.staffId) ? await staffName(tx, to.staffId) : it.staffName
          await tx
            .update(bookingItems)
            .set({ staffId: to.staffId, staffName: name, bufferAfter: to.bufferAfter })
            .where(eq(bookingItems.id, it.id))
        }
        const [moved] = await tx.update(bookings).set({ updatedAt: at }).where(eq(bookings.id, row.id)).returning()
        const event = { type: 'booking.moved' as const, businessId, bookingId: row.id, bookingCode: row.code }
        await emit(tx, { ...event, userId: row.userId })
        for (const userId of leaving) await emit(tx, { ...event, userId })
        // the client hears who does it now (a request hears it when it's answered)
        if (moved && row.status === 'confirmed') await queueBookingSms(tx, deps, moved, { news: 'moved' })
        ctx = { ...ctx, busy: [...ctx.busy, ...busyOf(row.id, row.date, plan)] }
        out.moved++
        continue
      }
      if (settle.otherwise?.get(row.code) === 'keep') {
        out.kept++
        continue
      }
    }

    let offers: BookingRow['declineAlternatives'] = []
    const services = booked.get(row.id)
    if (ctx && services && row.type === 'appointment') {
      const picked = pickAlternatives(ctx, row, services, exclude)
      offers = picked.offers
      ctx = { ...ctx, busy: [...ctx.busy, ...picked.held] }
    }
    if (row.status === 'pending') await declineForBusiness(tx, row, at, { reason: 'no_staff', text: null, offers })
    else await cancelForBusiness(tx, row, at, { reason: 'staff_away', text: null, offers })
    out.cancelled++
  }
  return out
}

const staffName = async (tx: Queryable, id: string) =>
  (await tx.select({ name: staff.name }).from(staff).where(eq(staff.id, id)))[0]?.name ?? null

/**
 * The booking with the leaving specialist's part given to one colleague who does those services and is free then:
 * the named one, else the first in the team's order; null when nobody can take it.
 */
function moveTo(
  ctx: AppointmentContext,
  row: BookingRow,
  items: readonly ItemRow[],
  staffId: string,
  named?: string,
): PlannedItem[] | null {
  const planned: PlannedItem[] = items.map((i) => ({
    serviceId: i.serviceId ?? '',
    staffId: i.staffId ?? '',
    start: i.start,
    end: i.end,
    bufferAfter: i.bufferAfter,
  }))
  const theirs = planned.filter((p) => p.staffId === staffId).map((p) => p.serviceId)
  const candidates = staffDoingAll(ctx, theirs)
    .filter((s) => s.id !== staffId && (!named || s.id === named))
    .map((s) => s.id)
  const whole = planned.every((p) => p.staffId === staffId)
  for (const id of candidates) {
    // all of it to one person, buffers as such a booking takes them; a shared booking hands over only their part
    const plan = whole ? shiftPlan(planned, planned[0]!.start, id) : planned.map((p) => (p.staffId === staffId ? { ...p, staffId: id } : p))
    if (!planRefusal(ctx, row.date, plan, [row.id])) return plan
  }
  return null
}

/**
 * Save a specialist's schedule (B-47). Bookings ahead the change leaves outside their day, on the dates it changes:
 * without a choice it's 409 `bookings_affected` listing them and nothing is saved; `move` saves and moves each to a
 * free colleague (else 3 other times), `keep` saves and leaves them. A personal day off that has ended is dropped when
 * it was saved before, and refused when it's new.
 */
export async function updateSchedule(
  deps: Deps,
  business: Business,
  staffId: string,
  change: ScheduleChange,
): Promise<StaffScheduleView & StaffBookingsResult> {
  return deps.db.transaction(async (tx) => {
    const now = deps.now()
    // one change at a time, ordered with the bookings being made here (they hold the row `for share`)
    const hours = await loadHours(tx, business.id, { lock: 'no key update' })
    const row = await teamRow(tx, business.id, staffId)
    if (row.status === 'removed') throw new ApiError('invalid_status')
    const was = scheduleOfRow(row)
    const daysOff: DateException[] = []
    const ended: number[] = []
    change.daysOff.forEach((d, i) => {
      const day = { name: d.name, from: d.from, to: d.to, yearly: d.yearly, hours: null }
      const over = !d.yearly && d.to < today(now)
      if (over && was.daysOff.some((s) => s.name === d.name && s.from === d.from && s.to === d.to && s.yearly === d.yearly)) return
      if (over) ended.push(i)
      daysOff.push(day)
    })
    const next: StaffSchedule = {
      shift: change.shift ? change.shift.map((d) => (d ? { open: d.open, close: d.close } : null)) : null,
      breaks: change.breaks.map((b) => (b ? { start: b.start, end: b.end } : null)),
      daysOff,
    }
    const issues = staffScheduleErrors(next).map((field) => ({
      path: field.split('.').map((p) => (/^\d+$/.test(p) ? Number(p) : p)),
      code: 'invalid',
    }))
    for (const i of ended) issues.push({ path: ['daysOff', i, 'to'], code: 'past' })
    if (issues.length) throw invalid(...issues)

    const affected = (await bookingsAheadWith(tx, business.id, staffId, now)).filter(
      ({ b, items }) =>
        staffDayChangedOn(hours, was, next, b.date) &&
        items.some((i) => i.staffId === staffId && !withinStaffDay(hours, next, b.date, { start: i.start, end: i.end })),
    )
    if (affected.length && !change.affected) throw new ApiError('bookings_affected', detailsOf(row.name, staffId, affected))
    await tx.update(staff).set({ shift: next.shift, breaks: next.breaks, daysOff: next.daysOff }).where(eq(staff.id, staffId))
    await teamChanged(tx, business.id, { userId: row.userId })
    const result = affected.length
      ? await settleStaffBookings(
          tx,
          deps,
          business.id,
          staffId,
          affected,
          change.affected === 'move' ? { kind: 'move' } : { kind: 'keep' },
        )
      : { moved: 0, kept: 0, cancelled: 0 }
    return { ...viewOf(next), ...result }
  })
}

/**
 * Remove someone from the team (B-50): they lose access and leave the client site. Bookings ahead with them: without
 * a choice it's 409 `bookings_affected`, each with the colleagues who do its services, and nothing changes; `move`
 * gives each to `to` (one `to` can't take follows its row, else is cancelled with 3 other times), `keep` leaves them
 * (they come to those, then go), `cancel` cancels each with 3 other times. The owner can't be removed.
 */
export async function removeMember(deps: Deps, business: Business, staffId: string, input: RemoveInput): Promise<StaffBookingsResult> {
  return deps.db.transaction(async (tx) => {
    const now = deps.now()
    await loadHours(tx, business.id, { lock: 'no key update' })
    const row = await teamRow(tx, business.id, staffId)
    if (row.level === 'owner') throw new ApiError('forbidden')
    const ahead = row.status === 'removed' ? [] : await bookingsAheadWith(tx, business.id, staffId, now)
    if (ahead.length && !input.affected)
      throw new ApiError('bookings_affected', detailsOf(row.name, staffId, ahead, await colleaguesOf(tx, business.id, staffId)))
    if (input.affected === 'move') {
      const [to] = await colleaguesOf(tx, business.id, staffId).then((all) => all.filter((s) => s.id === input.to))
      if (!to) throw invalid({ path: ['to'], code: 'not_found' })
    }
    await tx.update(staff).set({ status: 'removed', bookable: false }).where(eq(staff.id, row.id))
    await tx
      .update(invites)
      .set({ status: 'cancelled', answeredAt: new Date(now) })
      .where(and(eq(invites.staffId, row.id), eq(invites.status, 'pending')))
    await teamChanged(tx, business.id, { userId: row.userId })
    if (!ahead.length) return { moved: 0, kept: 0, cancelled: 0 }
    const settle: Settle =
      input.affected === 'move'
        ? { kind: 'move', to: input.to, otherwise: new Map((input.rows ?? []).map((r) => [r.code, r.affected])) }
        : input.affected === 'cancel'
          ? { kind: 'cancel' }
          : { kind: 'keep' }
    return settleStaffBookings(tx, deps, business.id, staffId, ahead, settle)
  })
}
