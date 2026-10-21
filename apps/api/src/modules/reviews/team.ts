/**
 * "Teswirler" as the team keeps them (book B-53, B-54): the reviews with their summary, filters and sort; the reply,
 * written, changed and taken away (its undo brings it back as it was); and reporting a review to Ýeral, which takes it
 * out of the rating while Ýeral checks it, 48 hours at most (Q-261). The owner and administrators reply and report
 * ("reply to / report reviews"); a specialist reads the reviews of their own visits, without the summary. A business
 * can't delete a review. Each change tells the screens of everyone who may read the review, its specialist included.
 */
import type { reviewReplyInputSchema, reviewReportInputSchema, teamReviewsQuerySchema, teamReviewsSchema } from '@yeral/contract/reviews'
import { REVIEW_REPORT_HOURS } from '@yeral/domain/lifecycle'
import { canOn, scopeOf, type Actor } from '@yeral/domain/permissions'
import { and, asc, desc, eq, inArray, isNotNull, isNull, lte, or, sql, type SQL } from 'drizzle-orm'
import type { z } from 'zod'
import { all, type Queryable } from '../../db/client'
import { businesses, reviews, staff } from '../../db/schema'
import type { Deps } from '../../deps'
import { ApiError } from '../../http/errors'
import { emit } from '../../notify'
import { withStaff } from '../clients/facts'
import { notRemoved, shiftRating, shiftReviews } from './rating'
import { replyOf, visitsOf } from './view'

interface Business {
  id: string
}
type Query = z.infer<typeof teamReviewsQuerySchema>
type TeamReviews = z.infer<typeof teamReviewsSchema>
type ReviewRow = typeof reviews.$inferSelect

const ORDERS = {
  newest: [desc(reviews.createdAt), asc(reviews.id)],
  oldest: [asc(reviews.createdAt), asc(reviews.id)],
  lowest: [asc(reviews.rating), desc(reviews.createdAt), asc(reviews.id)],
  highest: [desc(reviews.rating), desc(reviews.createdAt), asc(reviews.id)],
}

/** No reply to read: never written, or taken away. */
const unanswered = or(isNull(reviews.replyText), isNotNull(reviews.replyDeletedAt))

/** The report as the team sees it: checking (not counted), counted again after 48 hours, or kept by Ýeral. */
const stateOf = (r: ReviewRow) => (r.clearedAt ? 'cleared' : r.recountedAt ? 'counted' : 'checking')

export async function teamReviews(db: Queryable, business: Business, actor: Actor, q: Query): Promise<TeamReviews> {
  // a specialist reads those of their own visits (`calendar: own`), and asks for nobody else's
  if (q.staff && !canOn(actor, 'calendar', [q.staff])) throw new ApiError('forbidden')
  const own = scopeOf(actor, 'calendar') === 'own' ? actor.staffId : null
  const where = and(
    eq(reviews.businessId, business.id),
    notRemoved(),
    own ? withStaff(own, reviews.bookingId) : undefined,
    q.staff ? withStaff(q.staff, reviews.bookingId) : undefined,
    q.unanswered ? unanswered : undefined,
    q.stars ? eq(reviews.rating, q.stars) : undefined,
  )!
  const offset = Number(q.cursor ?? 0)
  const [{ rows, total }, summary] = await all(db, [
    () => pageOf(db, where, q, offset),
    // the first page has it; "Ýene görkez" doesn't need it again
    async () => (own || offset ? null : summaryOf(db, business.id)),
  ])
  const people = [...new Set(rows.flatMap((r) => [r.replyBy, r.reportedBy].filter((id): id is string => !!id)))]
  const [visits, names] = await all(db, [
    () => visitsOf(db, rows, q.lang),
    async () => (people.length ? db.select({ id: staff.id, name: staff.name }).from(staff).where(inArray(staff.id, people)) : []),
  ])
  const nameOf = (id: string | null) => names.find((n) => n.id === id)?.name ?? null
  return {
    items: rows.map((r) => {
      const reply = replyOf(r)
      return {
        id: r.id,
        author: r.authorName,
        rating: r.rating,
        tags: r.tags,
        text: r.text,
        createdAt: r.createdAt.getTime(),
        what: visits.get(r.id) ?? r.what,
        reply: reply ? { text: reply.text, at: reply.at.getTime(), by: nameOf(r.replyBy) } : null,
        report:
          r.reportReason && r.reportedAt
            ? { reason: r.reportReason, text: r.reportText, at: r.reportedAt.getTime(), by: nameOf(r.reportedBy), state: stateOf(r) }
            : null,
      }
    }),
    total,
    cursor: offset + q.limit < total ? String(offset + q.limit) : null,
    summary,
  }
}

/** One page, and how many match in all (counted again when the page is past the end). */
async function pageOf(db: Queryable, where: SQL, q: Query, offset: number) {
  const found = await db
    .select({ r: reviews, total: sql<number>`(count(*) over ())::int` })
    .from(reviews)
    .where(where)
    .orderBy(...ORDERS[q.sort])
    .limit(q.limit)
    .offset(offset)
  if (found[0] || !offset) return { rows: found.map((f) => f.r), total: found[0]?.total ?? 0 }
  const [counted] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviews)
    .where(where)
  return { rows: [], total: counted?.n ?? 0 }
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
        .where(and(eq(reviews.businessId, businessId), notRemoved(), unanswered)),
  ])
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...(b?.breakdown ?? {}) }
  return { rating: b?.rating ?? null, count: b?.count ?? 0, breakdown, unanswered: open?.n ?? 0 }
}

/** "reply to / report reviews": the owner and administrators. */
function assertReplies(actor: Actor): void {
  if (scopeOf(actor, 'reviewsReply') !== 'all') throw new ApiError('forbidden')
}

/** The business's review, held for the change; 404 for another business's. */
async function lockedReview(db: Queryable, businessId: string, id: string): Promise<ReviewRow> {
  const [r] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.id, id), eq(reviews.businessId, businessId), notRemoved()))
    .for('update')
  if (!r) throw new ApiError('not_found')
  return r
}

/** Through its booking, the specialist of the visit hears it too (the events feed). */
const reviewChanged = (db: Queryable, r: Pick<ReviewRow, 'businessId' | 'bookingId'>) =>
  emit(db, { type: 'review.updated', businessId: r.businessId, bookingId: r.bookingId })

/**
 * "Jogaby çap et" or its edit (B-53): everyone sees it, signed with the business and who wrote it. The same text
 * written again just after it was taken away (the toast's undo) brings it back as it was, its author and time kept.
 */
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
    const undo = !!r.replyDeletedAt && r.replyText === input.text
    await tx
      .update(reviews)
      .set(
        undo
          ? { replyDeletedAt: null, updatedAt: at }
          : { replyText: input.text, replyAt: at, replyBy: actor.staffId, replyDeletedAt: null, updatedAt: at },
      )
      .where(eq(reviews.id, r.id))
    await reviewChanged(tx, r)
  })
}

/** "Poz": the reply goes from every screen ("Jogap pozuldy"); kept so its undo can bring it back. */
export async function deleteReply(deps: Deps, business: Business, actor: Actor, id: string): Promise<void> {
  assertReplies(actor)
  const at = new Date(deps.now())
  await deps.db.transaction(async (tx) => {
    const r = await lockedReview(tx, business.id, id)
    if (!replyOf(r)) return
    await tx.update(reviews).set({ replyDeletedAt: at, updatedAt: at }).where(eq(reviews.id, r.id))
    await reviewChanged(tx, r)
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
    // never reported before, so it counted until now
    await shiftRating(tx, business.id, { [r.rating]: -1 })
    await reviewChanged(tx, r)
  })
}

/**
 * The 48-hour recount (Q-261, the jobs every minute): reports Ýeral hasn't decided in time count again, with the stars
 * they have now. The due reviews are held in id order first (the order an account's deletion holds its reviews in),
 * so a recount and an edit or a deletion of the review count once each and never wait on each other.
 */
export async function recountReviews(deps: Deps): Promise<number> {
  const now = deps.now()
  return deps.db.transaction(async (tx) => {
    const due = await tx
      .select({ id: reviews.id })
      .from(reviews)
      .where(
        and(
          isNotNull(reviews.reportedAt),
          isNull(reviews.recountedAt),
          isNull(reviews.clearedAt),
          notRemoved(),
          lte(reviews.reportedAt, new Date(now - REVIEW_REPORT_HOURS * 3_600_000)),
        ),
      )
      .orderBy(asc(reviews.id))
      .for('update')
    if (!due.length) return 0
    const back = await tx
      .update(reviews)
      .set({ recountedAt: new Date(now) })
      .where(
        inArray(
          reviews.id,
          due.map((d) => d.id),
        ),
      )
      .returning({ businessId: reviews.businessId, rating: reviews.rating, bookingId: reviews.bookingId })
    await shiftReviews(tx, back, 1, 'review.updated')
    // each review's specialist hears it too
    for (const r of back) await reviewChanged(tx, r)
    return back.length
  })
}
