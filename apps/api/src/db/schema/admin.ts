/**
 * The Ýeral team's own accounts, sessions and the record of what they did (ADR 0026). Nothing links them to `users`:
 * a phone never opens the admin tool.
 */
import { index, integer, jsonb, pgTable, text, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { businesses } from './business'
import { adminStatus } from './enums'
import { createdAt, ts } from './types'

export const admins = pgTable('admins', {
  id: uuid().primaryKey().defaultRandom(),
  /** What they sign in with: lowercase letters, digits, dots and dashes. */
  login: text().notNull().unique(),
  name: text().notNull(),
  /** `invited` until the setup link is used and its first code confirms the app; `disabled` signs in no more. */
  status: adminStatus().notNull().default('invited'),
  /** PBKDF2 (`lib/password.ts`); set at the setup, null after a reset. */
  passwordHash: text(),
  /** The authenticator app's secret, sealed under `ADMIN_SECRET_KEY` (`lib/sealed.ts`). */
  totpSecret: text(),
  /** The 30-second step of the last code used: a code works once. */
  totpLastStep: integer(),
  /** SHA-256 of each recovery code not used yet. */
  recoveryCodes: jsonb().$type<string[]>().notNull().default([]),
  /** The setup link waiting: SHA-256 of its token, and when it runs out (24 hours). */
  setupTokenHash: text().unique(),
  setupExpiresAt: ts(),
  /** Who invited them; null for the server command. */
  invitedBy: uuid().references((): AnyPgColumn => admins.id, { onDelete: 'set null' }),
  lastSignInAt: ts(),
  createdAt: createdAt(),
})

export const adminSessions = pgTable(
  'admin_sessions',
  {
    id: uuid().primaryKey().defaultRandom(),
    adminId: uuid()
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    /** SHA-256 of the cookie token. */
    tokenHash: text().notNull().unique(),
    expiresAt: ts().notNull(),
    userAgent: text(),
    createdAt: createdAt(),
  },
  (t) => [index('admin_sessions_admin_idx').on(t.adminId)],
)

/** What the team did, by whom: verifications, hidden pages, removed reviews, accounts invited and reset. */
export const adminActions = pgTable(
  'admin_actions',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Null: the server command (`admin-invite`). */
    adminId: uuid().references(() => admins.id),
    action: text().notNull(),
    businessId: uuid().references(() => businesses.id, { onDelete: 'set null' }),
    /** A review's id stays after the review is removed. */
    reviewId: uuid(),
    /** The account an invite, reset or disabling was for. */
    targetAdminId: uuid().references((): AnyPgColumn => admins.id, { onDelete: 'set null' }),
    reason: text(),
    details: jsonb().$type<Record<string, unknown>>(),
    at: ts().notNull().defaultNow(),
  },
  (t) => [index('admin_actions_business_idx').on(t.businessId), index('admin_actions_at_idx').on(t.at)],
)
