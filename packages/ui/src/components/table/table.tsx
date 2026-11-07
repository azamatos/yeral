import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { Slot } from 'radix-ui'
import { Children, useRef, useState, type ComponentProps, type CSSProperties, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'
import { tagChipVariants } from '../chip'
import { Popover, PopoverContent, PopoverTrigger } from '../popover'
import { Tooltip } from '../tooltip'

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
  // A6: header 40, 12/16 600 n-500, sentence case (no caps)
  return <div role="row" {...props} className={cn(rowClass, 'min-h-10 text-micro font-semibold text-n-500', className)} />
}

export function TableRow({ selected, className, ...props }: ComponentProps<'div'> & { selected?: boolean }) {
  return (
    <div
      role="row"
      aria-selected={selected}
      {...props}
      // a row that is a link takes the inset ring (A11): the frame clips, so the ring goes inside
      className={cn(
        rowClass,
        // a row with a TableRowLink is the link: its hit area covers the row, so the row points
        'relative hover:bg-n-50 focus-visible:shadow-focus-inset focus-visible:outline-none has-[a:focus-visible]:shadow-focus-inset has-[a[data-row-link]]:cursor-pointer',
        selected && 'bg-a-50 hover:bg-a-50',
        className,
      )}
    />
  )
}

/** `numeric`: the header of a column of counts or money, right-aligned over its cells (DS-Type 04). */
export function TableColumnHeader({ numeric, className, ...props }: ComponentProps<'div'> & { numeric?: boolean }) {
  return (
    <div
      role="columnheader"
      {...props}
      className={cn('flex min-w-0 items-center gap-1 px-2', numeric && 'justify-end text-right', className)}
    />
  )
}

/**
 * `numeric`: counts or money that sit above numbers of the same kind, right-aligned with tabular figures so the digits
 * line up by place — the one place a table keeps `tabular-nums` (DS-Type 04). Phones, dates and times stay proportional.
 */
export function TableCell({ numeric, className, ...props }: ComponentProps<'div'> & { numeric?: boolean }) {
  return (
    <div
      role="cell"
      {...props}
      className={cn('flex min-w-0 flex-col px-2 py-2', numeric && 'items-end text-right tabular-nums', className)}
    />
  )
}

export type SortState = 'ascending' | 'descending' | 'none'

/**
 * A6 sortable header (DS-Lists `.shb`): the label is a button, `aria-sort` on the header. Not sorted shows its
 * up-down chevrons only on hover and focus (n-400); the sorted header's text and chevron are ink. A numeric column puts
 * the chevron before its label so the label stays over the right-aligned digits. Which direction a click gives is the
 * caller's: first click the natural order (text A → Z, numbers and dates high / newest first), the second reverses.
 */
export function TableSortHeader({
  sort,
  onSort,
  numeric,
  className,
  children,
  ...props
}: Omit<ComponentProps<'div'>, 'onClick'> & { sort: SortState; onSort: () => void; numeric?: boolean }) {
  const Icon = sort === 'ascending' ? ChevronUp : sort === 'descending' ? ChevronDown : ChevronsUpDown
  const icon = (
    <Icon
      aria-hidden
      strokeWidth={1.75}
      className={cn(
        'size-4 shrink-0',
        sort === 'none' && 'text-n-400 opacity-0 group-hover/sort:opacity-100 group-focus-visible/sort:opacity-100',
      )}
    />
  )
  return (
    <div
      role="columnheader"
      aria-sort={sort}
      {...props}
      className={cn('flex min-w-0 items-center px-2', numeric && 'justify-end', className)}
    >
      <button
        type="button"
        onClick={onSort}
        className={cn(
          'group/sort -mx-1.5 inline-flex h-7 cursor-pointer items-center gap-1 rounded-sm px-1.5 font-semibold whitespace-nowrap hover:text-n-900 focus-visible:text-n-900 focus-visible:shadow-focus focus-visible:outline-none',
          sort !== 'none' && 'text-n-900',
        )}
      >
        {numeric && icon}
        {children}
        {!numeric && icon}
      </button>
    </div>
  )
}

/**
 * A6 row link: the link in the row's first cell (the name) whose hit area stretches over the whole row, so a click
 * anywhere opens the item and Enter on it does too; the row takes the inset focus ring. Cut off with «…»; the full
 * text shows in a tooltip only when it doesn't fit. Controls in the row (TableIconAction, the +N tags) sit above it.
 */
export function TableRowLink({ asChild, className, children, ...props }: ComponentProps<'a'> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'a'
  return (
    <Comp
      data-row-link=""
      {...props}
      className={cn(
        'block min-w-0 font-medium text-n-900 no-underline outline-none after:absolute after:inset-0 after:content-[""]',
        className,
      )}
    >
      {asChild ? children : <TruncatedText>{children}</TruncatedText>}
    </Comp>
  )
}

/** One line cut with «…»; hovering it shows the whole text in a tooltip, only when it was cut. */
export function TruncatedText({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  return (
    <Tooltip
      content={children}
      open={open}
      onOpenChange={(o) => setOpen(o && !!ref.current && ref.current.scrollWidth > ref.current.clientWidth)}
    >
      <span ref={ref} className={cn('block min-w-0 truncate', className)}>
        {children}
      </span>
    </Tooltip>
  )
}

/**
 * A6 row action: one IconButton S plain with its name in a tooltip («New booking», «Copy number»), above the row's
 * link so clicking it never opens the row; a second action would bring the «…» menu back.
 */
export function TableIconAction({ label, className, ...props }: Omit<ComponentProps<typeof Button>, 'aria-label'> & { label: string }) {
  return (
    <Tooltip content={label}>
      <Button variant="plain" size="s" iconOnly aria-label={label} {...props} className={cn('relative z-1', className)} />
    </Tooltip>
  )
}

/**
 * A6 tags column: up to `max` tag chips (24, no ×), then «+N» that opens a popover with the rest. Chips never wrap
 * or shrink; the cell clips. `moreLabel` names the «+N» button for screen readers («3 more tags»).
 */
export function TableTags({ children, max = 2, moreLabel }: { children: ReactNode; max?: number; moreLabel: (n: number) => string }) {
  const items = Children.toArray(children)
  const rest = items.slice(max)
  return (
    <div className="flex min-w-0 items-center gap-1.5 overflow-hidden">
      {items.slice(0, max)}
      {rest.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={moreLabel(rest.length)}
              className={cn(
                tagChipVariants({ size: 's' }),
                'relative z-1 cursor-pointer hover:bg-n-200 focus-visible:shadow-focus focus-visible:outline-none data-[state=open]:bg-n-200',
              )}
            >
              +{rest.length}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" aria-label={moreLabel(rest.length)} className="flex w-auto max-w-70 flex-wrap gap-1.5 p-3">
            {rest}
          </PopoverContent>
        </Popover>
      )}
    </div>
  )
}

/** Secondary line inside a cell (phone, duration · price). */
export function CellNote({ className, ...props }: ComponentProps<'span'>) {
  return <span {...props} className={cn('text-dense text-n-600', className)} />
}

/** Title bar above a table: title, date, search, filter chips, actions. */
export function TableToolbar({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-wrap items-center gap-3 border-b border-n-200 px-5 py-4', className)} />
}

/**
 * Bordered box around toolbar + table + bulk bar. `overflow-clip`, not `hidden`: both clip the children to the
 * radius, but `hidden` makes the frame a scroll container, and a `sticky` bulk bar then sticks to the frame's foot
 * instead of the viewport's.
 */
export function TableFrame({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-col overflow-clip rounded-card border border-n-200', className)} />
}
