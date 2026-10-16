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
import { isOnlineBlocked } from '@yeral/domain/clients'
import { holdUntil as holdUntilOf, initialStatus } from '@yeral/domain/lifecycle'
import { priceTotal } from '@yeral/domain/pricing'
import { and, eq, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookingItems, bookings, classSessions, clients, jobs, memberships } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import type { User } from '../../http/env'
import { emit } from '../../notify'
import { appointmentContext, loadBusinesses, loadBusy, loadTableContext, type LoadedBusiness } from '../availability/context'
import { publicBusiness } from '../catalog/detail'
import { servicePrice } from '../catalog/map'
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

async function noShowsOf(db: Queryable, clientId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(eq(bookings.clientId, clientId), eq(bookings.status, 'noshow')))
  return row?.n ?? 0
}

async function hasActiveTeam(db: Queryable, businessId: string): Promise<boolean> {
  const [m] = await db
    .select({ id: memberships.id })
    .from(memberships)
    .where(and(eq(memberships.businessId, businessId), eq(memberships.status, 'active')))
    .limit(1)
  return !!m
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
      active: true,
      source: 'web',
      clientNote: x.note ?? null,
      priceType: price?.type ?? null,
      priceAmount: price?.amount ?? null,
      holdUntil: x.status === 'pending' ? new Date(holdUntilOf(now, { date: x.date, start: x.start }, x.lb.rules.holdMinutes)) : null,
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
          active: true,
          sort: i,
        }
      }),
    )
  }
  await emit(db, { type: 'booking.created', businessId: row.businessId, bookingId: row.id, bookingCode: row.code, userId: row.userId })
  if (x.status === 'confirmed') return confirmBooking(db, deps, row)
  if (deps.site.demo && x.lb.business.demo && !(await hasActiveTeam(db, row.businessId))) {
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
  if (!lb.rules.onlineEnabled) throw new ApiError('online_disabled')
  const [known] = await db
    .select()
    .from(clients)
    .where(and(eq(clients.businessId, lb.business.id), eq(clients.phone, user.phone)))
  if (known && isOnlineBlocked({ onlineBlocked: known.onlineBlocked, noShows: await noShowsOf(db, known.id) }, lb.rules))
    throw new ApiError('online_blocked')
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
        .slice(0, 3)
        .sort((x, y) => x.start - y.start)
        .map((s) => ({ date: input.date, start: s.start, end: Math.min(1440, s.start + ctx.sittingMinutes) }))
    if (!tableId) throw new ApiError('slot_taken', { alternatives: nearest() })
    const table = {
      tableId,
      areaId: input.areaId,
      partySize: input.partySize,
      requests: input.requests,
      end: Math.min(1440, input.start + ctx.sittingMinutes),
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
  const items = await db.select().from(bookingItems).where(eq(bookingItems.bookingId, from.id)).orderBy(bookingItems.sort)
  const serviceIds = items.flatMap((i) => (i.serviceId ? [i.serviceId] : []))
  const sameStaff = items.length > 0 && items.every((i) => i.staffId === items[0]?.staffId) ? (items[0]?.staffId ?? null) : null
  const staffId = to.staffId === undefined ? sameStaff : to.staffId
  const q = { date: to.date, serviceIds, staffId, by: 'client' as const }
  let slot: AppointmentSlot
  try {
    slot = await placeAppointment(deps, lb, q, to.start, 'client', db)
  } catch (e) {
    // the same specialist may be busy now: any free specialist will do
    if (staffId === null || to.staffId !== undefined) throw e
    slot = await placeAppointment(deps, lb, { ...q, staffId: null }, to.start, 'client', db)
  }
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
        alternativeOf: opts.alternativeOf,
      }),
    () => Promise.resolve([]),
    db,
  )
}
