import { ToggleGroup } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

type Size = 's' | 'm' | 'l'

/**
 * Segmented control (DS · Controls `.seg`, v0.7 · A3): one choice out of a few — calendar range, staff view, day
 * toggle on Search. Sizes S 32 / M 40 / L 48 (radius 8 / 10 / 12, the items 5 / 7 / 9 inside a 3 px frame);
 * toolbars use M.
 */
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
      className={cn(
        'group/seg inline-flex flex-none items-stretch gap-0.5 bg-n-100 p-[3px]',
        size === 's' && 'h-8 rounded-ctl-s',
        size === 'm' && 'h-10 rounded-ctl-m',
        size === 'l' && 'h-12 rounded-ctl-l',
        className,
      )}
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
        'inline-flex cursor-pointer items-center justify-center gap-1.5 border-0 bg-transparent font-medium whitespace-nowrap text-n-600 hover:text-n-900',
        'group-data-[size=s]/seg:rounded-[5px] group-data-[size=s]/seg:px-2.5 group-data-[size=s]/seg:text-ctl-s/4',
        'group-data-[size=m]/seg:rounded-[7px] group-data-[size=m]/seg:px-3.5 group-data-[size=m]/seg:text-ctl-m/5',
        'group-data-[size=l]/seg:rounded-[9px] group-data-[size=l]/seg:px-4 group-data-[size=l]/seg:text-[15px]/5',
        'focus-visible:shadow-focus focus-visible:outline-none',
        'data-[state=on]:bg-n-0 data-[state=on]:font-semibold data-[state=on]:text-n-900 data-[state=on]:shadow-segment',
        "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
    />
  )
}
