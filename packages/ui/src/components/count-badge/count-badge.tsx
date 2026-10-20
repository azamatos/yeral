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
        /** needs an answer: the requests in the sidebar, a workspace row, the Bookings tab (`.cnt`) */
        attention: 'border border-st-pending-line bg-st-pending-bg text-st-pending-ink',
        /** waiting, not urgent: unanswered reviews (`.cnt-n`) */
        muted: 'border border-n-200 bg-n-100 text-st-cancelled-ink',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
)

/** The rail's 8 px dot in place of the number (`.rdot`): attention or muted. */
const dot = cva('block size-2 flex-none rounded-pill', {
  variants: { tone: { neutral: 'bg-n-500', accent: 'bg-a-500', attention: 'bg-st-pending-dot', muted: 'bg-n-500' } },
  defaultVariants: { tone: 'neutral' },
})

/**
 * Small number pill: tab counts, sidebar counts, a workspace's requests. A number above `max` shows as "99+". The
 * number is decorative where the parent link says it in full ("Bookings, 6 requests"); `variant="dot"` is the rail's
 * dot (always decorative).
 */
export function CountBadge({
  tone,
  variant = 'count',
  max = 99,
  className,
  children,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof count> & { variant?: 'count' | 'dot'; max?: number }) {
  if (variant === 'dot') return <span {...props} aria-hidden className={cn(dot({ tone }), className)} />
  return (
    <span {...props} className={cn(count({ tone }), className)}>
      {typeof children === 'number' && children > max ? `${max}+` : children}
    </span>
  )
}
