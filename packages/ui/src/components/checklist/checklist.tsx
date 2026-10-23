import { Check } from 'lucide-react'
import type { ComponentProps, ReactNode } from 'react'
import { cn } from '../../lib/cn'

export type ChecklistStatus = 'done' | 'current' | 'todo'

export interface ChecklistItem {
  id: string
  status: ChecklistStatus
  title: ReactNode
  caption?: ReactNode
  /** The item's own icon (16), shown in the marker until it's done. */
  icon: ReactNode
  /** What to do next, at the row's end: a link «Add». Not shown once the item is done. */
  action?: ReactNode
  /** At the end of a done row, in success ink: «Added». */
  doneText?: ReactNode
}

const marker = {
  done: 'bg-st-completed-bg text-st-completed-ink',
  current: 'bg-n-0 text-a-600 shadow-[inset_0_0_0_2px_var(--color-a-500)]',
  todo: 'bg-group text-n-500',
} as const

export type ChecklistProps = Omit<ComponentProps<'section'>, 'title'> & {
  /** The heading: «Make your page stronger». */
  title: ReactNode
  /** The heading's level on the page. */
  titleAs?: 'h2' | 'h3'
  /** The count at the heading's end: «1 / 3 done» (the screen's words). */
  countLabel: ReactNode
  /** The done marker's name for screen readers: «Done». */
  doneLabel: string
  items: readonly ChecklistItem[]
}

/**
 * Checklist (DS-Patterns → Feedback «Checklist»; B-Onboarding's last step, later B-Analytics' first weeks): a heading
 * with the count, a 4 px meter, and the items as a list. Each item's 28 marker is its state: done (success tint with
 * a check, read out as «Done»), current (white with the 2 px a-500 ring and the item's icon), todo (group fill, n-500
 * icon). A done item keeps its words, quieter, with `doneText` instead of its action. The frame around it, if any,
 * is the screen's.
 */
export function Checklist({ title, titleAs: Title = 'h3', countLabel, doneLabel, items, className, ...props }: ChecklistProps) {
  const done = items.filter((item) => item.status === 'done').length
  return (
    <section {...props} className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-baseline justify-between gap-4">
        <Title className="m-0 text-[17px] leading-6 font-semibold tracking-[-0.01em] text-n-900">{title}</Title>
        <span className="shrink-0 text-dense text-n-600">{countLabel}</span>
      </div>
      {/* the count above says it in words: the meter is only a picture of it */}
      <span aria-hidden className="block h-1 overflow-hidden rounded-pill bg-n-100">
        <span
          className="block h-full rounded-pill bg-a-500 transition-[width] duration-200 motion-reduce:transition-none"
          style={{ width: `${items.length ? (done / items.length) * 100 : 0}%` }}
        />
      </span>
      <ul className="m-0 flex list-none flex-col p-0 pt-1">
        {items.map((item) => (
          <li key={item.id} className="flex items-center gap-3 border-t border-n-200 py-3 text-body text-n-900 last:border-b">
            <span
              {...(item.status === 'done' ? { role: 'img', 'aria-label': doneLabel } : { 'aria-hidden': true })}
              className={cn('inline-flex size-7 shrink-0 items-center justify-center rounded-pill [&_svg]:size-4', marker[item.status])}
            >
              {item.status === 'done' ? <Check aria-hidden strokeWidth={2} /> : item.icon}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-0.5">
              <span className={item.status === 'done' ? 'font-medium text-n-600' : 'font-semibold'}>{item.title}</span>
              {item.caption ? <span className="text-dense text-n-600">{item.caption}</span> : null}
            </span>
            {item.status === 'done' ? (
              item.doneText ? (
                <span className="shrink-0 text-small font-semibold text-st-completed-ink">{item.doneText}</span>
              ) : null
            ) : (
              item.action
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
