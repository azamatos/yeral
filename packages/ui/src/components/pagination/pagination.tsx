import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { PagerButton } from '../date-strip'

/** Page numbers to show: first, last, current ±1, with gaps ('…'). */
export function pageItems(page: number, count: number): (number | '…')[] {
  const keep = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count))
  const sorted = [...keep].sort((a, b) => a - b)
  const out: (number | '…')[] = []
  sorted.forEach((p, i) => {
    if (i > 0 && p - sorted[i - 1]! > 1) out.push('…')
    out.push(p)
  })
  return out
}

/** Pagination for tables (DS `.pg`); the catalogue uses «Ýene görkez» instead. */
export function Pagination({
  page,
  pageCount,
  onPageChange,
  label,
  prevLabel,
  nextLabel,
  pageLabel,
  className,
}: {
  page: number
  pageCount: number
  onPageChange: (page: number) => void
  label: string
  prevLabel: string
  nextLabel: string
  /** accessible name for a page button, e.g. (n) => `Sahypa ${n}` */
  pageLabel: (page: number) => string
  className?: string
}) {
  return (
    <nav aria-label={label} className={cn('flex items-center gap-0.5', className)}>
      <PagerButton label={prevLabel} disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
        <ChevronLeft />
      </PagerButton>
      {pageItems(page, pageCount).map((p, i) =>
        p === '…' ? (
          <span key={`gap-${i}`} aria-hidden className="inline-flex size-9 items-center justify-center text-small text-n-600">
            …
          </span>
        ) : (
          <button
            key={p}
            type="button"
            aria-label={pageLabel(p)}
            aria-current={p === page ? 'page' : undefined}
            onClick={() => onPageChange(p)}
            className={cn(
              'inline-flex size-9 cursor-pointer items-center justify-center rounded-s border border-transparent bg-transparent text-small font-medium text-n-900 tabular-nums hover:bg-group',
              'focus-visible:shadow-focus focus-visible:outline-none aria-[current=page]:border-n-300 aria-[current=page]:font-semibold',
            )}
          >
            {p}
          </button>
        ),
      )}
      <PagerButton label={nextLabel} disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
        <ChevronRight />
      </PagerButton>
    </nav>
  )
}
