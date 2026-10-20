/**
 * After a phone's code checked out, the plain login and the link page's (book Q-270): sign in, or, for an account unused
 * for 6 months, ask "Is this you?" with its first name first. A number may have passed to someone else: "No" lets the old
 * account go and starts a fresh one, so the new person never sees the old history.
 */
import type { Locale } from '@yeral/domain/model'
import { and, desc, eq, isNotNull, lt } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Queryable } from '../../db/client'
import { bookings, clients, identityChecks, staff, users } from '../../db/schema'
import type { AppEnv, User } from '../../http/env'
import { ApiError } from '../../http/errors'
import { randomToken, sha256Hex } from '../../lib/crypto'
import { releaseAccount } from '../me/account'
import { DAY } from './session'
import { SIX_MONTHS_DAYS, signIn } from './sign-in'

const CHECK_MINUTES = 10

/** No sign-in and no use of a session for 6 months (book Q-270). */
const unused = (user: User, now: number) => user.lastSeenAt.getTime() < now - SIX_MONTHS_DAYS * DAY

/** What the account can be recognised by: its name, else the name on its latest booking, team row or client record. */
async function nameOf(db: Queryable, user: User): Promise<string | null> {
  if (user.name) return user.name
  const [booked] = await db
    .select({ name: bookings.clientName })
    .from(bookings)
    .where(and(eq(bookings.userId, user.id), isNotNull(bookings.clientName)))
    .orderBy(desc(bookings.createdAt))
    .limit(1)
  if (booked?.name) return booked.name
  const [row] = await db.select({ name: staff.name }).from(staff).where(eq(staff.userId, user.id)).orderBy(desc(staff.createdAt)).limit(1)
  if (row) return row.name
  const [record] = await db
    .select({ name: clients.name })
    .from(clients)
    .where(and(eq(clients.userId, user.id), isNotNull(clients.name)))
    .orderBy(desc(clients.createdAt))
    .limit(1)
  return record?.name ?? null
}

export type AfterCode =
  { status: 200; body: Awaited<ReturnType<typeof signIn>> } | { status: 202; body: { isThisYou: { name: string; ticket: string } } }

export async function afterCode(c: Context<AppEnv>, phone: string, lang: Locale | undefined): Promise<AfterCode> {
  const { db, now } = c.var.deps
  const [user] = await db.select().from(users).where(eq(users.phone, phone))
  if (user && unused(user, now())) {
    const name = await nameOf(db, user)
    if (!name) {
      // nothing to ask by: no booking, team row or client record, at most some favourites. Not worth a question, and
      // not to be handed on: the number starts afresh
      await db.transaction((tx) => releaseAccount(tx, user, now(), 'passedOn'))
      return { status: 200, body: await signIn(c, phone, lang) }
    }
    const ticket = randomToken(16)
    await db
      .insert(identityChecks)
      .values({ tokenHash: await sha256Hex(ticket), phone, userId: user.id, expiresAt: new Date(now() + CHECK_MINUTES * 60_000) })
    return { status: 202, body: { isThisYou: { name: name.split(/\s+/)[0] || name, ticket } } }
  }
  return { status: 200, body: await signIn(c, phone, lang) }
}

/**
 * The answer to "Is this you?": yes signs in to the account; no lets it go and signs in a fresh one. One answer settles
 * the question, so the account's other open tickets go with it; answers for one account wait on its row, one at a
 * time. A workspace owner's account can't go (`owns_workspace`): the ticket stays, and the Ýeral team sorts the number
 * out.
 */
export async function answerIdentity(c: Context<AppEnv>, ticket: string, yes: boolean, lang: Locale | undefined) {
  const { db, now } = c.var.deps
  const tokenHash = await sha256Hex(ticket)
  const phone = await db.transaction(async (tx) => {
    const [asked] = await tx.select({ userId: identityChecks.userId }).from(identityChecks).where(eq(identityChecks.tokenHash, tokenHash))
    const [old] = asked ? await tx.select().from(users).where(eq(users.id, asked.userId)).for('update') : []
    const settled = old ? await tx.delete(identityChecks).where(eq(identityChecks.userId, old.id)).returning() : []
    const check = settled.find((x) => x.tokenHash === tokenHash && x.expiresAt.getTime() > now())
    // an old ticket, or one already answered: the code step starts again
    if (!old || !check) throw new ApiError('code_expired')
    // the account moved to another number meanwhile: this one is free, and "No" just starts afresh
    if (!yes && old.phone === check.phone) {
      // in use again since the question: not this answer's to let go
      if (!unused(old, now())) throw new ApiError('code_expired')
      await releaseAccount(tx, old, now(), 'passedOn')
    }
    return check.phone
  })
  return signIn(c, phone, lang)
}

/** Questions nobody answered in time are gone (the jobs, every minute). */
export async function pruneIdentityChecks(db: Queryable, now: number): Promise<void> {
  await db.delete(identityChecks).where(lt(identityChecks.expiresAt, new Date(now)))
}
