/**
 * After a phone's code checked out, the plain login and the link page's (book Q-270): sign in, or, for an account unused
 * for 6 months, ask "Is this you?" with its first name first. A number may have passed to someone else: "No" lets the old
 * account go and starts a fresh one, so the new person never sees the old history.
 */
import type { Locale } from '@yeral/domain/model'
import { splitName } from '@yeral/domain/names'
import { and, desc, eq, isNotNull, lt } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Queryable } from '../../db/client'
import { bookings, clients, identityChecks, staff, users } from '../../db/schema'
import type { AppEnv, User } from '../../http/env'
import { ApiError } from '../../http/errors'
import { randomToken, sha256Hex } from '../../lib/crypto'
import { releaseAccount } from '../me/account'
import { signIn, unusedSince } from './sign-in'

const CHECK_MINUTES = 10

/** What the account can be recognised by: its name, else the name on its latest booking, team row or client record. */
async function knownAs(db: Queryable, user: User): Promise<string | null> {
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

/** Whether the account holds anything of a person's: a booking, a team row or a business's client record. */
async function holdsAnything(db: Queryable, userId: string): Promise<boolean> {
  const [booked] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.userId, userId)).limit(1)
  if (booked) return true
  const [row] = await db.select({ id: staff.id }).from(staff).where(eq(staff.userId, userId)).limit(1)
  if (row) return true
  const [record] = await db.select({ id: clients.id }).from(clients).where(eq(clients.userId, userId)).limit(1)
  return !!record
}

export type AfterCode =
  { status: 200; body: Awaited<ReturnType<typeof signIn>> } | { status: 202; body: { isThisYou: { name: string | null; ticket: string } } }

/** "Is this you?" for the account, by its first name if it has one to show. */
async function ask(c: Context<AppEnv>, user: User, name: string | null): Promise<AfterCode> {
  const { db, now } = c.var.deps
  const ticket = randomToken(16)
  await db
    .insert(identityChecks)
    .values({ tokenHash: await sha256Hex(ticket), phone: user.phone, userId: user.id, expiresAt: new Date(now() + CHECK_MINUTES * 60_000) })
  return { status: 202, body: { isThisYou: { name: user.name ?? splitName(name).first, ticket } } }
}

export async function afterCode(c: Context<AppEnv>, phone: string, lang: Locale | undefined): Promise<AfterCode> {
  const { db, now } = c.var.deps
  const [user] = await db.select().from(users).where(eq(users.phone, phone))
  // with the code on the screen anyone may type the number: the account signs in as it is, never let go
  if (user && !c.var.deps.codeOnScreen && unusedSince(user.lastSeenAt, now())) {
    const name = await knownAs(db, user)
    if (name || (await holdsAnything(db, user.id))) return ask(c, user, name)
    // nothing of a person's in it, favourites at most: not worth a question, and not to be handed on. The number
    // starts afresh, once the account's row is locked and still found unused and empty (as an answer finds it)
    const still = await db.transaction(async (tx) => {
      const [row] = await tx.select().from(users).where(eq(users.id, user.id)).for('update')
      if (row?.phone === phone && !row.name && unusedSince(row.lastSeenAt, now()) && !(await holdsAnything(tx, row.id))) {
        await releaseAccount(tx, row, now(), 'passedOn')
        return null
      }
      return row
    })
    // it changed meanwhile: still unused, it's asked about after all; in use again, it signs in as any account does
    if (still?.phone === phone && unusedSince(still.lastSeenAt, now())) return ask(c, still, await knownAs(db, still))
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
    // a question asked before the code went on the screen: "No" can't let the account go now
    if (!yes && c.var.deps.codeOnScreen) throw new ApiError('code_expired')
    // the account moved to another number meanwhile: this one is free, and "No" just starts afresh
    if (!yes && old.phone === check.phone) {
      // in use again since the question: not this answer's to let go
      if (!unusedSince(old.lastSeenAt, now())) throw new ApiError('code_expired')
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
