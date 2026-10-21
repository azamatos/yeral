/**
 * The business app's demo workspace (book F-242): one shared workspace anyone tries without signing in, made when it's
 * missing and again every night, so what visitors change lasts a day. On with `DEMO_WORKSPACE`.
 */
import { addDays, epochOf, today } from '@yeral/domain/time'
import { and, eq, inArray, lt } from 'drizzle-orm'
import { businesses, sessions, users } from '../../db/schema'
import { seedSandbox } from '../../db/seed'
import type { Deps } from '../../deps'
import { dropPhotos } from '../media/photos'

/** 04:00 at the businesses: the demo workspace is made again while every business is closed. */
export const SANDBOX_REMAKE_AT = 4 * 60

/** The last 04:00 (the market's time) at or before `now`. */
export function lastRemakeAt(now: number): number {
  const day = today(now)
  const at = epochOf(day, SANDBOX_REMAKE_AT)
  return at <= now ? at : epochOf(addDays(day, -1), SANDBOX_REMAKE_AT)
}

/**
 * Each run of the jobs: the demo workspace is made when it's missing or older than the last 04:00, and what visitors
 * uploaded goes from the disk once the new one is in. A remake that fails leaves the old one and says so; the next
 * run tries again.
 */
export async function keepSandbox(deps: Deps): Promise<boolean> {
  if (!deps.demoWorkspace) return false
  const now = deps.now()
  const [row] = await deps.db.select({ createdAt: businesses.createdAt }).from(businesses).where(eq(businesses.sandbox, true))
  if (row && row.createdAt.getTime() >= lastRemakeAt(now)) return false
  try {
    const { uploads } = await seedSandbox(deps.db, { now })
    await dropPhotos(deps, uploads)
    // the demo sessions that ran out go with it: a day each, so they'd only pile up
    await deps.db
      .delete(sessions)
      .where(
        and(
          lt(sessions.expiresAt, new Date(now)),
          inArray(sessions.userId, deps.db.select({ id: users.id }).from(users).where(eq(users.demo, true))),
        ),
      )
  } catch (error) {
    deps.log.error('demo workspace not made', { error: error instanceof Error ? error.message : String(error) })
    return false
  }
  deps.log.info('demo workspace made', { at: new Date(now).toISOString() })
  return true
}
