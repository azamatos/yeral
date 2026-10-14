import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * Empty state (DS-Components → «Pickers & empty»): one icon in a tint circle, a title that states the fact, one line
 * on what to do, one action.
 */
export function EmptyState({
  icon,
  title,
  description,
  action,
  bordered = true,
  className,
  ...props
}: Omit<ComponentProps<'div'>, 'title'> & {
  icon: ReactNode
  title: ReactNode
  description?: ReactNode
  action?: ReactNode
  bordered?: boolean
}) {
  return (
    <div
      {...props}
      className={cn(
        'flex flex-col items-center gap-3 px-8 py-10 text-center',
        bordered && 'rounded-card border border-dashed border-n-300',
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-pill bg-a-50 text-a-500 [&_svg]:size-6.5" aria-hidden>
        {icon}
      </div>
      <div className="text-[19px] leading-6 font-semibold text-n-900">{title}</div>
      {description && <div className="max-w-85 text-body text-n-600">{description}</div>}
      {action && <div className="mt-1">{action}</div>}
    </div>
  )
}
