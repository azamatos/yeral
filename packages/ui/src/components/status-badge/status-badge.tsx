import { cva } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'noshow'

const badge = cva(
  'inline-flex h-6.5 items-center gap-1.5 justify-self-start rounded-pill border px-2.5 text-dense font-semibold whitespace-nowrap [&_svg]:size-3.5',
  {
    variants: {
      status: {
        pending: 'border-st-pending-line bg-st-pending-bg text-st-pending-ink',
        confirmed: 'border-st-confirmed-line bg-st-confirmed-bg text-st-confirmed-ink',
        completed: 'border-st-completed-line bg-st-completed-bg text-st-completed-ink',
        cancelled: 'border-st-cancelled-line bg-st-cancelled-bg text-st-cancelled-ink',
        noshow: 'border-st-noshow-line bg-st-noshow-bg text-st-noshow-ink',
      },
    },
  },
)

const dot: Record<BookingStatus, string> = {
  pending: 'bg-st-pending-dot',
  confirmed: 'bg-st-confirmed-dot',
  completed: 'bg-st-completed-dot',
  cancelled: 'bg-st-cancelled-dot',
  noshow: 'bg-st-noshow-dot',
}

/**
 * Booking status — one colour and one shape in every app (Main → «Booking statuses»). The label comes from i18n
 * (Garaşylýar · Tassyklandy · Tamamlandy · Ýatyryldy · Gelmedi). `icon` replaces the dot: cancelled by client vs
 * by business show a different icon with the same colour.
 */
export function StatusBadge({
  status,
  icon,
  className,
  children,
  ...props
}: ComponentProps<'span'> & { status: BookingStatus; icon?: ReactNode }) {
  return (
    <span {...props} className={cn(badge({ status }), className)}>
      {icon ?? <span aria-hidden className={cn('size-1.5 rounded-pill', dot[status])} />}
      {children}
    </span>
  )
}
