import { cn } from '@yeral/ui/cn'
import type { ReactNode, Ref } from 'react'

/** A part of the confirm step (Booking `.csec`): a line above, 28 apart, its own heading (focusable for a hand-off). */
export function Part({
  title,
  titleRef,
  className,
  children,
}: {
  title?: string
  titleRef?: Ref<HTMLHeadingElement>
  className?: string
  children: ReactNode
}) {
  return (
    <section className={cn('flex flex-col gap-4 border-t border-n-200 py-7', className)}>
      {title && (
        <h2 ref={titleRef} tabIndex={-1} className="m-0 text-[20px] leading-[26px] font-semibold tracking-[-0.015em] focus:outline-none">
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}
