/**
 * The business app's demo workspace (book F-242): one shared workspace anyone tries without signing in, made when it's
 * missing and again every night, so what visitors change lasts a day. On with `DEMO_WORKSPACE`.
 */
import { addDays, epochOf, today } from '@yeral/domain/time'
import { eq } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { businesses } from '../../db/schema'
import { seedSandbox } from '../../db/seed'
import type { Deps } from '../../deps'

/** The demo workspace (book F-242)? Its numbers join no account: a visitor may type in anyone's. */
export async function isSandbox(db: Queryable, businessId: string): Promise<boolean> {
  const [row] = await db.select({ sandbox: businesses.sandbox }).from(businesses).where(eq(businesses.id, businessId))
  return !!row?.sandbox
}

/** 04:00 at the businesses: the demo workspace is made again while every business is closed. */
export const SANDBOX_REMAKE_AT = 4 * 60

/** The last 04:00 (the market's time) at or before `now`. */
export function lastRemakeAt(now: number): number {
  const day = today(now)
  const at = epochOf(day, SANDBOX_REMAKE_AT)
  return at <= now ? at : epochOf(addDays(day, -1), SANDBOX_REMAKE_AT)
}

/** Each run of the jobs: the demo workspace is made when it's missing or older than the last 04:00. */
export async function keepSandbox(deps: Deps): Promise<boolean> {
  if (!deps.demoWorkspace) return false
  const now = deps.now()
  const [row] = await deps.db.select({ createdAt: businesses.createdAt }).from(businesses).where(eq(businesses.sandbox, true))
  if (row && row.createdAt.getTime() >= lastRemakeAt(now)) return false
  await seedSandbox(deps.db, { now })
  deps.log.info('demo workspace made', { at: new Date(now).toISOString() })
  return true
}
