import { RadioGroup, Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

type Size = 's' | 'm'

/**
 * Filter chip (DS · Controls `.chip`, v0.7 · A3): a pill, S 32 (active-filter chips) or M 40 (client category and
 * quick filters); tint when on. Use `selected` for toggles (sets aria-pressed). The focus ring follows the pill (A11).
 */
export function Chip({
  selected,
  asChild,
  size = 'm',
  className,
  ...props
}: ComponentProps<'button'> & { selected?: boolean; asChild?: boolean; size?: Size }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      aria-pressed={asChild || selected === undefined ? undefined : selected}
      {...props}
      className={cn(
        'inline-flex flex-none cursor-pointer items-center gap-1.5 rounded-pill border border-n-300 bg-n-0 font-medium whitespace-nowrap text-n-900 no-underline hover:bg-n-50',
        size === 's' ? 'h-8 px-3 text-ctl-s/4' : 'h-10 px-4 text-ctl-m/5',
        'focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-n-50 disabled:text-n-500',
        "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        selected && 'border-a-line bg-a-50 text-a-600 hover:bg-a-100',
        className,
      )}
    />
  )
}

/**
 * One choice out of a few as chips (B-Services «Price»: Fixed · From · Free · Price at the place): a radio group, the
 * chosen chip in the tint; the arrow keys (all four, the chips wrap) move between them. Name it with `aria-labelledby` or `aria-label`.
 */
export function ChipRadioGroup({
  options,
  size,
  className,
  ...props
}: Omit<ComponentProps<typeof RadioGroup.Root>, 'children'> & {
  options: readonly { value: string; label: ReactNode; disabled?: boolean }[]
  size?: Size
}) {
  return (
    <RadioGroup.Root {...props} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => (
        <RadioGroup.Item key={o.value} value={o.value} disabled={o.disabled} asChild>
          <Chip
            size={size}
            className="data-[state=checked]:border-a-line data-[state=checked]:bg-a-50 data-[state=checked]:text-a-600 data-[state=checked]:hover:bg-a-100"
          >
            {o.label}
          </Chip>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
