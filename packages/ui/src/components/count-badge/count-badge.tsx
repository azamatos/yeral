import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '../../lib/cn'

const count = cva(
  'inline-flex h-5 min-w-5.5 flex-none items-center justify-center rounded-pill px-1.5 text-micro font-semibold tabular-nums',
  {
    variants: {
      tone: {
        neutral: 'bg-n-100 text-n-600',
        accent: 'bg-a-50 text-a-600',
        /** needs attention, e.g. pending requests in the sidebar */
        attention: 'border border-st-pending-line bg-st-pending-bg text-st-pending-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

/** Small number pill: tab counts, sidebar counts. */
export function CountBadge({ tone, className, ...props }: ComponentProps<'span'> & VariantProps<typeof count>) {
  return <span {...props} className={cn(count({ tone }), className)} />
}
