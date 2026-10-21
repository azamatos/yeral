import { ChevronRight } from 'lucide-react'
import { Slot } from 'radix-ui'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Sheet, SheetDivider, SheetTitle } from '../../lib/sheet'
import { Avatar } from '../avatar'
import { TAB_BAR_HEIGHT } from '../bottom-tab-bar'
import { CountBadge } from '../count-badge'

/**
 * The phone's "More" (DS-Patterns 06 · MoreSheet; B-Mobile frame 7): a sheet above the tab bar, which stays visible with
 * More in accent; the scrim, Esc, a tap outside (More again too) close it. Rows from the screen, in the board's order:
 * the workspace (the switcher's row) · Reviews · Settings · the person · My profile · … · Log out. A row the person's
 * level can't use isn't there at all.
 */
export function MoreSheet({
  open,
  onOpenChange,
  label,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The sheet's name: "More". */
  label: string
  children: ReactNode
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange} above={TAB_BAR_HEIGHT}>
      <SheetTitle className="sr-only">{label}</SheetTitle>
      <div className="flex flex-col px-2 pb-2">{children}</div>
    </Sheet>
  )
}

const row = cn(
  'm-0 flex min-h-12 w-full cursor-pointer items-center gap-3.5 rounded-s border-0 bg-transparent px-3 text-left text-[15px] leading-5 font-medium text-n-900 no-underline',
  'hover:bg-n-50 hover:text-n-900 focus-visible:shadow-focus-inset focus-visible:outline-none',
  "[&>svg]:flex-none [&>svg]:text-n-600 [&>svg:not([class*='size-'])]:size-5",
)

/**
 * A row (`.y-mr`: 48 min, icon 20, 15/20 500): a page (`drill` adds the chevron), an action, or Log out (`danger`). A
 * count (Reviews, muted) is read after the name; `hint` is quiet text at the end ("yeral.app"); `caption` a second
 * line under the name, which makes the row 56 (Contact Ýeral: "+993 64 75 45 91 · Telegram").
 */
export function MoreSheetRow({
  asChild,
  icon,
  label,
  caption,
  count,
  hint,
  drill = false,
  danger = false,
  className,
  children,
  ...props
}: ComponentProps<'button'> & {
  asChild?: boolean
  icon: ReactNode
  label: ReactNode
  caption?: ReactNode
  count?: { count: number; tone: 'attention' | 'muted'; label: string } | null
  hint?: ReactNode
  drill?: boolean
  danger?: boolean
}) {
  const Comp = asChild ? Slot.Root : 'button'
  return (
    <Comp
      {...(asChild ? {} : { type: 'button' as const })}
      {...props}
      className={cn(
        row,
        caption && 'min-h-14',
        danger && 'text-danger-ink hover:bg-error-tint hover:text-danger-ink [&>svg]:text-danger-ink',
        className,
      )}
    >
      {icon}
      {asChild && <Slot.Slottable>{children}</Slot.Slottable>}
      {caption ? (
        <span className="flex min-w-0 flex-col">
          <span>{label}</span>
          <span className="truncate text-micro font-normal text-n-600">{caption}</span>
        </span>
      ) : (
        <span className="min-w-0">{label}</span>
      )}
      {count && count.count > 0 && (
        <>
          <CountBadge aria-hidden tone={count.tone} className="ml-auto">
            {count.count}
          </CountBadge>
          <span className="sr-only">{count.label}</span>
        </>
      )}
      {hint && <span className="ml-auto text-dense font-normal text-n-600">{hint}</span>}
      {drill && <ChevronRight aria-hidden className={cn('size-4.5! text-n-500!', !(count && count.count > 0) && 'ml-auto')} />}
    </Comp>
  )
}

/** The hairline between the sheet's groups (`.y-hdiv`: 6 12). */
export const MoreSheetDivider = SheetDivider

/** The person (not a button): avatar 32, name 15/20 600, phone. The account rows follow. */
export function MoreSheetPerson({ name, phone, photo }: { name: string; phone: string; photo?: string | null }) {
  return (
    <div className="flex min-h-13 items-center gap-3.5 px-3">
      <Avatar decorative name={name} src={photo} size={32} letters={1} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-[15px] leading-5 font-semibold text-n-900">{name}</span>
        <span className="truncate text-micro text-n-600 tabular-nums">{phone}</span>
      </span>
    </div>
  )
}
