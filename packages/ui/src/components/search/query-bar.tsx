import { Search } from 'lucide-react'
import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** The pill query bar in the search header (Search, Business page, Account): «Näme? · Nirede? · Haçan?» + ink search button. */
export function QueryBar({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div
      role="search"
      {...props}
      className={cn(
        'flex h-12 min-w-0 flex-[0_1_640px] items-center rounded-pill border border-n-300 bg-n-0 pr-1.5 pl-1 sm:h-14',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** One part of the query bar: a label over the current value. Render a link with `asChild`, or use it as a button. */
export function QuerySegment({
  label,
  value,
  icon,
  asChild,
  className,
  children,
  ...props
}: ComponentProps<'button'> & { label: ReactNode; value: ReactNode; icon?: ReactNode; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'button'}
      {...props}
      className={cn(
        'relative flex h-11 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-pill border-0 bg-transparent px-3 no-underline hover:bg-group sm:px-4.5',
        '[&>svg]:size-[18px] [&>svg]:flex-none [&>svg]:text-n-600',
        'not-first:before:absolute not-first:before:top-1/2 not-first:before:-left-px not-first:before:h-7 not-first:before:w-px not-first:before:-translate-y-1/2 not-first:before:bg-n-200 hover:before:opacity-0',
        className,
      )}
    >
      {/* with asChild the child (a link) becomes the segment and receives the content below */}
      {asChild && <Slot.Slottable>{children}</Slot.Slottable>}
      {icon}
      <span className="flex min-w-0 flex-col text-left">
        <span className="text-label text-n-900 uppercase">{label}</span>
        <span className="truncate text-small font-semibold text-n-900">{value}</span>
      </span>
    </Comp>
  )
}

/** The round ink search button at the end of the query bar. */
export function QuerySubmit({
  label,
  className,
  asChild,
  children,
  ...props
}: ComponentProps<'button'> & { label: string; asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      type={asChild ? undefined : 'submit'}
      aria-label={label}
      {...props}
      className={cn(
        'inline-flex size-11 flex-none cursor-pointer items-center justify-center rounded-pill border-0 bg-ink-btn text-white hover:bg-ink-btn-hover [&_svg]:size-5',
        className,
      )}
    >
      {asChild ? children : <Search aria-hidden />}
    </Comp>
  )
}
