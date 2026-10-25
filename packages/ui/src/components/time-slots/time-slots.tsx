import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * One start time (DS `.slot`): 40 high (s 36, min 64), tabular; solid a-500 when chosen; struck through when taken
 * (disabled).
 */
export function TimeSlot({
  selected,
  size = 'm',
  className,
  ...props
}: ComponentProps<'button'> & { selected?: boolean; size?: 'm' | 's' }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      {...props}
      className={cn(
        'cursor-pointer rounded-s border border-n-300 bg-n-0 px-3 text-small font-semibold text-n-900 tabular-nums',
        size === 's' ? 'h-9 min-w-16' : 'h-10 min-w-18',
        'hover:border-a-500 hover:text-a-600 focus-visible:shadow-focus focus-visible:outline-none',
        'disabled:cursor-not-allowed disabled:border-n-100 disabled:bg-n-50 disabled:text-n-500 disabled:line-through disabled:hover:text-n-500',
        selected && 'border-a-500 bg-a-500 text-white hover:text-white',
        className,
      )}
    />
  )
}

export type SlotGroup = {
  label: ReactNode
  slots: {
    value: string
    label: ReactNode
    /** Taken or closed: struck through; its `ariaLabel` says why («16:00, already taken»). */
    disabled?: boolean
    ariaLabel?: string
    /** A caption under the chip, 12/16 n-500: «Already taken». */
    note?: ReactNode
  }[]
}

type Selection =
  | { selectionMode?: 'single'; value?: string; onValueChange: (value: string) => void }
  | {
      /** Pick up to `max` (offering times when declining a request): each chip a toggle. */
      selectionMode: 'multiple'
      values: readonly string[]
      onValuesChange: (values: string[]) => void
      max: number
      /** The live line under the chips: «2 / 3 times selected». */
      counter?: (count: number, max: number) => ReactNode
    }

/**
 * Start times grouped by part of day (the booking time step, the date and time picker; DS-Patterns → Pickers): a caps
 * label per group, chips that wrap. One time is picked, or with `selectionMode="multiple"` up to `max` (past it a tap
 * on another chip does nothing, as B-Calendar draws it), with a live counter line 8 under them. A picked time that
 * turns taken counts no more and shows struck as any taken one (the caller drops it from `values` when it refetches).
 * `size="s"` (36) in drawers. A taken time is struck through, with a `note` under it when the screen says so. The
 * words come from the caller.
 */
export function TimeSlots({ groups, size, className, ...pick }: { groups: SlotGroup[]; size?: 'm' | 's'; className?: string } & Selection) {
  const id = useId()
  const multiple = pick.selectionMode === 'multiple'
  const taken = new Set(groups.flatMap((g) => g.slots.filter((s) => s.disabled).map((s) => s.value)))
  // what's picked and still free: a time taken since doesn't count, nor show as picked
  const picked = multiple ? pick.values.filter((v) => !taken.has(v)) : []
  const chosen = (value: string) => !taken.has(value) && (multiple ? picked.includes(value) : value === pick.value)
  const full = multiple && picked.length >= pick.max
  const toggle = (value: string) => {
    if (!multiple) return pick.onValueChange(value)
    if (picked.includes(value)) pick.onValuesChange(picked.filter((v) => v !== value))
    else if (!full) pick.onValuesChange([...picked, value])
  }
  const list = (
    <div className={cn('flex flex-col gap-6', !multiple && className)}>
      {groups
        .filter((g) => g.slots.length > 0)
        .map((g, i) => (
          <div key={i} role="group" aria-labelledby={`${id}-${i}`} className="flex flex-col gap-2.5">
            <span id={`${id}-${i}`} className="text-label text-n-500 uppercase">
              {g.label}
            </span>
            <div className="flex flex-wrap items-start gap-2">
              {g.slots.map((s) => {
                const slot = (
                  <TimeSlot
                    key={s.value}
                    size={size}
                    selected={chosen(s.value)}
                    disabled={s.disabled}
                    aria-label={s.ariaLabel}
                    onClick={() => toggle(s.value)}
                  >
                    {s.label}
                  </TimeSlot>
                )
                return s.note ? (
                  <span key={s.value} className="inline-flex flex-col items-start gap-1">
                    {slot}
                    <span className="pl-0.5 text-micro text-n-500">{s.note}</span>
                  </span>
                ) : (
                  slot
                )
              })}
            </div>
          </div>
        ))}
    </div>
  )
  if (!multiple) return list
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {list}
      {pick.counter && (
        <span role="status" className="text-dense text-n-600">
          {pick.counter(picked.length, pick.max)}
        </span>
      )}
    </div>
  )
}
