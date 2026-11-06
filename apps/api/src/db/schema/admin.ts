/**
 * The Ýeral team's own accounts, sessions and the record of what they did (ADR 0026). Nothing links them to `users`:
 * a phone never opens the admin tool.
 */
import { sql } from 'drizzle-orm'
import { index, integer, jsonb, pgTable, text, uniqueIndex, uuid, type AnyPgColumn } from 'drizzle-orm/pg-core'
import { businesses } from './business'
import { adminRole, adminStatus } from './enums'
import { createdAt, ts } from './types'

export const admins = pgTable(
  'admins',
  {
    id: uuid().primaryKey().defaultRandom(),
    /** What they sign in with: lowercase letters, digits, dots and dashes. */
    login: text().notNull().unique(),
    name: text().notNull(),
    /** The first account ever is the superadmin, the one who changes the team; every other one an admin (Q-011). */
    role: adminRole().notNull().default('admin'),
    /** `invited` until the setup link is used and its first code confirms the app; `disabled` signs in no more. */
    status: adminStatus().notNull().default('invited'),
    /** PBKDF2 (`lib/password.ts`); set at the setup, null after a reset. */
    passwordHash: text(),
    /** The authenticator app's secret, sealed under `ADMIN_SECRET_KEY` (`lib/sealed.ts`). */
    totpSecret: text(),
    /** The 30-second step of the last code used: a code works once. */
    totpLastStep: integer(),
    /** Each recovery code not used yet, as HMAC-SHA256 of the account and the code under a derived key (`lib/sealed.ts`). */
    recoveryCodes: jsonb().$type<string[]>().notNull().default([]),
    /** The setup link waiting: SHA-256 of its token, and when it runs out (24 hours). */
    setupTokenHash: text().unique(),
    setupExpiresAt: ts(),
    /** Who invited them; null for the server command. */
    invitedBy: uuid().references((): AnyPgColumn => admins.id, { onDelete: 'set null' }),
    lastSignInAt: ts(),
    createdAt: createdAt(),
  },
  // exactly one superadmin, whatever two commands or requests do at once
  (t) => [
    uniqueIndex('admins_one_superadmin')
      .on(t.role)
      .where(sql`${t.role} = 'superadmin'`),
  ],
)

/**
 * A sign-in's first step passed (the login and the password): the second step's code is for this challenge, within
 * minutes, once (ADR 0026, amended 2026-11-06). Only the token's SHA-256 is kept; a wrong code counts, and at the limit
 * the challenge is spent.
 */
export const adminChallenges = pgTable(
  'admin_challenges',
  {
    tokenHash: text().primaryKey(),
    adminId: uuid()
      .notNull()
      .references(() => admins.id, { onDelete: 'cascade' }),
    expiresAt: ts().notNull(),
    attempts: integer().notNull().default(0),
    createdAt: createdAt(),
  },
  (t) => [index('admin_challenges_admin_idx').on(t.adminId)],
)

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
