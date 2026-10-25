import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type KeyValueItem = {
  key: ReactNode
  /** Never blank: «—» or a quiet word («not given») when there's nothing, with `muted`. */
  value: ReactNode
  /** The value as a quiet word: n-600 (regular in a compact row). */
  muted?: boolean
}

const ROW = {
  /** 140 key column (110 on phones), a line between rows: drawers, booking details */
  default:
    'grid grid-cols-[140px_minmax(0,1fr)] gap-3 border-b border-n-200 py-2.25 last:border-b-0 max-sm:grid-cols-[110px_minmax(0,1fr)]',
  /** the value on the right: a client's facts */
  compact: 'flex justify-between gap-3 border-b border-n-200 py-3 last:border-b-0',
  /** three columns, the key a caps label above: a booking's facts at a glance */
  facts: 'flex min-w-0 flex-col gap-0.5',
} as const

/**
 * KeyValueList (DS-Patterns → Data «KeyValueList»): facts as a `dl`, one per item. Default: a 140 key column (110 on
 * phones) and a line between rows; compact: the value on the right; facts: a three-column grid with caps labels and
 * values on one line (cut with «…»). A value is never blank: the caller passes «—» or a quiet word (`muted`). The
 * words come from the caller.
 */
export function KeyValueList({
  items,
  variant = 'default',
  className,
  ...props
}: Omit<ComponentProps<'dl'>, 'children'> & { items: readonly KeyValueItem[]; variant?: keyof typeof ROW }) {
  const facts = variant === 'facts'
  return (
    <dl {...props} className={cn(facts ? 'm-0 grid grid-cols-3 gap-x-4 gap-y-3' : 'm-0 flex flex-col', 'text-small', className)}>
      {items.map((item, i) => (
        <div key={i} className={ROW[variant]}>
          <dt className={facts ? 'text-label text-n-500 uppercase' : 'text-n-600'}>{item.key}</dt>
          <dd
            className={cn(
              'm-0 min-w-0',
              facts ? 'truncate font-semibold tabular-nums' : 'font-medium',
              // a quiet value: n-600, at the row's weight (a compact row's «not given» regular, as drawn)
              item.muted ? cn('text-n-600', variant === 'compact' && 'font-normal') : 'text-n-900',
            )}
          >
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
