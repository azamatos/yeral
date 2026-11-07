import { Info } from 'lucide-react'
import { Popover as PopoverPrimitive } from 'radix-ui'
import type { ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type InfoTipProps = {
  /** The button's name for screen readers: «About the internal status». */
  label: string
  /** What the popover says: one or two sentences. */
  children: ReactNode
  className?: string
}

/**
 * InfoTip (DS · Controls v0.7 · A9, `.ib` + `.ipop`): a 16 px ⓘ next to a label (or a tag) that opens a 280-wide
 * popover (13/18, padding 12, r10, raised) on click, tap or Enter; Esc and an outside click close it. It replaces the
 * hint lines under fields. The words come from the caller.
 */
export function InfoTip({ label, children, className }: InfoTipProps) {
  return (
    <PopoverPrimitive.Root>
      <PopoverPrimitive.Trigger
        type="button"
        aria-label={label}
        className={cn(
          'inline-flex size-4 flex-none cursor-pointer items-center justify-center rounded-pill border-0 bg-transparent p-0 text-n-600',
          'hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none data-[state=open]:text-n-900',
          className,
        )}
      >
        <Info aria-hidden strokeWidth={1.75} className="size-4" />
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          aria-label={label}
          side="bottom"
          align="start"
          sideOffset={6}
          collisionPadding={16}
          className="z-70 w-70 max-w-[calc(100vw-32px)] rounded-ctl-m border border-n-200 bg-n-0 p-3 text-dense font-normal text-n-900 shadow-raised outline-none data-[state=open]:animate-pop-in"
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}
