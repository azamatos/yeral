import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

const TONES = {
  success: { ink: 'text-st-completed-ink', dot: 'bg-st-completed-dot' },
  warning: { ink: 'text-st-pending-ink', dot: 'bg-st-pending-dot' },
  neutral: { ink: 'text-st-cancelled-ink', dot: 'bg-st-cancelled-dot' },
  muted: { ink: 'text-n-500', dot: 'bg-n-500' },
} as const

export type StatusDotTone = keyof typeof TONES

/**
 * StatusDot (DS-Patterns → Legend + StatusDot): a state in words with an 8 px dot before it, «Verified», «Active»,
 * «Invited · 6 days left», «Closed today · Opens tomorrow at 09:00»: the label 14/20 600 in the tone's ink, an optional
 * detail in n-600 after a «·». Four tones: success, warning, neutral (slate), muted. The words come from the caller;
 * the dot and the «·» are decoration.
 */
export function StatusDot({
  tone = 'neutral',
  detail,
  className,
  children,
  ...props
}: ComponentProps<'span'> & { tone?: StatusDotTone; detail?: ReactNode }) {
  const { ink, dot } = TONES[tone]
  return (
    <span {...props} className={cn('inline-flex items-center gap-2 text-small font-semibold whitespace-nowrap', ink, className)}>
      <span aria-hidden className={cn('size-2 flex-none rounded-pill', dot)} />
      {children}
      {detail != null && detail !== false && (
        <span className="font-normal text-n-600">
          <span aria-hidden>· </span>
          {detail}
        </span>
      )}
    </span>
  )
}
