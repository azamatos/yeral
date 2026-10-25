import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * PageHeader (DS-Patterns → «Page headers»): a page's title block. A client page: the H1 32/38 700 and the tabs 20
 * under it (My bookings). A drill-down: the back link, then the avatar 48, the title (h2 22/28 700) with a subtitle
 * 14/20 n-600, and an action at the right (Open her calendar). Tabs with counts under the business app's top bar are
 * the `tabs` alone (the top bar holds the title). Composition only: `back` (a BackLink), `avatar`, `actions` and `tabs`
 * (a TabsList) are the caller's; the words too.
 */
export function PageHeader({
  title,
  level = 1,
  subtitle,
  back,
  avatar,
  actions,
  tabs,
  className,
  ...props
}: Omit<ComponentProps<'header'>, 'title'> & {
  title?: ReactNode
  /** 1: a page's H1 (32/38); 2: a drill-down's title (22/28). */
  level?: 1 | 2
  subtitle?: ReactNode
  back?: ReactNode
  avatar?: ReactNode
  actions?: ReactNode
  tabs?: ReactNode
}) {
  const Heading = level === 1 ? 'h1' : 'h2'
  const titled = title != null && title !== false && title !== ''
  return (
    <header {...props} className={cn('flex flex-col', back ? 'gap-2' : 'gap-5', className)}>
      {back && <div className="-ml-1 flex">{back}</div>}
      {(titled || avatar || actions) && (
        // the action at the right, or on a line of its own when the title needs the room
        <div className="flex w-full flex-wrap items-center gap-3.5">
          {avatar}
          {(titled || subtitle) && (
            <div className="flex min-w-0 flex-col">
              {titled && <Heading className={cn('m-0 text-n-900', level === 1 ? 'text-h2' : 'text-h3 font-bold')}>{title}</Heading>}
              {subtitle && <span className="text-small text-n-600">{subtitle}</span>}
            </div>
          )}
          {actions && <div className="ml-auto flex flex-none items-center gap-2">{actions}</div>}
        </div>
      )}
      {tabs}
    </header>
  )
}
