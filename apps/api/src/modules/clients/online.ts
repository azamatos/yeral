/**
 * The client card's switch "Diňe jaň arkaly ýazylyp biler" and the no-show limit (book Q-127). The block is worked out,
 * not stored: on by hand, or while the no-shows since the business last turned it off reach the limit. So removing a
 * mistaken no-show (Q-207) or setting the limit to 0 lifts a block that came from the count, and marking a no-show
 * needs no extra step. The client card (P2 step 4) calls `setOnlineBlocked`.
 */
import { isOnlineBlocked } from '@yeral/domain/clients'
import type { BookingRules } from '@yeral/domain/rules'
import { and, eq, gt, sql, type SQL } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, clients } from '../../db/schema'

type ClientBlock = { id: string; onlineBlocked: boolean; noShowsSince: Date | null }

/** No-shows marked since the business last turned the switch off (all of them if it never did). */
export async function noShowsSinceReset(db: Queryable, client: Pick<ClientBlock, 'id' | 'noShowsSince'>): Promise<number> {
  const where: SQL[] = [eq(bookings.clientId, client.id), eq(bookings.status, 'noshow')]
  // when it was marked: the complaint, else the status change
  if (client.noShowsSince) where.push(gt(sql`coalesce(${bookings.complaintAt}, ${bookings.completedAt})`, client.noShowsSince))
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(...where))
  return row?.n ?? 0
}

/** Whether this client is phone-only at the business now; the count is skipped when it can't matter. */
export async function isClientBlocked(
  db: Queryable,
  client: ClientBlock,
  rules: Pick<BookingRules, 'blockAfterNoShows'>,
): Promise<boolean> {
  if (client.onlineBlocked) return true
  if (rules.blockAfterNoShows <= 0) return false
  return isOnlineBlocked({ onlineBlocked: false, noShows: await noShowsSinceReset(db, client) }, rules)
}

/**
 * The business sets the switch. Off lifts the block and starts the count again from zero, but only when the client was
 * blocked: saving "off" again keeps the no-shows that haven't reached the limit.
 */
export async function setOnlineBlocked(
  db: Queryable,
  client: ClientBlock,
  blocked: boolean,
  rules: Pick<BookingRules, 'blockAfterNoShows'>,
  at: Date,
): Promise<void> {
  if (blocked) {
    await db.update(clients).set({ onlineBlocked: true }).where(eq(clients.id, client.id))
    return
  }
  if (!(await isClientBlocked(db, client, rules))) return
  await db.update(clients).set({ onlineBlocked: false, noShowsSince: at }).where(eq(clients.id, client.id))
}
