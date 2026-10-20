/**
 * One-time login codes (client spec §4.4, §4.7; ADR 0019): 4 digits, 5 minutes, resend after 59 s, 3 wrong tries →
 * a 60-second lock and a new code. Outside production the code is always 1234 and SMS go to the log.
 */
import type { Locale } from '@yeral/domain/model'
import { isMobile } from '@yeral/domain/phone'
import { and, eq, gt, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { loginCodes } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import { randomDigits, sha256Hex } from '../../lib/crypto'
import { hit, rateLimited } from '../../lib/rate-limit'
import { codeSmsText } from '../../notify'

export const CODE_TTL_SEC = 300
export const RESEND_SEC = 59
export const MAX_ATTEMPTS = 3
export const LOCK_SEC = 60
export const DEMO_CODE = '1234'
/**
 * Codes one phone, and one internet address, may ask for in an hour (book Q-267). Mobile operators put many phones
 * behind one address, so the address gets far more.
 */
export const CODES_PER_PHONE = 5
export const CODES_PER_ADDRESS = 100

type Purpose = 'login' | 'change_phone'

const hashOf = (purpose: Purpose, phone: string, code: string) => sha256Hex(`${purpose}:${phone}:${code}`)
const secondsLeft = (until: Date, now: number) => Math.max(1, Math.ceil((until.getTime() - now) / 1000))

export async function sendCode(
  deps: Deps,
  req: { phone: string; purpose: Purpose; ip: string; lang: Locale; userId?: string },
): Promise<{ resendAfterSec: number; expiresInSec: number }> {
  const { db } = deps
  const now = deps.now()
  if (!isMobile(req.phone)) throw invalid({ path: ['phone'], code: 'not_mobile' })

  const [existing] = await db
    .select()
    .from(loginCodes)
    .where(and(eq(loginCodes.phone, req.phone), eq(loginCodes.purpose, req.purpose)))
  if (existing?.lockedUntil && existing.lockedUntil.getTime() > now) {
    throw new ApiError('too_many_attempts', { retryAfterSec: secondsLeft(existing.lockedUntil, now) })
  }
  if (existing && now - existing.sentAt.getTime() < RESEND_SEC * 1000) {
    throw new ApiError('resend_too_soon', { retryAfterSec: secondsLeft(new Date(existing.sentAt.getTime() + RESEND_SEC * 1000), now) })
  }
  // the address first: a request it refuses doesn't use up one of the phone's codes
  for (const [key, limit] of [
    [`code:ip:${req.ip}`, CODES_PER_ADDRESS],
    [`code:phone:${req.phone}`, CODES_PER_PHONE],
  ] as const) {
    const r = await hit(db, key, limit, 3600, now)
    if (!r.ok) throw rateLimited(r.retryAfterSec)
  }

  const code = deps.site.demo ? DEMO_CODE : randomDigits(4)
  const row = {
    codeHash: await hashOf(req.purpose, req.phone, code),
    expiresAt: new Date(now + CODE_TTL_SEC * 1000),
    attempts: 0,
    lockedUntil: null,
    sentAt: new Date(now),
    userId: req.userId ?? null,
  }
  await db
    .insert(loginCodes)
    .values({ phone: req.phone, purpose: req.purpose, ...row })
    .onConflictDoUpdate({ target: [loginCodes.phone, loginCodes.purpose], set: row })
  await deps.sms.send({ to: req.phone, text: codeSmsText(req.lang, code), secret: true })
  return { resendAfterSec: RESEND_SEC, expiresInSec: CODE_TTL_SEC }
}

/**
 * Checks and spends a code; returns who asked for it (phone change). Every try takes one of the three attempts in a
 * single update before the code is compared, so guesses sent at once can't share a read of the counter.
 */
export async function checkCode(deps: Deps, req: { phone: string; purpose: Purpose; code: string }): Promise<{ userId: string | null }> {
  const { db } = deps
  const now = deps.now()
  const where = and(eq(loginCodes.phone, req.phone), eq(loginCodes.purpose, req.purpose))
  const [row] = await db
    .update(loginCodes)
    .set({ attempts: sql`${loginCodes.attempts} + 1` })
    .where(
      and(
        where,
        lt(loginCodes.attempts, MAX_ATTEMPTS),
        gt(loginCodes.expiresAt, new Date(now)),
        or(isNull(loginCodes.lockedUntil), lte(loginCodes.lockedUntil, new Date(now))),
      ),
    )
    .returning()
  if (!row) {
    const [spent] = await db.select().from(loginCodes).where(where)
    if (spent?.lockedUntil && spent.lockedUntil.getTime() > now)
      throw new ApiError('too_many_attempts', { retryAfterSec: secondsLeft(spent.lockedUntil, now) })
    if (spent && spent.attempts >= MAX_ATTEMPTS && spent.expiresAt.getTime() > now)
      throw new ApiError('too_many_attempts', { retryAfterSec: LOCK_SEC })
    throw new ApiError('code_expired')
  }

  const codeHash = await hashOf(req.purpose, req.phone, req.code)
  if (codeHash !== row.codeHash) {
    if (row.attempts >= MAX_ATTEMPTS) {
      // locked for a minute; the code is spent, so a new one is needed afterwards
      await db
        .update(loginCodes)
        .set({ lockedUntil: new Date(now + LOCK_SEC * 1000), expiresAt: new Date(now) })
        .where(where)
      throw new ApiError('too_many_attempts', { retryAfterSec: LOCK_SEC })
    }
    throw new ApiError('code_invalid', { attemptsLeft: MAX_ATTEMPTS - row.attempts })
  }
  // only one request can delete the row, so a right code signs in once
  const [used] = await db
    .delete(loginCodes)
    .where(and(where, eq(loginCodes.codeHash, codeHash)))
    .returning({ userId: loginCodes.userId })
  if (!used) throw new ApiError('code_expired')
  return { userId: used.userId }
}
