import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Stars } from '../rating'

export type RatingRow = {
  stars: number
  count: number
  /** The row for screen readers: «5 stars: 88 reviews». */
  label: string
}

/**
 * RatingDistribution (DS-Patterns → Charts «Rating distribution»): how a business's reviews spread over 1 to 5 stars,
 * a row each in the caller's order (5 → 1): the stars 13/18 600, a 6 bar (n-100, a-500 filled to the row's share of
 * all the reviews), the count in a 28 column; each row `role="img"` named by its `label`. With `average`, the score
 * 44/48 700 above, its stars (16) and the count of reviews beside it. The words and the formatted score come from the
 * caller.
 */
export function RatingDistribution({
  rows,
  average,
  className,
  ...props
}: ComponentProps<'div'> & {
  rows: readonly RatingRow[]
  average?: {
    /** «4.9», formatted for the language. */
    score: ReactNode
    rating: number
    /** «Average rating: 4.9 out of 5». */
    label: string
    /** «96 reviews». */
    count: ReactNode
  }
}) {
  const total = rows.reduce((n, r) => n + r.count, 0)
  return (
    <div {...props} className={cn('flex flex-col gap-4', className)}>
      {average && (
        <div className="flex items-end gap-3.5">
          <span className="text-[44px] leading-12 font-bold tracking-[-0.03em] text-n-900">{average.score}</span>
          <span className="flex flex-col gap-1 pb-0.5">
            <Stars rating={average.rating} label={average.label} />
            <span className="text-dense text-n-600">{average.count}</span>
          </span>
        </div>
      )}
      <div className="flex max-w-90 flex-col gap-2">
        {rows.map((r) => (
          <div
            key={r.stars}
            role="img"
            aria-label={r.label}
            className="grid grid-cols-[12px_minmax(0,1fr)_28px] items-center gap-3 text-dense"
          >
            <span aria-hidden className="font-semibold text-n-900">
              {r.stars}
            </span>
            <span aria-hidden className="block h-1.5 overflow-hidden rounded-pill bg-n-100">
              <span className="block h-full rounded-pill bg-a-500" style={{ width: `${total ? (r.count / total) * 100 : 0}%` }} />
            </span>
            <span aria-hidden className="text-right text-n-600 tabular-nums">
              {r.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
