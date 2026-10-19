/**
 * Sending a booking from the client site (client spec §4.4–4.6, ADR 0017): the slot is checked with the domain rules,
 * written in one transaction, and the database's exclusion constraints catch a race (→ 409 slot_taken with the nearest
 * free times). Online bookings wait for the business unless it confirms instantly.
 */
import type { CreateBooking } from '@yeral/contract/bookings'
import type { PartyTooLargeDetails } from '@yeral/contract/errors'
import {
  assignTable,
  canBookSession,
  findAppointmentSlot,
  MAX_ONLINE_PARTY,
  maxSeats,
  nearestSlots,
  tableSlots,
  type AppointmentQuery,
  type AppointmentSlot,
} from '@yeral/domain/availability'
import { holdUntil as holdUntilOf, initialStatus, MAX_ALTERNATIVES } from '@yeral/domain/lifecycle'
import { priceTotal } from '@yeral/domain/pricing'
import { epochOf } from '@yeral/domain/time'
import { and, eq, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, classSessions, clients, jobs } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import type { User } from '../../http/env'
import { emit } from '../../notify'
import { appointmentContext, loadBusinesses, loadBusy, loadTableContext, type LoadedBusiness } from '../availability/context'
import { publicBusiness } from '../catalog/detail'
import { isPhoneBlocked } from '../clients/online'
import { servicePrice } from '../catalog/map'
import { hasSignedInTeam } from '../team/members'
import { confirmBooking } from './confirm'
import { freshCode, isSlotConflict, type BookingRow } from './repo'

/** Demo businesses with nobody to answer confirm requests themselves after this delay (outside production). */
const DEMO_ANSWER_MS = 20_000

/** The business's client row for this person, created on their first booking there. */
async function clientFor(db: Queryable, businessId: string, user: User): Promise<typeof clients.$inferSelect> {
  const [row] = await db
    .insert(clients)
    .values({ businessId, phone: user.phone, name: user.name, userId: user.id, source: 'yeral' })
    .onConflictDoUpdate({
      target: [clients.businessId, clients.phone],
      set: { userId: user.id, name: sql`coalesce(${clients.name}, excluded.name)` },
    })
    .returning()
  if (!row) throw new Error('client upsert failed')
  return row
}

export interface Placement {
  /** Appointment: the plan from the domain. */
  slot?: AppointmentSlot
  table?: { tableId: string; areaId: string; partySize: number; requests: string[]; end: number }
  session?: { id: string; seats: number; end: number; price: number }
}

interface Insert {
  lb: LoadedBusiness
  user: User
  type: CreateBooking['type']
  date: string
  start: number
  placement: Placement
  status: 'pending' | 'confirmed'
  note?: string
  rescheduleOf?: string
  /** A move's deadline never runs past the original visit's start (book Q-263). */
  holdCap?: number
  alternativeOf?: string
}

async function insertBooking(db: Queryable, deps: Deps, x: Insert): Promise<BookingRow> {
  const now = deps.now()
  const client = await clientFor(db, x.lb.business.id, x.user)
  const services = x.placement.slot?.items.map((it) => x.lb.services.find((s) => s.id === it.serviceId)) ?? []
  const price =
    x.type === 'appointment'
      ? priceTotal(services.flatMap((s) => (s ? [servicePrice(s)] : [])))
      : x.type === 'class' && x.placement.session
        ? { type: 'fixed' as const, amount: x.placement.session.price * x.placement.session.seats }
        : null
  const end = x.placement.slot?.end ?? x.placement.table?.end ?? x.placement.session?.end ?? x.start
  const [row] = await db
    .insert(bookings)
    .values({
      code: await freshCode(db),
      businessId: x.lb.business.id,
      type: x.type,
      clientId: client.id,
      userId: x.user.id,
      clientName: x.user.name ?? client.name,
      clientPhone: x.user.phone,
      date: x.date,
      start: x.start,
      end,
      // instant bookings are confirmed right below, so the confirmation runs like any other
      status: 'pending',
      source: 'web',
      clientNote: x.note ?? null,
      priceType: price?.type ?? null,
      priceAmount: price?.amount ?? null,
      holdUntil:
        x.status === 'pending'
          ? new Date(
              Math.min(
                holdUntilOf(now, { date: x.date, start: x.start }, x.lb.rules.holdMinutes, {
                  hours: x.lb.business.hours,
                  exceptions: x.lb.business.exceptions,
                }),
                x.holdCap ?? Infinity,
              ),
            )
          : null,
      rescheduleOf: x.rescheduleOf ?? null,
      alternativeOf: x.alternativeOf ?? null,
      partySize: x.placement.table?.partySize ?? null,
      areaId: x.placement.table?.areaId ?? null,
      tableId: x.placement.table?.tableId ?? null,
      tableRequests: x.placement.table?.requests ?? [],
      sessionId: x.placement.session?.id ?? null,
      seats: x.placement.session?.seats ?? null,
      createdAt: new Date(now),
      updatedAt: new Date(now),
    })
    .returning()
  if (!row) throw new Error('booking insert failed')
  if (x.placement.slot) {
    await db.insert(bookingItems).values(
      x.placement.slot.items.map((it, i) => {
        const svc = x.lb.services.find((s) => s.id === it.serviceId)
        const who = x.lb.staff.find((s) => s.id === it.staffId)
        return {
          bookingId: row.id,
          serviceId: it.serviceId,
          staffId: it.staffId,
          serviceName: svc?.name ?? { tk: '' },
          staffName: who?.name ?? null,
          date: x.date,
          start: it.start,
          end: it.end,
          bufferAfter: it.bufferAfter,
          priceType: svc?.priceType ?? 'fixed',
          priceAmount: svc?.priceAmount ?? 0,
          sort: i,
        }
      }),
    )
  }
  await emit(db, { type: 'booking.created', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
  if (x.status === 'confirmed') return confirmBooking(db, deps, row)
  if (deps.site.demo && x.lb.business.demo && !(await hasSignedInTeam(db, row.businessId))) {
    await db.insert(jobs).values({ kind: 'demo.answer', runAt: new Date(now + DEMO_ANSWER_MS), payload: { bookingId: row.id } })
  }
  return row
}

/** Where an appointment fits, or 409 with the nearest free times. */
async function placeAppointment(
  deps: Deps,
  lb: LoadedBusiness,
  q: AppointmentQuery,
  start: number,
  by: 'client' | 'staff' = 'client',
  db: Queryable = deps.db,
): Promise<AppointmentSlot> {
  const now = deps.now()
  const ctx = appointmentContext(lb, await loadBusy(db, [lb.business.id], q.date, q.date), now)
  const query = { ...q, by }
  const slot = findAppointmentSlot(ctx, query, start)
  if (!slot)
    throw new ApiError('slot_taken', {
      alternatives: nearestSlots(ctx, query, start).map((s) => ({ date: q.date, start: s.start, end: s.end })),
    })
  return slot
}

/** Run the insert; a race lost to another booking becomes 409 slot_taken. Inside a transaction: a savepoint. */
async function inTransaction<T>(
  deps: Deps,
  fn: (tx: Queryable) => Promise<T>,
  alternatives: () => Promise<unknown[]>,
  db: Queryable = deps.db,
): Promise<T> {
  try {
    return await db.transaction(fn)
  } catch (e) {
    if (isSlotConflict(e)) throw new ApiError('slot_taken', { alternatives: await alternatives() })
    throw e
  }
}

/** A request the client sends online: the business takes them, and this client isn't limited to phone bookings. */
export async function assertOnlineBooking(db: Queryable, lb: LoadedBusiness, user: User): Promise<void> {
  const refused = await onlineRefusal(db, lb, user.phone)
  if (refused) throw new ApiError(refused)
}

/** Why this phone can't book the business online now (paused, or phone-only there), or null when it can. */
export async function onlineRefusal(
  db: Queryable,
  lb: LoadedBusiness,
  phone: string,
): Promise<'online_disabled' | 'online_blocked' | null> {
  if (!lb.rules.onlineEnabled) return 'online_disabled'
  // by hand, or the no-shows since the business last lifted the block reach its limit (book Q-127)
  if (await isPhoneBlocked(db, lb.business.id, phone, lb.rules)) return 'online_blocked'
  return null
}

export async function createBooking(deps: Deps, user: User, input: CreateBooking): Promise<BookingRow> {
  const { db } = deps
  const now = deps.now()
  const b = await publicBusiness(deps, input.business)
  const lb = (await loadBusinesses(db, [b.id])).get(b.id)
  if (!lb) throw new ApiError('not_found')
  await assertOnlineBooking(db, lb, user)
  if (!b.bookingTypes.includes(input.type)) throw new ApiError('not_bookable')
  const status = initialStatus('web', lb.rules.confirmMode)

  if (input.type === 'appointment') {
    const q = { date: input.date, serviceIds: input.serviceIds, staffId: input.staffId, by: 'client' as const }
    const slot = await placeAppointment(deps, lb, q, input.start)
    return inTransaction(
      deps,
      (tx) =>
        insertBooking(tx, deps, {
          lb,
          user,
          type: 'appointment',
          date: input.date,
          start: input.start,
          placement: { slot },
          status,
          note: input.note,
        }),
      async () => {
        const ctx = appointmentContext(lb, await loadBusy(db, [b.id], input.date, input.date), deps.now())
        return nearestSlots(ctx, q, input.start).map((s) => ({ date: input.date, start: s.start, end: s.end }))
      },
    )
  }

  if (input.type === 'table') {
    // "9 we ondan köp adam bolsa, jaň ediň" (client spec §4.5)
    if (input.partySize > MAX_ONLINE_PARTY)
      throw new ApiError('party_too_large', { callFrom: MAX_ONLINE_PARTY + 1 } satisfies PartyTooLargeDetails)
    const ctx = await loadTableContext(db, lb, input.date, input.date, now)
    const tableId = assignTable(ctx, { date: input.date, start: input.start, partySize: input.partySize, areaId: input.areaId })
    const nearest = () =>
      tableSlots(ctx, { date: input.date, partySize: input.partySize })
        .filter((s) => s.areaIds.includes(input.areaId) && s.start !== input.start)
        .sort((x, y) => Math.abs(x.start - input.start) - Math.abs(y.start - input.start))
        .slice(0, MAX_ALTERNATIVES)
        .sort((x, y) => x.start - y.start)
        .map((s) => ({ date: input.date, start: s.start, end: s.start + ctx.sittingMinutes }))
    if (!tableId) throw new ApiError('slot_taken', { alternatives: nearest() })
    const table = {
      tableId,
      areaId: input.areaId,
      partySize: input.partySize,
      requests: input.requests,
      end: input.start + ctx.sittingMinutes,
    }
    return inTransaction(
      deps,
      (tx) =>
        insertBooking(tx, deps, {
          lb,
          user,
          type: 'table',
          date: input.date,
          start: input.start,
          placement: { table },
          status,
          note: input.note,
        }),
      () => Promise.resolve(nearest()),
    )
  }

  // class: seats are counted under a row lock on the session
  return db.transaction(async (tx) => {
    const [session] = await tx
      .select()
      .from(classSessions)
      .where(and(eq(classSessions.id, input.sessionId), eq(classSessions.businessId, b.id)))
      .for('update')
    if (!session) throw new ApiError('not_found')
    const [taken] = await tx
      .select({ seats: sql<number>`coalesce(sum(${bookings.seats}), 0)::int` })
      .from(bookings)
      .where(and(eq(bookings.sessionId, session.id), eq(bookings.active, true)))
    const view = { date: session.date, start: session.start, capacity: session.capacity, booked: taken?.seats ?? 0 }
    if (maxSeats(view) < input.seats) throw new ApiError('session_full')
    if (!canBookSession(view, input.seats, lb.rules, now)) throw new ApiError('not_bookable')
    return insertBooking(tx, deps, {
      lb,
      user,
      type: 'class',
      date: session.date,
      start: session.start,
      placement: { session: { id: session.id, seats: input.seats, end: session.start + session.durationMin, price: session.price } },
      status,
      note: input.note,
    })
  })
}

/** A booking's services in the order they run, and the one specialist doing them all (null when split). */
export async function bookedServices(db: Queryable, bookingId: string): Promise<{ serviceIds: string[]; staffId: string | null }> {
  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, bookingId)).orderBy(bookingItems.sort)
  const first = items[0]?.staffId ?? null
  return {
    serviceIds: items.flatMap((i) => (i.serviceId ? [i.serviceId] : [])),
    staffId: first && items.every((i) => i.staffId === first) ? first : null,
  }
}

/**
 * Who a re-booked time goes to, never someone else silently (ROUND6 A5, book Q-159): the specialist `to` names, anyone
 * free for null («Islendik hünärmen»), or the booking's own specialist when it names none. A move doesn't count the
 * booking's own time as busy (Q-165). The offered times' state asks the same question.
 */
export function rebookQuery(
  booked: { serviceIds: string[]; staffId: string | null },
  to: { date: string; staffId?: string | null },
  excludeBookingId?: string,
): AppointmentQuery {
  const staffId = to.staffId === undefined ? booked.staffId : to.staffId
  return { date: to.date, serviceIds: booked.serviceIds, by: 'client', staffId, oneSpecialist: !!staffId, excludeBookingId }
}

/**
 * A new appointment like `from` at another time: a client's move request, or an offered alternative. `opts.db` runs it
 * inside the caller's transaction.
 */
export async function rebook(
  deps: Deps,
  user: User,
  from: BookingRow,
  to: { date: string; start: number; staffId?: string | null },
  opts: { status: 'pending' | 'confirmed'; rescheduleOf?: string; alternativeOf?: string; db?: Queryable },
): Promise<BookingRow> {
  const db = opts.db ?? deps.db
  const lb = (await loadBusinesses(db, [from.businessId])).get(from.businessId)
  if (!lb) throw new ApiError('not_found')
  if (from.type !== 'appointment') throw new ApiError('not_bookable')
  const move = opts.rescheduleOf === from.id
  const query = rebookQuery(await bookedServices(db, from.id), to, move ? from.id : undefined)
  const slot = await placeAppointment(deps, lb, query, to.start, 'client', db)
  return inTransaction(
    deps,
    (tx) =>
      insertBooking(tx, deps, {
        lb,
        user,
        type: 'appointment',
        date: to.date,
        start: to.start,
        placement: { slot },
        status: opts.status,
        note: from.clientNote ?? undefined,
        rescheduleOf: opts.rescheduleOf,
        holdCap: move ? epochOf(from.date, from.start) : undefined,
        alternativeOf: opts.alternativeOf,
      }),
    () => Promise.resolve([]),
    db,
  )
}
