import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Vertical navigation (app sidebar 248, account side menu). */
export function SideNav({ className, ...props }: ComponentProps<'nav'>) {
  return <nav {...props} className={cn('flex flex-col gap-0.5', className)} />
}

/**
 * Sidebar item (DS `.sn`): icon + label (+ trailing count); active = tint. Mark the current page with
 * aria-current="page". Use `asChild` for router links.
 */
export function SideNavItem({
  asChild,
  trailing,
  className,
  children,
  ...props
}: ComponentProps<'a'> & { asChild?: boolean; trailing?: ReactNode }) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      {...props}
      className={cn(
        'flex h-10 items-center gap-3 rounded-s px-3 text-small font-medium whitespace-nowrap text-n-900 no-underline hover:bg-group',
        'focus-visible:shadow-focus focus-visible:outline-none aria-[current=page]:bg-a-50 aria-[current=page]:font-semibold aria-[current=page]:text-a-600',
        "[&_svg]:flex-none [&_svg:not([class*='size-'])]:size-[18px]",
        className,
      )}
    >
      {asChild ? <Slot.Slottable>{children}</Slot.Slottable> : children}
      {trailing && <span className="ml-auto">{trailing}</span>}
    </Comp>
  )
}

/** Hairline between sidebar groups. */
export function SideNavDivider() {
  return <div role="separator" className="my-2 h-px bg-n-200" />
}
