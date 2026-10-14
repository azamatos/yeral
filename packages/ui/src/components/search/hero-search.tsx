import { Search } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'

/** The big search on Home (DS-Components → «Search · hero (desktop)»). On phones the app shows one field that opens a sheet. */
export function HeroSearch({ submitLabel, className, children, ...props }: ComponentProps<'form'> & { submitLabel: string }) {
  return (
    <form role="search" {...props} className={cn('flex h-18 items-center rounded-card border border-n-300 bg-n-0 py-2 pr-2', className)}>
      {children}
      <Button type="submit" variant="primary" size="l">
        <Search />
        {submitLabel}
      </Button>
    </form>
  )
}

/** One labelled part of the hero search; a hairline separates it from the previous one. */
export function HeroSearchField({
  label,
  icon,
  grow = 1,
  className,
  children,
}: {
  label: ReactNode
  icon?: ReactNode
  /** flex-grow, the first field («Näme?») uses 1.3 */
  grow?: number
  className?: string
  children: ReactNode
}) {
  return (
    <label
      style={{ flexGrow: grow, flexBasis: 0 }}
      className={cn(
        'relative flex min-w-0 flex-col gap-0.5 px-5',
        'not-first:before:absolute not-first:before:top-1/2 not-first:before:left-0 not-first:before:h-9 not-first:before:w-px not-first:before:-translate-y-1/2 not-first:before:bg-n-200',
        className,
      )}
    >
      <span className="text-label text-n-900 uppercase">{label}</span>
      <span className="flex min-w-0 items-center gap-1.5 [&_svg]:size-4 [&_svg]:flex-none [&_svg]:text-n-600">
        {icon}
        {children}
      </span>
    </label>
  )
}

/** Borderless input for HeroSearchField. */
export function HeroSearchInput({ className, ...props }: ComponentProps<'input'>) {
  return (
    <input
      {...props}
      className={cn('w-full min-w-0 border-0 bg-transparent p-0 text-body text-n-900 outline-none placeholder:text-n-500', className)}
    />
  )
}
