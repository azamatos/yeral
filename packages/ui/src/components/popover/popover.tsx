import { Popover as PopoverPrimitive } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

/** Popover, 280–360 wide, anchored to its trigger (pickers, menus, language). Closes on outside click and Esc. */
export const Popover = PopoverPrimitive.Root
export const PopoverTrigger = PopoverPrimitive.Trigger
export const PopoverClose = PopoverPrimitive.Close
export const PopoverAnchor = PopoverPrimitive.Anchor

export function PopoverContent({ className, sideOffset = 8, align = 'start', ...props }: ComponentProps<typeof PopoverPrimitive.Content>) {
  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={16}
        {...props}
        className={cn(
          'z-65 max-w-[calc(100vw-32px)] min-w-popover rounded-m border border-n-200 bg-n-0 p-5 text-n-900 shadow-raised outline-none data-[state=open]:animate-pop-in',
          className,
        )}
      />
    </PopoverPrimitive.Portal>
  )
}
