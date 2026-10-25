import { ChevronUp } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * ActionBar (DS-Patterns → «Phone patterns · sticky action bar»; Venue, Booking `.mbar`): the phone's sticky bottom
 * bar, a summary on the left and the primary L on the right (`action`), a line above it, 12 16 padding plus the
 * phone's safe area at the bottom. The summary is the caller's: a caption over a value («2 services · 1 h 45 min» over
 * `Price size="bar"`), or a title over a caption when it opens the whole booking in a sheet (`onExpand`): it's a
 * button then (`aria-haspopup="dialog"`) with a chevron. Under 1024 (24 at the sides from 768): the page hides it from
 * 1024, where the booking's summary card shows beside the steps.
 */
export function ActionBar({
  action,
  onExpand,
  expanded,
  className,
  children,
  ...props
}: ComponentProps<'div'> & {
  /** The primary L: «Continue». */
  action: ReactNode
  /** The summary opens the whole booking in a sheet. */
  onExpand?: () => void
  /** The sheet is open. */
  expanded?: boolean
}) {
  return (
    <div
      {...props}
      className={cn(
        'sticky bottom-0 z-5 flex items-center gap-3 border-t border-n-200 bg-n-0 px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] sm:px-6',
        className,
      )}
    >
      {onExpand ? (
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={expanded}
          onClick={onExpand}
          className="flex h-13 min-w-0 flex-1 cursor-pointer items-center gap-2 rounded-s border-0 bg-transparent p-0 text-left text-n-900 focus-visible:shadow-focus focus-visible:outline-none"
        >
          <span className="flex min-w-0 flex-col">{children}</span>
          <ChevronUp aria-hidden className="size-4.5 flex-none" />
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 flex-col">{children}</div>
      )}
      <div className="flex flex-none">{action}</div>
    </div>
  )
}
