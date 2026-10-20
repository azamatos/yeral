/**
 * The business's own bookings (book B-23, B-24, B-25): free times as the team books them, and a booking entered for a
 * client who calls or walks in, confirmed at once, with "Yzyna al" for a few seconds. The team books without the lead
 * time, the booking window or the online switch, but never before the step that holds now (no back-dated visits).
 */
import type { freeTimesQuerySchema, freeTimesSchema, newBookingSchema } from '@yeral/contract/calendar'
import {
  appointmentSlots,
  currentStep,
  findAppointmentSlot,
  nearestSlots,
  staffDoingAll,
  type AppointmentContext,
  type AppointmentQuery,
  type AppointmentSlot,
} from '@yeral/domain/availability'
import { businessClosedReason } from '@yeral/domain/hours'
import { canUndoNewBooking, NEW_BOOKING_UNDO_MS } from '@yeral/domain/lifecycle'
import { canOn, scopeOf, type Actor } from '@yeral/domain/permissions'
import { addDays, epochOf, localOf, today } from '@yeral/domain/time'
import { and, eq, sql } from 'drizzle-orm'
import type { z } from 'zod'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, clients, users } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { unusedSince } from '../auth/sign-in'
import { appointmentContext, loadBusinesses, loadBusy, type LoadedBusiness } from '../availability/context'
import { queueBookingSms } from '../bookings/confirm'
import { appointmentPrice, inTransaction, itemRows } from '../bookings/create'
import { freshCode, itemsOf, type BookingRow } from '../bookings/repo'
import { accountName } from '../me/me'

type FreeTimesQuery = z.infer<typeof freeTimesQuerySchema>
type FreeTimes = z.infer<typeof freeTimesSchema>
type NewBooking = z.infer<typeof newBookingSchema>
interface Business {
  id: string
}
interface Issue {
  path: (string | number)[]
  code: string
}

/** "Iň ýakyn boş wagtlar": the first 4 free starts in 14 days (design COMPONENTS, NewBookingDrawer). */
const NEAREST = 4
/** The date strip's days, today first. */
const STRIP_DAYS = 14

const invalid = (...issues: Issue[]) => new ApiError('validation_error', { issues })

async function loaded(db: Queryable, businessId: string): Promise<LoadedBusiness> {
  const lb = (await loadBusinesses(db, [businessId])).get(businessId)
  if (!lb) throw new ApiError('not_found')
  return lb
}

/** The owner and administrators book anyone; a specialist only themself ("add, move, cancel bookings: own"). */
function assertMayBook(actor: Actor, staffId: string): void {
  if (!canOn(actor, 'bookings', [staffId])) throw new ApiError('forbidden')
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
 * free at each, and the 14-day strip. A specialist sees their own; the others everyone who does all the services.
 */
export async function freeTimes(deps: Deps, business: Business, actor: Actor, q: FreeTimesQuery): Promise<FreeTimes> {
  const now = deps.now()
  const staffId = q.staff ?? (scopeOf(actor, 'bookings') === 'own' ? actor.staffId : null)
  if (staffId) assertMayBook(actor, staffId)
  const lb = await loaded(deps.db, business.id)
  const first = today(now)
  const last = addDays(first, STRIP_DAYS - 1)
  const date = q.date ?? first
  const inStrip = date >= first && date <= last
  const [busy, dayBusy] = await Promise.all([
    loadBusy(deps.db, [business.id], addDays(first, -1), last),
    inStrip ? [] : loadBusy(deps.db, [business.id], date, date),
  ])
  const ctx = appointmentContext(lb, [...busy, ...dayBusy], now)
  checkChoice(ctx, q.services, staffId, { services: 'services', staff: 'staff' })
  const team = staffId ? [staffId] : staffDoingAll(ctx, q.services).map((s) => s.id)

  const cache = new Map<string, FreeTimes['slots']>()
  /** A day's free starts, each with the specialists free at it in the team's order. */
  const startsOn = (d: string) => {
    const known = cache.get(d)
    if (known) return known
    const byStart = new Map<number, FreeTimes['slots'][number]>()
    for (const id of team)
      for (const s of appointmentSlots(ctx, { date: d, serviceIds: q.services, staffId: id, by: 'staff' })) {
        const at = byStart.get(s.start)
        if (at) at.staffIds.push(id)
        else byStart.set(s.start, { start: s.start, end: s.end, staffIds: [id] })
      }
    const out = [...byStart.values()].sort((a, b) => a.start - b.start)
    cache.set(d, out)
    return out
  }

  const strip = Array.from({ length: STRIP_DAYS }, (_, i) => addDays(first, i))
  const days = strip.map((d) => {
    const closed = businessClosedReason(ctx.business, d)
    if (closed) return { date: d, state: 'closed' as const, closedReason: closed.kind === 'exception' ? closed.name : null }
    return { date: d, state: startsOn(d).length ? ('open' as const) : ('full' as const), closedReason: null }
  })
  const nearest: FreeTimes['nearest'] = []
  // yesterday first: a day open past midnight may still have starts left tonight (book Q-105)
  for (const d of [addDays(first, -1), ...strip]) {
    for (const s of startsOn(d)) {
      if (nearest.length === NEAREST) break
      nearest.push({ date: d, start: s.start, end: s.end, staffId: s.staffIds[0]! })
    }
    if (nearest.length === NEAREST) break
  }
  return { nearest, date, slots: startsOn(date), days }
}

/**
 * The phone's client at this business (B-23): its record, found by the number, or a new one with the name typed in
 * (else the account's). The booking joins the number's account unless it went unused for 6 months: the number may be
 * someone else's now, and it joins after "Is this you?" at their next sign-in (book Q-270).
 */
async function phoneClient(tx: Queryable, businessId: string, phone: string, name: string | undefined, now: number) {
  const [account] = await tx.select().from(users).where(eq(users.phone, phone))
  const holder = account && !unusedSince(account.lastSeenAt, now) ? account : undefined
  const [record] = await tx
    .insert(clients)
    .values({
      businessId,
      phone,
      name: name ?? (holder ? accountName(holder) : null),
      userId: holder?.id ?? null,
      // an undo removes a record its booking made (`undoBooking`)
      createdAt: new Date(now),
    })
    // a known client keeps their name; a record without one takes the name typed in
    .onConflictDoUpdate({ target: [clients.businessId, clients.phone], set: { name: sql`coalesce(${clients.name}, excluded.name)` } })
    .returning()
  if (!record) throw new Error('client upsert failed')
  return { record, holder }
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
  const { record, holder } = await phoneClient(tx, lb.business.id, input.phone, input.name, now)
  const price = appointmentPrice(lb, slot)
  const [row] = await tx
    .insert(bookings)
    .values({
      code: await freshCode(tx),
      businessId: lb.business.id,
      type: 'appointment',
      clientId: record.id,
      userId: holder?.id ?? null,
      // the business's name for its client on the bookings it enters
      clientName: record.name ?? (holder ? accountName(holder) : null),
      clientPhone: input.phone,
      date: input.date,
      start: input.start,
      end: slot.end,
      status: 'confirmed',
      source: input.source,
      internalNote: input.note ?? null,
      // the client at the desk needs no SMS (B-25)
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
  await queueBookingSms(tx, deps, row, { first: row.notifyClient ? 'booked' : null, notBefore: now + NEW_BOOKING_UNDO_MS })
  return row
}

/**
 * "Ýazyp goý" (B-23, B-25): a booking for a client who called or is at the desk, confirmed at once, with the specialist
 * the team chose. A walk-in is today; no booking starts before the step that holds now. A taken time: 409 with the
 * nearest free ones that day.
 */
export async function addBooking(
  deps: Deps,
  business: Business,
  actor: Actor,
  input: NewBooking,
): Promise<{ code: string; undoUntil: number }> {
  const now = deps.now()
  assertMayBook(actor, input.staffId)
  const lb = await loaded(deps.db, business.id)
  // tables and classes come after the MVP, with their own screens (B-62, B-69)
  if (!lb.business.bookingTypes.includes('appointment')) throw new ApiError('not_bookable')
  const at = epochOf(input.date, input.start)
  const issues: Issue[] = []
  if (at < currentStep(now, lb.rules.slotStep)) issues.push({ path: ['start'], code: 'past' })
  if (input.source === 'walkin' && localOf(at).date !== today(now)) issues.push({ path: ['date'], code: 'not_today' })
  if (issues.length) throw invalid(...issues)
  const q: AppointmentQuery = { date: input.date, serviceIds: input.serviceIds, staffId: input.staffId, by: 'staff' }
  const contextNow = async () => appointmentContext(lb, await loadBusy(deps.db, [business.id], input.date, input.date), deps.now())
  const nearest = (ctx: AppointmentContext) =>
    nearestSlots(ctx, q, input.start).map((s) => ({ date: input.date, start: s.start, end: s.end }))
  const ctx = await contextNow()
  checkChoice(ctx, input.serviceIds, input.staffId, { services: 'serviceIds', staff: 'staffId' })
  const slot = findAppointmentSlot(ctx, q, input.start)
  if (!slot) throw new ApiError('slot_taken', { alternatives: nearest(ctx) })
  const row = await inTransaction(
    deps,
    (tx) => insertTeamBooking(tx, deps, lb, input, slot),
    async () => nearest(await contextNow()),
  )
  return { code: row.code, undoUntil: row.createdAt.getTime() + NEW_BOOKING_UNDO_MS }
}

/**
 * "Yzyna al" (B-24): a booking the team just added goes as if never made, its SMS unsent, and a client record it made
 * with it (a mistyped number leaves nothing behind).
 */
export async function undoBooking(deps: Deps, business: Business, actor: Actor, code: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const [b] = await tx
      .select()
      .from(bookings)
      .where(and(eq(bookings.businessId, business.id), eq(bookings.code, code)))
      .for('update')
    if (!b) throw new ApiError('not_found')
    const staffIds = (await itemsOf(tx, b.id)).flatMap((i) => (i.staffId ? [i.staffId] : []))
    if (!canOn(actor, 'calendar', staffIds)) throw new ApiError('not_found')
    if (!canOn(actor, 'bookings', staffIds)) throw new ApiError('forbidden')
    const refused = canUndoNewBooking({ status: b.status, source: b.source, createdAt: b.createdAt.getTime() }, deps.now())
    if (refused) throw new ApiError(refused)
    await tx.delete(bookings).where(eq(bookings.id, b.id))
    if (b.clientId)
      await tx
        .delete(clients)
        .where(
          and(
            eq(clients.id, b.clientId),
            eq(clients.createdAt, b.createdAt),
            sql`not exists (select 1 from "bookings" where "bookings"."client_id" = ${b.clientId})`,
          ),
        )
    // the row is gone: the event names it by its code
    await emit(tx, { type: 'booking.cancelled', businessId: b.businessId, bookingCode: b.code, userId: b.userId })
  })
}
