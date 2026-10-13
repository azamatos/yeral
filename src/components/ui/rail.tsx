'use client'

import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useRef, type ReactNode } from 'react'

/** Horizontal carousel: swipe on phones, arrows on desktop. */
export function Rail({ title, sub, action, children }: { title: ReactNode; sub?: ReactNode; action?: ReactNode; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const go = (d: number) => ref.current?.scrollBy({ left: d * ref.current.clientWidth * 0.8, behavior: 'smooth' })
  return (
    <section className="mx-auto max-w-[1240px] px-4 md:px-6">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <h2 className="text-[22px] font-bold tracking-[-0.02em] md:text-[26px]">{title}</h2>
          {sub && <p className="mt-0.5 text-[14px] text-ink-2">{sub}</p>}
        </div>
        <div className="flex flex-none items-center gap-2">
          {action}
          <button type="button" aria-label="Назад" onClick={() => go(-1)} className="hidden size-9 items-center justify-center rounded-full border border-line hover:bg-group-2 md:flex">
            <ChevronLeft size={18} />
          </button>
          <button type="button" aria-label="Вперёд" onClick={() => go(1)} className="hidden size-9 items-center justify-center rounded-full border border-line hover:bg-group-2 md:flex">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>
      <div ref={ref} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 px-4 pb-2 md:mx-0 md:scroll-px-0 md:px-0">
        {children}
      </div>
    </section>
  )
}

export function RailItem({ children }: { children: ReactNode }) {
  return <div className="w-[78%] flex-none snap-start sm:w-[46%] lg:w-[calc((100%-48px)/4)]">{children}</div>
}
