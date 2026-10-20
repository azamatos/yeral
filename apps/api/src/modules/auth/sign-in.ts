/**
 * Sign a phone in after its code checked out (ADR 0019): the account is made on the first login, the phone's client
 * records and bookings join it, and the session starts. The plain login and the SMS link page's login both use it.
 */
import type { Locale } from '@yeral/domain/model'
import { MARKET } from '@yeral/domain/market'
import { and, eq, isNull } from 'drizzle-orm'
import type { Context } from 'hono'
import { bookings, clients, users } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { toMe } from '../me/me'
import { startSession } from './session'

export async function signIn(c: Context<AppEnv>, phone: string, lang: Locale | undefined) {
  return c.var.deps.db.transaction(async (tx) => {
    let [user] = await tx.select().from(users).where(eq(users.phone, phone))
    const isNew = !user?.name
    if (!user)
      [user] = await tx
        .insert(users)
        .values({ phone, lang: lang ?? MARKET.defaultLanguage })
        .returning()
    if (!user) throw new Error('user insert failed')
    // the same phone may already be known: a business's client list, phone bookings. Team invites wait for the
    // person to accept or decline them (`/me/invites`, book chapter 3).
    await tx
      .update(clients)
      .set({ userId: user.id })
      .where(and(eq(clients.phone, phone), isNull(clients.userId)))
    await tx
      .update(bookings)
      .set({ userId: user.id })
      .where(and(eq(bookings.clientPhone, phone), isNull(bookings.userId)))
    await startSession(c, tx, user.id)
    return { me: await toMe(tx, user), isNew }
  })
}
