import { cva } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * What a key shows beside its words: a filled square (S 14 r4 with a 1 px line, M 10 r3), or a chart line 16 × 2
 * (solid accent, or dashed n-400 for the compared period). Colours are CSS values from the tokens
 * (`var(--color-st-pending-bg)`); a dashed fill draws its line dashed.
 */
export type LegendSwatch =
  { kind: 'fill'; color: string; line?: string; dashed?: boolean } | { kind: 'line'; color?: string; dashed?: boolean }

export type LegendItem = {
  label: ReactNode
  swatch?: LegendSwatch
  /** In the swatch's place: an icon 14 («By phone»). */
  icon?: ReactNode
  /** M chart keys: the figure after a bold name («Regular 151»). */
  value?: ReactNode
}

export type LegendProps = Omit<ComponentProps<'ul'>, 'children'> & {
  items: readonly LegendItem[]
  /** S (12/16, swatches 14): keys under a chart or in a layer section; M (13/18): chart keys with values. */
  size?: 's' | 'm'
}

const item = cva('inline-flex items-center whitespace-nowrap text-n-600 [&>svg]:flex-none', {
  variants: {
    size: {
      s: 'gap-1.5 text-micro [&>svg]:size-3.5',
      m: 'gap-2 text-dense [&>svg]:size-4',
    },
  },
})

function Swatch({ swatch, size }: { swatch: LegendSwatch; size: 's' | 'm' }) {
  if (swatch.kind === 'line')
    return (
      <span
        aria-hidden
        className={cn('inline-block h-0 w-4 flex-none border-t-2', swatch.dashed ? 'border-dashed' : 'border-solid')}
        style={{ borderTopColor: swatch.color ?? (swatch.dashed ? 'var(--color-n-400)' : 'var(--color-a-500)') }}
      />
    )
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block flex-none',
        size === 's' ? 'size-3.5 rounded-xs border' : 'size-2.5 rounded-[3px]',
        swatch.dashed ? 'border-dashed' : 'border-solid',
      )}
      style={{ background: swatch.color, borderColor: size === 's' ? (swatch.line ?? 'transparent') : undefined }}
    />
  )
}

/**
 * Legend (DS-Patterns → Status «Legend & status dot»; COMPONENTS.md Display/Legend, `@yeral/ui/legend`): the keys
 * under a chart or beside a plan, a wrapping list of swatch + words. S (12/16, gap 6, swatches 14 r4 with a 1 px line,
 * 8 × 18 between keys) is the row inside a StatusLegend layer section and under a plan; M (13/18, gap 8, 8 × 20
 * between keys) is for chart keys: a line 16 × 2 (solid accent, dashed n-400 for the compared period) or a 10 r3
 * swatch with a bold name and its value. Words come from the caller; beside a chart with its own hidden data table
 * the legend is decorative (`aria-hidden`). People's and pages' states (verified, open) are StatusDot, not a legend.
 */
export function Legend({ items, size = 's', className, ...props }: LegendProps) {
  return (
    <ul {...props} className={cn('m-0 flex list-none flex-wrap p-0', size === 's' ? 'gap-x-[18px] gap-y-2' : 'gap-x-5 gap-y-2', className)}>
      {items.map((it, i) => (
        <li key={i} className={item({ size })}>
          {it.icon ?? (it.swatch && <Swatch swatch={it.swatch} size={size} />)}
          {it.value !== undefined ? <b className="font-semibold text-n-900">{it.label}</b> : it.label}
          {it.value}
        </li>
      ))}
    </ul>
  )
}
