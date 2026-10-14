import { ToggleGroup } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

type Size = 's' | 'm'

/** Segmented control (DS `.seg`): one choice out of a few — calendar range, staff view, day toggle on Search. */
export function Segmented({
  className,
  size = 'm',
  children,
  value,
  onValueChange,
  ...props
}: Omit<ToggleGroup.ToggleGroupSingleProps, 'type' | 'value' | 'onValueChange' | 'defaultValue'> & {
  value: string
  onValueChange: (v: string) => void
  size?: Size
}) {
  return (
    <ToggleGroup.Root
      type="single"
      {...props}
      value={value}
      // a segmented control always has a value: ignore Radix's "unselect" (empty string)
      onValueChange={(v) => {
        if (v) onValueChange(v)
      }}
      data-size={size}
      className={cn('group/seg inline-flex flex-none gap-0.5 rounded-s bg-n-100 p-[3px]', className)}
    >
      {children}
    </ToggleGroup.Root>
  )
}

export function SegmentedItem({ className, ...props }: ComponentProps<typeof ToggleGroup.Item>) {
  return (
    <ToggleGroup.Item
      {...props}
      className={cn(
        'h-8 cursor-pointer rounded-input border-0 bg-transparent px-3.5 text-small font-medium text-n-600 group-data-[size=s]/seg:h-7.5 group-data-[size=s]/seg:px-3 hover:text-n-900',
        'focus-visible:shadow-focus focus-visible:outline-none',
        'data-[state=on]:bg-n-0 data-[state=on]:font-semibold data-[state=on]:text-n-900 data-[state=on]:shadow-segment',
        className,
      )}
    />
  )
}
