import { cn } from '@yeral/ui/cn'
import { Check, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'

/** How long a tapped row shows its tint and check before the step moves on (C7-Booking C4.1 «for 150 ms»). */
export const PICK_FLASH_MS = 150

/** The pick rows' frame (C7-Booking `.lst`): one bordered list, r16, the rows divided by 1px lines. */
export function PickList({ className, ...props }: ComponentProps<'div'>) {
  return <div {...props} className={cn('flex flex-col overflow-hidden rounded-card border border-n-200 bg-n-0', className)} />
}

/**
 * A pick row (C7-Booking C4.1–C4.2 `.lrow`): a button with a chevron, not a radio card. A tap tints it (`a-50`) and
 * swaps the chevron for a check for 150 ms, then `onPick` moves the step on. Hover `n-50`, the focus ring inset. One
 * chosen already (`pressed`, a service in the summary, the specialist the flow has) keeps the check in the tint's
 * colour so the step reads the choice back; the tap then is the caller's to interpret.
 */
export function PickRow({
  onPick,
  pressed = false,
  compact = false,
  className,
  children,
  ...props
}: Omit<ComponentProps<'button'>, 'onClick' | 'type'> & {
  onPick: () => void
  pressed?: boolean
  /** The services' rows: 64 high instead of 76. */
  compact?: boolean
  children: ReactNode
}) {
  const [flash, setFlash] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    [],
  )
  return (
    <button
      type="button"
      aria-pressed={pressed}
      {...props}
      onClick={() => {
        if (flash) return
        setFlash(true)
        timer.current = setTimeout(() => {
          timer.current = null
          setFlash(false)
          onPick()
        }, PICK_FLASH_MS)
      }}
      className={cn(
        'relative flex w-full cursor-pointer items-center gap-4 border-0 border-t border-n-200 bg-n-0 px-4 py-3 text-left text-n-900 first:border-t-0',
        'hover:bg-n-50 focus-visible:shadow-focus-inset focus-visible:outline-none disabled:cursor-default disabled:text-n-500 disabled:hover:bg-n-0',
        compact ? 'min-h-16' : 'min-h-19',
        flash && 'bg-a-50 hover:bg-a-50',
        className,
      )}
    >
      {children}
      {flash || pressed ? (
        <Check aria-hidden className="size-5 flex-none text-a-600" strokeWidth={2} />
      ) : (
        <ChevronRight aria-hidden className="text-n-700 size-5 flex-none" strokeWidth={1.75} />
      )}
    </button>
  )
}
