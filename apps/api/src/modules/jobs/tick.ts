/**
 * One jobs tick (ADR 0005): the Node entry's timer calls it every minute. Runs never overlap, across processes too: a
 * run first takes a transaction-level advisory lock (`pg_try_advisory_xact_lock`, which goes away with a dead runner)
 * and skips when another run holds it. The lock's transaction keeps one connection; the work runs on others, so
 * `deps.db` must be a pool. A failed run is logged, never thrown.
 */
import { sql } from 'drizzle-orm'
import type { Deps } from '../../deps'
import { runDueJobs } from './run'

/** The jobs lock's key among the database's advisory locks (any constant; nothing else uses advisory locks). */
export const JOBS_LOCK = 72_017_005

export async function jobsTick(deps: Deps): Promise<void> {
  try {
    const result = await deps.db.transaction(async (tx) => {
      const { rows } = await tx.execute<{ locked: boolean }>(sql.raw(`select pg_try_advisory_xact_lock(${JOBS_LOCK}) as locked`))
      return rows[0]?.locked ? runDueJobs(deps) : null
    })
    if (!result) deps.log.debug('jobs: another run is still working')
    else if (result.expired || result.completed || result.recounted || result.jobs) deps.log.info('jobs', result)
  } catch (e) {
    deps.log.error('jobs failed', { error: String(e) })
  }
}
