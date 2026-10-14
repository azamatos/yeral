import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

/** Header link (DS `.nl`): «Biznes üçin», language button. Use `asChild` for router links. */
export function NavLink({ asChild, className, ...props }: ComponentProps<'a'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      {...props}
      className={cn(
        'inline-flex h-10 cursor-pointer items-center gap-2 rounded-s border-0 bg-transparent px-3 text-body font-medium text-n-900 no-underline hover:bg-group',
        "focus-visible:shadow-focus focus-visible:outline-none [&_svg:not([class*='size-'])]:size-[18px]",
        className,
      )}
    />
  )
}
