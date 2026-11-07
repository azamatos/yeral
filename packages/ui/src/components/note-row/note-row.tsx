import { TriangleAlert } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type NoteRowProps = ComponentProps<'div'> & {
  /** An alert note: the warning icon (18, pending ink) and nothing else; a plain note keeps the icon's column empty. */
  alert?: boolean
  /** The line under the text, 12/16 n-500: who, when, «Shown when booking» — one plain line, no pills. */
  meta?: ReactNode
  /** The row's menu on the right: an IconButton S plain «…» named by the screen (two or more actions, so a menu). */
  action?: ReactNode
}

/**
 * NoteRow — DS-Lists → 05 Callouts (A10) «Alert note on a client card · a note row, not a box»: text ink 14/20, the
 * meta under it, pad 12 0. Rows stack in one column: a line between rows that starts at the text column (30 in), none
 * above the first. Replaces the amber alert box with its violet «Shown when booking» pill and the «NOTE · THE WHOLE
 * TEAM SEES IT» caps box. The words come in as props; the icon is decorative — the meta says what the alert means.
 */
export function NoteRow({ alert, meta, action, className, children, ...props }: NoteRowProps) {
  return (
    <div {...props} className={cn('group flex items-start gap-3', className)}>
      <span aria-hidden className="mt-[13px] flex size-4.5 flex-none text-st-pending-ink">
        {alert && <TriangleAlert className="size-4.5" />}
      </span>
      <div className="flex min-w-0 flex-1 items-start gap-3 border-t border-n-200 py-3 group-first:border-t-0">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 [overflow-wrap:anywhere]">
          <span className="text-small text-n-900">{children}</span>
          {meta && <span className="text-micro text-n-500">{meta}</span>}
        </span>
        {action && <span className="flex flex-none">{action}</span>}
      </div>
    </div>
  )
}
