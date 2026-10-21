import { Check } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Menu (account avatar menu, row actions, language): popover of 40-high items (`.mi`), arrow keys, type-ahead. */
export const Menu = DropdownMenu.Root
export const MenuTrigger = DropdownMenu.Trigger
export const MenuGroup = DropdownMenu.Group
export const MenuRadioGroup = DropdownMenu.RadioGroup

export function MenuContent({ className, sideOffset = 8, align = 'end', ...props }: ComponentProps<typeof DropdownMenu.Content>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        sideOffset={sideOffset}
        align={align}
        collisionPadding={16}
        {...props}
        className={cn(
          'z-50 flex w-popover max-w-[calc(100vw-32px)] flex-col rounded-m border border-n-200 bg-n-0 p-1.5 shadow-raised outline-none data-[state=open]:animate-pop-in',
          className,
        )}
      />
    </DropdownMenu.Portal>
  )
}

/** A submenu beside its row (the account menu's Contact Ýeral): the menu's look, opened by the row or →. */
export function MenuSubContent({ className, sideOffset = 6, ...props }: ComponentProps<typeof DropdownMenu.SubContent>) {
  return (
    <DropdownMenu.Portal>
      <DropdownMenu.SubContent
        sideOffset={sideOffset}
        collisionPadding={16}
        {...props}
        className={cn(
          'z-50 flex w-popover max-w-[calc(100vw-32px)] flex-col rounded-m border border-n-200 bg-n-0 p-1.5 shadow-raised outline-none data-[state=open]:animate-pop-in',
          className,
        )}
      />
    </DropdownMenu.Portal>
  )
}

const itemClass = cn(
  'flex h-10 w-full cursor-pointer items-center gap-3 rounded-input px-3 text-left text-body text-n-900 outline-none select-none',
  'data-highlighted:bg-group data-disabled:cursor-not-allowed data-disabled:text-n-500',
  "[&_svg]:flex-none [&_svg]:text-n-600 [&_svg:not([class*='size-'])]:size-[18px]",
)

export function MenuItem({ className, ...props }: ComponentProps<typeof DropdownMenu.Item>) {
  return <DropdownMenu.Item {...props} className={cn(itemClass, className)} />
}

/** A choice in a radio group (language). `description` shows a second line, e.g. the native name. */
export function MenuRadioItem({
  className,
  children,
  description,
  ...props
}: ComponentProps<typeof DropdownMenu.RadioItem> & { description?: ReactNode }) {
  return (
    <DropdownMenu.RadioItem {...props} className={cn(itemClass, 'h-auto min-h-10 justify-between py-1.5', className)}>
      <span className="flex flex-col">
        <span>{children}</span>
        {description && <span className="text-dense text-n-600">{description}</span>}
      </span>
      <DropdownMenu.ItemIndicator>
        <Check className="text-a-500!" />
      </DropdownMenu.ItemIndicator>
    </DropdownMenu.RadioItem>
  )
}

export function MenuSeparator({ className, ...props }: ComponentProps<typeof DropdownMenu.Separator>) {
  return <DropdownMenu.Separator {...props} className={cn('my-1.5 h-px bg-n-200', className)} />
}

/** Non-interactive heading block at the top of a menu (e.g. the signed-in user's name and phone). */
export function MenuLabel({ className, ...props }: ComponentProps<typeof DropdownMenu.Label>) {
  return <DropdownMenu.Label {...props} className={cn('flex flex-col gap-0.5 px-3 pt-2.5 pb-3', className)} />
}
