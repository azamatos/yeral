/**
 * Phones linked to our Telegram bot's chats (ADR 0029): a linked phone gets its sign-in codes, and every other text the
 * SMS port carries, in the chat; an unlinked one gets the sign-in's `telegram_link` answer, whose link the person opens
 * in Telegram (`webhook.ts` makes the link from there). Until an SMS gateway comes.
 */
import type { Locale } from '@yeral/domain/model'
import { and, eq, gt, isNull, lt, ne, or, sql } from 'drizzle-orm'
import type { Db, Queryable } from '../../db/client'
import { telegramLinkRequests, telegramLinks, telegramUpdates } from '../../db/schema'
import type { Deps } from '../../deps'
import { randomToken, sha256Hex } from '../../lib/crypto'
import type { Logger } from '../../ports/log'
import { hideLinkTokens, type SmsMessage, type SmsPort } from '../../ports/sms'
import { blockedBot, type TelegramPort } from '../../ports/telegram'

/** How long the sign-in's link works: enough to open Telegram and press two buttons, not enough to be passed around. */
export const LINK_TTL_SEC = 600
/** A seen update is remembered this long: Telegram gives up repeating one well before. */
const UPDATE_KEEP_SEC = 86_400

export type Purpose = typeof telegramLinkRequests.$inferSelect.purpose

export async function linkedChat(db: Queryable, phone: string): Promise<number | null> {
  const [row] = await db.select({ chatId: telegramLinks.chatId }).from(telegramLinks).where(eq(telegramLinks.phone, phone))
  return row?.chatId ?? null
}

/**
 * Sends a text to the phone's chat, logged as every SMS is (a sign-in code hidden); false when the phone isn't linked.
 * A person who blocked the bot (403) loses the link, so their next sign-in asks them to link again, and the text
 * counts as not sent.
 */
export async function sendToLinked(deps: Pick<Deps, 'db' | 'log'> & { telegram: TelegramPort }, message: SmsMessage): Promise<boolean> {
  const chatId = await linkedChat(deps.db, message.to)
  if (chatId === null) return false
  try {
    await deps.telegram.sendMessage(chatId, message.text)
  } catch (e) {
    if (!blockedBot(e)) throw e
    await deps.db.delete(telegramLinks).where(and(eq(telegramLinks.phone, message.to), eq(telegramLinks.chatId, chatId)))
    deps.log.info('telegram link dropped', { to: message.to, reason: 'blocked' })
    return false
  }
  deps.log.info('telegram', { to: message.to, text: message.secret ? '(sign-in code hidden)' : hideLinkTokens(message.text) })
  return true
}

/**
 * A sign-in from an unlinked phone: the link the person opens in Telegram (`https://t.me/<bot>?start=<nonce>`). Only
 * the nonce's hash is kept, with the phone and purpose it was asked for, so the code sent on linking is this one's.
 */
export async function startLink(
  deps: Pick<Deps, 'db' | 'now'> & { telegram: TelegramPort },
  req: { phone: string; purpose: Purpose; lang: Locale },
): Promise<string> {
  const nonce = randomToken(24)
  await deps.db.insert(telegramLinkRequests).values({
    tokenHash: await sha256Hex(nonce),
    phone: req.phone,
    purpose: req.purpose,
    lang: req.lang,
    expiresAt: new Date(deps.now() + LINK_TTL_SEC * 1000),
  })
  return `https://t.me/${deps.telegram.username}?start=${nonce}`
}

/** The link request behind a nonce, if it's still open: unused, unexpired, and not opened from another chat. */
export async function openRequest(db: Queryable, nonce: string, chatId: number, now: number) {
  const [row] = await db
    .select()
    .from(telegramLinkRequests)
    .where(
      and(
        eq(telegramLinkRequests.tokenHash, await sha256Hex(nonce)),
        isNull(telegramLinkRequests.usedAt),
        gt(telegramLinkRequests.expiresAt, new Date(now)),
        or(isNull(telegramLinkRequests.chatId), eq(telegramLinkRequests.chatId, chatId)),
      ),
    )
  return row ?? null
}

/** The newest open request this chat started, if any. */
export async function chatRequest(db: Queryable, chatId: number, now: number) {
  const [row] = await db
    .select()
    .from(telegramLinkRequests)
    .where(
      and(eq(telegramLinkRequests.chatId, chatId), isNull(telegramLinkRequests.usedAt), gt(telegramLinkRequests.expiresAt, new Date(now))),
    )
    .orderBy(sql`${telegramLinkRequests.createdAt} desc`)
    .limit(1)
  return row ?? null
}

/**
 * Links a phone to the chat that shared it as its own contact; the chat's other link, if any, goes (a Telegram account
 * has one number, and the old number may be someone else's by now).
 */
export async function link(tx: Queryable, req: { phone: string; chatId: number; telegramUserId: number }): Promise<void> {
  await tx.delete(telegramLinks).where(and(eq(telegramLinks.chatId, req.chatId), ne(telegramLinks.phone, req.phone)))
  await tx
    .insert(telegramLinks)
    .values(req)
    .onConflictDoUpdate({ target: telegramLinks.phone, set: { chatId: req.chatId, telegramUserId: req.telegramUserId } })
}

/** Whether this update is new; a repeat (Telegram sends one again until it's answered) is false. */
export async function firstSeen(db: Queryable, updateId: number): Promise<boolean> {
  const inserted = await db
    .insert(telegramUpdates)
    .values({ updateId })
    .onConflictDoNothing()
    .returning({ updateId: telegramUpdates.updateId })
  return inserted.length > 0
}

/** Link requests nobody finished and updates long answered are gone (the jobs, every minute). */
export async function pruneTelegram(db: Queryable, now: number): Promise<void> {
  await db.delete(telegramLinkRequests).where(lt(telegramLinkRequests.expiresAt, new Date(now)))
  await db.delete(telegramUpdates).where(lt(telegramUpdates.seenAt, new Date(now - UPDATE_KEEP_SEC * 1000)))
}

/**
 * The SMS port while codes go through the bot: a linked phone gets the text in its chat; an unlinked one gets what it
 * gets today (the log). `delivers`: the linked phones are reached, so a number proves its person (`codeOnScreen` is
 * refused beside it, `deps.ts`).
 */
export function telegramSms(db: Db, telegram: TelegramPort, fallback: SmsPort, log: Logger): SmsPort {
  return {
    delivers: true,
    async send(message) {
      if (!(await sendToLinked({ db, telegram, log }, message))) await fallback.send(message)
    },
  }
}
