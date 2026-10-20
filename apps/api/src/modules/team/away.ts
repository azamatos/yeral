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
import {
  specialDayErrors,
  staffDayChangedOn,
  staffScheduleErrors,
  withinStaffDay,
  type DateException,
  type StaffSchedule,
} from '@yeral/domain/hours'
import { occupiesSlot } from '@yeral/domain/lifecycle'
import { addDays, epochOf, today } from '@yeral/domain/time'
import { and, eq, gte, isNull } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid, type Issue } from '../../http/errors'
import { emit } from '../../notify'
import { appointmentContext, loadBusiness, loadBusy, loadHours, type LoadedBusiness } from '../availability/context'
import { specialistAccounts } from '../calendar/repo'
import { queueBookingSms } from '../bookings/confirm'
import { bookedServices, cancelForBusiness, declineForBusiness } from '../bookings/engine'
import { pickAlternatives } from '../bookings/offers'
import {
  isSlotConflict,
  itemsOf,
  itemsOfBookings,
  lockBooking,
  StaleBooking,
  stateOf,
  type BookingRow,
  type ItemRow,
} from '../bookings/repo'
import { removeRow, teamChanged, teamRow, type StaffRow } from './service'

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
  const items = await itemsOfBookings(
    db,
    ahead.map((b) => b.id),
  )
  return ahead
    .sort((x, y) => epochOf(x.date, x.start) - epochOf(y.date, y.start))
    .map((b) => ({ b, items: items.filter((i) => i.bookingId === b.id) }))
}

/** "{dates}: N ýazylyş bar": the bookings one by one, with the colleagues who do each one's services when removing. */
function detailsOf(name: string, staffId: string, ahead: readonly Ahead[], lb?: LoadedBusiness): BookingsAffectedDetails {
  const ctx = lb && appointmentContext(lb, [], 0)
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
        ...(ctx
          ? {
              colleagues: staffDoingAll(ctx, theirs)
                .filter((s) => s.id !== staffId)
                .map((s) => ({ staffId: s.id, name: lb.staff.find((x) => x.id === s.id)?.name ?? '' })),
            }
          : {}),
      }
    }),
  }
}

/** What to do with each booking: move (to a named colleague, or to whoever is free), keep, or cancel with offers. */
type Settle = { kind: 'keep' } | { kind: 'cancel' } | { kind: 'move'; to?: string; otherwise?: ReadonlyMap<string, 'keep' | 'cancel'> }

/**
 * Settle the specialist's bookings ahead, after the change is saved (the caller holds the business row): the business
 * is loaded from the transaction, so it already has them off or gone. A booking moved goes to a colleague who does its
 * services and is free then (the named one, or the first free in the team's order), at the same time, and the client
 * hears who does it now; one no colleague can take follows `otherwise`, else is cancelled with 3 other times, as is
 * one cancelled outright. A waiting request is declined instead ("no specialist", B-20). Each booking moved or offered
 * times takes that time from the next, so no two clients get the same one.
 */
async function settleStaffBookings(
  tx: Queryable,
  deps: Deps,
  lb: LoadedBusiness,
  staffId: string,
  ahead: readonly Ahead[],
  settle: Settle,
): Promise<StaffBookingsResult> {
  const out: StaffBookingsResult = { moved: 0, kept: 0, cancelled: 0 }
  if (settle.kind === 'keep') return { ...out, kept: ahead.length }
  const now = deps.now()
  const at = new Date(now)
  const businessId = lb.business.id
  // busy time on every date a booking may move to or be offered: from today through the window, and the bookings' own
  const first = today(now)
  const dates = ahead.map((a) => a.b.date).sort()
  const last = [addDays(first, lb.rules.windowDays), dates.at(-1)!].sort().at(-1)!
  let ctx: AppointmentContext = appointmentContext(lb, await loadBusy(tx, [businessId], [first, dates[0]!].sort()[0]!, last), now)
  // the bookings cancelled so far free their time; one moved holds its new time (and its old one, with the person away)
  const freed: string[] = []
  const leaving = await specialistAccounts(tx, [staffId])
  for (const { b } of ahead) {
    let row: BookingRow
    try {
      row = await lockBooking(tx, b.id)
    } catch (e) {
      if (e instanceof StaleBooking) continue
      throw e
    }
    // read again under its lock: started, cancelled or given to someone else meanwhile
    const items = await itemsOf(tx, row.id)
    if (!occupiesSlot(stateOf(row), now) || epochOf(row.date, row.start) <= now || !items.some((i) => i.staffId === staffId)) continue

    if (settle.kind === 'move' && row.type === 'appointment') {
      const plan = moveTo(ctx, row, items, staffId, settle.to)
      // the database has the last word on overlaps: a booking made meanwhile leaves this one to the fallback
      const moved = plan && (await giveTo(tx, lb, row, items, plan, at))
      if (moved && plan) {
        const event = { type: 'booking.moved' as const, businessId, bookingId: row.id, bookingCode: row.code }
        await emit(tx, { ...event, userId: row.userId })
        for (const userId of leaving) await emit(tx, { ...event, userId })
        // the client hears who does it now (a request hears it when it's answered)
        if (row.status === 'confirmed') await queueBookingSms(tx, deps, moved, { news: 'moved' })
        ctx = { ...ctx, busy: [...ctx.busy, ...busyOf(row.id, row.date, plan)] }
        out.moved++
        continue
      }
      if (settle.otherwise?.get(row.code) === 'keep') {
        out.kept++
        continue
      }
    }

    // other times for an appointment (tables and classes are re-booked by phone after the MVP)
    let offers: BookingRow['declineAlternatives'] | undefined
    if (row.type === 'appointment') {
      const picked = pickAlternatives(ctx, row, await bookedServices(tx, row.id), [...freed, row.id])
      offers = picked.offers
      ctx = { ...ctx, busy: [...ctx.busy, ...picked.held] }
    }
    if (row.status === 'pending') await declineForBusiness(tx, row, at, { reason: 'no_staff', text: null, offers: offers ?? [] })
    else await cancelForBusiness(tx, row, at, { reason: 'staff_away', text: null, offers })
    freed.push(row.id)
    out.cancelled++
  }
  return out
}

/** Hand the booking's items over as planned, in a savepoint: an overlap the database refuses leaves it as it was. */
async function giveTo(
  tx: Queryable,
  lb: LoadedBusiness,
  row: BookingRow,
  items: readonly ItemRow[],
  plan: readonly PlannedItem[],
  at: Date,
): Promise<BookingRow | null> {
  try {
    return await tx.transaction(async (sp) => {
      for (const [i, it] of items.entries()) {
        const to = plan[i]!
        if (to.staffId === it.staffId && to.bufferAfter === it.bufferAfter) continue
        await sp
          .update(bookingItems)
          .set({
            staffId: to.staffId,
            staffName: lb.staff.find((s) => s.id === to.staffId)?.name ?? it.staffName,
            bufferAfter: to.bufferAfter,
          })
          .where(eq(bookingItems.id, it.id))
      }
      const [moved] = await sp.update(bookings).set({ updatedAt: at }).where(eq(bookings.id, row.id)).returning()
      return moved ?? null
    })
  } catch (e) {
    if (isSlotConflict(e)) return null
    throw e
  }
}

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
    const issues: Issue[] = []
    // each day off checked by its place in the list sent (one ended and saved before drops out quietly)
    change.daysOff.forEach((d, i) => {
      const day = { name: d.name, from: d.from, to: d.to, yearly: d.yearly, hours: null }
      const over = !d.yearly && d.to < today(now)
      if (over && was.daysOff.some((s) => s.name === d.name && s.from === d.from && s.to === d.to && s.yearly === d.yearly)) return
      for (const field of specialDayErrors(day)) issues.push({ path: ['daysOff', i, field], code: 'invalid' })
      if (over) issues.push({ path: ['daysOff', i, 'to'], code: 'past' })
      daysOff.push(day)
    })
    const next: StaffSchedule = {
      shift: change.shift ? change.shift.map((d) => (d ? { open: d.open, close: d.close } : null)) : null,
      breaks: change.breaks.map((b) => (b ? { start: b.start, end: b.end } : null)),
      daysOff,
    }
    const week = staffScheduleErrors({ ...next, daysOff: [] }).map((field) => {
      const [name, index] = field.split('.')
      return { path: [name!, Number(index)], code: 'invalid' }
    })
    if (week.length || issues.length) throw invalid(...week, ...issues)

    const affected = (await bookingsAheadWith(tx, business.id, staffId, now)).filter(
      ({ b, items }) =>
        staffDayChangedOn(hours, was, next, b.date) &&
        items.some((i) => i.staffId === staffId && !withinStaffDay(hours, next, b.date, { start: i.start, end: i.end })),
    )
    if (affected.length && !change.affected) throw new ApiError('bookings_affected', detailsOf(row.name, staffId, affected))
    await tx
      .update(staff)
      .set({ shift: next.shift && [...next.shift], breaks: [...next.breaks], daysOff: [...next.daysOff] })
      .where(eq(staff.id, staffId))
    await teamChanged(tx, business.id, { userId: row.userId })
    const result = affected.length
      ? await settleStaffBookings(
          tx,
          deps,
          await loadBusiness(tx, business.id),
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
 * (they come to those, then go), `cancel` cancels each with 3 other times. The owner can't be removed. Someone already
 * gone (removed, or left by themself) keeps their bookings until the owner settles them here.
 */
export async function removeMember(deps: Deps, business: Business, staffId: string, input: RemoveInput): Promise<StaffBookingsResult> {
  return deps.db.transaction(async (tx) => {
    const now = deps.now()
    await loadHours(tx, business.id, { lock: 'no key update' })
    const row = await teamRow(tx, business.id, staffId)
    // "Eýesini öçürip bolmaýar"
    if (row.level === 'owner') throw new ApiError('forbidden')
    // someone who left by themself (B-15) leaves their bookings for this same flow
    const ahead = await bookingsAheadWith(tx, business.id, staffId, now)
    if (ahead.length && !input.affected)
      throw new ApiError('bookings_affected', detailsOf(row.name, staffId, ahead, await loadBusiness(tx, business.id)))
    await removeRow(tx, row, now)
    await teamChanged(tx, business.id, { userId: row.userId })
    if (!ahead.length) return { moved: 0, kept: 0, cancelled: 0 }
    // the team as it is now, without them
    const lb = await loadBusiness(tx, business.id)
    if (input.affected === 'move' && !lb.staff.some((s) => s.id === input.to && s.bookable))
      throw invalid({ path: ['to'], code: 'not_found' })
    const settle: Settle =
      input.affected === 'move'
        ? { kind: 'move', to: input.to, otherwise: new Map((input.rows ?? []).map((r) => [r.code, r.affected])) }
        : input.affected === 'cancel'
          ? { kind: 'cancel' }
          : { kind: 'keep' }
    return settleStaffBookings(tx, deps, lb, staffId, ahead, settle)
  })
}
