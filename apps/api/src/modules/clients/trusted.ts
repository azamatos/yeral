/**
 * "Trusted on Ýeral" for one account (design v0.7 · D): the standing the client sees in Account (`GET /v1/me/trusted`)
 * and the yes or no "Confirm trusted clients at once" asks before an online request waits. The business side reads
 * the same facts per client row in `facts.ts` (`trustedSql`).
 */
import { trustedStanding, type TrustedStanding, type TrustFacts } from '@yeral/domain/clients'
import { localOf } from '@yeral/domain/time'
import { sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { trustFactsSql } from './facts'

/** The account's trust facts over its bookings at every business; nothing yet without a booking. */
export async function trustFactsOf(db: Queryable, userId: string, now: number): Promise<TrustFacts> {
  const { rows } = await db.execute<{ visits: number; visitsSince: number; lastStrike: string | null }>(sql`
    select f.visits::int as "visits", f.visits_since::int as "visitsSince", f.last_strike::text as "lastStrike"
    from ${trustFactsSql(sql`${userId}::uuid`, now)} f`)
  return rows[0] ?? { visits: 0, visitsSince: 0, lastStrike: null }
}

/** Where the account stands now, as Account shows it. */
export async function trustedStandingOf(db: Queryable, userId: string, now: number): Promise<TrustedStanding> {
  return trustedStanding(await trustFactsOf(db, userId, now), localOf(now).date)
}

/** Whether the account carries the mark now. */
export async function isTrustedUser(db: Queryable, userId: string, now: number): Promise<boolean> {
  return (await trustedStandingOf(db, userId, now)).state === 'trusted'
}
