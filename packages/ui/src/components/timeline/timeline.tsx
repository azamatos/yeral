import { Check, X } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * A step's marker (DS-Patterns `.tm-*`): accent (done), success (completed), current (a warning ring with a dot: what's
 * happening now), todo (a grey ring: still ahead), slate (cancelled), danger (no-show). Tone names, not booking
 * statuses: the booking entity maps one to the other.
 */
export type TimelineTone = 'accent' | 'success' | 'current' | 'todo' | 'slate' | 'danger'

export type TimelineItem = {
  title: ReactNode
  caption?: ReactNode
  /** What the marker shows, for screen readers («Done»): the markers are drawn only. */
  state?: ReactNode
}

const MARKER: Record<TimelineTone, string> = {
  accent: 'bg-a-500',
  success: 'bg-st-completed-dot',
  current: 'border-2 border-st-pending-dot bg-n-0',
  todo: 'border-2 border-n-300 bg-n-0',
  slate: 'bg-st-cancelled-dot',
  danger: 'bg-st-noshow-dot',
}
const MARK: Partial<Record<TimelineTone, typeof Check>> = { accent: Check, success: Check, slate: X, danger: X }

type Props = Omit<ComponentProps<'ol'>, 'children'> &
  (
    | { variant?: 'status'; items: readonly (TimelineItem & { tone: TimelineTone })[] }
    | { variant: 'numbered'; items: readonly (TimelineItem & { done?: boolean })[] }
  )

const shown = (node: ReactNode) => node != null && node !== false && node !== ''

/**
 * Timeline (DS-Patterns → «Timeline · status history and what's next»), an ordered list. `status`: a booking's history,
 * a 20 marker per step in its tone (a tick for done and completed, a cross for cancelled and no-show, a ring for now —
 * with a dot — and next), title 14/20 600 and a caption («14 Oct · 14:40»), a 2 px line between markers. `numbered`:
 * what happens next on a sent page, 28 markers numbered 1, 2, 3 (a tick on an accent tint once done, the line accent
 * after it), titles 15/22 600. The step happening now (a `current` tone; the first not done) is `aria-current="step"`;
 * the markers are drawn only, so a step's `state` («Done») says it to screen readers. The words come from the caller.
 */
export function Timeline(props: Props) {
  // the variant decides the markup below (read from `props`, so its items keep their type)
  const { variant: _variant, items: _items, className, ...rest } = props
  return (
    <ol {...rest} className={cn('m-0 flex list-none flex-col p-0', className)}>
      {props.variant === 'numbered'
        ? props.items.map((item, i, items) => {
            const last = i === items.length - 1
            const now = !item.done && items.findIndex((s) => !s.done) === i
            return (
              <li
                key={i}
                aria-current={now ? 'step' : undefined}
                className={cn(
                  'relative flex gap-3.5',
                  !last && 'pb-5.5 after:absolute after:top-8 after:bottom-1 after:left-3.25 after:w-0.5 after:rounded-xs',
                  !last && (item.done ? 'after:bg-a-line' : 'after:bg-n-200'),
                )}
              >
                <span
                  aria-hidden
                  className={cn(
                    'flex size-7 flex-none items-center justify-center rounded-pill border text-dense font-semibold',
                    item.done ? 'border-a-line bg-a-50 text-a-600' : 'border-n-300 bg-n-0 text-n-600',
                  )}
                >
                  {item.done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
                </span>
                <Words item={item} numbered />
              </li>
            )
          })
        : props.items.map((item, i, items) => {
            const last = i === items.length - 1
            const Mark = MARK[item.tone]
            return (
              <li
                key={i}
                aria-current={item.tone === 'current' ? 'step' : undefined}
                className={cn(
                  'relative grid grid-cols-[20px_minmax(0,1fr)] gap-3',
                  !last &&
                    'pb-4 before:absolute before:top-6 before:bottom-1 before:left-2.25 before:w-0.5 before:rounded-xs before:bg-n-200',
                )}
              >
                <span
                  aria-hidden
                  className={cn('mt-px flex size-5 items-center justify-center rounded-pill text-white', MARKER[item.tone])}
                >
                  {Mark && <Mark className="size-3" strokeWidth={3} />}
                  {item.tone === 'current' && <span className="size-2 rounded-pill bg-st-pending-dot" />}
                </span>
                <Words item={item} />
              </li>
            )
          })}
    </ol>
  )
}

function Words({ item, numbered }: { item: TimelineItem; numbered?: boolean }) {
  return (
    <span className={cn('flex min-w-0 flex-col gap-0.5', numbered && 'pt-0.75')}>
      <span className={numbered ? 'text-body font-semibold text-n-900' : 'text-small font-semibold text-n-900'}>
        {item.title}
        {shown(item.state) && <span className="sr-only"> {item.state}</span>}
      </span>
      {shown(item.caption) && <span className="text-dense text-n-600">{item.caption}</span>}
    </span>
  )
}
