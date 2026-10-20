/**
 * Who is on which team (ADR 0025): a team member is an active staff row linked to an account, with the app. Rows
 * without an account (a specialist without the app, someone invited) and removed rows give no access.
 */
import type { Actor } from '@yeral/domain/permissions'
import { and, eq, isNotNull, isNull, type SQL } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { businesses, staff } from '../../db/schema'

/** The condition for a row that gives its account access to the workspace. */
export const signsIn: SQL = and(eq(staff.status, 'active'), eq(staff.hasApp, true), isNotNull(staff.userId)) as SQL

/** Where this account works, and as whom: its rows on every team it signs in to. */
export async function teamsOf(db: Queryable, userId: string): Promise<{ businessId: string; actor: Actor }[]> {
  const rows = await db
    .select({ businessId: staff.businessId, staffId: staff.id, level: staff.level, canAnswerOwn: staff.canAnswerOwn })
    .from(staff)
    .where(and(eq(staff.userId, userId), signsIn))
  return rows.map(({ businessId, ...actor }) => ({ businessId, actor }))
}

/** The workspaces this account works in; `finished`: not one still being set up (book Q-200). */
export async function workspaceIdsOf(db: Queryable, userId: string, opts: { finished?: boolean } = {}): Promise<string[]> {
  if (!opts.finished) return (await teamsOf(db, userId)).map((t) => t.businessId)
  const rows = await db
    .select({ id: staff.businessId })
    .from(staff)
    .innerJoin(businesses, eq(businesses.id, staff.businessId))
    .where(and(eq(staff.userId, userId), signsIn, isNull(businesses.setupStep)))
  return rows.map((r) => r.id)
}

/** Does anyone sign in to this workspace (a business with a team answers its own requests, even in the demo)? */
export async function hasSignedInTeam(db: Queryable, businessId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: staff.id })
    .from(staff)
    .where(and(eq(staff.businessId, businessId), signsIn))
    .limit(1)
  return !!row
}
