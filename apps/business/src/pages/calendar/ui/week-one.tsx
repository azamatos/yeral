import type { CalendarView } from '@yeral/contract/calendar'
import { addDays, localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { cn } from '@yeral/ui/cn'
import { useTranslations } from 'use-intl'
import { BLOCK_LOOK } from '@/entities/booking'
import { gridHours, movesIn, placedIn, shadesOf, stretchOn, weekCell } from '../model/grid'

/** B-Calendar `.wol`: 48 px an hour, no room for text. */
const HOUR = 48

/**
 * One person's week (B-Calendar `weekOne`, book B-17 step 4): seven day columns of textless blocks, the status's colour
 * alone; a day's head or column opens that day. Nothing to read in a block, so the head says the day's count.
 */
export function WeekOne({
  view,
  column: c,
  from,
  now,
  onDay,
}: {
  view: CalendarView
  column: CalendarView['columns'][number]
  /** The week's Monday. */
  from: string
  now: number
  onDay: (date: string) => void
}) {
  const t = useTranslations('calendar.week')
  const cal = useTranslations('calendar')
  const layers = useTranslations('calendar.layers')
  const fmt = useFmt()
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const bounds = days.map((d) => gridHours(view, d))
  const first = Math.min(...bounds.map((b) => b.from))
  const last = Math.max(...bounds.map((b) => b.to))
  const px = (minute: number) => ((minute - first * 60) * HOUR) / 60
  const at = localOf(now)
  const height = (last - first) * HOUR
  const place = (s: { start: number; end: number }) => ({ top: px(s.start) + 1, height: Math.max(px(s.end) - px(s.start) - 2, 6) })
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-max sm:min-w-0">
        <div className="sticky top-0 z-12 grid grid-cols-[64px_repeat(7,minmax(40px,1fr))] border-b border-n-200 bg-n-0">
          <div />
          {days.map((d) => {
            const cell = weekCell(view, c, d)
            const off = !!cell.off
            const what = off ? layers('dayOff') : cal('columnBookings', { n: cell.bookings })
            return (
              <button
                key={d}
                type="button"
                onClick={() => onDay(d)}
                className="flex min-w-0 cursor-pointer flex-col items-start gap-0.5 border-0 border-l border-solid border-n-200 bg-n-0 px-3 py-2.5 text-left hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none"
              >
                <span
                  className={cn(
                    '-ml-2 inline-flex h-6 items-center rounded-pill px-2 text-[14px] leading-[18px] font-semibold whitespace-nowrap',
                    d === at.date && 'bg-a-50 text-a-600',
                  )}
                >
                  {t('day', { weekday: fmt.weekdayShort(d), day: Number(d.slice(8)) })}
                </span>
                <span className="text-dense text-n-600">{what}</span>
                <span className="sr-only">
                  {t('cell', { name: c.name, date: fmt.weekdayDate(d) })}
                  {t('open')}
                </span>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-[64px_repeat(7,minmax(40px,1fr))]">
          <div aria-hidden className="relative" style={{ height }}>
            {Array.from({ length: last - first }, (_, i) => (
              <span
                key={i}
                className="absolute right-2.5 text-[12px] leading-[18px] text-n-500 tabular-nums"
                style={{ top: i === 0 ? 0 : i * HOUR - 9 }}
              >
                {fmt.time(((first + i) % 24) * 60)}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const day = c.days.find((x) => x.date === d)
            const placed = placedIn(view.bookings, c.staffId, d).filter((p) => p.booking.status !== 'cancelled')
            const closed = [
              ...(day?.breaks ?? []),
              ...view.blocks.flatMap((k) => (k.staffId === c.staffId ? (stretchOn(d, k) ?? []) : [])),
              ...view.elsewhere.flatMap((e) => (e.staffId === c.staffId ? (stretchOn(d, e) ?? []) : [])),
            ]
            return (
              // the head's button says the same; this is the big target for a pointer
              <button
                key={d}
                type="button"
                tabIndex={-1}
                aria-hidden
                onClick={() => onDay(d)}
                className="relative block w-full cursor-pointer overflow-hidden border-0 border-b border-l border-solid border-n-200 bg-transparent p-0 hover:bg-n-50"
                style={{ height: height + 1 }}
              >
                {shadesOf(day, first, last).map((z) => (
                  <span
                    key={z.start}
                    className="absolute inset-x-0 bg-n-50"
                    style={{ top: px(z.start), height: px(z.end) - px(z.start) }}
                  />
                ))}
                <span
                  className="pointer-events-none absolute inset-0 z-1"
                  style={{ backgroundImage: `repeating-linear-gradient(to bottom, var(--color-n-200) 0 1px, transparent 1px ${HOUR}px)` }}
                />
                {closed.map((s) => (
                  <span key={s.start} className="absolute right-1 left-1 z-2 block rounded-[4px] bg-n-100" style={place(s)} />
                ))}
                {placed.map((p) => (
                  <span
                    key={p.booking.code}
                    data-testid="week-block"
                    className={cn('absolute right-1 left-1 z-2 block rounded-[4px]', BLOCK_LOOK[p.booking.status])}
                    style={place(p)}
                  />
                ))}
                {movesIn(view.moves, c.staffId, d).map((m) => (
                  <span
                    key={m.move.code}
                    className={cn('absolute right-1 left-1 z-2 block rounded-[4px]', BLOCK_LOOK.pending)}
                    style={place(m)}
                  />
                ))}
                {d === at.date && at.min >= first * 60 && at.min <= last * 60 && (
                  <span className="absolute inset-x-0 z-3 block h-0.5 bg-a-500" style={{ top: px(at.min) }} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
