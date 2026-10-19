/**
 * The client card's switch "Diňe jaň arkaly ýazylyp biler" and the no-show limit (book Q-127): reaching the business's
 * limit turns the switch on; the business can turn it off, and the count starts again from zero. The "Gelmedi"
 * complaint and the client card (P2 step 4) call these; booking online reads the switch only (`onlineRefusal`).
 */
import { reachesNoShowLimit } from '@yeral/domain/clients'
import type { BookingRules } from '@yeral/domain/rules'
import { and, eq, gt, sql, type SQL } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { bookings, clients } from '../../db/schema'

/** No-shows marked since the business last turned the switch off (all of them if it never did). */
export async function noShowsSinceReset(db: Queryable, client: { id: string; noShowsSince: Date | null }): Promise<number> {
  const where: SQL[] = [eq(bookings.clientId, client.id), eq(bookings.status, 'noshow')]
  if (client.noShowsSince) where.push(gt(bookings.complaintAt, client.noShowsSince))
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(bookings)
    .where(and(...where))
  return row?.n ?? 0
}

/** After a no-show is marked: reaching the limit turns the switch on. Returns whether it did just now. */
export async function afterNoShow(db: Queryable, clientId: string, rules: Pick<BookingRules, 'blockAfterNoShows'>): Promise<boolean> {
  const [client] = await db.select().from(clients).where(eq(clients.id, clientId))
  if (!client || client.onlineBlocked) return false
  if (!reachesNoShowLimit(await noShowsSinceReset(db, client), rules)) return false
  await db.update(clients).set({ onlineBlocked: true }).where(eq(clients.id, clientId))
  return true
}

/** The business sets the switch; turning it off starts the no-show count again from zero. */
export async function setOnlineBlocked(db: Queryable, clientId: string, blocked: boolean, at: Date): Promise<void> {
  await db
    .update(clients)
    .set(blocked ? { onlineBlocked: true } : { onlineBlocked: false, noShowsSince: at })
    .where(eq(clients.id, clientId))
}
