/**
 * Sign a phone in after its code checked out (ADR 0019): the account is made on the first login, the phone's client
 * records and bookings join it, and the session starts. The plain login and the SMS link page's login both use it.
 */
import type { Locale } from '@yeral/domain/model'
import { MARKET } from '@yeral/domain/market'
import { addDays, today } from '@yeral/domain/time'
import { and, eq, gte, isNull, or, sql } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Queryable } from '../../db/client'
import { bookings, clients, users } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { toMe } from '../me/me'
import { DAY, startSession } from './session'

/**
 * Book Q-270's 6 months: how far back a phone's bookings and client records join its account, and how long an account
 * goes unused before "Is this you?".
 */
export const SIX_MONTHS_DAYS = 183

/** No sign-in and no use of a session for 6 months (book Q-270). */
export const unusedSince = (lastSeenAt: Date, now: number) => lastSeenAt.getTime() < now - SIX_MONTHS_DAYS * DAY

/** A booking for the number that no account holds, upcoming or from the last 6 months (book Q-270). */
export const unheldBooking = (phone: string, now: number) =>
  and(
    eq(bookings.clientPhone, phone),
    isNull(bookings.userId),
    isNull(bookings.accountDeletedAt),
    gte(bookings.date, addDays(today(now), -SIX_MONTHS_DAYS)),
  )

/**
 * A business's client record that belongs to its number's present holder (book Q-270): made in the last 6 months, or
 * holding a booking from them that no deleted account left. An older one stays with whoever had the number before.
 */
export const recentRecord = (now: number) =>
  or(
    gte(clients.createdAt, new Date(now - SIX_MONTHS_DAYS * DAY)),
    // spelled out: in a subquery Drizzle would leave the outer table's columns unqualified
    sql`exists (select 1 from "bookings" where "bookings"."client_id" = "clients"."id"
      and "bookings"."date" >= ${addDays(today(now), -SIX_MONTHS_DAYS)} and "bookings"."account_deleted_at" is null)`,
  )

/**
 * The phone may already be known: a business's client list, phone bookings. Only what's upcoming or from the last 6
 * months joins the account (book Q-270), so a number that passed to someone else doesn't bring them the older history.
 * At a sign-in, and when an account takes a new number (Q-171).
 */
export async function linkPhone(tx: Queryable, userId: string, phone: string, now: number): Promise<void> {
  await tx.update(bookings).set({ userId }).where(unheldBooking(phone, now))
  await tx
    .update(clients)
    .set({ userId })
    .where(and(eq(clients.phone, phone), isNull(clients.userId), recentRecord(now)))
}

export async function signIn(c: Context<AppEnv>, phone: string, lang: Locale | undefined) {
  const now = c.var.deps.now()
  return c.var.deps.db.transaction(async (tx) => {
    let [user] = await tx.select().from(users).where(eq(users.phone, phone))
    const isNew = !user?.name
    if (!user) {
      ;[user] = await tx
        .insert(users)
        .values({ phone, lang: lang ?? MARKET.defaultLanguage })
        .onConflictDoNothing({ target: users.phone })
        .returning()
      // another sign-in with the phone made it meanwhile
      if (!user) [user] = await tx.select().from(users).where(eq(users.phone, phone))
    }
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
