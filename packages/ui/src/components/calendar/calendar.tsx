import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { PagerButton } from '../date-strip'

const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`

/** Days of a month (YYYY-MM) as YYYY-MM-DD, with Monday-first leading blanks. */
export function monthGrid(month: string): (string | null)[] {
  const [y, m] = month.split('-').map(Number) as [number, number]
  const first = new Date(Date.UTC(y, m - 1, 1))
  const lead = (first.getUTCDay() + 6) % 7
  const count = new Date(Date.UTC(y, m, 0)).getUTCDate()
  return [...Array<null>(lead).fill(null), ...Array.from({ length: count }, (_, i) => ymd(y, m, i + 1))]
}

/**
 * Month picker (DS-Components → «Pickers»): Monday first, 40px round days, today ringed, chosen day solid a-500.
 * One tab stop; arrow keys move by day and week.
 */
export function Calendar({
  month,
  value,
  today,
  onValueChange,
  isDisabled,
  monthLabel,
  weekdays,
  dayLabel,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  className,
}: {
  /** YYYY-MM shown */
  month: string
  value?: string
  today?: string
  onValueChange: (date: string) => void
  isDisabled?: (date: string) => boolean
  monthLabel: ReactNode
  /** seven short weekday names, Monday first: Du Si Ça Pe An Şe Ýe */
  weekdays: string[]
  /** accessible name for a day button */
  dayLabel?: (date: string) => string
  prevLabel: string
  nextLabel: string
  onPrev?: () => void
  onNext?: () => void
  className?: string
}) {
  const days = monthGrid(month)
  const grid = useRef<HTMLDivElement>(null)
  const enabled = days.filter((d): d is string => d !== null && !isDisabled?.(d))
  const focusTarget = value && enabled.includes(value) ? value : today && enabled.includes(today) ? today : enabled[0]

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (!step) return
    e.preventDefault()
    const buttons = [...(grid.current?.querySelectorAll<HTMLButtonElement>('button[data-date]') ?? [])]
    const index = buttons.findIndex((b) => b === document.activeElement)
    for (let i = index + step; i >= 0 && i < buttons.length; i += Math.sign(step)) {
      if (!buttons[i]!.disabled) {
        buttons[i]!.focus()
        break
      }
    }
  }

  return (
    <div className={cn('flex w-[292px] flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-body font-semibold text-n-900" aria-live="polite">
          {monthLabel}
        </span>
        <div className="flex gap-0.5">
          <PagerButton label={prevLabel} onClick={onPrev} disabled={!onPrev}>
            <ChevronLeft />
          </PagerButton>
          <PagerButton label={nextLabel} onClick={onNext} disabled={!onNext}>
            <ChevronRight />
          </PagerButton>
        </div>
      </div>
      <div
        ref={grid}
        role="group"
        aria-label={typeof monthLabel === 'string' ? monthLabel : undefined}
        onKeyDown={onKeyDown}
        className="grid grid-cols-[repeat(7,40px)] justify-between gap-0.5"
      >
        {weekdays.map((w) => (
          <span key={w} aria-hidden className="text-center text-label text-n-500 uppercase">
            {w}
          </span>
        ))}
        {days.map((d, i) =>
          d === null ? (
            <span key={`blank-${i}`} />
          ) : (
            <button
              key={d}
              type="button"
              data-date={d}
              disabled={isDisabled?.(d)}
              tabIndex={d === focusTarget ? 0 : -1}
              aria-pressed={d === value}
              aria-current={d === today ? 'date' : undefined}
              aria-label={dayLabel?.(d)}
              onClick={() => onValueChange(d)}
              className={cn(
                'size-10 cursor-pointer rounded-pill border-0 bg-transparent text-small font-semibold text-n-900 tabular-nums hover:bg-group',
                'focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-default disabled:bg-transparent disabled:font-normal disabled:text-n-500',
                d === today && 'shadow-[inset_0_0_0_1px_var(--color-n-900)]',
                d === value && 'bg-a-500 text-white shadow-none hover:bg-a-500',
              )}
            >
              {Number(d.slice(8))}
            </button>
          ),
        )}
      </div>
    </div>
  )
}
