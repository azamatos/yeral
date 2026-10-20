/**
 * After a phone's code checked out, the plain login and the link page's (book Q-270): sign in, or, for an account unused
 * for 6 months, ask "Is this you?" with its first name first. A number may have passed to someone else: "No" lets the old
 * account go (as a deletion does) and starts a fresh one, so the new person never sees the old history.
 */
import type { Locale } from '@yeral/domain/model'
import { and, eq, gt, lt } from 'drizzle-orm'
import type { Context } from 'hono'
import type { Queryable } from '../../db/client'
import { identityChecks, users } from '../../db/schema'
import type { AppEnv } from '../../http/env'
import { ApiError } from '../../http/errors'
import { randomToken, sha256Hex } from '../../lib/crypto'
import { releaseAccount } from '../me/account'
import { signIn } from './sign-in'

/** An account unused this long asks "Is this you?" before signing in. */
export const STALE_DAYS = 183
const CHECK_MINUTES = 10
const DAY = 86_400_000

export type AfterCode =
  { status: 200; body: Awaited<ReturnType<typeof signIn>> } | { status: 202; body: { isThisYou: { name: string; ticket: string } } }

export async function afterCode(c: Context<AppEnv>, phone: string, lang: Locale | undefined): Promise<AfterCode> {
  const { db, now } = c.var.deps
  const [user] = await db.select().from(users).where(eq(users.phone, phone))
  // a nameless account has made no booking yet: nothing of it to show anyone
  if (user?.name && user.lastSeenAt.getTime() < now() - STALE_DAYS * DAY) {
    const ticket = randomToken(16)
    await db
      .insert(identityChecks)
      .values({ tokenHash: await sha256Hex(ticket), phone, userId: user.id, expiresAt: new Date(now() + CHECK_MINUTES * 60_000) })
    return { status: 202, body: { isThisYou: { name: user.name.split(/\s+/)[0] ?? user.name, ticket } } }
  }
  return { status: 200, body: await signIn(c, phone, lang) }
}

/**
 * The answer to "Is this you?": yes signs in to the account; no lets it go and signs in a fresh one. A workspace owner's
 * account can't go (`owns_workspace`): the ticket stays, and the Ýeral team sorts the number out.
 */
export async function answerIdentity(c: Context<AppEnv>, ticket: string, yes: boolean, lang: Locale | undefined) {
  const { db, now } = c.var.deps
  const tokenHash = await sha256Hex(ticket)
  const phone = await db.transaction(async (tx) => {
    const [check] = await tx
      .delete(identityChecks)
      .where(and(eq(identityChecks.tokenHash, tokenHash), gt(identityChecks.expiresAt, new Date(now()))))
      .returning()
    // an old ticket, or one already answered: the code step starts again
    if (!check) throw new ApiError('code_expired')
    if (!yes) {
      const [old] = await tx.select().from(users).where(eq(users.id, check.userId)).for('update')
      if (old?.phone === check.phone) await releaseAccount(tx, old, now(), { cancelAhead: false })
    }
    return check.phone
  })
  return signIn(c, phone, lang)
}

/** Questions nobody answered in time are gone (the jobs, every minute). */
export async function pruneIdentityChecks(db: Queryable, now: number): Promise<void> {
  await db.delete(identityChecks).where(lt(identityChecks.expiresAt, new Date(now)))
}
