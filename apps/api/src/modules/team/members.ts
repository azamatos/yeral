/**
 * Who is on which team (ADR 0025): a team member is an active staff row linked to an account, with the app. Rows
 * without an account (a specialist without the app, someone invited) and removed rows give no access.
 */
import { and, eq, isNotNull, type SQL } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { staff } from '../../db/schema'

/** The condition for a row that gives its account access to the workspace. */
export const signsIn: SQL = and(eq(staff.status, 'active'), eq(staff.hasApp, true), isNotNull(staff.userId)) as SQL

/** The workspaces this account works in. */
export async function workspaceIdsOf(db: Queryable, userId: string): Promise<string[]> {
  const rows = await db
    .select({ businessId: staff.businessId })
    .from(staff)
    .where(and(eq(staff.userId, userId), signsIn))
  return rows.map((r) => r.businessId)
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
