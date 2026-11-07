import type { CalendarView } from '@yeral/contract/calendar'
import { addDays } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Clock } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { BOOKING_STATUS_ICON, HoverCard } from '@/entities/booking'
import { gridHours, movesIn, placedIn, shadesOf, stretchOn, weekCell, type WeekCell } from '../model/grid'

/** The bar's tones (B7-Calendar `.mtl`): working time grey, each status its dot colour, busy elsewhere n-400. */
const TONE = {
  pending: 'bg-st-pending-dot',
  confirmed: 'bg-st-confirmed-dot',
  completed: 'bg-st-completed-dot',
  noshow: 'bg-st-noshow-dot',
  elsewhere: 'bg-n-400',
} as const

/**
 * The team's week (B7-Calendar · B3, TeamWeekMatrix): a row per person, a column per day, each cell that person's day
 * as a 10 px timeline on one scale (so a glance down a column shows who is busy in the morning), the count with the
 * waiting requests in amber and the first–last time; «Day off», «Time off», «No bookings» as words. Hover or focus
 * shows the day's bookings; a click opens that person's day.
 */
export function WeekAll({
  view,
  from,
  today,
  onDay,
}: {
  view: CalendarView
  /** The week's Monday. */
  from: string
  today: string
  onDay: (date: string, staffId: string) => void
}) {
  const t = useTranslations('calendar.week')
  const c = useTranslations('calendar')
  const layers = useTranslations('calendar.layers')
  const block = useTranslations('calendar.block')
  const fmt = useFmt()
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const bounds = days.map((d) => gridHours(view, d))
  const first = Math.min(...bounds.map((b) => b.from)) * 60
  const last = Math.max(...bounds.map((b) => b.to)) * 60
  const pct = (minute: number) => `${((Math.min(Math.max(minute, first), last) - first) * 100) / (last - first)}%`
  const span = (s: { start: number; end: number }) => ({ left: pct(s.start), width: `calc(${pct(s.end)} - ${pct(s.start)})` })
  const offLabel = (off: NonNullable<WeekCell['off']>) =>
    off === 'none' || off.kind === 'dayoff'
      ? layers('dayOff')
      : off.kind === 'timeoff'
        ? layers('timeOff')
        : off.name
          ? layers('closedFor', { reason: off.name })
          : layers('closed')
  const rows = view.columns.map((column) => ({ column, cells: days.map((d) => weekCell(view, column, d)) }))
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <div
        role="table"
        aria-label={t('table')}
        className="grid min-w-[952px] grid-cols-[168px_repeat(7,minmax(112px,1fr))] lg:grid-cols-[220px_repeat(7,minmax(112px,1fr))]"
      >
        <div role="row" className="contents">
          <div
            role="columnheader"
            className="sticky top-0 z-12 flex h-[53px] items-center border-b border-n-200 bg-n-0 pr-3 pl-8 text-[13px] leading-[18px] font-semibold text-n-600"
          >
            {t('people', { n: view.columns.length })}
          </div>
          {days.map((d, i) => (
            <div
              key={d}
              role="columnheader"
              className="sticky top-0 z-12 flex h-[53px] flex-col items-start justify-center gap-0.5 border-b border-l border-n-200 bg-n-0 px-3"
            >
              <span
                className={cn(
                  '-ml-2 inline-flex h-[22px] items-center rounded-pill px-2 text-[14px] leading-[18px] font-semibold whitespace-nowrap',
                  d === today && 'bg-a-50 text-a-600',
                )}
              >
                {t('day', { weekday: fmt.weekdayShort(d), day: Number(d.slice(8)) })}
              </span>
              <span className="text-[12px] leading-4 text-n-600">
                {c('columnBookings', { n: rows.reduce((sum, r) => sum + (r.cells[i]?.bookings ?? 0), 0) })}
              </span>
            </div>
          ))}
        </div>
        {rows.map(({ column: person, cells }) => (
          <div key={person.staffId} role="row" className="contents">
            <div role="rowheader" className="flex min-w-0 items-center gap-2.5 border-b border-n-200 py-3 pr-3 pl-8">
              <Avatar name={person.name} src={person.photo?.url} size={28} letters={1} tone="tint" decorative />
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[14px] leading-5 font-semibold text-n-900" title={person.name}>
                  {person.name}
                </span>
                {!person.hasApp && <span className="text-[12px] leading-4 text-n-600">{c('noApp')}</span>}
              </span>
            </div>
            {cells.map((cell) => {
              const d = cell.date
              const day = person.days.find((x) => x.date === d)
              const off = cell.off && offLabel(cell.off)
              const live = placedIn(view.bookings, person.staffId, d).filter((p) => p.booking.status !== 'cancelled')
              const moves = movesIn(view.moves, person.staffId, d)
              const busy = view.elsewhere.flatMap((e) => (e.staffId === person.staffId ? (stretchOn(d, e) ?? []) : []))
              const all = [...live, ...moves, ...busy]
              // the first and last of her bookings; time busy elsewhere is in the bar and the card, not the range
              const timed = [...live, ...moves]
              const range = timed.length
                ? fmt.timeRange(Math.min(...timed.map((x) => x.start)), Math.max(...timed.map((x) => x.end)))
                : null
              const shades = shadesOf(day, first / 60, last / 60)
              const count = c('columnBookings', { n: cell.bookings })
              const who = t('dayCard', { name: person.name, date: fmt.shortWeekdayDate(d) })
              const card = (
                <div className="flex flex-col gap-2">
                  <p className="m-0 text-ctl-m leading-5 font-semibold text-n-900">{who}</p>
                  <p className="m-0 text-dense text-n-600">
                    {off ??
                      (range
                        ? t('bar', { bookings: t('count', { bookings: count, requests: cell.requests }), time: range })
                        : t('noBookings'))}
                  </p>
                  {all.length > 0 && (
                    <ul className="m-0 flex list-none flex-col p-0">
                      {[
                        ...live.map((p) => ({ ...p, kind: 'booking' as const })),
                        ...moves.map((m) => ({ ...m, kind: 'move' as const })),
                        ...busy.map((e) => ({ ...e, kind: 'busy' as const })),
                      ]
                        .sort((a, b) => a.start - b.start)
                        .map((x) => {
                          const Icon = x.kind === 'busy' ? null : BOOKING_STATUS_ICON[x.kind === 'move' ? 'pending' : x.booking.status]
                          return (
                            <li
                              key={`${x.kind}${x.start}${'booking' in x ? x.booking.code : ''}`}
                              className="grid grid-cols-[16px_84px_minmax(0,1fr)] items-start gap-x-2 border-t border-n-100 py-1.5 first:border-t-0"
                            >
                              {Icon ? <Icon aria-hidden strokeWidth={2} className="mt-0.5 size-3.5 text-n-600" /> : <span />}
                              <span className="text-[13px] leading-[18px] font-semibold text-n-900 tabular-nums">
                                {fmt.timeRange(x.start, x.end)}
                              </span>
                              <span className="flex min-w-0 flex-col">
                                <span
                                  className={cn(
                                    'truncate text-[13px] leading-[18px] font-medium',
                                    x.kind === 'busy' ? 'text-n-600' : 'text-n-900',
                                  )}
                                >
                                  {x.kind === 'busy'
                                    ? layers('elsewhere')
                                    : x.kind === 'move'
                                      ? block('newTime')
                                      : (x.booking.client.name ?? block('unnamed'))}
                                </span>
                                {x.kind !== 'busy' && (
                                  <span className="truncate text-[12px] leading-4 text-n-600">
                                    {x.kind === 'move'
                                      ? (x.move.client.name ?? block('unnamed'))
                                      : x.items.map((i) => i.service).join(' + ')}
                                  </span>
                                )}
                              </span>
                            </li>
                          )
                        })}
                    </ul>
                  )}
                  <Button variant="secondary" size="s" className="self-start" onClick={() => onDay(d, person.staffId)}>
                    {t('openDay', { name: person.name })}
                  </Button>
                </div>
              )
              return (
                <div key={d} role="cell" className="contents">
                  <HoverCard card={card} label={who} side="bottom" align="start" width="w-80">
                    <button
                      type="button"
                      onClick={() => onDay(d, person.staffId)}
                      className={cn(
                        'flex min-h-[84px] cursor-pointer flex-col items-stretch gap-[7px] border-0 border-b border-l border-solid border-n-200 bg-transparent px-3 pt-3.5 pb-2.5 text-left hover:bg-n-50 focus-visible:shadow-[inset_0_0_0_2px_var(--color-a-400)] focus-visible:outline-none',
                        off && 'justify-center bg-n-50 pt-2.5',
                      )}
                    >
                      <span className="sr-only">{t('cell', { name: person.name, date: fmt.weekdayDate(d) })}</span>
                      {off ? (
                        <span className="text-[13px] leading-[18px] font-semibold text-n-600">{off}</span>
                      ) : (
                        <>
                          <span aria-hidden className="relative block h-2.5 flex-none">
                            {day?.working && (
                              <span
                                className="absolute inset-y-0 block rounded-[2px] bg-n-200"
                                style={span(
                                  day.working.open < day.working.close
                                    ? { start: day.working.open, end: day.working.close }
                                    : { start: day.working.open, end: last },
                                )}
                              />
                            )}
                            {shades
                              .filter((z) => !z.off && z.start > first)
                              .map((z) => (
                                <span key={z.start} className="absolute inset-y-0 block bg-n-0" style={span(z)} />
                              ))}
                            {(day?.breaks ?? []).map((b) => (
                              <span key={b.start} className="absolute inset-y-0 block bg-n-0" style={span(b)} />
                            ))}
                            {busy.map((e) => (
                              <span
                                key={e.start}
                                className={cn('absolute inset-y-0 block rounded-[2px]', TONE.elsewhere)}
                                style={span(e)}
                              />
                            ))}
                            {live.map((p) => (
                              <span
                                key={p.booking.code}
                                className={cn(
                                  'absolute inset-y-0 block rounded-[2px]',
                                  TONE[p.booking.status as keyof typeof TONE] ?? TONE.confirmed,
                                )}
                                style={span(p)}
                              />
                            ))}
                            {moves.map((m) => (
                              <span
                                key={m.move.code}
                                className={cn('absolute inset-y-0 block rounded-[2px]', TONE.pending)}
                                style={span(m)}
                              />
                            ))}
                          </span>
                          {cell.bookings || cell.requests ? (
                            <>
                              <span className="flex items-center justify-between gap-1.5 text-[14px] leading-[18px] font-semibold whitespace-nowrap">
                                <span className="truncate">{count}</span>
                                {cell.requests > 0 && (
                                  <span className="inline-flex flex-none items-center gap-0.5 text-[12px] leading-4 font-semibold text-st-pending-ink">
                                    <Clock aria-hidden strokeWidth={2} className="size-3" />
                                    {cell.requests}
                                    <span className="sr-only">{c('requests', { n: cell.requests })}</span>
                                  </span>
                                )}
                              </span>
                              <span className="-mt-[5px] text-[12px] leading-4 whitespace-nowrap text-n-600 tabular-nums">{range}</span>
                            </>
                          ) : (
                            <>
                              <span className="text-[14px] leading-[18px] font-medium whitespace-nowrap text-n-600">{t('noBookings')}</span>
                              {day?.working && (
                                <span className="-mt-[5px] text-[12px] leading-4 whitespace-nowrap text-n-600 tabular-nums">
                                  {t('works', { time: fmt.timeRange(day.working.open, day.working.close) })}
                                </span>
                              )}
                            </>
                          )}
                        </>
                      )}
                      <span className="sr-only">{t('open')}</span>
                    </button>
                  </HoverCard>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
