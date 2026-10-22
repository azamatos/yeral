import { cva } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const track = cva('block overflow-hidden bg-n-100', {
  variants: {
    variant: {
      /** a goal with its label row above it (DS-Patterns «Progress · goal with labels»): 8 high, round ends */
      goal: 'h-2 rounded-pill',
      /** the setup flow's top bar on phones and tablets (B-Onboarding `.mbp`): 3 high, square track */
      flow: 'h-0.75',
    },
  },
  defaultVariants: { variant: 'goal' },
})

export type ProgressBarProps = Omit<ComponentProps<'div'>, 'role' | 'children'> & {
  /** What it measures, for screen readers: «Setup steps», «Photos added». */
  label: string
  value: number
  max: number
  /** The lowest value it reads out (the setup flow counts steps from 1). The bar fills `value / max`. */
  min?: number
  variant?: 'goal' | 'flow'
}

/**
 * ProgressBar (DS-Patterns → Status «Progress»; B-Onboarding's setup top bar, B-Analytics' goal): an a-500 fill on an
 * n-100 track, filled `value / max`. `flow` is the 3 px bar under the setup wizard's phone header, its fill rounded at
 * the leading end only; `goal` is the 8 px meter under a label row the screen draws. A `role="progressbar"` with its
 * label and values; the text around it comes from the screen.
 */
export function ProgressBar({ label, value, max, min = 0, variant = 'goal', className, ...props }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      {...props}
      role="progressbar"
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      className={cn(track({ variant }), className)}
    >
      <span
        className={cn(
          'block h-full bg-a-500 transition-[width] duration-200 motion-reduce:transition-none',
          variant === 'flow' ? 'rounded-r-pill' : 'rounded-pill',
        )}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
