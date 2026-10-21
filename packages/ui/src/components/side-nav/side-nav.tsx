import { Slot } from 'radix-ui'
import { createContext, use, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CountBadge } from '../count-badge'
import { Tooltip } from '../tooltip'

const Collapsed = createContext(false)

/**
 * Vertical navigation (DS-Patterns 06 · SideNav): the business sidebar's items (248) or its rail (`collapsed`, 72: icons
 * in 44 buttons, names in tooltips, counts as dots), and the client account's side menu.
 */
export function SideNav({ collapsed = false, className, ...props }: ComponentProps<'nav'> & { collapsed?: boolean }) {
  return (
    <Collapsed value={collapsed}>
      <nav {...props} className={cn('flex flex-col', collapsed ? 'items-center gap-1.5' : 'gap-0.5', className)} />
    </Collapsed>
  )
}

/** A count beside an item: requests (attention) or unanswered reviews (muted), and what it counts, read with the name. */
export interface SideNavCount {
  count: number
  tone: 'attention' | 'muted'
  /** "6 requests": read after the item's name; in the rail's tooltip after a " · ". */
  label: string
}

/**
 * An item (`.sn`: 40 min, 14/500, r10; the current page in tint with `aria-current="page"`): icon, name (two lines
 * before it's cut, for longer languages) and an optional count. In the rail it's a 44 icon button with its name in a
 * tooltip and the count as a dot. `asChild` renders the router's link.
 */
export function SideNavItem({
  asChild,
  icon,
  label,
  count,
  className,
  children,
  ...props
}: ComponentProps<'a'> & { asChild?: boolean; icon: ReactNode; label: ReactNode; count?: SideNavCount | null }) {
  const collapsed = use(Collapsed)
  const Comp = asChild ? Slot.Root : 'a'
  const shown = count && count.count > 0 ? count : null
  const link = (
    <Comp
      {...props}
      // the rail's tooltip repeats the name and count already in the link: read once, not again as a description
      {...(collapsed ? { 'aria-describedby': undefined } : {})}
      className={cn(
        'relative flex items-center rounded-s text-small font-medium text-n-900 no-underline hover:bg-group hover:text-n-900',
        'focus-visible:shadow-focus focus-visible:outline-none aria-[current=page]:bg-a-50 aria-[current=page]:font-semibold aria-[current=page]:text-a-600',
        "[&_svg]:flex-none [&_svg:not([class*='size-'])]:size-5",
        collapsed ? 'size-11 justify-center' : 'min-h-10 gap-3 px-3 py-2.5',
        className,
      )}
    >
      {icon}
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
      {collapsed ? (
        <>
          <span className="sr-only">{label}</span>
          {shown && (
            <>
              <span className="sr-only">{shown.label}</span>
              <CountBadge variant="dot" tone={shown.tone} className="absolute top-1.5 right-1.5" />
            </>
          )}
        </>
      ) : (
        <>
          <span className="line-clamp-2 min-w-0 flex-1 break-words">{label}</span>
          {shown && (
            <>
              <CountBadge aria-hidden tone={shown.tone}>
                {shown.count}
              </CountBadge>
              <span className="sr-only">{shown.label}</span>
            </>
          )}
        </>
      )}
    </Comp>
  )
  if (!collapsed) return link
  return (
    <Tooltip
      side="right"
      variant="label"
      content={
        <>
          {label}
          {shown && ` · ${shown.label}`}
        </>
      }
    >
      {link}
    </Tooltip>
  )
}

/** Hairline between sidebar groups (`.sdv`: 8 4). */
export function SideNavDivider({ className }: { className?: string }) {
  return <div role="separator" className={cn('mx-1 my-2 h-px flex-none bg-n-200', className)} />
}
