/** People, login codes and sessions (ADR 0019). */
import { boolean, index, integer, pgTable, primaryKey, text, uuid } from 'drizzle-orm/pg-core'
import { codePurpose, locale } from './enums'
import { createdAt, ts } from './types'

export const users = pgTable('users', {
  id: uuid().primaryKey().defaultRandom(),
  /** E.164 `+99365901122`. */
  phone: text().notNull().unique(),
  /** Asked on the first booking. */
  name: text(),
  /** Chosen by the person; until then the language they signed in with, else the market's main one (no database default: the market is configuration). */
  lang: locale().notNull(),
  notifyConfirmation: boolean().notNull().default(true),
  notifyReminderDay: boolean().notNull().default(true),
  notifyReminder2h: boolean().notNull().default(true),
  /** Unused since review asks went (book Q-259); kept so the previous api image still runs, dropped in a later release. */
  notifyReviewAsk: boolean().notNull().default(true),
  /** The last sign-in or session renewal: an account unused for 6 months asks "Is this you?" first (book Q-270). */
  lastSeenAt: ts().notNull().defaultNow(),
  createdAt: createdAt(),
})

export const sessions = pgTable(
  'sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** SHA-256 of the cookie token; the token itself is never stored. */
    tokenHash: text().notNull().unique(),
    expiresAt: ts().notNull(),
    lastSeenAt: ts().notNull().defaultNow(),
    userAgent: text(),
    createdAt: createdAt(),
  },
  (t) => [index('sessions_user_idx').on(t.userId)],
)

/**
 * "Is this you?" (book Q-270): a phone whose code checked out, signing in to an account unused for 6 months, answers
 * first. The ticket stands for the checked code for a few minutes; only its hash is stored.
 */
export const identityChecks = pgTable('identity_checks', {
  tokenHash: text().primaryKey(),
  phone: text().notNull(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: ts().notNull(),
  createdAt: createdAt(),
})

export const loginCodes = pgTable(
  'login_codes',
  {
    phone: text().notNull(),
    purpose: codePurpose().notNull(),
    /** For `change_phone`: who is changing their number. */
    userId: uuid().references(() => users.id, { onDelete: 'cascade' }),
    codeHash: text().notNull(),
    expiresAt: ts().notNull(),
    attempts: integer().notNull().default(0),
    lockedUntil: ts(),
    sentAt: ts().notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.phone, t.purpose] })],
)

/** Fixed-window counters: code requests per phone and per IP. */
export const rateLimits = pgTable('rate_limits', {
  key: text().primaryKey(),
  windowStart: ts().notNull(),
  count: integer().notNull().default(0),
})
