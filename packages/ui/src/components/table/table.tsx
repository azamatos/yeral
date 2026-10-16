import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Data table look (DS-Components → Data, `.tr`): rows of a CSS grid, 56 high, 14/20 type; hover n-50; selected a-50.
 * Pass `columns` (a grid-template-columns value) once on the table. Behaviour (sorting, selection, paging) comes from
 * TanStack Table in the apps; these are the visual primitives with table roles.
 * Wide tables scroll inside their box below 1024; on phones apps render rows as stacked list items.
 */
export function Table({ columns, className, style, ...props }: ComponentProps<'div'> & { columns: string }) {
  return (
    <div className="overflow-x-auto">
      <div
        role="table"
        {...props}
        style={{ ...style, '--cols': columns } as CSSProperties}
        className={cn('min-w-max text-small text-n-900 md:min-w-0', className)}
      />
    </div>
  )
}

const rowClass = 'grid min-h-14 grid-cols-(--cols) items-center gap-x-0 border-b border-n-200 px-2 last:border-b-0'

export function TableHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div role="row" {...props} className={cn(rowClass, 'min-h-10 text-label text-n-500 uppercase', className)} />
}

export function TableRow({ selected, className, ...props }: ComponentProps<'div'> & { selected?: boolean }) {
  return (
    <div
      role="row"
      aria-selected={selected}
      {...props}
      className={cn(rowClass, 'hover:bg-n-50', selected && 'bg-a-50 hover:bg-a-50', className)}
    />
  )
}

export function TableColumnHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div role="columnheader" {...props} className={cn('flex min-w-0 items-center gap-1 px-2', className)} />
}

export function TableCell({ className, ...props }: ComponentProps<'div'>) {
  return <div role="cell" {...props} className={cn('flex min-w-0 flex-col px-2 py-2', className)} />
}

/** Secondary line inside a cell (phone, duration · price). */
export function CellNote({ className, ...props }: ComponentProps<'span'>) {
  return <span {...props} className={cn('text-dense text-n-600', className)} />
}

/** Title bar above a table: title, date, search, filter chips, actions. */
export function TableToolbar({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-wrap items-center gap-3 border-b border-n-200 px-5 py-4', className)} />
}

/** Bordered box around toolbar + table + bulk bar. */
export function TableFrame({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-col overflow-hidden rounded-card border border-n-200', className)} />
}

/**
 * Bulk actions (ink bar at the table foot, sticky to the viewport bottom): «2 saýlandy» + actions + clear.
 * Put white or outline-on-ink buttons inside (`BulkBarButton`).
 */
export function BulkBar({ count, children, className }: { count: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div
      role="region"
      aria-live="polite"
      className={cn('sticky bottom-0 flex items-center gap-4 bg-n-900 py-3 pr-3 pl-5 text-white', className)}
    >
      <span className="text-small font-semibold">{count}</span>
      <div className="flex-1" />
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  )
}

export function BulkBarButton({ primary, className, ...props }: ComponentProps<'button'> & { primary?: boolean }) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        'inline-flex h-9 min-w-0 cursor-pointer items-center justify-center gap-2 rounded-s border px-3.5 text-small font-semibold whitespace-nowrap',
        'focus-visible:shadow-focus focus-visible:outline-none [&_svg]:size-[18px]',
        primary ? 'border-transparent bg-n-0 text-n-900 hover:bg-n-100' : 'border-n-600 bg-transparent text-white hover:bg-ink-btn-hover',
        className,
      )}
    />
  )
}
