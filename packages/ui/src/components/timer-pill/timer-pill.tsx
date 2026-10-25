import { cva } from 'class-variance-authority'
import { Clock } from 'lucide-react'
import type { ComponentProps } from 'react'
import { useClock } from '../../lib/clock'
import { cn } from '../../lib/cn'

const timer = cva(
  'inline-flex flex-none items-center rounded-pill border border-st-pending-line font-semibold whitespace-nowrap tabular-nums [&_svg]:flex-none [&_svg]:stroke-2',
  {
    variants: {
      size: {
        /** a table row, a drawer */
        m: 'h-6.5 gap-1.25 bg-st-pending-bg px-2.25 text-dense [&_svg]:size-3.5',
        /** on a warning-tinted block (a request card) */
        s: 'h-4.5 gap-0.75 bg-n-0 px-1.5 text-[11px] leading-4 [&_svg]:size-3',
      },
      hot: { true: 'text-danger-ink', false: 'text-st-pending-ink' },
    },
    defaultVariants: { size: 'm', hot: false },
  },
)

export type TimerPillProps = Omit<ComponentProps<'span'>, 'children'> & {
  /** When the time runs out: the minutes left count down to it. */
  until: Date | number
  /**
   * The minutes left at a time: by default the clock's minutes to `until`. A request's hold counts only while the
   * business is open, so its screen passes the open minutes left (`@yeral/domain`), which stand still while it's closed.
   */
  left?: (now: number) => number
  /** The minutes left as the pill shows them: «18 min». */
  format: (minutes: number) => string
  /** The same as a sentence for screen readers: «18 min left to answer». */
  label: (minutes: number) => string
  /** From this many minutes left the text turns danger ink, nothing else (15). */
  hotBelowMin?: number
  size?: 's' | 'm'
  /**
   * In place of the count: a request that arrived while the business was closed shows when to answer by, «By 09:30»,
   * read «Answer by 09:30 tomorrow».
   */
  by?: { text: string; label: string }
  /** The time now (epoch ms), for a story or a page drawn on the server; the page's shared clock otherwise. */
  now?: number
}

/**
 * TimerPill (DS-Patterns → Status «TimerPill»): the time left to answer a request, «18 min» on the warning tint with a
 * clock, danger ink from 15 minutes left (`hotBelowMin`), or «By 09:30» for one that arrived while the business was
 * closed. M (26) in tables and drawers, S (18, white) on a warning-tinted block. Every timer on the page counts on one
 * shared clock (`@yeral/ui/clock`, to 15 s), which a sentence beside it reads too; `role="timer"` with the full
 * sentence as its name. The words come from the caller (`format`, `label`, `by`).
 */
export function TimerPill({ until, left, format, label, hotBelowMin = 15, size, by, now, className, ...props }: TimerPillProps) {
  const clock = useClock()
  const at = now ?? clock
  const minutes = Math.max(0, Math.ceil(left ? left(at) : (+until - at) / 60_000))
  const hot = !by && minutes <= hotBelowMin
  return (
    <span
      {...props}
      role="timer"
      aria-label={by ? by.label : label(minutes)}
      // drawn on the server at its time, then counted in the browser at its own
      suppressHydrationWarning
      className={cn(timer({ size, hot }), className)}
    >
      <Clock aria-hidden />
      {by ? by.text : format(minutes)}
    </span>
  )
}
