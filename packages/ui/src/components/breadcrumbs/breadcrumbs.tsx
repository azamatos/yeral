import { ChevronRight } from 'lucide-react'
import { Slot } from 'radix-ui'
import { Children, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Breadcrumbs (DS · Lists A7, v0.7): «Home › Beauty › Glow Studio» on one line, 14/20; the parents look like links
 * (n-600, ink and underlined on hover, a 2 px focus outline), chevrons between, the current page in ink 600 and cut
 * with «…» when the line is too narrow.
 */
export function Breadcrumbs({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const items = Children.toArray(children)
  return (
    <nav aria-label={label} className={cn('min-w-0', className)}>
      <ol className="m-0 flex min-w-0 list-none items-center gap-2 p-0 text-small whitespace-nowrap text-n-600">
        {items.map((item, i) => (
          <li key={i} className={cn('flex items-center gap-2', i === items.length - 1 ? 'min-w-0' : 'flex-none')}>
            {i > 0 && <ChevronRight aria-hidden className="size-4 flex-none text-n-400" strokeWidth={1.75} />}
            {item}
          </li>
        ))}
      </ol>
    </nav>
  )
}

/** A crumb link; the last crumb is the current page (pass `current`). */
export function Crumb({ asChild, current, className, ...props }: ComponentProps<'a'> & { asChild?: boolean; current?: boolean }) {
  if (current)
    return (
      <span
        aria-current="page"
        title={typeof props.children === 'string' ? props.children : undefined}
        className={cn('min-w-0 truncate font-semibold text-n-900', className)}
      >
        {props.children}
      </span>
    )
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      {...props}
      className={cn(
        'rounded-xs text-n-600 no-underline underline-offset-3 hover:text-n-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-a-400',
        className,
      )}
    />
  )
}
