import { REVIEW_SORTS } from '@yeral/contract/reviews'

export type ReviewSort = (typeof REVIEW_SORTS)[number]
export type ReviewStars = 1 | 2 | 3 | 4 | 5
const STARS: readonly ReviewStars[] = [1, 2, 3, 4, 5]

/**
 * The reviews list's address (B-Reviews, book B-53): the chip (not answered, or a star count: one or the other), the
 * specialist, the order (`order`: the bookings' `sort` means another list). The reply composer and the report modal are the page's own state: nobody shares them.
 */
export type ReviewsSearch = { filter?: 'unanswered'; stars?: ReviewStars; staff?: string; order?: ReviewSort }

/** What's not a chip leaves «All»; what's not a sort leaves newest first; the stars win over «not answered». */
export function reviewsSearch(search: Record<string, unknown>): ReviewsSearch {
  const stars = STARS.find((s) => s === Number(search.stars))
  const order = REVIEW_SORTS.find((s) => s === search.order)
  return {
    ...(stars ? { stars } : search.filter === 'unanswered' ? { filter: 'unanswered' as const } : {}),
    ...(typeof search.staff === 'string' && search.staff ? { staff: search.staff } : {}),
    ...(order && order !== 'newest' ? { order } : {}),
  }
}
