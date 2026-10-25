import { cva } from 'class-variance-authority'
import { Clock } from 'lucide-react'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'
import { useMinute } from '../../lib/use-minute'

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
  /** When the time runs out (epoch ms): the minutes left count down to it. */
  until: number
  /** The minutes left as the pill shows them: «18 min». */
  format: (minutes: number) => string
  /** The same as a sentence for screen readers: «18 min left to answer». */
  label: (minutes: number) => string
  /** From this many minutes left the text turns danger ink, nothing else (15). */
  hotBelowMin?: number
  size?: 's' | 'm'
  /**
   * In place of the count: a request that arrived while the business was closed shows when to answer by, «By 09:30»,
   * read «Answer by 09:30 tomorrow»; the time counts only while it's open.
   */
  by?: { text: string; label: string }
  /** The time now (epoch ms), for a story; the page's shared minute clock otherwise. */
  now?: number
}

/**
 * TimerPill (DS-Patterns → Status «TimerPill»): the time left to answer a request, «18 min» on the warning tint with a
 * clock, danger ink from 15 minutes left (`hotBelowMin`), or «By 09:30» for one that arrived while the business was
 * closed. M (26) in tables and drawers, S (18, white) on a warning-tinted block. Every timer on the page draws again
 * at each new minute on one shared clock; `role="timer"` with the full sentence as its name. The words come from the
 * caller (`format`, `label`, `by`).
 */
export function TimerPill({ until, format, label, hotBelowMin = 15, size, by, now, className, ...props }: TimerPillProps) {
  const minute = useMinute()
  const minutes = Math.max(0, Math.ceil((until - (now ?? minute)) / 60_000))
  const hot = !by && minutes <= hotBelowMin
  return (
    <span {...props} role="timer" aria-label={by ? by.label : label(minutes)} className={cn(timer({ size, hot }), className)}>
      <Clock aria-hidden />
      {by ? by.text : format(minutes)}
    </span>
  )
}
