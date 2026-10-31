import { cva } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

export type MeterTone = 'accent' | 'warning' | 'neutral'

/** One part of a stacked meter: confirmed (accent) · pending (warning) · no-show (danger). */
export type MeterSegment = { value: number; tone: MeterTone | 'danger' }

const track = cva('block overflow-hidden rounded-pill', {
  variants: {
    size: {
      3: 'h-0.75 rounded-none',
      4: 'h-1',
      6: 'h-1.5',
      8: 'h-2',
    },
    /** what the meter lies on: white (n-100 track), the accent tint (white track) or n-50 (n-200 track) */
    surface: {
      white: 'bg-n-100',
      tint: 'bg-n-0',
      grey: 'bg-n-200',
    },
  },
  defaultVariants: { size: 6, surface: 'white' },
})

const fill: Record<MeterTone | 'danger', string> = {
  accent: 'bg-a-500',
  warning: 'bg-st-pending-dot',
  neutral: 'bg-n-500',
  danger: 'bg-error',
}

export type MeterProps = Omit<ComponentProps<'span'>, 'children' | 'role'> & {
  /** The whole thing as a sentence, for screen readers: «6 bookings, 72% of the day», «14 seats: 9 confirmed, 1 request, 1 no-show». */
  label: string
  /** How much of `max` is filled; 0…max. Ignored with `segments`. */
  value?: number
  max: number
  tone?: MeterTone
  /** Height in px: 3 (a square-ended top bar), 4 (small), 6 (load), 8 (share, stacked). */
  size?: 3 | 4 | 6 | 8
  surface?: 'white' | 'tint' | 'grey'
  /** Stacked parts in order, each `value / max` wide, clipped by the track; in place of `value`. */
  segments?: readonly MeterSegment[]
}

const pct = (value: number, max: number) => (max > 0 ? `${(Math.min(max, Math.max(0, value)) / max) * 100}%` : '0%')

/**
 * Meter (DS-Patterns → Status «Progress & meters»; COMPONENTS.md Data/Meter, `@yeral/ui/meter`): a presentational bar
 * for a share of something that isn't a task's progress (that is ProgressBar): a day's load in a week cell (6, with the
 * count and the percent the cell draws beside it), a goal's share (8), a small 4 under a tile. Tones accent (a-500),
 * warning (low, #dc8b0b) and neutral (past, n-500); the track is n-100 on white, white on the accent tint, n-200 on an
 * n-50 panel. `segments` stack confirmed · pending · no-show (and «full» is one segment at `max`). A `span` so it can
 * sit inside a button (the week's cells are buttons); `role="img"` named by the caller's sentence.
 */
export function Meter({ label, value = 0, max, tone = 'accent', size, surface, segments, className, ...props }: MeterProps) {
  return (
    <span {...props} role="img" aria-label={label} className={cn(track({ size, surface }), segments && 'flex', className)}>
      {segments ? (
        segments.map((s, i) => <span key={i} className={cn('block h-full flex-none', fill[s.tone])} style={{ width: pct(s.value, max) }} />)
      ) : (
        <span className={cn('block h-full rounded-pill', fill[tone])} style={{ width: pct(value, max) }} />
      )}
    </span>
  )
}
