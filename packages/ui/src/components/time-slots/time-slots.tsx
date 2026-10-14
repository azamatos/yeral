import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/** One start time (DS `.slot`): 40 high, tabular; solid a-500 when chosen; struck through when taken. */
export function TimeSlot({ selected, className, ...props }: ComponentProps<'button'> & { selected?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={cn(
        'h-10 min-w-18 cursor-pointer rounded-s border border-n-300 bg-n-0 px-3 text-small font-semibold text-n-900 tabular-nums',
        'hover:border-a-500 hover:text-a-600 focus-visible:shadow-focus focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:border-n-100 disabled:bg-n-50 disabled:text-n-500 disabled:line-through disabled:hover:text-n-500',
        selected && 'border-a-500 bg-a-500 text-white hover:text-white',
        className,
      )}
    />
  )
}

export type SlotGroup = { label: ReactNode; slots: { value: string; label: ReactNode; disabled?: boolean; ariaLabel?: string }[] }

/** Start times grouped by part of day — Irden / Günortan / Agşam (booking time step, date & time picker). */
export function TimeSlots({
  groups,
  value,
  onValueChange,
  className,
}: {
  groups: SlotGroup[]
  value?: string
  onValueChange: (value: string) => void
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {groups
        .filter((g) => g.slots.length > 0)
        .map((g, i) => (
          <div key={i} role="group" aria-labelledby={`slots-${i}`} className="flex flex-col gap-2.5">
            <span id={`slots-${i}`} className="text-label text-n-500 uppercase">
              {g.label}
            </span>
            <div className="flex flex-wrap gap-2">
              {g.slots.map((s) => (
                <TimeSlot
                  key={s.value}
                  selected={s.value === value}
                  disabled={s.disabled}
                  aria-label={s.ariaLabel}
                  onClick={() => onValueChange(s.value)}
                >
                  {s.label}
                </TimeSlot>
              ))}
            </div>
          </div>
        ))}
    </div>
  )
}
