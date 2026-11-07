import { cva, type VariantProps } from 'class-variance-authority'
import { X } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export const tagChipVariants = cva(
  'inline-flex flex-none items-center rounded-pill border font-medium whitespace-nowrap [&_svg]:shrink-0',
  {
    variants: {
      /** m 28 (13/16) in cards and editors; s 24 (12/16) in table cells, never removable there. */
      size: {
        m: 'h-7 gap-1.5 px-2.5 text-[13px] leading-4 [&_svg]:size-3.5',
        s: 'h-6 gap-1 px-2 text-micro [&_svg]:size-3',
      },
      /**
       * own: the team's tag, filled; automatic: set by Ýeral from visits, outlined with a leading icon; reported: the
       * danger outline; trusted: the completed tones (v0.7 · D), the positive twin of reported.
       */
      kind: {
        own: 'border-transparent bg-n-100 text-n-900',
        automatic: 'border-n-300 bg-n-0 text-n-900 [&_svg]:text-n-600',
        reported: 'border-danger-line bg-n-0 text-danger-ink [&_svg]:text-danger-ink',
        trusted: 'border-st-completed-line bg-n-0 font-semibold text-st-completed-ink [&_svg]:text-st-completed-ink',
      },
    },
    compoundVariants: [
      { kind: ['automatic', 'reported', 'trusted'], size: 'm', className: 'pl-2' },
      { kind: ['automatic', 'reported', 'trusted'], size: 's', className: 'pl-1.5' },
    ],
    defaultVariants: { size: 'm', kind: 'own' },
  },
)

export type TagChipProps = Omit<ComponentProps<'span'>, 'children'> &
  VariantProps<typeof tagChipVariants> & {
    children: ReactNode
    /** A leading icon (automatic tags: New sparkle, Regular repeat, Lapsed clock, Reported flag). */
    icon?: ReactNode
    /** Your tags in an editor have a × that calls this; automatic tags never do. */
    onRemove?: () => void
    /** The ×'s name for screen readers: «Remove tag VIP». */
    removeLabel?: string
    /** The ring of a tag just added, or of the one a duplicate points at (A8 states 5 and 6). */
    highlight?: boolean
  }

/**
 * TagChip (DS-Lists A8 `.tg`, Storybook Selection/TagChip): 28 or 24 high, radius 999, #f0f0f3 for your own tags;
 * automatic ones are outlined with an icon and can't be removed. A removable chip fills n-200 on hover and its × gets
 * a n-300 circle; the × is its own button (`removeLabel`), so the chip itself stays text.
 */
export function TagChip({ size, kind, icon, onRemove, removeLabel, highlight, className, children, ...props }: TagChipProps) {
  const removable = !!onRemove && (!kind || kind === 'own')
  return (
    <span
      {...props}
      className={cn(
        tagChipVariants({ size, kind }),
        removable && 'group/tag gap-[3px] pr-[3px] hover:bg-n-200 has-[button:focus-visible]:bg-n-200',
        highlight && 'shadow-[0_0_0_2px_#ffffff,0_0_0_4px_var(--color-a-line)]',
        className,
      )}
    >
      {icon}
      {children}
      {removable && (
        <button
          type="button"
          aria-label={removeLabel}
          onClick={onRemove}
          className="inline-flex size-5 cursor-pointer items-center justify-center rounded-pill text-n-600 group-hover/tag:bg-n-300 group-hover/tag:text-n-900 focus-visible:shadow-focus focus-visible:outline-none [&_svg]:size-4"
        >
          <X aria-hidden strokeWidth={1.75} />
        </button>
      )}
    </span>
  )
}
