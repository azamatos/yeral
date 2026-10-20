import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { CountBadge } from '../count-badge'

/** The bar's height above the phone's safe area: a sheet that opens above it (MoreSheet) sits here. */
export const TAB_BAR_HEIGHT = 'calc(64px + env(safe-area-inset-bottom))'

/**
 * The phone's main menu under 768 (DS-Patterns 06 · BottomTabBar; `.tabb` wins): 64 high plus the safe area, four
 * equal items (Calendar · Bookings · Clients · More).
 */
export function BottomTabBar({ className, style, ...props }: ComponentProps<'nav'>) {
  return (
    <nav
      {...props}
      style={{ ...style, height: TAB_BAR_HEIGHT }}
      className={cn('grid grid-cols-4 border-t border-n-200 bg-n-0 px-1 pb-[env(safe-area-inset-bottom)]', className)}
    />
  )
}

const item = cn(
  'relative m-0 flex h-15.75 min-w-0 cursor-pointer flex-col items-center justify-center gap-0.75 rounded-m border-0 bg-transparent p-0 text-[11px] leading-3.5 font-semibold text-n-600 no-underline',
  'hover:text-n-900 focus-visible:shadow-focus-inset focus-visible:outline-none aria-[current=page]:text-a-600 aria-expanded:text-a-600',
  "[&>svg]:flex-none [&>svg:not([class*='size-'])]:size-5.5",
)

/** The tab's name, two lines before it's cut (longer languages). */
const Name = ({ children }: { children: ReactNode }) => (
  <span className="line-clamp-2 max-w-full px-1 text-center break-words">{children}</span>
)

/** The Bookings tab's count (`.y-tbc`): 18 high, amber, 11/16 700, at the icon's top right. */
function Count({ count, label }: { count: number; label: string }) {
  return (
    <>
      <CountBadge
        aria-hidden
        tone="attention"
        className="absolute top-1.25 left-[calc(50%+6px)] h-4.5 min-w-4.5 px-1.25 text-[11px] leading-4 font-bold"
      >
        {count}
      </CountBadge>
      <span className="sr-only">{label}</span>
    </>
  )
}

/**
 * A tab (63 high, r12; icon 22 and 11/14 600; the current page in accent with `aria-current="page"`, an inset focus ring
 * since the items touch the screen's edges). `count`: the requests this person may answer, read after the name.
 */
export function BottomTab({
  asChild,
  icon,
  label,
  count,
  className,
  children,
  ...props
}: ComponentProps<'a'> & { asChild?: boolean; icon: ReactNode; label: ReactNode; count?: { count: number; label: string } | null }) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp {...props} className={cn(item, className)}>
      {icon}
      {asChild && <Slot.Slottable>{children}</Slot.Slottable>}
      <Name>{label}</Name>
      {count && count.count > 0 && <Count {...count} />}
    </Comp>
  )
}

/** More (the menu icon): opens the MoreSheet, and stays in accent while it's open (`aria-expanded`). */
export function BottomTabButton({ icon, label, className, ...props }: ComponentProps<'button'> & { icon: ReactNode; label: ReactNode }) {
  return (
    <button type="button" aria-haspopup="dialog" {...props} className={cn(item, className)}>
      {icon}
      <Name>{label}</Name>
    </button>
  )
}
