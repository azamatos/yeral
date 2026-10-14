import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { useMediaQuery } from '../../lib/use-media-query'

export type StripDay = {
  /** YYYY-MM-DD */
  date: string
  /** «Ça», «Şu gün» — already localised */
  weekday: ReactNode
  /** day of month */
  day: ReactNode
  /** full = open but no free time (number struck through); closed = not selectable */
  state?: 'available' | 'full' | 'closed'
  /** screen-reader text read after the visible weekday and day, e.g. «oktýabr, boş wagt ýok» */
  srText?: string
}

/**
 * Horizontal date strip of the booking time step (Booking `.dy`): 14 days, today first, a week per page with arrows
 * on ≥768 (days of the hidden week aren't focusable); on phones it scrolls natively.
 */
export function DateStrip({
  days,
  value,
  onValueChange,
  title,
  prevLabel,
  nextLabel,
  className,
  'aria-label': ariaLabel,
}: {
  days: StripDay[]
  value?: string
  onValueChange: (date: string) => void
  title?: ReactNode
  prevLabel: string
  nextLabel: string
  className?: string
  'aria-label': string
}) {
  const paged = useMediaQuery('(min-width: 768px)')
  const pages = Math.ceil(days.length / 7)
  const selectedIndex = Math.max(
    0,
    days.findIndex((d) => d.date === value),
  )
  const [page, setPage] = useState(Math.floor(selectedIndex / 7))

  return (
    <div className={cn('flex flex-col', className)}>
      <div className="flex items-center justify-between">
        <span className="text-body font-semibold text-n-900">{title}</span>
        {pages > 1 && (
          <div className="hidden gap-0.5 sm:flex">
            <PagerButton label={prevLabel} disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft />
            </PagerButton>
            <PagerButton label={nextLabel} disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight />
            </PagerButton>
          </div>
        )}
      </div>
      <div role="group" aria-label={ariaLabel} className="-mx-1 mt-3 [scrollbar-width:none] overflow-x-auto p-1 sm:overflow-hidden">
        <div
          className="flex gap-2 transition-transform duration-250 ease-out"
          style={paged ? { transform: `translateX(calc(${-page} * (100% + 8px)))` } : undefined}
        >
          {days.map((d, i) => {
            const hidden = paged && Math.floor(i / 7) !== page
            const on = d.date === value
            return (
              <button
                key={d.date}
                type="button"
                disabled={d.state === 'closed'}
                tabIndex={hidden ? -1 : undefined}
                aria-hidden={hidden || undefined}
                aria-pressed={on}
                onClick={() => onValueChange(d.date)}
                className={cn(
                  'group flex h-19 flex-[0_0_64px] cursor-pointer flex-col items-center justify-center gap-1 rounded-m border border-n-200 bg-n-0 p-0 text-n-900 sm:min-w-16 sm:flex-[0_0_calc((100%-48px)/7)]',
                  'hover:border-a-500 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-n-200',
                  on && 'border-a-500 bg-a-500 text-white',
                )}
              >
                <span className={cn('text-micro font-medium whitespace-nowrap', on ? 'text-white' : 'text-n-600')}>{d.weekday}</span>{' '}
                <span
                  className={cn(
                    'text-[20px] leading-6 font-bold tabular-nums',
                    d.state === 'full' && 'font-medium line-through',
                    d.state === 'full' && !on && 'text-n-500',
                  )}
                >
                  {d.day}
                </span>{' '}
                {d.srText && <span className="sr-only">{d.srText}</span>}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** Square 36 icon button used by pagers (DS `.pg`). */
export function PagerButton({ label, children, className, ...props }: ComponentProps<'button'> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      {...props}
      className={cn(
        'inline-flex size-9 cursor-pointer items-center justify-center rounded-s border border-transparent bg-transparent text-n-900 hover:bg-group',
        'focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-default disabled:bg-transparent disabled:text-n-400 [&_svg]:size-[18px]',
        className,
      )}
    >
      {children}
    </button>
  )
}
