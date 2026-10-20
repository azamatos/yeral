/** Free times for the booking flows (client spec §4.4–4.6); never cached. */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import {
  appointmentAvailabilityQuerySchema,
  appointmentAvailabilitySchema,
  sessionListSchema,
  sessionsQuerySchema,
  specialistsAvailabilityQuerySchema,
  specialistsAvailabilitySchema,
  tableAvailabilityQuerySchema,
  tableAvailabilitySchema,
} from '@yeral/contract/availability'
import { slugSchema } from '@yeral/contract/common'
import type { PartyTooLargeDetails } from '@yeral/contract/errors'
import {
  appointmentSlots,
  hasAppointmentSlot,
  MAX_ONLINE_PARTY,
  maxSeats,
  nextFreeSlot,
  staffDoingAll,
  tableSlots,
} from '@yeral/domain/availability'
import { canClientReschedule, cancelDeadline } from '@yeral/domain/lifecycle'
import { addDays, epochOf, today } from '@yeral/domain/time'
import type { Deps } from '../../deps'
import { and, eq } from 'drizzle-orm'
import type { Context } from 'hono'
import { bookings } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { ApiError } from '../../http/errors'
import { errors, json } from '../../http/openapi'
import { requireUser } from '../auth/session'
import { myBooking, stateOf } from '../bookings/repo'
import { visibleBusiness } from '../catalog/detail'
import { text } from '../catalog/map'
import { appointmentContext, checkQuery, dayStrip, loadBusiness, loadBusy, loadTableContext, type LoadedBusiness } from './context'
import { loadSessions } from './sessions'

const slugParam = z.object({ slug: slugSchema })

/** The business's free times: public once verified, and for its own team while in review (book F-032). */
async function loaded(deps: Deps, slug: string, viewerId: string | null) {
  const { row: b } = await visibleBusiness(deps, slug, viewerId)
  const lb = await loadBusiness(deps.db, b.id)
  return lb
}

/**
 * Move mode (book Q-165): the bookings whose time doesn't count as busy — the client's own confirmed appointment being
 * moved, and a move already waiting for it (a second move replaces it). A booking that can't be moved is refused.
 */
async function movingFamily(c: Context<AppEnv>, lb: LoadedBusiness, code: string | undefined): Promise<string[]> {
  if (!code) return []
  const { deps } = c.var
  const b = await myBooking(deps.db, requireUser(c).id, code)
  if (b.businessId !== lb.business.id) throw new ApiError('not_found')
  if (b.type !== 'appointment') throw new ApiError('not_bookable')
  const refused = canClientReschedule(stateOf(b), lb.rules, deps.now())
  if (refused) throw new ApiError(refused)
  const waiting = await deps.db
    .select({ id: bookings.id })
    .from(bookings)
    .where(and(eq(bookings.rescheduleOf, b.id), eq(bookings.status, 'pending')))
  return [b.id, ...waiting.map((w) => w.id)]
}

const appointmentRoute = createRoute({
  method: 'get',
  path: '/businesses/{slug}/availability',
  tags: ['availability'],
  summary: 'Free starts for services (and a specialist or «Islendik»), with the 14-day strip',
  request: { params: slugParam, query: appointmentAvailabilityQuerySchema },
  responses: { 200: json(appointmentAvailabilitySchema), 401: errors[401], 404: errors[404], 409: errors[409] },
})

const specialistsRoute = createRoute({
  method: 'get',
  path: '/businesses/{slug}/specialists/availability',
  tags: ['availability'],
  summary: 'Next free time per specialist who does every chosen service ("Indiki boş wagt")',
  request: { params: slugParam, query: specialistsAvailabilityQuerySchema },
  responses: { 200: json(specialistsAvailabilitySchema), 401: errors[401], 404: errors[404], 409: errors[409] },
})

const tablesRoute = createRoute({
  method: 'get',
  path: '/businesses/{slug}/tables',
  tags: ['availability'],
  summary: 'Times with a free table for the party size, per area',
  request: { params: slugParam, query: tableAvailabilityQuerySchema },
  responses: { 200: json(tableAvailabilitySchema), 400: errors[400], 404: errors[404] },
})

const sessionsRoute = createRoute({
  method: 'get',
  path: '/businesses/{slug}/sessions',
  tags: ['availability'],
  summary: 'Class schedule with seats left',
  request: { params: slugParam, query: sessionsQuerySchema },
  responses: { 200: json(sessionListSchema), 404: errors[404] },
})

export const availabilityRoutes = new OpenAPIHono<AppEnv>()
  .openapi(appointmentRoute, async (c) => {
    const { deps } = c.var
    const now = deps.now()
    const q = c.req.valid('query')
    const lb = await loaded(deps, c.req.valid('param').slug, c.var.auth?.user.id ?? null)
    const first = today(now)
    const date = q.date ?? first
    const last = addDays(first, Math.max(q.days, lb.rules.windowDays + 1))
    const [moving, busy] = await Promise.all([movingFamily(c, lb, q.move), loadBusy(deps.db, [lb.business.id], first, last)])
    const ctx = appointmentContext(lb, busy, now)
    const staffId = q.staff === 'any' ? null : q.staff
    checkQuery(ctx, q.services, staffId)
    const query = { serviceIds: q.services, staffId, by: 'client' as const, excludeBookingIds: moving }
    const online = lb.rules.onlineEnabled
    const slotsOn = (d: string) => (online ? appointmentSlots(ctx, { ...query, date: d }) : [])
    const days = dayStrip(ctx.business, first, q.days, (d) => online && hasAppointmentSlot(ctx, { ...query, date: d }))
    const slots = slotsOn(date).map((s) => ({ start: s.start, end: s.end }))
    const next = !slots.length && online ? nextFreeSlot(ctx, query, addDays(date, 1), lb.rules.windowDays) : null
    return c.json({ date, slots, days, nextFree: next ? { date: next.date, start: next.slot.start } : null }, 200)
  })
  .openapi(specialistsRoute, async (c) => {
    const { deps } = c.var
    const now = deps.now()
    const { services, move } = c.req.valid('query')
    const lb = await loaded(deps, c.req.valid('param').slug, c.var.auth?.user.id ?? null)
    const first = today(now)
    const [moving, busy] = await Promise.all([
      movingFamily(c, lb, move),
      loadBusy(deps.db, [lb.business.id], first, addDays(first, lb.rules.windowDays)),
    ])
    const ctx = appointmentContext(lb, busy, now)
    checkQuery(ctx, services, null)
    const next = (staffId: string | null) => {
      const found = lb.rules.onlineEnabled
        ? nextFreeSlot(ctx, { serviceIds: services, staffId, by: 'client', excludeBookingIds: moving }, first)
        : null
      return found ? { date: found.date, start: found.slot.start } : null
    }
    return c.json({ any: next(null), items: staffDoingAll(ctx, services).map((s) => ({ staffId: s.id, next: next(s.id) })) }, 200)
  })
  .openapi(tablesRoute, async (c) => {
    const { deps } = c.var
    const now = deps.now()
    const q = c.req.valid('query')
    const lb = await loaded(deps, c.req.valid('param').slug, c.var.auth?.user.id ?? null)
    // "9 we ondan köp adam bolsa, jaň ediň" (client spec §4.5)
    if (q.party > MAX_ONLINE_PARTY) throw new ApiError('party_too_large', { callFrom: MAX_ONLINE_PARTY + 1 } satisfies PartyTooLargeDetails)
    const first = today(now)
    const date = q.date ?? first
    const ctx = await loadTableContext(deps.db, lb, first, addDays(first, Math.max(q.days, lb.rules.windowDays + 1)), now)
    const online = lb.rules.onlineEnabled
    const slotsOn = (d: string) => (online ? tableSlots(ctx, { date: d, partySize: q.party }) : [])
    const days = dayStrip(ctx.business, first, q.days, (d) => slotsOn(d).length > 0)
    const slots = slotsOn(date)
    let nextFree: { date: string; start: number } | null = null
    for (let i = 1; !slots.length && online && i <= lb.rules.windowDays; i++) {
      const d = addDays(date, i)
      const [s] = slotsOn(d)
      if (s) nextFree = { date: d, start: s.start }
      if (nextFree) break
    }
    return c.json({ date, slots, days, nextFree }, 200)
  })
  .openapi(sessionsRoute, async (c) => {
    const { deps } = c.var
    const now = deps.now()
    const q = c.req.valid('query')
    const lb = await loaded(deps, c.req.valid('param').slug, c.var.auth?.user.id ?? null)
    const from = q.from ?? today(now)
    const sessions = await loadSessions(deps.db, [lb.business.id], from, addDays(from, q.days - 1))
    const items = sessions
      .filter((s) => epochOf(s.date, s.start + s.durationMin) > now)
      .map((s) => ({
        id: s.id,
        date: s.date,
        start: s.start,
        durationMin: s.durationMin,
        name: text(s.name, q.lang),
        trainer: s.trainer,
        level: s.level ? text(s.level, q.lang) : null,
        price: s.price,
        capacity: s.capacity,
        seatsLeft: Math.max(0, s.capacity - s.booked),
        maxSeats: lb.rules.onlineEnabled && epochOf(s.date, s.start) >= now + lb.rules.leadMinutes * 60_000 ? maxSeats(s) : 0,
        cancelDeadline: cancelDeadline(lb.rules, s),
      }))
    return c.json({ items }, 200)
  })
