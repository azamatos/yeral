import { ChevronLeft } from 'lucide-react'
import { Slot } from 'radix-ui'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

/**
 * BackLink (DS-Patterns `.y-back`): back to the list a page came from, «‹ Specialists»: 36 high, n-600 14/500, a chevron
 * before the label, the group tint and ink on hover. A link: `asChild` around the router's `Link` (its words become the
 * label, the chevron goes before them), an `a` otherwise. The label comes from the caller; the page lines it up 4 to
 * the left so the chevron sits on the text's edge.
 */
export function BackLink({ asChild, className, children, ...props }: ComponentProps<'a'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      {...props}
      className={cn(
        'inline-flex h-9 items-center gap-0.5 rounded-s pr-2.5 pl-1 text-small font-medium whitespace-nowrap text-n-600 no-underline',
        'hover:bg-group hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none',
        className,
      )}
    >
      <ChevronLeft aria-hidden className="size-4.5 flex-none" />
      <Slot.Slottable>{children}</Slot.Slottable>
    </Comp>
  )
}
