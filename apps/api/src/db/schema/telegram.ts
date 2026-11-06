/** Phones linked to our Telegram bot's chats, the links being made, and the updates seen (ADR 0029). */
import { bigint, index, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core'
import { codePurpose, locale } from './enums'
import { createdAt, ts } from './types'

/**
 * A phone reached through the bot: the person shared their own contact in the chat, so Telegram vouched for the number.
 * One chat holds one phone (a Telegram account has one number): a new contact from it replaces the old link.
 */
export const telegramLinks = pgTable(
  'telegram_links',
  {
    /** E.164, as `users.phone`; no foreign key: a number links before its account exists. */
    phone: text().primaryKey(),
    chatId: bigint({ mode: 'number' }).notNull(),
    /** The Telegram account that shared the contact. */
    telegramUserId: bigint({ mode: 'number' }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('telegram_links_chat_idx').on(t.chatId)],
)

/**
 * A sign-in whose phone isn't linked yet: the answer carried `https://t.me/<bot>?start=<nonce>`; only the nonce's hash
 * is stored, bound to the phone that asked. `/start <nonce>` sets the chat; the chat's own contact with that phone
 * makes the link, spends the nonce (`usedAt`) and sends the waiting code afresh in `lang`.
 */
export const telegramLinkRequests = pgTable(
  'telegram_link_requests',
  {
    tokenHash: text().primaryKey(),
    phone: text().notNull(),
    purpose: codePurpose().notNull(),
    lang: locale().notNull(),
    /** The chat that opened the link; null until `/start`. */
    chatId: bigint({ mode: 'number' }),
    expiresAt: ts().notNull(),
    usedAt: ts(),
    createdAt: createdAt(),
  },
  (t) => [index('telegram_link_requests_chat_idx').on(t.chatId)],
)

/** Updates the webhook has seen: Telegram repeats one until it's answered, so a repeat does nothing twice. */
export const telegramUpdates = pgTable('telegram_updates', {
  updateId: bigint({ mode: 'number' }).primaryKey(),
  seenAt: createdAt(),
})
