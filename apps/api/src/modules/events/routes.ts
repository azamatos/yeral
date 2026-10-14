/**
 * Live updates (systemPatterns.md): open screens poll `GET /v1/events?after=<cursor>` and invalidate what changed.
 * A client sees events about their bookings; a team member, events of their businesses.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eventListSchema, eventsQuerySchema, type EventType } from '@yeral/contract/events'
import { and, asc, eq, gt, inArray, max, or } from 'drizzle-orm'
import { businesses, events, memberships } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { errors, json } from '../../http/openapi'
import { requireUser } from '../auth/session'

const PAGE = 100

const eventsRoute = createRoute({
  method: 'get',
  path: '/events',
  tags: ['events'],
  summary: 'Changes since a cursor (without `after`: no items, just the current cursor)',
  request: { query: eventsQuerySchema },
  responses: { 200: json(eventListSchema), 401: errors[401] },
})

export const eventRoutes = new OpenAPIHono<AppEnv>().openapi(eventsRoute, async (c) => {
  const user = requireUser(c)
  const { db } = c.var.deps
  const { after } = c.req.valid('query')
  if (after === undefined) {
    const [row] = await db.select({ id: max(events.id) }).from(events)
    return c.json({ items: [], cursor: String(row?.id ?? 0) }, 200)
  }
  const teams = await db
    .select({ businessId: memberships.businessId })
    .from(memberships)
    .where(and(eq(memberships.userId, user.id), eq(memberships.status, 'active')))
  const mine = teams.length
    ? or(
        eq(events.userId, user.id),
        inArray(
          events.businessId,
          teams.map((t) => t.businessId),
        ),
      )
    : eq(events.userId, user.id)
  const rows = await db
    .select({ e: events, slug: businesses.slug })
    .from(events)
    .leftJoin(businesses, eq(businesses.id, events.businessId))
    .where(and(gt(events.id, Number(after) || 0), mine))
    .orderBy(asc(events.id))
    .limit(PAGE)
  const items = rows.map(({ e, slug }) => ({
    id: String(e.id),
    type: e.type as EventType,
    at: e.at.getTime(),
    bookingCode: e.bookingCode,
    business: slug,
  }))
  return c.json({ items, cursor: items.at(-1)?.id ?? after }, 200)
})
