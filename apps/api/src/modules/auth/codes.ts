/**
 * One-time login codes (client spec §4.4, §4.7; ADR 0019): 4 digits, 5 minutes, resend after 59 s, 3 wrong tries →
 * a 60-second lock and a new code. Outside production the code is always 1234 and SMS go to the log. At the first
 * launch (`codeOnScreen`, book Q-036, F-200) the sign-in's answer carries the code to show, under the same limits.
 * With our Telegram bot (ADR 0029) the code goes to the phone's chat, or the answer carries the link that makes one.
 */
import type { CodeDelivery } from '@yeral/contract/account'
import type { Locale } from '@yeral/domain/model'
import { isMobile } from '@yeral/domain/phone'
import { and, eq, gt, isNull, lt, lte, or, sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { loginCodes } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError, invalid } from '../../http/errors'
import { randomDigits, sha256Hex } from '../../lib/crypto'
import { hit, rateLimited } from '../../lib/rate-limit'
import { codeSmsText } from '../../notify'
import { TelegramError } from '../../ports/telegram'
import { sendToLinked, startLink } from '../telegram/links'

/**
 * Whether the plain sign-in shows its code on the screen: the first launch's switch is on and no SMS reaches a phone
 * (book Q-036, F-200). `/auth/code` puts the code in its answer by it, and `/auth/mode` tells the screens ahead, so the
 * on-screen lead and the code never disagree.
 */
export const showsCodeOnScreen = (deps: Pick<Deps, 'codeOnScreen' | 'sms'>): boolean => deps.codeOnScreen && !deps.sms.delivers

/** How the sign-in's code reaches the person, as `/auth/mode` tells the screens ahead (never `telegram_link`: that's per number). */
export const codeDelivery = (deps: Pick<Deps, 'codeOnScreen' | 'sms' | 'telegram'>): Exclude<CodeDelivery, 'telegram_link'> =>
  showsCodeOnScreen(deps) ? 'screen' : deps.telegram ? 'telegram' : 'sms'

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
const newCode = (deps: Pick<Deps, 'site'>) => (deps.site.demo ? DEMO_CODE : randomDigits(4))

/**
 * The sign-in's answer: the timers, and how the code reaches the person (ADR 0029). `link`: the bot's chat where the
 * code arrived («Open Telegram»), or the link that makes one.
 */
export type SentCode = { resendAfterSec: number; expiresInSec: number } & (
  | { delivery: 'screen'; code: string }
  | { delivery: 'sms' }
  | { delivery: 'telegram'; link: string }
  | { delivery: 'telegram_link'; link: string }
)

export async function sendCode(
  deps: Deps,
  req: {
    phone: string
    purpose: Purpose
    ip: string
    lang: Locale
    userId?: string
    /**
     * The plain sign-in, whose screen shows the code while `codeOnScreen` is on. Never a booking link's (it would sign
     * a link's holder in without the number, which the link page hides) nor a phone change's.
     */
    onScreen?: boolean
    /**
     * The number's Telegram is lost (a new account, a recycled number): the answer is the link to a chat even though
     * one is stored, and sharing the contact there proves the number as the first time (ADR 0029). The same limits.
     */
    relink?: boolean
  },
): Promise<SentCode> {
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

  const code = newCode(deps)
  const row = {
    codeHash: await hashOf(req.purpose, req.phone, code),
    expiresAt: new Date(now + CODE_TTL_SEC * 1000),
    attempts: 0,
    lockedUntil: null,
    sentAt: new Date(now),
    userId: req.userId ?? null,
  }
  // only while the last code may be replaced: of two sent at once one wins and the other is refused, so the code
  // sent (or shown) is the one that signs in
  const [saved] = await db
    .insert(loginCodes)
    .values({ phone: req.phone, purpose: req.purpose, ...row })
    .onConflictDoUpdate({
      target: [loginCodes.phone, loginCodes.purpose],
      set: row,
      setWhere: and(
        lte(loginCodes.sentAt, new Date(now - RESEND_SEC * 1000)),
        or(isNull(loginCodes.lockedUntil), lte(loginCodes.lockedUntil, new Date(now))),
      ),
    })
    .returning({ phone: loginCodes.phone })
  if (!saved) throw new ApiError('resend_too_soon', { retryAfterSec: RESEND_SEC })
  const timers = { resendAfterSec: RESEND_SEC, expiresInSec: CODE_TTL_SEC }
  const text = codeSmsText(req.lang, code)
  if (deps.telegram) {
    const bot = { ...deps, telegram: deps.telegram.bot }
    if (!req.relink) {
      let sent: boolean
      try {
        sent = await sendToLinked(bot, { to: req.phone, text, secret: true })
      } catch (e) {
        if (!(e instanceof TelegramError)) throw e
        // Telegram is out (not a blocked bot): the code is taken back so «Try again» isn't told to wait; the error
        // names the method and Telegram's words, never the token (`ports/telegram.ts`)
        await db
          .delete(loginCodes)
          .where(and(eq(loginCodes.phone, req.phone), eq(loginCodes.purpose, req.purpose), eq(loginCodes.codeHash, row.codeHash)))
        deps.log.warn('telegram unavailable', { method: e.method, status: e.status, description: e.description })
        throw new ApiError('telegram_unavailable')
      }
      if (sent) return { ...timers, delivery: 'telegram', link: `https://t.me/${deps.telegram.bot.username}` }
    }
    // not linked (or linking again): the code waits; once the person links, a fresh one goes to the chat
    // (`modules/telegram/webhook.ts`)
    return { ...timers, delivery: 'telegram_link', link: await startLink(bot, { phone: req.phone, purpose: req.purpose, lang: req.lang }) }
  }
  // written to the log as every SMS is, the code hidden
  await deps.sms.send({ to: req.phone, text, secret: true })
  return req.onScreen && showsCodeOnScreen(deps) ? { ...timers, delivery: 'screen', code } : { ...timers, delivery: 'sms' }
}

/**
 * The code waiting for a phone that just linked its Telegram (ADR 0029), issued afresh so it can be sent: only hashes
 * are kept. The same limits go on; a locked or spent code stays as it is (null: nothing to send).
 */
export async function reissueWaitingCode(
  deps: Pick<Deps, 'site' | 'now'> & { db: Queryable },
  req: { phone: string; purpose: Purpose },
): Promise<string | null> {
  const now = deps.now()
  const code = newCode(deps)
  const [row] = await deps.db
    .update(loginCodes)
    .set({ codeHash: await hashOf(req.purpose, req.phone, code), expiresAt: new Date(now + CODE_TTL_SEC * 1000), attempts: 0 })
    .where(
      and(
        eq(loginCodes.phone, req.phone),
        eq(loginCodes.purpose, req.purpose),
        gt(loginCodes.expiresAt, new Date(now)),
        or(isNull(loginCodes.lockedUntil), lte(loginCodes.lockedUntil, new Date(now))),
      ),
    )
    .returning({ phone: loginCodes.phone })
  return row ? code : null
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
