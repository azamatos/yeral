import { RadioGroup } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type IconChoice = { value: string; label: string; icon: ReactNode }

/**
 * IconPicker (DS-Patterns «Selection», B-Settings `.icg`): one icon out of a few in a grid of 44 tiles (8 to a row),
 * 1px n-300, r10; the chosen one in the tint with the a-600 icon; hover n-50; focus the violet ring. Arrow keys move
 * between them. Each tile is named by its `label` («Hourglass»). Name the group with `aria-labelledby` or `aria-label`.
 */
export function IconPicker({
  options,
  className,
  ...props
}: Omit<ComponentProps<typeof RadioGroup.Root>, 'children'> & { options: readonly IconChoice[] }) {
  return (
    <RadioGroup.Root {...props} className={cn('grid grid-cols-8 gap-2', className)}>
      {options.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          aria-label={o.label}
          className={cn(
            'inline-flex h-11 min-w-0 cursor-pointer items-center justify-center rounded-s border border-n-300 bg-n-0 p-0 text-n-900 [&_svg]:size-4.5',
            'hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
            'data-[state=checked]:border-a-line data-[state=checked]:bg-a-50 data-[state=checked]:text-a-600',
          )}
        >
          {o.icon}
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  )
}
