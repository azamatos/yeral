import type { CSSProperties } from 'react'

/**
 * The booking at the time picked (B-Calendar `.ghost`): dashed, its time and client. It says nothing to a screen reader
 * (the confirm does) and lets a click through to the slots under it.
 */
export function MoveGhost({ time, client, style }: { time: string; client: string; style: CSSProperties }) {
  return (
    <div
      aria-hidden
      data-testid="move-ghost"
      style={style}
      className="pointer-events-none absolute right-1 left-1 z-6 flex flex-col gap-px overflow-hidden rounded-[8px] border-[1.5px] border-dashed border-a-500 bg-n-0 px-2 py-1 text-a-600 shadow-[0_8px_24px_rgba(16,16,20,.16)]"
    >
      <span className="text-[12px] leading-4 font-semibold">{time}</span>
      <span className="truncate text-[14px] leading-[18px] font-semibold">{client}</span>
    </div>
  )
}
