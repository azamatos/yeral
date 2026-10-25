import type { ReactNode } from 'react'

/** The focused header (Booking `.fh`): 72 high, its three parts; 16 at the sides on phones. */
export function FocusedHeader({ start, middle, end }: { start: ReactNode; middle?: ReactNode; end: ReactNode }) {
  return (
    <header className="grid h-18 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4 border-b border-n-200 bg-n-0 px-6 max-sm:px-4">
      <div className="flex min-w-0 items-center">{start}</div>
      {middle ?? <span />}
      <div className="flex min-w-0 justify-end">{end}</div>
    </header>
  )
}
