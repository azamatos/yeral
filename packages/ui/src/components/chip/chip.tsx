import { RadioGroup, Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Filter chip (DS `.chip`): 36 high pill; tint when on. Use `selected` for toggles (sets aria-pressed). */
export function Chip({ selected, asChild, className, ...props }: ComponentProps<'button'> & { selected?: boolean; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      aria-pressed={asChild || selected === undefined ? undefined : selected}
      {...props}
      className={cn(
        'inline-flex h-9 flex-none cursor-pointer items-center gap-1.5 rounded-pill border border-n-300 bg-n-0 px-3.5 text-small font-medium whitespace-nowrap text-n-900 no-underline hover:bg-n-50',
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
  className,
  ...props
}: Omit<ComponentProps<typeof RadioGroup.Root>, 'children'> & { options: readonly { value: string; label: ReactNode }[] }) {
  return (
    <RadioGroup.Root {...props} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((o) => (
        <RadioGroup.Item key={o.value} value={o.value} asChild>
          <Chip className="data-[state=checked]:border-a-line data-[state=checked]:bg-a-50 data-[state=checked]:text-a-600 data-[state=checked]:hover:bg-a-100">
            {o.label}
          </Chip>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
