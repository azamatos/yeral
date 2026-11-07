import type { CalendarView } from '@yeral/contract/calendar'
import { addDays, localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { cn } from '@yeral/ui/cn'
import { Coffee, Lock, Phone, TriangleAlert } from 'lucide-react'
import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { BLOCK_LOOK, BOOKING_STATUS_ICON, useJoin } from '@/entities/booking'
import { movesIn, placedIn, stretchOn, weekCell } from '../model/grid'

const ICON_INK = {
  pending: 'text-st-pending-ink',
  confirmed: 'text-st-confirmed-ink',
  completed: 'text-st-completed-ink',
  noshow: 'text-st-noshow-ink',
  cancelled: 'text-st-cancelled-ink',
} as const

type Row =
  | { kind: 'card'; key: string; start: number; end: number; card: ReactNode }
  | { kind: 'grey'; key: string; start: number; end: number; icon: ReactNode; text: string }

/**
 * One person's week on a phone (B7-Calendar · B3, 390): seven columns don't fit, so the week is a list — a day head
 * (the date, Today, the count, the requests in amber) that sticks while it scrolls, then the day's bookings in time
 * order: the start over the end, a card in the status tint with the status icon, the client and «service · length»,
 * a request's time left, a phone booking's phone. Breaks, closed time and busy elsewhere are grey rows, a day off one
 * «Day off» row, the now line between rows on today. It opens on today; a card opens the booking (`onOpen`).
 */
export function WeekList({
  view,
  column: c,
  from,
  now,
  picked,
  timer,
  onOpen,
}: {
  view: CalendarView
  column: CalendarView['columns'][number]
  /** The week's Monday. */
  from: string
  now: number
  picked?: string
  timer: (until: number | null) => { node: ReactNode; text: string } | null
  onOpen: (pick: { booking: string } | { request: string }) => void
}) {
  const t = useTranslations('calendar.week')
  const cal = useTranslations('calendar')
  const block = useTranslations('calendar.block')
  const layers = useTranslations('calendar.layers')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  const at = localOf(now)
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i))
  const list = useRef<HTMLDivElement>(null)
  // the week opens on today's head when today is in it
  useLayoutEffect(() => {
    const head = list.current?.querySelector<HTMLElement>('[data-today]')
    if (list.current && head) list.current.scrollTop = head.offsetTop - list.current.offsetTop
  }, [from])

  const card = (
    key: string,
    p: { status: keyof typeof ICON_INK; start: number; end: number; name: string; service: string },
    extra: { phone?: boolean; alert?: boolean; hold?: { node: ReactNode; text: string } | null; selected?: boolean },
    open: () => void,
  ): Row => {
    const Icon = BOOKING_STATUS_ICON[p.status]
    const what = t('serviceLength', { service: p.service, length: fmt.duration(p.end - p.start) })
    const more = join([s(p.status), extra.phone ? block('byPhone') : '', extra.alert ? block('alert') : '', extra.hold?.text ?? ''], 'list')
    return {
      kind: 'card',
      key,
      start: p.start,
      end: p.end,
      card: (
        <button
          type="button"
          aria-pressed={extra.selected || undefined}
          onClick={open}
          className={cn(
            'flex min-w-0 flex-1 cursor-pointer items-start gap-2 rounded-ctl-s py-2 pr-2.5 pl-2.5 text-left text-n-900 focus-visible:shadow-focus focus-visible:outline-none',
            BLOCK_LOOK[p.status],
            extra.selected && 'shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-n-900)]',
          )}
        >
          <span className="sr-only">
            {block('label', { time: fmt.timeRange(p.start, p.end), name: p.name, service: what, more: block('more', { more }) })}
          </span>
          <Icon aria-hidden strokeWidth={2} className={cn('mt-0.5 size-4 flex-none', ICON_INK[p.status])} />
          <span aria-hidden className="flex min-w-0 flex-1 flex-col">
            <span className={cn('truncate text-[15px] leading-5 font-semibold', p.status === 'cancelled' && 'line-through')}>{p.name}</span>
            <span className="truncate text-[13px] leading-[18px] text-n-600">{what}</span>
          </span>
          <span aria-hidden className="flex flex-none items-center gap-1.5 [&_svg]:size-3.5">
            {extra.phone && <Phone strokeWidth={1.75} />}
            {extra.alert && <TriangleAlert strokeWidth={1.75} className="text-danger-ink" />}
            {extra.hold?.node}
          </span>
        </button>
      ),
    }
  }

  return (
    <div ref={list} className="min-h-0 flex-1 overflow-auto pb-24">
      {days.map((d) => {
        const cell = weekCell(view, c, d)
        const day = c.days.find((x) => x.date === d)
        const off = cell.off
        const rows: Row[] = [
          ...placedIn(view.bookings, c.staffId, d).map((p) => {
            const b = p.booking
            return card(
              b.code,
              {
                status: b.status,
                start: p.start,
                end: p.end,
                name: b.client.name ?? block('unnamed'),
                service: p.items.map((i) => i.service).join(' + '),
              },
              {
                phone: b.source === 'phone',
                alert: b.alert,
                hold: b.status === 'pending' ? timer(b.holdUntil) : null,
                selected: picked === b.code,
              },
              () => onOpen(b.status === 'pending' ? { request: b.code } : b.move ? { request: b.move.code } : { booking: b.code }),
            )
          }),
          ...movesIn(view.moves, c.staffId, d).map((m) =>
            card(
              m.move.code,
              {
                status: 'pending',
                start: m.start,
                end: m.end,
                name: block('newTime'),
                service: m.move.client.name ?? block('unnamed'),
              },
              { hold: timer(m.move.holdUntil) },
              () => onOpen({ request: m.move.code }),
            ),
          ),
          ...(day?.breaks ?? []).map((x): Row => ({
            kind: 'grey',
            key: `b${x.start}`,
            ...x,
            icon: <Coffee aria-hidden strokeWidth={2} />,
            text: layers('break'),
          })),
          ...view.blocks.flatMap((k): Row[] => {
            const x = k.staffId === c.staffId ? stretchOn(d, k) : null
            if (!x) return []
            const text = k.reason ? layers('closedFor', { reason: k.reason }) : layers('closed')
            return [{ kind: 'grey', key: `k${x.start}`, start: x.start, end: x.end, icon: <Lock aria-hidden strokeWidth={2} />, text }]
          }),
          ...view.elsewhere.flatMap((e): Row[] => {
            const x = e.staffId === c.staffId ? stretchOn(d, e) : null
            return x ? [{ kind: 'grey', key: `e${x.start}`, start: x.start, end: x.end, icon: null, text: layers('elsewhere') }] : []
          }),
        ].sort((a, b) => a.start - b.start || a.end - b.end)
        const nowAt = d === at.date ? rows.findIndex((r) => r.start > at.min) : -2
        const nowLine = <li aria-hidden key="now" className="relative mx-4 my-1 h-0.5 bg-a-500" />
        const head = off
          ? off === 'none' || off.kind === 'dayoff'
            ? layers('dayOff')
            : off.kind === 'timeoff'
              ? layers('timeOff')
              : off.name
                ? layers('closedFor', { reason: off.name })
                : layers('closed')
          : null
        return (
          <section key={d} aria-labelledby={`week-list-${d}`} data-today={d === at.date || undefined}>
            <h3
              id={`week-list-${d}`}
              className="sticky top-0 z-2 m-0 flex h-11 items-center gap-2 border-b border-n-200 bg-n-0 px-4 text-[15px] leading-5 font-semibold text-n-900"
            >
              {fmt.shortWeekdayDate(d)}
              {d === at.date && (
                <span className="rounded-pill bg-a-50 px-2 text-[12px] leading-5 font-semibold text-a-600">{cal('today')}</span>
              )}
              <span
                className={cn(
                  'ml-auto text-[13px] leading-[18px] font-normal text-n-600',
                  cell.requests > 0 && !off && 'font-semibold text-st-pending-ink',
                )}
              >
                {head ?? t('count', { bookings: cal('columnBookings', { n: cell.bookings }), requests: cell.requests })}
              </span>
            </h3>
            <ul className="m-0 flex list-none flex-col gap-1.5 p-0 py-2">
              {off && !rows.length ? (
                <li className="mx-4 flex h-10 items-center rounded-ctl-s bg-n-100 px-3 text-[13px] leading-[18px] font-semibold text-n-600">
                  {head}
                </li>
              ) : (
                rows.flatMap((r, i) => [
                  ...(i === nowAt ? [nowLine] : []),
                  <li key={r.key} className="flex items-stretch gap-3 px-4">
                    <span aria-hidden className="flex w-11 flex-none flex-col pt-2 text-right text-[13px] leading-[18px] tabular-nums">
                      <span className="font-semibold text-n-900">{fmt.time(r.start)}</span>
                      <span className="text-n-500">{fmt.time(r.end)}</span>
                    </span>
                    {r.kind === 'card' ? (
                      r.card
                    ) : (
                      <span className="flex min-w-0 flex-1 items-center gap-2 rounded-ctl-s bg-n-100 px-2.5 py-2 text-[13px] leading-[18px] font-semibold text-n-600 [&_svg]:size-3.5 [&_svg]:flex-none">
                        {r.icon}
                        <span className="truncate">{r.text}</span>
                        <span className="sr-only">{layers('at', { time: fmt.timeRange(r.start, r.end) })}</span>
                      </span>
                    )}
                  </li>,
                ])
              )}
              {nowAt === -1 && rows.length > 0 && nowLine}
            </ul>
          </section>
        )
      })}
    </div>
  )
}
