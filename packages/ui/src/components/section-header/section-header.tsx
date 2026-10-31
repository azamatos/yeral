import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type SectionHeaderProps = Omit<ComponentProps<'div'>, 'title'> & {
  /** The section's name («Notes», «Upcoming», «History»). */
  title: ReactNode
  /** Renders the title as an `h2` (default) or `h3`, by the page's outline. */
  as?: 'h2' | 'h3'
  /** `id` for the heading, so the section can point at it (`aria-labelledby`). */
  titleId?: string
  /** The count beside the title (13/18 secondary): «2», «12 visits». */
  count?: ReactNode
  /** What sits at the end of the row: an S secondary button («Add note») or a caption («Only the team sees them»). */
  action?: ReactNode
}

/**
 * SectionHeader — DS-Patterns → 03 Data display «Section header row» (Storybook Display/SectionHeader), from B-Client
 * (`.shrow .sh`: Notes · Upcoming · History · Reports), B-Settings, B-Services. A 36-high row: title 17/24 600, the
 * count in the secondary colour, and a trailing action pushed to the end. The row wraps on narrow widths. Words
 * come from the caller.
 */
export function SectionHeader({ title, as: Heading = 'h2', titleId, count, action, className, ...props }: SectionHeaderProps) {
  return (
    <div {...props} className={cn('flex min-h-9 flex-wrap items-center gap-x-2.5 gap-y-1', className)}>
      <Heading id={titleId} className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">
        {title}
      </Heading>
      {count !== undefined && count !== null && <span className="text-dense text-n-600">{count}</span>}
      {action && (
        <>
          <span className="flex-1" />
          {action}
        </>
      )}
    </div>
  )
}
