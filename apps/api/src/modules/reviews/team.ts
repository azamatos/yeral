/**
 * "Teswirler" as the team keeps them (book B-53, B-54): the reviews with their summary, filters and sort; the reply,
 * written, changed and taken away; and reporting a review to Ýeral, which takes it out of the rating while Ýeral checks
 * it, 48 hours at most (Q-261). The owner and administrators reply and report ("reply to / report reviews"); a
 * specialist reads the reviews of their own visits, without the summary. A business can't delete a review.
 */
import type { reviewReplyInputSchema, reviewReportInputSchema, teamReviewsQuerySchema, teamReviewsSchema } from '@yeral/contract/reviews'
import { REVIEW_REPORT_HOURS } from '@yeral/domain/lifecycle'
import { canOn, scopeOf, type Actor } from '@yeral/domain/permissions'
import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, sql } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { bookingItems, businesses, reviews, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { visitWhat } from '../catalog/map'
import { isCounted, shiftRating } from './rating'

interface Business {
  id: string
}
type Query = z.infer<typeof teamReviewsQuerySchema>
type TeamReviews = z.infer<typeof teamReviewsSchema>

/** The review's visit had an item with this person. */
const ofStaff = (staffId: string) =>
  sql`exists (select 1 from ${bookingItems} where ${bookingItems.bookingId} = ${reviews.bookingId} and ${bookingItems.staffId} = ${staffId})`

const ORDERS = {
  newest: [desc(reviews.createdAt), asc(reviews.id)],
  oldest: [asc(reviews.createdAt), asc(reviews.id)],
  lowest: [asc(reviews.rating), desc(reviews.createdAt), asc(reviews.id)],
  highest: [desc(reviews.rating), desc(reviews.createdAt), asc(reviews.id)],
}

/** The report as the team sees it: checking (not counted), counted again after 48 hours, or kept by Ýeral. */
const stateOf = (r: typeof reviews.$inferSelect) => (r.clearedAt ? 'cleared' : r.recountedAt ? 'counted' : 'checking')

export async function teamReviews(db: Queryable, business: Business, actor: Actor, q: Query): Promise<TeamReviews> {
  // a specialist reads those of their own visits (`calendar: own`), and asks for nobody else's
  if (q.staff && !canOn(actor, 'calendar', [q.staff])) throw new ApiError('forbidden')
  const own = scopeOf(actor, 'calendar') === 'own' ? actor.staffId : null
  const where = and(
    eq(reviews.businessId, business.id),
    own ? ofStaff(own) : undefined,
    q.staff ? ofStaff(q.staff) : undefined,
    q.unanswered ? isNull(reviews.replyText) : undefined,
    q.stars ? eq(reviews.rating, q.stars) : undefined,
  )
  const offset = Number(q.cursor ?? 0) || 0
  const [found, summary] = await all(db, [
    () =>
      db
        .select({ r: reviews, total: sql<number>`(count(*) over ())::int` })
        .from(reviews)
        .where(where)
        .orderBy(...ORDERS[q.sort])
        .limit(q.limit)
        .offset(offset),
    async () => (own ? null : summaryOf(db, business.id)),
  ])
  const rows = found.map((f) => f.r)
  const total = found[0]?.total ?? 0
  const people = [...new Set(rows.flatMap((r) => [r.replyBy, r.reportedBy].filter((id): id is string => !!id)))]
  const [items, names] = await all(db, [
    async () =>
      rows.length
        ? db
            .select()
            .from(bookingItems)
            .where(
              inArray(
                bookingItems.bookingId,
                rows.map((r) => r.bookingId),
              ),
            )
            .orderBy(asc(bookingItems.sort))
        : [],
    async () => (people.length ? db.select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, people)) : []),
  ])
  const nameOf = (id: string | null) => names.find((n) => n.id === id)?.name ?? null
  return {
    items: rows.map((r) => ({
      id: r.id,
      author: r.authorName,
      rating: r.rating,
      tags: r.tags,
      text: r.text,
      createdAt: r.createdAt.getTime(),
      what:
        visitWhat(
          items.filter((i) => i.bookingId === r.bookingId),
          q.lang,
        ) || r.what,
      reply: r.replyText && r.replyAt ? { text: r.replyText, at: r.replyAt.getTime(), by: nameOf(r.replyBy) } : null,
      report:
        r.reportReason && r.reportedAt
          ? { reason: r.reportReason, text: r.reportText, at: r.reportedAt.getTime(), by: nameOf(r.reportedBy), state: stateOf(r) }
          : null,
    })),
    total,
    cursor: offset + q.limit < total ? String(offset + q.limit) : null,
    summary,
  }
}

/** The rating as clients see it, and how many reviews wait for a reply ("Jogapsyz · 4"). */
async function summaryOf(db: Queryable, businessId: string): Promise<NonNullable<TeamReviews['summary']>> {
  const [[b], [open]] = await all(db, [
    () =>
      db
        .select({ rating: businesses.rating, count: businesses.reviewsCount, breakdown: businesses.ratingBreakdown })
        .from(businesses)
        .where(eq(businesses.id, businessId)),
    () =>
      db
        .select({ n: sql<number>`count(*)::int` })
        .from(reviews)
        .where(and(eq(reviews.businessId, businessId), isNull(reviews.replyText))),
  ])
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...(b?.breakdown ?? {}) }
  return { rating: b?.rating ?? null, count: b?.count ?? 0, breakdown, unanswered: open?.n ?? 0 }
}

/** "reply to / report reviews": the owner and administrators. */
function assertReplies(actor: Actor): void {
  if (scopeOf(actor, 'reviewsReply') !== 'all') throw new ApiError('forbidden')
}

/** The business's review, held for the change; 404 for another business's. */
async function lockedReview(db: Queryable, businessId: string, id: string) {
  const [r] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.id, id), eq(reviews.businessId, businessId)))
    .for('update')
  if (!r) throw new ApiError('not_found')
  return r
}

const reviewChanged = (db: Queryable, businessId: string) => emit(db, { type: 'review.updated', businessId })

/** "Jogaby çap et" or its edit (B-53): everyone sees it, signed with the business and who wrote it. */
export async function replyToReview(
  deps: Deps,
  business: Business,
  actor: Actor,
  id: string,
  input: z.infer<typeof reviewReplyInputSchema>,
): Promise<void> {
  assertReplies(actor)
  const at = new Date(deps.now())
  await deps.db.transaction(async (tx) => {
    const r = await lockedReview(tx, business.id, id)
    await tx.update(reviews).set({ replyText: input.text, replyAt: at, replyBy: actor.staffId, updatedAt: at }).where(eq(reviews.id, r.id))
    await reviewChanged(tx, business.id)
  })
}

/** "Poz": the reply goes ("Jogap pozuldy"; its undo writes it again). */
export async function deleteReply(deps: Deps, business: Business, actor: Actor, id: string): Promise<void> {
  assertReplies(actor)
  const at = new Date(deps.now())
  await deps.db.transaction(async (tx) => {
    const r = await lockedReview(tx, business.id, id)
    if (!r.replyText) return
    await tx.update(reviews).set({ replyText: null, replyAt: null, replyBy: null, updatedAt: at }).where(eq(reviews.id, r.id))
    await reviewChanged(tx, business.id)
  })
}

/**
 * "Arz et" (B-54): once per review, never again once Ýeral kept it. It stays visible on both sides but leaves the
 * rating while Ýeral checks it, 48 hours at most; the business can still reply to it.
 */
export async function reportReview(
  deps: Deps,
  business: Business,
  actor: Actor,
  id: string,
  input: z.infer<typeof reviewReportInputSchema>,
): Promise<void> {
  assertReplies(actor)
  const at = new Date(deps.now())
  await deps.db.transaction(async (tx) => {
    const r = await lockedReview(tx, business.id, id)
    if (r.reportedAt) throw new ApiError('already_reported')
    await tx
      .update(reviews)
      .set({ reportReason: input.reason, reportText: input.text ?? null, reportedAt: at, reportedBy: actor.staffId, updatedAt: at })
      .where(eq(reviews.id, r.id))
    if (isCounted(r)) await shiftRating(tx, business.id, { [r.rating]: -1 })
    await reviewChanged(tx, business.id)
  })
}

/**
 * The 48-hour recount (Q-261, the jobs every minute): reports Ýeral hasn't decided in time count again. Each review
 * is marked in the same statement that finds it, so a recount and an edit of the review count once each.
 */
export async function recountReviews(deps: Deps): Promise<number> {
  const now = deps.now()
  return deps.db.transaction(async (tx) => {
    const due = await tx
      .update(reviews)
      .set({ recountedAt: new Date(now) })
      .where(
        and(
          isNotNull(reviews.reportedAt),
          isNull(reviews.recountedAt),
          isNull(reviews.clearedAt),
          lte(reviews.reportedAt, new Date(now - REVIEW_REPORT_HOURS * 3_600_000)),
        ),
      )
      .returning({ businessId: reviews.businessId, rating: reviews.rating })
    for (const businessId of [...new Set(due.map((r) => r.businessId))].sort()) {
      const shift: Record<number, number> = {}
      for (const r of due) if (r.businessId === businessId) shift[r.rating] = (shift[r.rating] ?? 0) + 1
      await shiftRating(tx, businessId, shift)
      await reviewChanged(tx, businessId)
    }
    return due.length
  })
}
