import type { CalendarView } from '@yeral/contract/calendar'
import { addDays, localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { cn } from '@yeral/ui/cn'
import { Coffee, Lock } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { BookingHoverCard, WeekBlock } from '@/entities/booking'
import { gridHours, lanesOf, movesIn, placedIn, shadesOf, stretchOn, weekCell } from '../model/grid'

/** B7-Calendar: 68 px an hour, so 09:00–20:00 fits a 900-high screen and every block has room for words. */
const HOUR = 68

/**
 * One person's week (B7-Calendar · B3): seven day columns where every block says when, who and what (by its length:
 * the time range, client and service; the start and client; a dot, the start and «Jahan B.»), bookings at one time
 * side by side, the breaks, closed time and time busy elsewhere as in the day, the shift's edges shaded, the now line
 * on today. Hover or focus shows the booking's card; a click opens it (`onOpen`). A day's head opens that day.
 */
export function WeekOne({
  view,
  column: c,
  from,
  now,
  picked,
  timer,
  onDay,
  onOpen,
}: {
  view: CalendarView
  column: CalendarView['columns'][number]
  /** The week's Monday. */
  from: string
  now: number
  /** The booking open in the drawer: ringed. */
  picked?: string
  /** A request's time left, as the day grid draws it. */
  timer: (until: number | null) => { node: ReactNode; text: string } | null
  onDay: (date: string) => void
  onOpen: (pick: { booking: string } | { request: string }) => void
}) {
  const t = useTranslations('calendar.week')
  const cal = useTranslations('calendar')
  const block = useTranslations('calendar.block')
  const layers = useTranslations('calendar.layers')
  const fmt = useFmt()
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const bounds = days.map((d) => gridHours(view, d))
  const first = Math.min(...bounds.map((b) => b.from))
  const last = Math.max(...bounds.map((b) => b.to))
  const px = (minute: number) => ((minute - first * 60) * HOUR) / 60
  const at = localOf(now)
  const height = (last - first) * HOUR
  const place = (s: { start: number; end: number }, lane = 0, lanes = 1) => ({
    top: px(s.start) + 1,
    height: Math.max(px(s.end) - px(s.start) - 2, 14),
    left: `calc(3px + ${(lane * 100) / lanes}%)`,
    width: `calc(${100 / lanes}% - 6px)`,
  })
  const layer = (s: { start: number; end: number }, icon: ReactNode, text: string, look: string, key: string) => (
    <span
      key={key}
      className={cn(
        'absolute right-[3px] left-[3px] z-2 flex items-start gap-1 overflow-hidden rounded-[6px] px-1.5 py-0.5 text-[11px] leading-[14px] font-semibold whitespace-nowrap text-n-600',
        look,
      )}
      style={{ top: px(s.start) + 1, height: Math.max(px(s.end) - px(s.start) - 2, 14) }}
    >
      {icon}
      <span className="truncate">{text}</span>
      <span className="sr-only">{layers('at', { time: fmt.timeRange(s.start, s.end) })}</span>
    </span>
  )
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div className="min-w-max sm:min-w-0">
        <div className="sticky top-0 z-12 grid grid-cols-[56px_repeat(7,minmax(96px,1fr))] border-b border-n-200 bg-n-0">
          <div />
          {days.map((d) => {
            const cell = weekCell(view, c, d)
            const off = cell.off
            const what = off
              ? off === 'none' || off.kind === 'dayoff'
                ? layers('dayOff')
                : off.kind === 'timeoff'
                  ? layers('timeOff')
                  : off.name
                    ? layers('closedFor', { reason: off.name })
                    : layers('closed')
              : t('count', { bookings: cal('columnBookings', { n: cell.bookings }), requests: cell.requests })
            return (
              <button
                key={d}
                type="button"
                onClick={() => onDay(d)}
                className="flex h-[53px] min-w-0 cursor-pointer flex-col items-start justify-center gap-0.5 border-0 border-l border-solid border-n-200 bg-n-0 px-2.5 text-left hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none"
              >
                <span
                  className={cn(
                    '-ml-2 inline-flex h-[22px] items-center rounded-pill px-2 text-[14px] leading-[18px] font-semibold whitespace-nowrap',
                    d === at.date && 'bg-a-50 text-a-600',
                  )}
                >
                  {t('day', { weekday: fmt.weekdayShort(d), day: Number(d.slice(8)) })}
                </span>
                <span
                  className={cn(
                    'max-w-full truncate text-[12px] leading-4 text-n-600',
                    cell.requests > 0 && !cell.off && 'font-semibold text-st-pending-ink',
                  )}
                >
                  {what}
                </span>
                <span className="sr-only">
                  {t('cell', { name: c.name, date: fmt.weekdayDate(d) })}
                  {t('open')}
                </span>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-[56px_repeat(7,minmax(96px,1fr))]">
          <div aria-hidden className="relative" style={{ height }}>
            {Array.from({ length: last - first }, (_, i) => (
              <span
                key={i}
                className="absolute right-2 text-[11px] leading-4 text-n-500 tabular-nums"
                style={{ top: i === 0 ? 0 : i * HOUR - 8 }}
              >
                {fmt.time(((first + i) % 24) * 60)}
              </span>
            ))}
          </div>
          {days.map((d) => {
            const day = c.days.find((x) => x.date === d)
            const placed = lanesOf(placedIn(view.bookings, c.staffId, d))
            const blocks = view.blocks.flatMap((k) => (k.staffId === c.staffId ? (stretchOn(d, k) ?? []) : []))
            const busy = view.elsewhere.flatMap((e) => (e.staffId === c.staffId ? (stretchOn(d, e) ?? []) : []))
            return (
              <div
                key={d}
                role="group"
                aria-label={fmt.weekdayDate(d)}
                className="relative overflow-hidden border-b border-l border-n-200"
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
                {(day?.breaks ?? []).map((s) =>
                  layer(
                    s,
                    <Coffee aria-hidden strokeWidth={2} className="mt-px size-3 flex-none" />,
                    layers('break'),
                    'bg-n-100',
                    `b${s.start}`,
                  ),
                )}
                {blocks.map((k) =>
                  layer(
                    k,
                    <Lock aria-hidden strokeWidth={2} className="mt-px size-3 flex-none" />,
                    k.reason ? layers('closedFor', { reason: k.reason }) : layers('closed'),
                    'bg-n-100',
                    `k${k.start}`,
                  ),
                )}
                {busy.map((e) => layer(e, null, layers('elsewhere'), 'border border-n-200 bg-n-50 font-medium', `e${e.start}`))}
                {placed.map((p) => {
                  const b = p.booking
                  const hold = b.status === 'pending' ? timer(b.holdUntil) : null
                  return (
                    <WeekBlock
                      key={b.code}
                      status={b.status}
                      start={p.start}
                      end={p.end}
                      name={b.client.name ?? block('unnamed')}
                      service={p.items.map((i) => i.service).join(' + ')}
                      style={place(p, p.lane, p.lanes)}
                      phone={b.source === 'phone'}
                      walkIn={b.source === 'walkin'}
                      alert={b.alert}
                      timer={hold?.node}
                      timerText={hold?.text}
                      selected={picked === b.code}
                      card={
                        <BookingHoverCard booking={b} date={d} start={p.start} end={p.end} onOpen={() => onOpen({ booking: b.code })} />
                      }
                      onOpen={() =>
                        onOpen(b.status === 'pending' ? { request: b.code } : b.move ? { request: b.move.code } : { booking: b.code })
                      }
                    />
                  )
                })}
                {movesIn(view.moves, c.staffId, d).map((m) => {
                  const hold = timer(m.move.holdUntil)
                  return (
                    <WeekBlock
                      key={m.move.code}
                      status="pending"
                      start={m.start}
                      end={m.end}
                      name={block('newTime')}
                      service={m.move.client.name ?? block('unnamed')}
                      style={place(m)}
                      timer={hold?.node}
                      timerText={hold?.text}
                      onOpen={() => onOpen({ request: m.move.code })}
                    />
                  )
                })}
                {d === at.date && at.min >= first * 60 && at.min <= last * 60 && (
                  <span
                    className="pointer-events-none absolute inset-x-0 z-6 block h-0.5 bg-a-500 before:absolute before:top-[-3px] before:left-[-4px] before:size-2 before:rounded-pill before:bg-a-500"
                    style={{ top: px(at.min) }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
