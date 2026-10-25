import { Check, ExternalLink } from 'lucide-react'
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
          'z-65 flex w-popover max-w-[calc(100vw-32px)] flex-col rounded-m border border-n-200 bg-n-0 p-1.5 shadow-raised outline-none data-[state=open]:animate-pop-in',
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
          'z-65 flex w-popover max-w-[calc(100vw-32px)] flex-col rounded-m border border-n-200 bg-n-0 p-1.5 shadow-raised outline-none data-[state=open]:animate-pop-in',
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

/** A link with a quiet second line (Contact Ýeral: "Call" and the number, "Write on Telegram" and the @name). */
export interface MenuLink {
  id: string
  label: string
  /** The second line: the number, the Telegram name. */
  caption: string
  icon: ReactNode
  href: string
  /** Another site (Telegram): a new tab, and the external-link icon at the end. */
  external?: boolean
}

/** The account menu's row (B-Shell `.mi`: 40 min, 14/20, icon 18): a link row and the rows built like it. */
export const menuRowClass = cn(
  'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-input px-2.5 py-1.5 text-small text-n-900 no-underline outline-none select-none',
  'focus-visible:shadow-focus-inset data-highlighted:bg-group [&>svg]:size-4.5 [&>svg]:flex-none [&>svg]:text-n-600',
)

/** A `MenuLink` as a menu row: its icon, the label over the caption, the external-link icon for another site. */
export function MenuLinkItem({ link, className }: { link: MenuLink; className?: string }) {
  return (
    <DropdownMenu.Item asChild className={cn(menuRowClass, className)}>
      <a href={link.href} {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
        {link.icon}
        <span className="flex min-w-0 flex-col">
          <span>{link.label}</span>
          <span className="truncate text-micro text-n-600 tabular-nums">{link.caption}</span>
        </span>
        {link.external && <ExternalLink aria-hidden className="ml-auto size-4! text-n-500!" />}
      </a>
    </DropdownMenu.Item>
  )
}

/**
 * A menu's title in caps at its top (B-Shell `.lbl`: "CONTACT ÝERAL"). The menu already carries the name, so screen
 * readers don't hear it twice.
 */
export function MenuTitle({ className, ...props }: ComponentProps<'div'>) {
  return <div aria-hidden {...props} className={cn('px-2.5 pt-2 pb-1.5 text-label text-n-600 uppercase', className)} />
}
