/**
 * Reported reviews as the Ýeral team decides them (book ROUND6 F2, Q-261, Q-262): kept ("cleared": it counts and can't
 * be reported again) or removed (gone from the page, the team's list and the rating). Within 48 hours a reported review
 * doesn't count; after that it counts again while it waits. Only the business hears the result (its screens); the
 * author isn't told and still sees their review on their booking. Each decision is written down (`admin_actions`).
 */
import type { AdminReview } from '@yeral/contract/admin'
import { REVIEW_REPORT_HOURS } from '@yeral/domain/lifecycle'
import { and, asc, desc, eq, inArray, isNotNull, isNull, type SQL } from 'drizzle-orm'
import type { Queryable } from '../../db/client'
import { businesses, reviews, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import type { Admin } from '../../http/env'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { isCounted, shiftReviews } from '../reviews/rating'
import { replyOf } from '../reviews/view'
import { recordAction } from './accounts'
import { ADMIN_LIST_MAX } from './businesses'

export type AdminReviewView = 'reported' | 'cleared' | 'removed'

const VIEWS: Record<AdminReviewView, { where: SQL; order: SQL[] }> = {
  reported: {
    where: and(isNotNull(reviews.reportedAt), isNull(reviews.clearedAt), isNull(reviews.removedAt))!,
    order: [asc(reviews.reportedAt)],
  },
  cleared: { where: and(isNotNull(reviews.clearedAt), isNull(reviews.removedAt))!, order: [desc(reviews.clearedAt)] },
  removed: { where: isNotNull(reviews.removedAt), order: [desc(reviews.removedAt)] },
}

export async function adminReviews(db: Queryable, view: AdminReviewView): Promise<AdminReview[]> {
  const rows = await db
    .select({ r: reviews, business: { id: businesses.id, slug: businesses.slug, name: businesses.name } })
    .from(reviews)
    .innerJoin(businesses, eq(businesses.id, reviews.businessId))
    .where(VIEWS[view].where)
    .orderBy(...VIEWS[view].order, asc(reviews.id))
    .limit(ADMIN_LIST_MAX)
  const people = [...new Set(rows.flatMap(({ r }) => (r.reportedBy ? [r.reportedBy] : [])))]
  const names = people.length ? await db.select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, people)) : []
  return rows.map(({ r, business }) => ({
    id: r.id,
    business,
    author: r.authorName,
    rating: r.rating,
    tags: r.tags,
    text: r.text,
    what: r.what,
    createdAt: r.createdAt.getTime(),
    reply: replyOf(r)?.text ?? null,
    report:
      r.reportReason && r.reportedAt
        ? {
            reason: r.reportReason,
            text: r.reportText,
            at: r.reportedAt.getTime(),
            by: names.find((n) => n.id === r.reportedBy)?.name ?? null,
            countsAgainAt: r.reportedAt.getTime() + REVIEW_REPORT_HOURS * 3_600_000,
            counted: isCounted(r),
          }
        : null,
    clearedAt: r.clearedAt?.getTime() ?? null,
    removed: r.removedAt ? { at: r.removedAt.getTime(), reason: r.removedReason ?? '' } : null,
  }))
}

/** The review held (before its business's rating, the order every rating change takes); a removed one is past deciding. */
async function lockedReview(tx: Queryable, id: string) {
  const [r] = await tx.select().from(reviews).where(eq(reviews.id, id)).for('update')
  if (!r) throw new ApiError('not_found')
  if (r.removedAt) throw new ApiError('invalid_status')
  return r
}

/** Kept: it counts (again, if it was waiting within its 48 hours) and can't be reported again (Q-261). */
export async function clearReview(deps: Pick<Deps, 'db' | 'now'>, by: Admin, id: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const r = await lockedReview(tx, id)
    if (!r.reportedAt || r.clearedAt) throw new ApiError('invalid_status')
    const counted = isCounted(r)
    await tx
      .update(reviews)
      .set({ clearedAt: new Date(deps.now()), updatedAt: new Date(deps.now()) })
      .where(eq(reviews.id, r.id))
    if (counted) await emit(tx, { type: 'review.updated', businessId: r.businessId, bookingId: r.bookingId })
    else await shiftReviews(tx, [r], 1, 'review.updated')
    await recordAction(tx, by, 'review.cleared', { businessId: r.businessId, reviewId: r.id })
  })
}

/**
 * Removed, with the team's note: out of the rating if it counted. What it said is kept in the record of the decision,
 * should the business or its author ask.
 */
export async function removeReview(deps: Pick<Deps, 'db' | 'now'>, by: Admin, id: string, reason: string): Promise<void> {
  await deps.db.transaction(async (tx) => {
    const r = await lockedReview(tx, id)
    const counted = isCounted(r)
    await tx
      .update(reviews)
      .set({ removedAt: new Date(deps.now()), removedReason: reason, updatedAt: new Date(deps.now()) })
      .where(eq(reviews.id, r.id))
    if (counted) await shiftReviews(tx, [r], -1, 'review.updated')
    else await emit(tx, { type: 'review.updated', businessId: r.businessId, bookingId: r.bookingId })
    await recordAction(tx, by, 'review.removed', {
      businessId: r.businessId,
      reviewId: r.id,
      reason,
      details: { author: r.authorName, rating: r.rating, text: r.text, tags: r.tags },
    })
  })
}
