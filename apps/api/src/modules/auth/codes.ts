/**
 * One-time login codes (client spec §4.4, §4.7; ADR 0019): 4 digits, 5 minutes, resend after 59 s, 3 wrong tries →
 * a 60-second lock and a new code. Outside production the code is always 1234 and SMS go to the log.
 */
import type { Locale } from '@yeral/domain/model'
import { isMobile } from '@yeral/domain/phone'
import { and, eq } from 'drizzle-orm'
import { loginCodes } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { randomDigits, sha256Hex } from '../../lib/crypto'
import { hit } from '../../lib/rate-limit'
import { codeSmsText } from '../../notify'

export const CODE_TTL_SEC = 300
export const RESEND_SEC = 59
export const MAX_ATTEMPTS = 3
export const LOCK_SEC = 60
export const DEMO_CODE = '1234'

type Purpose = 'login' | 'change_phone'

const hashOf = (purpose: Purpose, phone: string, code: string) => sha256Hex(`${purpose}:${phone}:${code}`)
const secondsLeft = (until: Date, now: number) => Math.max(1, Math.ceil((until.getTime() - now) / 1000))

export async function sendCode(
  deps: Deps,
  req: { phone: string; purpose: Purpose; ip: string; lang: Locale; userId?: string },
): Promise<{ resendAfterSec: number; expiresInSec: number }> {
  const { db } = deps
  const now = deps.now()
  if (!isMobile(req.phone)) throw new ApiError('validation_error', { issues: [{ path: ['phone'], code: 'not_mobile' }] })

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
  for (const [key, limit] of [
    [`code:phone:${req.phone}`, 5],
    [`code:ip:${req.ip}`, 20],
  ] as const) {
    const r = await hit(db, key, limit, 3600, now)
    if (!r.ok) throw new ApiError('rate_limited', { retryAfterSec: r.retryAfterSec })
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
  await deps.sms.send({ to: req.phone, text: codeSmsText(req.lang, code) })
  return { resendAfterSec: RESEND_SEC, expiresInSec: CODE_TTL_SEC }
}

/** Checks and spends a code; returns who asked for it (phone change). */
export async function checkCode(deps: Deps, req: { phone: string; purpose: Purpose; code: string }): Promise<{ userId: string | null }> {
  const { db } = deps
  const now = deps.now()
  const where = and(eq(loginCodes.phone, req.phone), eq(loginCodes.purpose, req.purpose))
  const [row] = await db.select().from(loginCodes).where(where)
  if (!row) throw new ApiError('code_expired')
  if (row.lockedUntil && row.lockedUntil.getTime() > now)
    throw new ApiError('too_many_attempts', { retryAfterSec: secondsLeft(row.lockedUntil, now) })
  if (row.expiresAt.getTime() <= now) throw new ApiError('code_expired')

  if ((await hashOf(req.purpose, req.phone, req.code)) !== row.codeHash) {
    const attempts = row.attempts + 1
    if (attempts >= MAX_ATTEMPTS) {
      // locked for a minute; the code is spent, so a new one is needed afterwards
      await db
        .update(loginCodes)
        .set({ attempts, lockedUntil: new Date(now + LOCK_SEC * 1000), expiresAt: new Date(now) })
        .where(where)
      throw new ApiError('too_many_attempts', { retryAfterSec: LOCK_SEC })
    }
    await db.update(loginCodes).set({ attempts }).where(where)
    throw new ApiError('code_invalid', { attemptsLeft: MAX_ATTEMPTS - attempts })
  }
  await db.delete(loginCodes).where(where)
  return { userId: row.userId }
}
