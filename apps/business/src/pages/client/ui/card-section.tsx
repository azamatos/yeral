import { SectionHeader } from '@yeral/ui/section-header'
import { useId, type ReactNode } from 'react'

/** A section of the card (B-Client `.sec`): a line above, the row with its title, count and action. */
export function CardSection({
  title,
  count,
  action,
  children,
}: {
  title: ReactNode
  count?: ReactNode
  action?: ReactNode
  children: ReactNode
}) {
  const id = useId()
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3 border-t border-n-200 py-7">
      <SectionHeader titleId={id} title={title} count={count} action={action} />
      {children}
    </section>
  )
}

/** The section's quiet line (B-Client `.cap`): «No notes yet», «Only the team sees them». */
export function Caption({ children }: { children: ReactNode }) {
  return <span className="text-dense text-n-600">{children}</span>
}
