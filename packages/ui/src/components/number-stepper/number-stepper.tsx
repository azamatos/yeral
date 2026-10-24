import { Minus, Plus } from 'lucide-react'
import type { ComponentProps, KeyboardEvent, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * − n + (DS-Patterns `.y-stp`, B-Settings `.stpr`): one 44 box with 42 inner buttons, the value between them 15 600
 * tabular, read out as it changes; ↑ and ↓ step it from either button. An end button is off at `min` / `max`
 * (`aria-disabled`, so the focus stays on it as the value reaches the end).
 * `format` writes the value («2 times», «Off» for 0); with a unit the value column is 84 wide (`wide`). Name the
 * group with `aria-label` or `aria-labelledby`; the buttons' names come in as props.
 */
export function NumberStepper({
  value,
  onValueChange,
  min = 0,
  max = Number.POSITIVE_INFINITY,
  step = 1,
  format = String,
  wide,
  disabled,
  decreaseLabel,
  increaseLabel,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'onChange' | 'children'> & {
  value: number
  onValueChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  format?: (value: number) => ReactNode
  /** The 84 value column, for a value with a unit («2 times»). */
  wide?: boolean
  disabled?: boolean
  decreaseLabel: string
  increaseLabel: string
}) {
  const atMin = value - step < min
  const atMax = value + step > max
  const change = (by: number) => {
    const next = Math.min(max, Math.max(min, value + by))
    if (next !== value) onValueChange(next)
  }
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
    e.preventDefault()
    if (!disabled) change(e.key === 'ArrowUp' ? step : -step)
  }
  const button = cn(
    'inline-flex size-10.5 flex-none cursor-pointer items-center justify-center rounded-[9px] border-0 bg-transparent p-0 text-n-900',
    'hover:bg-n-100 focus-visible:shadow-focus focus-visible:outline-none',
    'disabled:cursor-not-allowed disabled:text-n-400 disabled:hover:bg-transparent',
    'aria-disabled:cursor-not-allowed aria-disabled:text-n-400 aria-disabled:hover:bg-transparent',
  )
  return (
    <div
      role="group"
      {...props}
      onKeyDown={onKeyDown}
      className={cn('inline-flex h-11 flex-none items-center rounded-s border border-n-300 bg-n-0', className)}
    >
      <button
        type="button"
        className={button}
        aria-label={decreaseLabel}
        disabled={disabled}
        aria-disabled={atMin || undefined}
        onClick={() => change(-step)}
      >
        <Minus aria-hidden strokeWidth={1.75} className="size-4.5" />
      </button>
      <span aria-live="polite" className={cn('text-center text-body font-semibold tabular-nums', wide ? 'min-w-21' : 'min-w-14')}>
        {format(value)}
      </span>
      <button
        type="button"
        className={button}
        aria-label={increaseLabel}
        disabled={disabled}
        aria-disabled={atMax || undefined}
        onClick={() => change(step)}
      >
        <Plus aria-hidden strokeWidth={1.75} className="size-4.5" />
      </button>
    </div>
  )
}
