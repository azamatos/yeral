/**
 * The end-to-end flows' hooks (e2e/; `E2E_HOOKS`, on in CI's stack and a developer's api, refused in production). A
 * flow can't wait half an hour for a request's hold to run out, or a day for a visit to end: the hook lets one
 * booking's time pass and the real jobs do what they would at that moment (`modules/jobs/run.ts`), so what the apps
 * then show is what they show in production. Off, the route doesn't exist (404).
 */
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi'
import { BOOKING_STATUSES } from '@yeral/domain/model'
import { addDays } from '@yeral/domain/time'
import { eq } from 'drizzle-orm'
import type { Db } from '../../db/client'
import { bookingItems, bookings } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { ApiError } from '../../http/errors'
import { errors, json } from '../../http/openapi'
import { isSlotConflict } from '../bookings/repo'
import { completeVisits, expireRequests } from '../jobs/run'

const elapseRoute = createRoute({
  method: 'post',
  path: '/e2e/bookings/{code}/elapse',
  tags: ['e2e'],
  summary:
    'Test hook (`E2E_HOOKS`): time passes for one booking — a waiting request’s hold ends now and the expiry job runs; a confirmed visit becomes a day earlier and the completion job runs',
  request: { params: z.object({ code: z.string() }) },
  responses: { 200: json(z.object({ status: z.enum(BOOKING_STATUSES) })), 404: errors[404], 409: errors[409] },
})

/** How many days back a visit may go to find its specialist free: the seed's days are never full that long. */
const DAYS_BACK = 7

/**
 * A visit that has ended: the same time on an earlier day, the first one back where its specialist's day has room
 * (the no-overlap constraint on the items' `span`, which follows `date`).
 */
async function backdate(db: Db, b: { id: string; date: string }): Promise<void> {
  for (let back = 1; back <= DAYS_BACK; back++) {
    const date = addDays(b.date, -back)
    try {
      await db.transaction(async (tx) => {
        await tx.update(bookings).set({ date }).where(eq(bookings.id, b.id))
        await tx.update(bookingItems).set({ date }).where(eq(bookingItems.bookingId, b.id))
      })
      return
    } catch (e) {
      // the specialist is busy at that time on that day: a day earlier
      if (!isSlotConflict(e) || back === DAYS_BACK) throw e
    }
  }
}

export const e2eRoutes = new OpenAPIHono<AppEnv>().openapi(elapseRoute, async (c) => {
  const { deps } = c.var
  if (!deps.e2eHooks) throw new ApiError('not_found')
  const { code } = c.req.valid('param')
  const [b] = await deps.db.select().from(bookings).where(eq(bookings.code, code))
  if (!b) throw new ApiError('not_found')
  if (b.status === 'pending') {
    await deps.db
      .update(bookings)
      .set({ holdUntil: new Date(deps.now()) })
      .where(eq(bookings.id, b.id))
    await expireRequests(deps)
  } else if (b.status === 'confirmed') {
    await backdate(deps.db, b)
    await completeVisits(deps)
  } else throw new ApiError('invalid_status')
  const [after] = await deps.db.select({ status: bookings.status }).from(bookings).where(eq(bookings.id, b.id))
  return c.json({ status: after!.status }, 200)
})
