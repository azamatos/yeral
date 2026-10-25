import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export const pillVariants = cva(
  'inline-flex flex-none items-center rounded-pill border font-semibold whitespace-nowrap [&_svg]:flex-none [&_svg]:stroke-2',
  {
    variants: {
      tone: {
        neutral: 'border-n-200 bg-group text-n-600',
        slate: 'border-st-cancelled-line bg-st-cancelled-bg text-st-cancelled-ink',
        accent: 'border-a-line bg-a-50 text-a-600',
        success: 'border-st-completed-line bg-st-completed-bg text-st-completed-ink',
        warning: 'border-st-pending-line bg-st-pending-bg text-st-pending-ink',
        danger: 'border-danger-line bg-error-tint text-danger-ink',
        outline: 'border-a-line bg-n-0 text-a-600',
        /** on a photo */
        ink: 'border-n-900 bg-n-900 text-white',
      },
      size: {
        s: 'h-5 gap-1 px-1.75 text-micro [&_svg]:size-3',
        m: 'h-6 gap-1 px-2 text-micro [&_svg]:size-3',
        l: 'h-7 gap-1.5 px-2.5 text-dense [&_svg]:size-3.5 [&_svg]:stroke-[1.75]',
      },
    },
    defaultVariants: { tone: 'neutral', size: 'm' },
  },
)

export type PillProps = ComponentProps<'span'> & VariantProps<typeof pillVariants> & { icon?: ReactNode }

/**
 * Pill (DS-Patterns → Status «Pill · tones × sizes»): a tag in a list, a card or a drawer: Regular, Every year, Closed,
 * VIP, New. Eight tones (neutral, slate, accent, success, warning, danger, outline, ink on a photo) and three sizes
 * (s 20, m 24, l 28); an icon before the text (12, 14 on l, aria-hidden by the caller). A plain span: not for booking
 * statuses (StatusBadge) and not a button (Chip). The text comes from the caller.
 */
export function Pill({ tone, size, icon, className, children, ...props }: PillProps) {
  return (
    <span {...props} className={cn(pillVariants({ tone, size }), className)}>
      {icon}
      {children}
    </span>
  )
}
