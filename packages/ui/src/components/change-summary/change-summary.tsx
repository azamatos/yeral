import { ArrowRight } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * ChangeSummary (DS-Patterns → Booking move mode «ChangeSummary»): a time (or anything) before and after a change.
 * `bar`: two halves with caps labels and an arrow between, the old one 17/24 600 n-600, struck through when the change
 * is made at once (`moved`), the new one 17/24 700; it stacks on phones with the arrow pointing down. `rows`: a quiet
 * panel in a drawer, an optional caps title and a 92 label column. The labels carry the order (the arrow is
 * decoration); the words come from the caller.
 */
export function ChangeSummary({
  from,
  to,
  labels,
  moved = false,
  variant = 'bar',
  title,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  from: ReactNode
  to: ReactNode
  /** «Previous time», «New time». */
  labels: { from: string; to: string }
  /** The change is made at once (an instant business): the old value is struck through. */
  moved?: boolean
  variant?: 'bar' | 'rows'
  /** The rows' caps title: «Time change request». */
  title?: ReactNode
}) {
  if (variant === 'rows')
    return (
      // one grid, so both rows share the label column: 92, wider for a longer label («Прежнее время»)
      <div
        {...props}
        className={cn(
          'grid grid-cols-[minmax(92px,max-content)_minmax(0,1fr)] items-baseline gap-2.5 rounded-m bg-n-50 p-3.5 text-small',
          className,
        )}
      >
        {title && <span className="col-span-2 text-label text-n-500 uppercase">{title}</span>}
        <span className="text-dense text-n-600">{labels.from}</span>
        <span className={cn('text-n-600', moved && 'line-through')}>{from}</span>
        <span className="text-dense text-n-600">{labels.to}</span>
        <span className="font-semibold text-n-900">{to}</span>
      </div>
    )
  return (
    <div
      {...props}
      className={cn(
        'grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 rounded-card border border-n-200 bg-n-0 px-6 py-5',
        'max-sm:grid-cols-1 max-sm:gap-2.5 max-sm:px-5 max-sm:py-4',
        className,
      )}
    >
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="text-label text-n-500 uppercase">{labels.from}</span>
        <span className={cn('text-body-l leading-6 font-semibold', moved ? 'text-n-500 line-through' : 'text-n-600')}>{from}</span>
      </span>
      <ArrowRight aria-hidden className="size-6 text-n-500 max-sm:rotate-90 max-sm:justify-self-start" />
      <span className="flex min-w-0 flex-col gap-1.5">
        <span className="text-label text-n-500 uppercase">{labels.to}</span>
        <span className="text-body-l leading-6 font-bold text-n-900">{to}</span>
      </span>
    </div>
  )
}
