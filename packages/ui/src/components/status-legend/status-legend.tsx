import { cva } from 'class-variance-authority'
import { CircleHelp, X } from 'lucide-react'
import { useId, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Sheet, SheetClose, SheetTitle } from '../../lib/sheet'
import { useMediaQuery } from '../../lib/use-media-query'
import { Button } from '../button'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '../popover'

export type StatusLegendItem = {
  /** What the row explains: a StatusBadge, an icon 16, a LegendTile, a TimerPill S, a chip. */
  visual: ReactNode
  /** Its words: the meaning of a status, or the key's name («Buffer», «Busy elsewhere — the time is taken …»). */
  text: ReactNode
  /** A long key takes both columns of the sheet's grid. */
  wide?: boolean
}

export type StatusLegendSection = {
  title: string
  items: readonly StatusLegendItem[]
  /**
   * `statuses`: badge + meaning rows (126 column, 12/16 n-600); `keys` (default): visual + words 13/18, a two-column
   * grid in the sheet; `inline`: the same rows, wrapped in one line in the sheet (one-word sources).
   */
  variant?: 'statuses' | 'keys' | 'inline'
  /** A note under the rows («Only the team sees these. They don't change the booking status.»). */
  caption?: ReactNode
}

export type StatusLegendProps = {
  /** The dialog's title and the trigger's name: «Colours and symbols». */
  title: string
  /** The close button's name. */
  closeLabel: string
  /** The footer button: «Got it». */
  confirmLabel: string
  sections: readonly StatusLegendSection[]
  /** A row the sheet alone shows, under a line: the «Show cancelled» switch. */
  extra?: ReactNode
  /** Open on mount: the first visit; only «Got it» tells `onConfirm` (closing doesn't), and the caller remembers it. */
  defaultOpen?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** «Got it» was pressed (the legend is closed). */
  onConfirm?: () => void
  /** Where the popover hangs from the trigger (the toolbar's end: `end`). */
  align?: 'start' | 'center' | 'end'
  /** On the trigger. */
  className?: string
}

const caps = 'text-label text-n-500 uppercase'

function Rows({ section, sheet }: { section: StatusLegendSection; sheet: boolean }) {
  const variant = section.variant ?? 'keys'
  if (variant === 'statuses')
    return section.items.map((it, i) => (
      <div key={i} className="grid grid-cols-[126px_minmax(0,1fr)] items-center gap-2.5 text-micro text-n-600">
        <span className="flex justify-self-start">{it.visual}</span>
        <span>{it.text}</span>
      </div>
    ))
  const rows = section.items.map((it, i) => (
    <span key={i} className={cn('flex items-center gap-2.5 text-dense text-n-900', sheet && it.wide && 'col-span-2')}>
      <span className="flex flex-none text-n-600 [&>svg]:size-4">{it.visual}</span>
      <span>{it.text}</span>
    </span>
  ))
  if (!sheet) return rows
  return <div className={variant === 'inline' ? 'flex flex-wrap gap-x-[18px] gap-y-2' : 'grid grid-cols-2 gap-x-3 gap-y-2'}>{rows}</div>
}

function Sections({ sections, sheet }: { sections: readonly StatusLegendSection[]; sheet: boolean }) {
  return sections.map((section) => (
    <div key={section.title} className="flex flex-col gap-2">
      <span className={caps}>{section.title}</span>
      <Rows section={section} sheet={sheet} />
      {section.caption && <span className="text-dense text-n-600">{section.caption}</span>}
    </div>
  ))
}

/**
 * StatusLegend (DS-Patterns → Status «StatusLegend»; COMPONENTS.md Overlays/StatusLegend, `@yeral/ui/status-legend`):
 * «Colours and symbols», the one place a calendar, a list or a plan explains its badges, icons, layers and timers.
 * A ghost S 36 circle-help trigger (44 on phones; open = the group fill) opens a popover 320 (pad 16, gap 16: the
 * title 15/20 with its close button, sections of a caps title and rows, a line and «Got it» secondary S at the right;
 * it scrolls past `100vh − 200`) from 768, and the same sections in a bottom sheet under it (title 17/24, body gap 14, an `extra` row under a line,
 * «Got it» full width). Esc, outside and the buttons close it; the focus lands on the title and goes back to the
 * trigger. It opens by itself with `defaultOpen` (a person's first visit) and «Got it» tells `onConfirm`, so the
 * caller remembers. Every word and visual comes from props: the booking entity supplies statuses, sources and layers;
 * `LegendTile` draws the layer squares.
 */
export function StatusLegend({
  title,
  closeLabel,
  confirmLabel,
  sections,
  extra,
  defaultOpen,
  open: openProp,
  onOpenChange,
  onConfirm,
  align = 'end',
  className,
}: StatusLegendProps) {
  const wide = useMediaQuery('(min-width: 768px)')
  const [openState, setOpenState] = useState(defaultOpen ?? false)
  const open = openProp ?? openState
  const setOpen = (next: boolean) => {
    setOpenState(next)
    onOpenChange?.(next)
  }
  const confirm = () => {
    setOpen(false)
    onConfirm?.()
  }
  const titleId = useId()
  const titleRef = useRef<HTMLHeadingElement>(null)
  const trigger = (
    <Button
      variant="ghost"
      size="s"
      iconOnly
      aria-label={title}
      className={cn('data-[state=open]:bg-group max-sm:size-11 max-sm:[&_svg]:size-5', className)}
    >
      <CircleHelp />
    </Button>
  )

  if (!wide)
    return (
      <Sheet open={open} onOpenChange={setOpen} trigger={trigger} className="overflow-hidden">
        <div className="flex min-h-13 flex-none items-center gap-2 pr-1 pl-4">
          <SheetTitle className="m-0 min-w-0 flex-1 text-[17px] leading-6 font-semibold tracking-[-0.01em]">{title}</SheetTitle>
          <SheetClose asChild>
            <Button variant="ghost" size="m" iconOnly aria-label={closeLabel}>
              <X />
            </Button>
          </SheetClose>
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto px-4 pt-1 pb-4">
          <Sections sections={sections} sheet />
          {extra && <div className="flex items-center justify-between gap-3 border-t border-n-200 pt-0.5">{extra}</div>}
        </div>
        <div className="flex flex-none gap-2 border-t border-n-200 px-4 pt-3 pb-4">
          <Button variant="secondary" className="flex-auto" onClick={confirm}>
            {confirmLabel}
          </Button>
        </div>
      </Sheet>
    )

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align={align}
        aria-labelledby={titleId}
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          titleRef.current?.focus()
        }}
        className="flex max-h-[calc(100vh-200px)] w-80 flex-col gap-4 overflow-y-auto p-4"
      >
        <div className="-my-1.5 flex items-center justify-between gap-2">
          <h2 id={titleId} ref={titleRef} tabIndex={-1} className="m-0 text-[15px] leading-5 font-semibold outline-none">
            {title}
          </h2>
          <PopoverClose asChild>
            <Button variant="ghost" size="s" iconOnly aria-label={closeLabel} className="-mr-1.5">
              <X />
            </Button>
          </PopoverClose>
        </div>
        <Sections sections={sections} sheet={false} />
        <div className="flex justify-end border-t border-n-200 pt-3">
          <Button variant="secondary" size="s" onClick={confirm}>
            {confirmLabel}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

const tile = cva('inline-flex size-5.5 flex-none items-center justify-center rounded-sm text-n-600 [&>svg]:size-3', {
  variants: {
    look: {
      /** a break, a closed time (n-100) */
      solid: 'bg-n-100',
      /** the buffer: an n-100 hatch on white with an n-200 inset line */
      hatch:
        'bg-[repeating-linear-gradient(135deg,var(--color-n-100)_0_3px,var(--color-n-0)_3px_6px)] shadow-[inset_0_0_0_1px_var(--color-n-200)]',
      /** outside hours, and busy elsewhere (plain since round 2): n-50 with a 1 px n-200 line */
      outline: 'bg-n-50 shadow-[inset_0_0_0_1px_var(--color-n-200)]',
      /** a request's mark («New time?»): the pending tint with a 1.5 px dashed pending line and ink, a 12 icon */
      pending: 'border-[1.5px] border-dashed border-st-pending-dot bg-st-pending-bg text-st-pending-ink',
    },
  },
})

/**
 * LegendTile: a 22 r6 square showing a calendar layer's fill in a StatusLegend row — solid (break, closed time, with
 * a 12 icon), hatch (buffer), outline (outside hours; busy elsewhere, which is a plain block with no icon since
 * round 2), pending (the «New time?» mark with its clock). Decorative: the row's words say what it is.
 */
export function LegendTile({ look, className, ...props }: ComponentProps<'span'> & { look: 'solid' | 'hatch' | 'outline' | 'pending' }) {
  return <span aria-hidden {...props} className={cn(tile({ look }), className)} />
}
