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
  type AppointmentContext,
  appointmentSlots,
  hasAppointmentSlot,
  MAX_ONLINE_PARTY,
  maxSeats,
  nextFreeSlot,
  staffDoingAll,
  tableSlots,
} from '@yeral/domain/availability'
import { businessClosedReason } from '@yeral/domain/hours'
import { cancelDeadline } from '@yeral/domain/lifecycle'
import { addDays, epochOf, today } from '@yeral/domain/time'
import type { Deps } from '../../deps'
import type { AppEnv } from '../../http/env'
import { ApiError } from '../../http/errors'
import { errors, json } from '../../http/openapi'
import { requireUser } from '../auth/session'
import { myBooking } from '../bookings/repo'
import { publicBusiness } from '../catalog/detail'
import { text } from '../catalog/map'
import { appointmentContext, loadBusinesses, loadBusy, loadTableContext } from './context'
import { loadSessions } from './sessions'

const slugParam = z.object({ slug: slugSchema })

async function loaded(deps: Deps, slug: string) {
  const b = await publicBusiness(deps, slug)
  const lb = (await loadBusinesses(deps.db, [b.id])).get(b.id)
  if (!lb) throw new ApiError('not_found')
  return lb
}

/** The services must exist and be bookable online; a chosen specialist must do all of them. */
function checkQuery(ctx: AppointmentContext, serviceIds: string[], staffId: string | null) {
  for (const id of serviceIds) if (!ctx.services.some((s) => s.id === id && s.online)) throw new ApiError('not_found', { serviceId: id })
  if (staffId && !staffDoingAll(ctx, serviceIds).some((s) => s.id === staffId)) throw new ApiError('not_found', { staffId })
}

const appointmentRoute = createRoute({
  method: 'get',
  path: '/businesses/{slug}/availability',
  tags: ['availability'],
  summary: 'Free starts for services (and a specialist or «Islendik»), with the 14-day strip',
  request: { params: slugParam, query: appointmentAvailabilityQuerySchema },
  responses: { 200: json(appointmentAvailabilitySchema), 401: errors[401], 404: errors[404] },
})

const specialistsRoute = createRoute({
  method: 'get',
  path: '/businesses/{slug}/specialists/availability',
  tags: ['availability'],
  summary: 'Next free time per specialist who does every chosen service ("Indiki boş wagt")',
  request: { params: slugParam, query: specialistsAvailabilityQuerySchema },
  responses: { 200: json(specialistsAvailabilitySchema), 404: errors[404] },
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
    const lb = await loaded(deps, c.req.valid('param').slug)
    const first = today(now)
    const date = q.date ?? first
    const last = addDays(first, Math.max(q.days, lb.rules.windowDays + 1))
    const ctx = appointmentContext(lb, await loadBusy(deps.db, [lb.business.id], first, last), now)
    const staffId = q.staff === 'any' ? null : q.staff
    checkQuery(ctx, q.services, staffId)
    // move mode: the client's own booking doesn't count as busy (book Q-165)
    const moving = q.move ? await myBooking(deps.db, requireUser(c).id, q.move) : null
    if (moving && moving.businessId !== lb.business.id) throw new ApiError('not_found')
    const query = { serviceIds: q.services, staffId, by: 'client' as const, excludeBookingId: moving?.id }
    const online = lb.rules.onlineEnabled
    const slotsOn = (d: string) => (online ? appointmentSlots(ctx, { ...query, date: d }) : [])
    const days = Array.from({ length: q.days }, (_, i) => {
      const d = addDays(first, i)
      const closed = businessClosedReason(ctx.business, d)
      if (closed) return { date: d, state: 'closed' as const, closedReason: closed.kind === 'exception' ? closed.name : null }
      const free = online && hasAppointmentSlot(ctx, { ...query, date: d })
      return { date: d, state: free ? ('open' as const) : ('full' as const), closedReason: null }
    })
    const slots = slotsOn(date).map((s) => ({ start: s.start, end: s.end }))
    const next = !slots.length && online ? nextFreeSlot(ctx, query, addDays(date, 1), lb.rules.windowDays) : null
    return c.json({ date, slots, days, nextFree: next ? { date: next.date, start: next.slot.start } : null }, 200)
  })
  .openapi(specialistsRoute, async (c) => {
    const { deps } = c.var
    const now = deps.now()
    const { services } = c.req.valid('query')
    const lb = await loaded(deps, c.req.valid('param').slug)
    const first = today(now)
    const ctx = appointmentContext(lb, await loadBusy(deps.db, [lb.business.id], first, addDays(first, lb.rules.windowDays)), now)
    checkQuery(ctx, services, null)
    const next = (staffId: string | null) => {
      const found = lb.rules.onlineEnabled ? nextFreeSlot(ctx, { serviceIds: services, staffId, by: 'client' }, first) : null
      return found ? { date: found.date, start: found.slot.start } : null
    }
    return c.json({ any: next(null), items: staffDoingAll(ctx, services).map((s) => ({ staffId: s.id, next: next(s.id) })) }, 200)
  })
  .openapi(tablesRoute, async (c) => {
    const { deps } = c.var
    const now = deps.now()
    const q = c.req.valid('query')
    const lb = await loaded(deps, c.req.valid('param').slug)
    // "9 we ondan köp adam bolsa, jaň ediň" (client spec §4.5)
    if (q.party > MAX_ONLINE_PARTY) throw new ApiError('party_too_large', { callFrom: MAX_ONLINE_PARTY + 1 } satisfies PartyTooLargeDetails)
    const first = today(now)
    const date = q.date ?? first
    const ctx = await loadTableContext(deps.db, lb, first, addDays(first, Math.max(q.days, lb.rules.windowDays + 1)), now)
    const online = lb.rules.onlineEnabled
    const slotsOn = (d: string) => (online ? tableSlots(ctx, { date: d, partySize: q.party }) : [])
    const days = Array.from({ length: q.days }, (_, i) => {
      const d = addDays(first, i)
      const closed = businessClosedReason(ctx.business, d)
      if (closed) return { date: d, state: 'closed' as const, closedReason: closed.kind === 'exception' ? closed.name : null }
      return { date: d, state: slotsOn(d).length ? ('open' as const) : ('full' as const), closedReason: null }
    })
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
    const lb = await loaded(deps, c.req.valid('param').slug)
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
