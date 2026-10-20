/**
 * The client card's switch "Diňe jaň arkaly ýazylyp biler" and the no-show limit (book Q-127). The block is worked out,
 * not stored: on by hand, or while the no-shows marked since the business last lifted it reach the limit. So removing a
 * mistaken no-show (Q-207) or setting the limit to 0 lifts a block that came from the count, and marking a no-show
 * needs no extra step. Each read and write is one statement on the client's current row. The client card (P2 step 4)
 * calls `setOnlineBlocked`.
 */
import { isOnlineBlocked } from '@yeral/domain/clients'
import type { BookingRules } from '@yeral/domain/rules'
import { and, eq, inArray, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { clients } from '../../db/schema'
import { noShowMarkedAt } from '../bookings/repo'

type Rules = Pick<BookingRules, 'blockAfterNoShows'>

/**
 * The client row's no-shows marked since its reset (all of them before any): a count usable in a select or an update.
 * The columns are spelt out with their tables: Drizzle leaves the main table's off, and inside this subquery a bare
 * "id" would be the booking's.
 */
const noShowsSince = sql<number>`(select count(*)::int from "bookings" where "bookings"."client_id" = "clients"."id"
  and "bookings"."status" = 'noshow'
  and ("clients"."no_shows_since" is null or ${noShowMarkedAt} > "clients"."no_shows_since"))`

/** Whether the count reaches the limit, in SQL. */
const reached = (rules: Rules) => (rules.blockAfterNoShows > 0 ? sql`${noShowsSince} >= ${rules.blockAfterNoShows}` : sql`false`)

export async function noShowsSinceReset(db: Queryable, clientId: string): Promise<number> {
  const [row] = await db.select({ n: noShowsSince }).from(clients).where(eq(clients.id, clientId))
  return row?.n ?? 0
}

/** Which of these records the no-show count blocks now. */
export async function blockedByCount(db: Queryable, clientIds: string[], rules: Rules): Promise<Set<string>> {
  if (!clientIds.length) return new Set()
  const rows = await db
    .select({ id: clients.id, blocked: sql<boolean>`${reached(rules)}` })
    .from(clients)
    .where(inArray(clients.id, clientIds))
  return new Set(rows.filter((r) => r.blocked).map((r) => r.id))
}

/** Whether this phone is phone-only at the business now (false when the business doesn't know it). */
export async function isPhoneBlocked(db: Queryable, businessId: string, phone: string, rules: Rules): Promise<boolean> {
  const [row] = await db
    .select({ byHand: clients.onlineBlocked, noShows: noShowsSince })
    .from(clients)
    .where(and(eq(clients.businessId, businessId), eq(clients.phone, phone)))
  return !!row && isOnlineBlocked({ onlineBlocked: row.byHand, noShowsSinceReset: row.noShows }, rules)
}

/**
 * The business sets the switch. On: by hand, unless the count already blocks (then it stays the count's, and lifts
 * with it). Off: clears the hand block, and starts the count from zero only when it had reached the limit, so a hand
 * block switched off keeps the no-shows below it.
 */
export async function setOnlineBlocked(db: Queryable, clientId: string, blocked: boolean, rules: Rules, at: Date): Promise<void> {
  const set = blocked
    ? { onlineBlocked: sql`${clients.onlineBlocked} or not (${reached(rules)})` }
    : {
        onlineBlocked: false,
        noShowsSince: sql`case when ${reached(rules)} then ${at.toISOString()}::timestamptz else ${clients.noShowsSince} end`,
      }
  await db.update(clients).set(set).where(eq(clients.id, clientId))
}
