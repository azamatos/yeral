/**
 * A business's stored rating (stars, review count and breakdown), kept up to date as reviews come, change and go. One
 * UPDATE works the new figures out from the row it changes, so changes at once each count from the latest figures
 * without locking the row first: a review's insert already holds a share lock on its business (the foreign key), and a
 * lock taken on top of that would deadlock two reviews written at once.
 */
import { sql } from 'drizzle-orm'
import type { Queryable } from '../../db/client'

/**
 * A review counts in the stored rating unless the business reported it and Ýeral hasn't decided yet, nor have 48 hours
 * passed (the recount marks them, `recountReviews`). Every path that shifts the rating checks it first.
 */
export const isCounted = (r: { reportedAt: Date | null; recountedAt: Date | null; clearedAt: Date | null }) =>
  !r.reportedAt || !!r.recountedAt || !!r.clearedAt

/** Reviews added (+) or taken away (−) per number of stars. */
export type StarShift = Partial<Record<number, number>>

const STARS = [1, 2, 3, 4, 5] as const

export async function shiftRating(db: Queryable, businessId: string, shift: StarShift): Promise<void> {
  const counts = STARS.map((k) => sql`greatest(0, coalesce(("rating_breakdown"->>${String(k)})::int, 0) + ${shift[k] ?? 0}::int)`)
  const total = sql.join(counts, sql` + `)
  const stars = sql.join(
    counts.map((n, i) => sql`${i + 1}::int * ${n}`),
    sql` + `,
  )
  const added = Object.values(shift).reduce<number>((s, n) => s + (n ?? 0), 0)
  await db.execute(sql`update "businesses" set
    "rating_breakdown" = jsonb_build_object('1', ${counts[0]}, '2', ${counts[1]}, '3', ${counts[2]}, '4', ${counts[3]}, '5', ${counts[4]}),
    "reviews_count" = greatest(0, "reviews_count" + ${added}::int),
    "rating" = case when (${total}) = 0 then null else round((${stars})::numeric / (${total}), 1) end
    where "id" = ${businessId}`)
}
