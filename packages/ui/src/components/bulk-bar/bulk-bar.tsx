import { X } from 'lucide-react'
import type { ComponentProps, CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { TAB_BAR_HEIGHT } from '../bottom-tab-bar'
import { Button } from '../button'

export type BulkBarProps = ComponentProps<'div'> & {
  /** «2 selected», formatted by the caller (the plural is the screen's). */
  count: ReactNode
  /** The ×-button at the end: its name («Clear selection») and what it does. */
  clearLabel: string
  onClear: () => void
  /** The actions, as on-ink buttons: `Button` S `inverse-solid` (the one main action) and `inverse-outline`. */
  children?: ReactNode
  /** The region's name («Selected bookings»): part of the contract, a nameless region isn't a landmark. */
  'aria-label': string
}

/**
 * BulkBar — DS-Patterns → Table «bulk bar» and DS-Business «Request row · booking row · bulk bar», from B-Bookings
 * (`.bulk`; Storybook Data/BulkBar). The ink bar at the table's foot, sticky to the viewport's bottom (above the tab
 * bar on phones): «2 selected» + the actions (Confirm · Decline · Export CSV) + clear. Its buttons are `Button` S in
 * the on-ink set; a disabled one keeps the transparent fill with an n-600 line. A region: name it (`aria-label`
 * «Selected bookings»); the count is announced as it changes. Words come from the caller.
 */
export function BulkBar({ count, clearLabel, onClear, children, className, style, ...props }: BulkBarProps) {
  return (
    <div
      role="region"
      aria-live="polite"
      {...props}
      // on phones the bar sits above the fixed tab bar, safe-area inset included
      style={{ ...style, '--tab-bar': TAB_BAR_HEIGHT } as CSSProperties}
      className={cn(
        'sticky bottom-0 z-5 flex flex-wrap items-center gap-3 rounded-b-[15px] bg-n-900 py-3 pr-3 pl-5 text-white max-sm:bottom-(--tab-bar)',
        // S buttons are 44 high with radius 12 on phones (B-Bookings `.b-sm` under 768)
        'max-sm:[&_button]:h-11 max-sm:[&_button]:rounded-m',
        className,
      )}
    >
      <span className="text-small font-semibold">{count}</span>
      <span className="flex-1" />
      {children}
      <Button variant="inverse-ghost" size="s" iconOnly aria-label={clearLabel} onClick={onClear} className="max-sm:w-11">
        <X aria-hidden />
      </Button>
    </div>
  )
}
