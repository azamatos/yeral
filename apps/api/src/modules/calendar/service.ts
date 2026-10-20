/**
 * The business's own bookings (book B-23–B-27): free times as the team books them, a booking entered for a client who
 * calls or walks in, confirmed at once, with "Yzyna al" for a few seconds, and moving or cancelling a confirmed one.
 * The team books without the lead time, the booking window or the online switch, but never before the step that holds
 * now (no back-dated visits).
 */
import type {
  businessCancelSchema,
  freeTimesQuerySchema,
  freeTimesSchema,
  moveBookingSchema,
  newBookingSchema,
} from '@yeral/contract/calendar'
import type { CannotMoveDetails } from '@yeral/contract/errors'
import {
  appointmentSlots,
  currentStep,
  findAppointmentSlot,
  hasAppointmentSlot,
  nearestSlots,
  planRefusal,
  shiftPlan,
  staffDoingAll,
  type AppointmentContext,
  type AppointmentQuery,
  type AppointmentSlot,
  type PlannedItem,
} from '@yeral/domain/availability'
import { currentBusinessDate } from '@yeral/domain/hours'
import { canBusinessCancel, canBusinessMove, canUndoNewBooking, NEW_BOOKING_UNDO_MS, toldOf } from '@yeral/domain/lifecycle'
import { canOn, scopeOf, type Actor } from '@yeral/domain/permissions'
import { addDays, epochOf } from '@yeral/domain/time'
import { and, eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, clients } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid, type Issue } from '../../http/errors'
import { emit } from '../../notify'
import {
  appointmentContext,
  assertOpenAt,
  dayStrip,
  loadBusiness,
  loadBusy,
  lockedHours,
  type LoadedBusiness,
} from '../availability/context'
import { queueBookingSms } from '../bookings/confirm'
import { appointmentPrice, cancelForBusiness, dropPendingMove, inTransaction, itemRows } from '../bookings/engine'
import { retimeAddressSms } from '../bookings/address-sms'
import { extendBookingLinks } from '../bookings/links'
import { freshCode, guard, isSlotConflict, stateOf, type BookingRow, type ItemRow } from '../bookings/repo'
import { assertNoWaitingMove, phoneClient, specialistAccounts, teamBooking } from './repo'

type FreeTimesQuery = z.infer<typeof freeTimesQuerySchema>
type FreeTimes = z.infer<typeof freeTimesSchema>
type NewBooking = z.infer<typeof newBookingSchema>
type MoveInput = z.infer<typeof moveBookingSchema>
type CancelInput = z.infer<typeof businessCancelSchema>
interface Business {
  id: string
}

/** "Iň ýakyn boş wagtlar": the first 4 free starts in 14 days (design COMPONENTS, NewBookingDrawer). */
const NEAREST = 4
/** The date strip's days, the business day that holds now first. */
const STRIP_DAYS = 14

/** The owner and administrators book anyone; a specialist only themself ("add, move, cancel bookings: own"). */
function assertMayBook(actor: Actor, staffId: string): void {
  if (!canOn(actor, 'bookings', [staffId])) throw new ApiError('forbidden')
}

/** No booking the team gives starts off the business's steps or before the step that holds now (no back-dated visits). */
function startIssues(date: string, start: number, slotStep: number, now: number): Issue[] {
  if (start % slotStep !== 0) return [{ path: ['start'], code: 'off_step' }]
  return epochOf(date, start) < currentStep(now, slotStep) ? [{ path: ['start'], code: 'past' }] : []
}

/**
 * The services are on the menu (an archived one isn't booked anew, book Q-210; the online switch doesn't bind the
 * team), and the specialist, if named, does them all: the team books one specialist per booking (B-23).
 */
function checkChoice(
  ctx: AppointmentContext,
  serviceIds: readonly string[],
  staffId: string | null,
  paths: { services: string; staff: string },
): void {
  const unknown = serviceIds.flatMap((id, i) =>
    ctx.services.some((s) => s.id === id) ? [] : [{ path: [paths.services, i], code: 'not_found' }],
  )
  if (unknown.length) throw invalid(...unknown)
  if (staffId && !staffDoingAll(ctx, serviceIds).some((s) => s.id === staffId)) throw invalid({ path: [paths.staff], code: 'cannot_do' })
}

/**
 * Free times for the new-booking drawer and the quick sheet (B-23, B-24): the nearest four, a day's starts with who is
 * free at each, and the 14-day strip, from the business day that holds now (last night's while it runs, book Q-105).
 * A specialist sees their own; the others everyone who does all the services.
 */
export async function freeTimes(deps: Deps, business: Business, actor: Actor, q: FreeTimesQuery): Promise<FreeTimes> {
  const now = deps.now()
  const staffId = q.staff ?? (scopeOf(actor, 'bookings') === 'own' ? actor.staffId : null)
  if (staffId) assertMayBook(actor, staffId)
  const lb = await loadBusiness(deps.db, business.id)
  const hours = { hours: lb.business.hours, exceptions: lb.business.exceptions }
  const first = currentBusinessDate(hours, now)
  const last = addDays(first, STRIP_DAYS - 1)
  const date = q.date ?? first
  const inStrip = date >= first && date <= last
  const [busy, dayBusy] = await Promise.all([
    loadBusy(deps.db, [business.id], first, last),
    inStrip ? [] : loadBusy(deps.db, [business.id], date, date),
  ])
  const ctx = appointmentContext(lb, [...busy, ...dayBusy], now)
  checkChoice(ctx, q.services, staffId, { services: 'services', staff: 'staff' })
  const team = staffId ? [staffId] : staffDoingAll(ctx, q.services).map((s) => s.id)
  const query = (d: string, id: string): AppointmentQuery => ({ date: d, serviceIds: q.services, staffId: id, by: 'staff' })

  const cache = new Map<string, FreeTimes['slots']>()
  /** A day's free starts, each with the specialists free at it in the team's order. */
  const startsOn = (d: string) => {
    const known = cache.get(d)
    if (known) return known
    const byStart = new Map<number, FreeTimes['slots'][number]>()
    for (const id of team)
      for (const s of appointmentSlots(ctx, query(d, id))) {
        const at = byStart.get(s.start)
        if (at) at.staffIds.push(id)
        else byStart.set(s.start, { start: s.start, end: s.end, staffIds: [id] })
      }
    const out = [...byStart.values()].sort((a, b) => a.start - b.start)
    cache.set(d, out)
    return out
  }

  // the strip only asks whether a day has a start: each specialist's search stops at the first one
  const days = dayStrip(hours, first, STRIP_DAYS, (d) =>
    cache.has(d) ? startsOn(d).length > 0 : team.some((id) => hasAppointmentSlot(ctx, query(d, id))),
  )
  const nearest: FreeTimes['nearest'] = []
  for (const d of days) {
    if (d.state !== 'open') continue
    for (const s of startsOn(d.date)) {
      nearest.push({ date: d.date, start: s.start, end: s.end, staffId: s.staffIds[0]! })
      if (nearest.length === NEAREST) break
    }
    if (nearest.length === NEAREST) break
  }
  return { nearest, date, slots: startsOn(date), days }
}

async function insertTeamBooking(
  tx: Queryable,
  deps: Deps,
  lb: LoadedBusiness,
  input: NewBooking,
  slot: AppointmentSlot,
): Promise<BookingRow> {
  const now = deps.now()
  const at = new Date(now)
  await assertOpenAt(tx, lb.business.id, { date: input.date, start: input.start, end: slot.end })
  const id = randomUUID()
  const { record, holder } = await phoneClient(tx, lb.business.id, input.phone, input.name, now, id)
  const price = appointmentPrice(lb, slot)
  const [row] = await tx
    .insert(bookings)
    .values({
      id,
      code: await freshCode(tx),
      businessId: lb.business.id,
      type: 'appointment',
      clientId: record.id,
      userId: holder?.id ?? null,
      // the business's name for its client
      clientName: record.name,
      clientPhone: input.phone,
      date: input.date,
      start: input.start,
      // agreed on the phone or at the desk
      told: toldOf(
        input,
        slot.items.map((it) => it.staffId),
      ),
      end: slot.end,
      status: 'confirmed',
      source: input.source,
      internalNote: input.note ?? null,
      // the client at the desk needs no SMS about it (B-25); reminders follow the client's own switches (chapter 8)
      notifyClient: input.notifyClient ?? input.source === 'phone',
      priceType: price.type,
      priceAmount: price.amount,
      confirmedAt: at,
      createdAt: at,
      updatedAt: at,
    })
    .returning()
  if (!row) throw new Error('booking insert failed')
  await tx.insert(bookingItems).values(itemRows(lb, row.id, input.date, slot))
  await emit(tx, { type: 'booking.created', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
  // nothing reaches the client while "Yzyna al" may still take the booking back (B-24)
  await queueBookingSms(tx, deps, row, { news: row.notifyClient ? 'booked' : null })
  return row
}

/**
 * "Ýazyp goý" (B-23, B-25): a booking for a client who called or is at the desk, confirmed at once, with the specialist
 * the team chose. A walk-in joins the business day that holds now; no booking starts before the step that holds now or
 * off the business's steps. A taken time: 409 with the nearest free ones that day.
 */
export async function addBooking(
  deps: Deps,
  business: Business,
  actor: Actor,
  input: NewBooking,
): Promise<{ code: string; undoUntil: number }> {
  const now = deps.now()
  assertMayBook(actor, input.staffId)
  const lb = await loadBusiness(deps.db, business.id)
  // tables and classes come after the MVP, with their own screens (B-62, B-69)
  if (!lb.business.bookingTypes.includes('appointment')) throw new ApiError('not_bookable')
  const issues = startIssues(input.date, input.start, lb.rules.slotStep, now)
  if (
    input.source === 'walkin' &&
    input.date !== currentBusinessDate({ hours: lb.business.hours, exceptions: lb.business.exceptions }, now)
  )
    issues.push({ path: ['date'], code: 'not_today' })
  if (issues.length) throw invalid(...issues)
  const q: AppointmentQuery = { date: input.date, serviceIds: input.serviceIds, staffId: input.staffId, by: 'staff' }
  const contextNow = async (biz = lb) => appointmentContext(biz, await loadBusy(deps.db, [business.id], input.date, input.date), deps.now())
  const nearest = (ctx: AppointmentContext) =>
    nearestSlots(ctx, q, input.start).map((s) => ({ date: input.date, start: s.start, end: s.end }))
  const ctx = await contextNow()
  checkChoice(ctx, input.serviceIds, input.staffId, { services: 'serviceIds', staff: 'staffId' })
  const slot = findAppointmentSlot(ctx, q, input.start)
  if (!slot) throw new ApiError('slot_taken', { alternatives: nearest(ctx) })
  const row = await inTransaction(
    deps,
    (tx) => insertTeamBooking(tx, deps, lb, input, slot),
    // as the business stands now: its hours may have just changed
    async () => nearest(await contextNow(await loadBusiness(deps.db, business.id))),
  )
  return { code: row.code, undoUntil: row.createdAt.getTime() + NEW_BOOKING_UNDO_MS }
}

/**
 * "Yzyna al" (B-24): a booking the team just added goes as if never made, its SMS unsent, and a client record it made
 * with it (a mistyped number leaves nothing behind).
 */
export async function undoBooking(deps: Deps, business: Business, actor: Actor, code: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const { b, staffIds } = await teamBooking(tx, business, actor, code, { lock: true })
    const refused = canUndoNewBooking({ status: b.status, source: b.source, createdAt: b.createdAt.getTime() }, deps.now())
    if (refused) throw new ApiError(refused)
    // the record first: a booking for the same number being saved meanwhile holds it until it commits, and is then
    // seen below (each statement reads what has committed by its start)
    const [made] = b.clientId
      ? await tx
          .select({ id: clients.id })
          .from(clients)
          .where(and(eq(clients.id, b.clientId), eq(clients.createdAt, b.createdAt)))
          .for('update')
      : []
    // a name this booking gave a record that had none goes with it
    if (b.clientId)
      await tx
        .update(clients)
        .set({ name: null, nameSetBy: null })
        .where(and(eq(clients.id, b.clientId), eq(clients.nameSetBy, b.id)))
    await tx.delete(bookings).where(eq(bookings.id, b.id))
    if (made) {
      const [other] = await tx.select({ id: bookings.id }).from(bookings).where(eq(bookings.clientId, made.id)).limit(1)
      if (!other) await tx.delete(clients).where(eq(clients.id, made.id))
    }
    // the row is gone, so the feed can't find its specialists through it: each specialist on it hears it as the person
    // concerned, as the client does (the owner and administrators hear the whole calendar)
    const people = [...new Set([...(b.userId ? [b.userId] : []), ...(await specialistAccounts(tx, staffIds))])]
    for (const userId of people.length ? people : [null])
      await emit(tx, { type: 'booking.cancelled', businessId: b.businessId, bookingCode: b.code, userId })
  })
}

const asPlanned = (items: readonly ItemRow[]): PlannedItem[] =>
  items.map((i) => ({ serviceId: i.serviceId ?? '', staffId: i.staffId ?? '', start: i.start, end: i.end, bufferAfter: i.bufferAfter }))

/**
 * "Move to another time" or a dragged block (B-26): a confirmed booking that hasn't started goes to the new time, and
 * to another specialist's column when given (one whose specialist left needs one). A move that doesn't fit is 409
 * `cannot_move` with the reason the toast names; one the client asked for is answered first. The client hears it
 * unless the team says not to (the booking's own setting by default): the new time, or the new specialist when only
 * that changed. A move that changes nothing does nothing.
 */
export async function moveBooking(deps: Deps, business: Business, actor: Actor, code: string, input: MoveInput): Promise<void> {
  const first = await teamBooking(deps.db, business, actor, code)
  if (input.staffId) assertMayBook(actor, input.staffId)
  // tables move between tables and classes as a whole session, after the MVP (B-62, B-69)
  if (first.b.type !== 'appointment') throw new ApiError('not_bookable')
  guard(canBusinessMove(stateOf(first.b), deps.now()))
  const lb = await loadBusiness(deps.db, business.id)
  const issues = startIssues(input.date, input.start, lb.rules.slotStep, deps.now())
  if (issues.length) throw invalid(...issues)
  let plan: PlannedItem[] = []
  let excluded: string[] = []
  try {
    await deps.db.transaction(async (tx) => {
      const now = deps.now()
      const at = new Date(now)
      // the hours as they stand, before the booking's lock (the order an hours save takes them in)
      const hours = await lockedHours(tx, business.id)
      // all of it again under the booking's lock: a client's move confirmed meanwhile changed its time and items, and
      // a client's move takes this lock before it's asked
      const { b, items, staffIds } = await teamBooking(tx, business, actor, code, { lock: true })
      guard(canBusinessMove(stateOf(b), now))
      await assertNoWaitingMove(tx, b, now)
      // one whose answer time ran out before the jobs got to it is settled now, as they would
      await dropPendingMove(tx, b, at)
      // a specialist who left (book B-50): the team picks who takes it
      if (!input.staffId && items.some((i) => !i.staffId)) throw invalid({ path: ['staffId'], code: 'required' })
      plan = shiftPlan(asPlanned(items), input.start, input.staffId)
      excluded = [b.id]
      const timeChanged = input.date !== b.date || input.start !== b.start
      // a drop on its own place, or the same move sent twice
      if (!timeChanged && plan.every((it, i) => it.staffId === items[i]!.staffId)) return
      const ctx = appointmentContext(
        { ...lb, business: { ...lb.business, ...hours } },
        await loadBusy(tx, [business.id], input.date, input.date),
        now,
      )
      const refusal = planRefusal(ctx, input.date, plan, excluded)
      if (refusal) throw new ApiError('cannot_move', { ...refusal } satisfies CannotMoveDetails)
      for (const [i, it] of items.entries()) {
        const to = plan[i]!
        await tx
          .update(bookingItems)
          .set({
            date: input.date,
            start: to.start,
            end: to.end,
            bufferAfter: to.bufferAfter,
            staffId: to.staffId,
            staffName: lb.staff.find((s) => s.id === to.staffId)?.name ?? it.staffName,
          })
          .where(eq(bookingItems.id, it.id))
      }
      const [moved] = await tx
        .update(bookings)
        .set({ date: input.date, start: input.start, end: plan.at(-1)!.end, moveRefused: null, updatedAt: at })
        .where(eq(bookings.id, b.id))
        .returning()
      if (!moved) throw new Error('booking update failed')
      await extendBookingLinks(tx, moved)
      await retimeAddressSms(tx, moved, now)
      const event = { type: 'booking.moved' as const, businessId: moved.businessId, bookingId: moved.id, bookingCode: moved.code }
      await emit(tx, { ...event, userId: moved.userId })
      const left = staffIds.filter((id) => !plan.some((it) => it.staffId === id))
      for (const userId of await specialistAccounts(tx, left)) await emit(tx, { ...event, userId })
      // the news is worded when it goes, from what the client knows: a confirmation still waiting tells the change
      // itself, and a change back to what they knew tells nothing (`queueBookingSms`)
      await queueBookingSms(tx, deps, moved, { news: (input.notifyClient ?? b.notifyClient) ? 'moved' : null })
    })
  } catch (e) {
    if (!isSlotConflict(e)) throw e
    // another booking took the time meanwhile: say why as it stands now
    const ctx = appointmentContext(lb, await loadBusy(deps.db, [business.id], input.date, input.date), deps.now())
    const now = planRefusal(ctx, input.date, plan, excluded) ?? { problem: 'overlap' as const, staffId: plan[0]?.staffId ?? '' }
    throw new ApiError('cannot_move', { ...now } satisfies CannotMoveDetails)
  }
}

/**
 * "Cancel booking" (B-27): a confirmed booking that hasn't started, with the reason the team picked. "The client called
 * to cancel" is the client's own cancel ("You cancelled"); the others are the business's, and the client sees the
 * reason. A move the client asked for goes with it. The client hears it by SMS (their switch decides, book Q-286),
 * unless they never heard of the booking: one the team added seconds ago, its "Yzyna al" still running.
 */
export async function cancelByBusiness(deps: Deps, business: Business, actor: Actor, code: string, input: CancelInput): Promise<void> {
  const { b } = await teamBooking(deps.db, business, actor, code)
  guard(canBusinessCancel(stateOf(b), deps.now()))
  await deps.db.transaction(async (tx) => {
    const at = new Date(deps.now())
    // again under the lock: a client's move confirmed meanwhile may have given it to another specialist
    const { b: row } = await teamBooking(tx, business, actor, code, { lock: true })
    guard(canBusinessCancel(stateOf(row), at.getTime()))
    await cancelForBusiness(tx, row, at, { reason: input.reason, text: input.reason === 'other' ? (input.text ?? null) : null })
  })
}
