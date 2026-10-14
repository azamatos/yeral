import { Slot } from 'radix-ui'
import { Children, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** Breadcrumbs (DS-Components → Navigation): «Baş sahypa / Dellekhanalar / Barber Loft». */
export function Breadcrumbs({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  const items = Children.toArray(children)
  return (
    <nav aria-label={label} className={className}>
      <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0 text-dense text-n-600">
        {items.map((item, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && (
              <span aria-hidden className="text-n-400">
                /
              </span>
            )}
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
      <span aria-current="page" className={cn('text-n-600', className)}>
        {props.children}
      </span>
    )
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      {...props}
      className={cn(
        'text-n-600 no-underline hover:text-n-900 hover:underline focus-visible:rounded-[4px] focus-visible:shadow-focus focus-visible:outline-none',
        className,
      )}
    />
  )
}
