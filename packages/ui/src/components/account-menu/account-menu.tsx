import { Ellipsis } from 'lucide-react'
import { DropdownMenu } from 'radix-ui'
import { Fragment, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Avatar } from '../avatar'
import { MenuContent, MenuSeparator } from '../menu'

/** A row of the account menu: My profile, Your Ýeral page, Open as a client, Log out… */
export interface AccountMenuItem {
  id: string
  label: string
  icon: ReactNode
  /** Quiet text at the row's end: "yeral.app". */
  hint?: string
  /** Log out: danger ink, after a separator. */
  danger?: boolean
  /** A page elsewhere: the row is a link (`external` opens it in a new tab). */
  href?: string
  external?: boolean
  onSelect?: () => void
}

const accountMenuItem = cn(
  'flex min-h-10 cursor-pointer items-center gap-2.5 rounded-input px-2.5 py-1.5 text-small text-n-900 no-underline outline-none select-none',
  'focus-visible:shadow-focus-inset data-highlighted:bg-group [&>svg]:size-4.5 [&>svg]:flex-none [&>svg]:text-n-600',
)
const dangerItem = 'text-danger-ink data-highlighted:bg-error-tint [&>svg]:text-danger-ink'

/**
 * The person, not a switcher (DS-Patterns 06 · AccountMenu; B-Shell `.me`): avatar 32, name, phone and a ghost 36 "…"
 * button, the only thing that opens the menu (300, above the block). `rail`: the avatar alone in a 44 button. Rows come
 * from the screen; a danger row (Log out) sits after a separator. No Language row while the market has one language.
 */
export function AccountMenu({
  variant = 'block',
  name,
  phone,
  photo,
  items,
  menuLabel,
  triggerLabel,
  className,
}: {
  variant?: 'block' | 'rail'
  name: string
  phone: string
  photo?: string | null
  items: readonly AccountMenuItem[]
  /** The menu's name: "Account". */
  menuLabel: string
  /** The button's name: "Account menu" (the rail adds the person: "Account menu: Maýsa Annaýewa"). */
  triggerLabel: string
  className?: string
}) {
  const avatar = <Avatar decorative name={name} src={photo} size={32} />
  const menu = (
    <MenuContent
      aria-label={menuLabel}
      aria-labelledby={undefined}
      side={variant === 'rail' ? 'right' : 'top'}
      align="end"
      className="w-75"
    >
      {items.map((item, i) => (
        <Fragment key={item.id}>
          {item.danger && i > 0 && <MenuSeparator className="mx-1" />}
          <DropdownMenu.Item
            asChild={!!item.href}
            onSelect={() => item.onSelect?.()}
            className={cn(accountMenuItem, item.danger && dangerItem)}
          >
            {item.href ? (
              <a href={item.href} {...(item.external ? { target: '_blank', rel: 'noreferrer' } : {})}>
                {item.icon}
                {item.label}
                {item.hint && <span className="ml-auto text-dense text-n-600">{item.hint}</span>}
              </a>
            ) : (
              <>
                {item.icon}
                {item.label}
                {item.hint && <span className="ml-auto text-dense text-n-600">{item.hint}</span>}
              </>
            )}
          </DropdownMenu.Item>
        </Fragment>
      ))}
    </MenuContent>
  )

  if (variant === 'rail')
    return (
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label={triggerLabel}
          className={cn(
            'inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-m border-0 bg-transparent hover:bg-group focus-visible:shadow-focus focus-visible:outline-none data-[state=open]:bg-group',
            className,
          )}
        >
          {avatar}
        </DropdownMenu.Trigger>
        {menu}
      </DropdownMenu.Root>
    )

  return (
    <div className={cn('flex min-w-0 items-center gap-2.5 p-2', className)}>
      {avatar}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-small font-semibold text-n-900">{name}</span>
        <span className="truncate text-micro text-n-600 tabular-nums">{phone}</span>
      </span>
      <DropdownMenu.Root>
        <DropdownMenu.Trigger
          aria-label={triggerLabel}
          className="inline-flex size-9 flex-none cursor-pointer items-center justify-center rounded-s border-0 bg-transparent text-n-900 hover:bg-group focus-visible:shadow-focus focus-visible:outline-none data-[state=open]:bg-group"
        >
          <Ellipsis aria-hidden className="size-4.5" />
        </DropdownMenu.Trigger>
        {menu}
      </DropdownMenu.Root>
    </div>
  )
}
