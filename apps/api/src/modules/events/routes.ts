/**
 * Live updates (systemPatterns.md): open screens poll `GET /v1/events?after=<cursor>` and invalidate what changed.
 * A client sees events about their bookings; a team member, events of their businesses.
 *
 * Event ids are taken when a row is inserted but become visible when its transaction commits, so a later id can show
 * up first. Events are read in the order of the transaction that wrote them, and only from transactions older than
 * every one still running; the cursor `<txid>.<id>` then never passes an event that hasn't committed yet.
 */
import { createRoute, OpenAPIHono } from '@hono/zod-openapi'
import { eventListSchema, eventsQuerySchema, type EventType } from '@yeral/contract/events'
import { and, asc, desc, eq, inArray, or, sql } from 'drizzle-orm'
import { businesses, events, memberships } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { errors, json } from '../../http/openapi'
import { requireUser } from '../auth/session'

const PAGE = 100

const settled = sql`${events.txid} < pg_snapshot_xmin(pg_current_snapshot())`
const cursorOf = (e: { txid: string; id: number }) => `${e.txid}.${e.id}`

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
  const latest = async () => {
    const [row] = await db
      .select({ txid: events.txid, id: events.id })
      .from(events)
      .where(settled)
      .orderBy(desc(events.txid), desc(events.id))
      .limit(1)
    return row ? cursorOf(row) : '0.0'
  }
  const [, txid, id] = /^(\d{1,20})\.(\d{1,19})$/.exec(after ?? '') ?? []
  // no cursor yet, or one from before this format: start from now
  if (!txid || !id) return c.json({ items: [], cursor: await latest() }, 200)
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
    .where(and(sql`(${events.txid}, ${events.id}) > (${txid}::xid8, ${Number(id)})`, mine, settled))
    .orderBy(asc(events.txid), asc(events.id))
    .limit(PAGE)
  const items = rows.map(({ e, slug }) => ({
    id: String(e.id),
    type: e.type as EventType,
    at: e.at.getTime(),
    bookingCode: e.bookingCode,
    business: slug,
  }))
  const last = rows.at(-1)?.e
  return c.json({ items, cursor: last ? cursorOf(last) : (after as string) }, 200)
})
