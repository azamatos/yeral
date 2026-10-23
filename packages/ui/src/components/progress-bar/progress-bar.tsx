import { cva } from 'class-variance-authority'
import { Progress } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const track = cva('block overflow-hidden bg-n-100', {
  variants: {
    variant: {
      /** a goal with its label row above it (DS-Patterns «Progress · goal with labels»): 8 high, round ends */
      goal: 'h-2 rounded-pill',
      /** the setup flow's top bar on phones and tablets (B-Onboarding `.mbp`): 3 high, square track */
      flow: 'h-0.75',
      /** a 4 px meter under a heading with its count (DS-Patterns «Checklist»: «1 / 3 done») */
      meter: 'h-1 rounded-pill',
    },
  },
  defaultVariants: { variant: 'goal' },
})

export type ProgressBarProps = Omit<ComponentProps<'div'>, 'role' | 'children'> & {
  /** What it measures, for screen readers: «Setup steps», «Photos added». */
  label: string
  value: number
  max: number
  /** What a screen reader says instead of a percentage: «Step 4 of 8», «2 of 3 photos». */
  valueText?: string
  variant?: 'goal' | 'flow' | 'meter'
}

/**
 * ProgressBar (DS-Patterns → Status «Progress»; B-Onboarding's setup top bar, B-Analytics' goal): an a-500 fill on an
 * n-100 track, filled `value / max` (Radix Progress: `role="progressbar"`, the value clamped to 0…max). `flow` is the
 * 3 px bar under the setup wizard's phone header, its fill rounded at the leading end only; `goal` is the 8 px meter
 * under a label row the screen draws. The text around it comes from the screen.
 */
export function ProgressBar({ label, value, max, valueText, variant = 'goal', className, ...props }: ProgressBarProps) {
  const now = Math.min(max, Math.max(0, value))
  const pct = max > 0 ? (now / max) * 100 : 0
  return (
    <Progress.Root
      {...props}
      value={now}
      max={max}
      aria-label={label}
      getValueLabel={valueText ? () => valueText : undefined}
      className={cn(track({ variant }), className)}
    >
      <Progress.Indicator
        className={cn(
          'block h-full bg-a-500 transition-[width] duration-200 motion-reduce:transition-none',
          variant === 'flow' ? 'rounded-r-pill' : 'rounded-pill',
        )}
        style={{ width: `${pct}%` }}
      />
    </Progress.Root>
  )
}
