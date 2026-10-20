/**
 * Sign a phone in after its code checked out (ADR 0019): the account is made on the first login, the phone's client
 * records and bookings join it, and the session starts. The plain login and the SMS link page's login both use it.
 */
import type { Locale } from '@yeral/domain/model'
import { MARKET } from '@yeral/domain/market'
import { addDays, today } from '@yeral/domain/time'
import { and, eq, gte, inArray, isNull, or } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Queryable } from '../../db/client'
import { bookings, clients, users } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { toMe } from '../me/me'
import { startSession } from './session'

/** How far back a phone's bookings and client records join its account (book Q-270). */
export const LINK_BACK_DAYS = 183

/**
 * The phone may already be known: a business's client list, phone bookings. Only what's upcoming or from the last 6
 * months joins the account (book Q-270), so a number that passed to someone else doesn't bring them the older history.
 * At a sign-in, and when an account takes a new number (Q-171).
 */
export async function linkPhone(tx: Queryable, userId: string, phone: string, now: number): Promise<void> {
  const linked = await tx
    .update(bookings)
    .set({ userId })
    .where(
      and(
        eq(bookings.clientPhone, phone),
        isNull(bookings.userId),
        isNull(bookings.accountDeletedAt),
        gte(bookings.date, addDays(today(now), -LINK_BACK_DAYS)),
      ),
    )
    .returning({ clientId: bookings.clientId })
  const recentClients = linked.flatMap((b) => (b.clientId ? [b.clientId] : []))
  await tx
    .update(clients)
    .set({ userId })
    .where(
      and(
        eq(clients.phone, phone),
        isNull(clients.userId),
        or(
          gte(clients.createdAt, new Date(now - LINK_BACK_DAYS * 86_400_000)),
          recentClients.length ? inArray(clients.id, recentClients) : undefined,
        ),
      ),
    )
}

export async function signIn(c: Context<AppEnv>, phone: string, lang: Locale | undefined) {
  const now = c.var.deps.now()
  return c.var.deps.db.transaction(async (tx) => {
    let [user] = await tx.select().from(users).where(eq(users.phone, phone))
    const isNew = !user?.name
    if (!user)
      [user] = await tx
        .insert(users)
        .values({ phone, lang: lang ?? MARKET.defaultLanguage })
        .returning()
    if (!user) throw new Error('user insert failed')
    await tx
      .update(users)
      .set({ lastSeenAt: new Date(now) })
      .where(eq(users.id, user.id))
    // Team invites wait for the person to accept or decline them (`/me/invites`, book chapter 3).
    await linkPhone(tx, user.id, phone, now)
    await startSession(c, tx, user.id)
    return { me: await toMe(tx, user), isNew }
  })
}
