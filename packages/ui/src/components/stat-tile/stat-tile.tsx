import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Skeleton } from '../skeleton'

const tileVariants = cva('flex min-w-0 flex-col border-l border-n-200 px-6 first:border-l-0 first:pl-0', {
  variants: {
    size: {
      /** key figures (B-Analytics): value 32/38, delta + caption row; 24/30 on phones */
      l: 'gap-1.5',
      /** a card's header (B-Client): value 22/28, caption */
      m: 'gap-1',
    },
  },
  defaultVariants: { size: 'l' },
})

const valueClass = {
  l: 'text-[32px] leading-[38px] font-bold tracking-[-0.02em] max-sm:text-[24px] max-sm:leading-[30px]',
  m: 'text-[22px] leading-7 font-bold tracking-[-0.015em]',
} as const

export type StatTileProps = Omit<ComponentProps<'div'>, 'children'> &
  VariantProps<typeof tileVariants> & {
    /** 11 caps label («Revenue», «Visits»). */
    label: ReactNode
    /** The figure, tabular numbers («46,200 TMT», «12»); formatted by the caller. */
    value: ReactNode
    /** The comparison beside the caption (a DeltaPill, when it exists; a Pill until then). Not on `m` tiles. */
    delta?: ReactNode
    /** 13/18 secondary line («41,250 TMT in August», «from completed visits»). */
    caption?: ReactNode
  }

/**
 * StatTile — DS-Patterns → 03 Data display «Stat tile · L 32 (key figures) and M 22 (cards)» (Storybook Data/StatTile).
 * One figure with its label, an optional delta and a caption, in a `StatRow`. `size="l"` is the analytics row
 * (B-Analytics, later), `size="m"` the client card's header (B-Client → ClientStats: Visits · Average check · Last
 * visit · No-shows). A value a role may not see (revenue, the average check) is not rendered at all, never blanked:
 * the caller leaves the tile out and the row re-flows. Words and formatted numbers come from the caller.
 */
export function StatTile({ label, value, delta, caption, size, className, ...props }: StatTileProps) {
  const s = size ?? 'l'
  return (
    <div role="listitem" {...props} className={cn(tileVariants({ size }), className)}>
      <span className="text-label text-n-500 uppercase">{label}</span>
      <span className={cn('whitespace-nowrap text-n-900 tabular-nums', valueClass[s])}>{value}</span>
      {(delta || caption) &&
        (delta ? (
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            {delta}
            {caption && <span className="text-dense text-n-600">{caption}</span>}
          </span>
        ) : (
          <span className="min-w-0 truncate text-dense text-n-600">{caption}</span>
        ))}
    </div>
  )
}

/** The loading tile: the same geometry as the content it stands for (label 72 × 14, value, caption 120 × 18). */
export function StatTileSkeleton({ size, className, ...props }: ComponentProps<'div'> & VariantProps<typeof tileVariants>) {
  return (
    <div {...props} className={cn(tileVariants({ size }), className)}>
      <Skeleton className="h-3.5 w-18 rounded-sm" />
      <Skeleton className={cn('w-22.5 rounded-sm', size === 'm' ? 'h-7' : 'h-[38px] max-sm:h-[30px]')} />
      <Skeleton className="h-4.5 w-30 rounded-sm" />
    </div>
  )
}

export type StatRowProps = ComponentProps<'div'> & {
  /** How many tiles sit side by side (a tile left out re-flows the row 4 → 3). */
  columns?: 3 | 4
  /** The tiles are skeletons: the row says `aria-busy` (it stays a list: a known tile beside a skeleton is still a list item). */
  loading?: boolean
}

/**
 * StatRow — the tiles' list: 1 px n-200 dividers between them, no boxes; 4 or 3 across, 2 × 2 on phones (the third
 * tile starts the second line without a divider). Name it (`aria-label`: «Key figures», «Statistics»); while
 * `loading` the name is the loading text.
 */
export function StatRow({ columns = 4, loading, className, ...props }: StatRowProps) {
  return (
    <div
      role="list"
      aria-busy={loading || undefined}
      {...props}
      className={cn(
        'grid max-sm:grid-cols-2 max-sm:gap-y-5 max-sm:[&>*:nth-child(3)]:border-l-0 max-sm:[&>*:nth-child(3)]:pl-0',
        columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-4',
        className,
      )}
    />
  )
}
