import type { CalendarView } from '@yeral/contract/calendar'
import { openMinutesBetween, type BusinessHours } from '@yeral/domain/hours'
import { addDays, localOf, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { cn } from '@yeral/ui/cn'
import { TimerPill } from '@yeral/ui/timer-pill'
import { Coffee, Lock } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { BookingBlock, MoveBlock } from '@/entities/booking'
import {
  besideLive,
  buffersOf,
  gridHours,
  HOUR_PX,
  movesIn,
  onGrid,
  overlaps,
  placedIn,
  placeOf,
  pxOf,
  QUARTER_PX,
  shadesOf,
  stretchOn,
} from '../model/grid'

/** The gutter with the hours (B-Calendar `.ggut`, 64) and a column's least width (`.gcol`, 200). */
const GUTTER = 'w-16 flex-none'
const COLUMN = 'min-w-50 flex-1 basis-0'
/** On a phone one person's column fills the width and the others wait for their chip (B-Calendar `.gx`, `.stchips`). */
const ONLY_ON_PHONE = 'max-sm:min-w-0'
const NOT_ON_PHONE = 'max-sm:hidden'

type Timer = (until: number | null) => { node: ReactNode; text: string } | null
type Link = 'hover' | 'focus'
/** What a click on a block opens: a request (a new one, or a client's move by its own code) or the booking. */
type Pick = { request: string } | { booking: string }
/** The address's booking picked and request open. */
type Picked = { booking?: string; request?: string }

/**
 * The day's grid (B-Calendar `.gwrap`, DS-Business CalendarGrid «DayAllStaff»): a column per person the reader sees,
 * their name and the day's count on top («6 bookings · 1 request»); the hours down the gutter, quarter lines, each
 * person's day (`DayColumn`); today, the now line with its time. It fills the page below the toolbar and scrolls
 * both ways inside it, the gutter and the names staying in place.
 */
export function DayGrid({
  view,
  date,
  now,
  business,
  picked,
  phoneStaff,
  busy,
  onOpen,
}: {
  view: CalendarView
  date: string
  now: number
  /** The business's hours: a request's timer counts only while it's open. Null: the clock's minutes. */
  business: BusinessHours | null
  picked: Picked
  /** The person whose column a phone shows (their chip). */
  phoneStaff?: string
  /** Another day's on its way: this one stays until it comes. */
  busy?: boolean
  onOpen: (pick: Pick) => void
}) {
  const t = useTranslations('calendar')
  const fmt = useFmt()
  const { from, to } = gridHours(view, date)
  const height = (to - from) * HOUR_PX
  const nowAt = localOf(now)
  // the now line on today, and past midnight on the night before's grid (a night bar's day runs on)
  const nowMinute = today(now) === date ? nowAt.min : addDays(today(now), -1) === date ? nowAt.min + 1440 : null
  const nowTop = nowMinute !== null && nowMinute >= from * 60 && nowMinute <= to * 60 ? pxOf(nowMinute, from) : null
  // closed now: a request that came in waits for the opening, its timer says by when (B-Calendar «by 09:30»)
  const closed = business ? openMinutesBetween(business, now, now + 60_000) === 0 : false

  // the booking a waiting move belongs to, while its block or the move's is pointed at
  // pointed at or focused, each kept on its own: leaving one doesn't clear the other
  const [hovered, setHovered] = useState<string | null>(null)
  const [focused, setFocused] = useState<string | null>(null)
  const onLink = (how: Link, code: string | null) => (how === 'hover' ? setHovered : setFocused)(code)

  const phone = (c: CalendarView['columns'][number]) => (c.staffId === phoneStaff ? ONLY_ON_PHONE : NOT_ON_PHONE)

  const timer: Timer = (until) => {
    if (until === null) return null
    const left = business ? (at: number) => openMinutesBetween(business, at, until) : undefined
    const by = closed ? fmt.time(localOf(until).min) : null
    return {
      node: (
        <TimerPill
          size="s"
          until={until}
          left={left}
          format={(m) => fmt.duration(m)}
          label={(m) => t('timer.left', { time: fmt.duration(m) })}
          by={by ? { text: t('timer.by', { time: by }), label: t('timer.byLabel', { time: by }) } : undefined}
        />
      ),
      text: by
        ? t('timer.byLabel', { time: by })
        : t('timer.left', { time: fmt.duration(Math.max(0, Math.ceil(left ? left(now) : (until - now) / 60_000))) }),
    }
  }

  if (view.columns.length === 0) return <p className="m-0 px-4 py-10 text-small text-n-600 sm:px-8">{t('nobody')}</p>

  return (
    <div
      role="region"
      aria-label={t('grid', { date: fmt.weekdayDate(date) })}
      aria-busy={busy || undefined}
      // it scrolls: the keyboard reaches it even on a day with no bookings
      tabIndex={0}
      className="relative min-h-0 flex-1 overflow-auto focus-visible:shadow-[inset_0_0_0_2px_var(--color-a-400)] focus-visible:outline-none"
    >
      {/* as wide as the columns; on a phone the one column fits the screen and its header wraps */}
      <div className="min-w-max max-sm:min-w-0">
        {/* the names stay on top while the day scrolls */}
        <div className="sticky top-0 z-12 flex border-b border-n-200 bg-n-0">
          <div className={`${GUTTER} sticky left-0 z-8 bg-n-0`} />
          {view.columns.map((c) => {
            // the day's own, as the day's line counts them (requests among the bookings)
            const mine = view.bookings.filter(
              (b) => b.date === date && b.status !== 'cancelled' && b.items.some((i) => i.staffId === c.staffId),
            )
            // a client's move waits for an answer too (B-Calendar counts its ghost)
            const asked = view.moves.filter((m) => m.date === date && m.items.some((i) => i.staffId === c.staffId)).length
            const waiting = mine.filter((b) => b.status === 'pending').length + asked
            return (
              <div key={c.staffId} className={cn(COLUMN, phone(c), 'flex items-center gap-2.5 border-l border-n-200 p-3')}>
                <Avatar name={c.name} src={c.photo?.url} size={32} letters={1} tone="tint" decorative />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[15px] leading-5 font-semibold text-n-900">
                    {c.name}
                    {!c.hasApp && (
                      <span className="rounded-pill bg-n-100 px-1.75 py-px text-[11px] leading-4 font-semibold text-n-600">
                        {t('noApp')}
                      </span>
                    )}
                  </span>
                  <span className="text-dense text-n-600">
                    {waiting > 0
                      ? t.rich('columnLine', {
                          bookings: t('columnBookings', { n: mine.length }),
                          requests: t('requests', { n: waiting }),
                          rq: (chunks) => <span className="font-semibold text-st-pending-ink">{chunks}</span>,
                        })
                      : t('columnBookings', { n: mine.length })}
                  </span>
                </span>
              </div>
            )
          })}
        </div>
        <div className="relative flex">
          <div aria-hidden className={`${GUTTER} sticky left-0 z-8 bg-n-0`} style={{ height }}>
            {Array.from({ length: to - from }, (_, i) => (
              <span
                key={i}
                className="absolute right-2.5 text-[12px] leading-[18px] text-n-500 tabular-nums"
                style={{ top: i === 0 ? 0 : i * HOUR_PX - 9 }}
              >
                {fmt.time(((from + i) % 24) * 60)}
              </span>
            ))}
            {nowTop !== null && nowMinute !== null && (
              <span
                className="absolute left-1.5 z-7 h-5 rounded-pill bg-a-500 px-1.5 text-[11px] leading-5 font-bold text-white tabular-nums"
                style={{ top: nowTop - 10 }}
              >
                {fmt.time(nowMinute)}
              </span>
            )}
          </div>
          {view.columns.map((c) => (
            <DayColumn
              key={c.staffId}
              className={phone(c)}
              view={view}
              column={c}
              date={date}
              from={from}
              to={to}
              timer={timer}
              picked={picked}
              linked={hovered ?? focused}
              onLink={onLink}
              onOpen={onOpen}
            />
          ))}
          {nowTop !== null && (
            <div aria-hidden className="pointer-events-none absolute right-0 left-16 z-7 h-0.5 bg-a-500" style={{ top: nowTop }} />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * One person's day (B-Calendar `.gcol`): the time they don't work shaded (a day off, time off or the business closed
 * by name, the lock on the last two), the quarter lines, their breaks and blocked time («Closed · Training»), the
 * buffer after each booking hatched, their bookings, time busy elsewhere (no details; beside a booking at its time),
 * and a client's move waiting at the asked time.
 */
function DayColumn({
  className,
  view,
  column: c,
  date,
  from,
  to,
  timer,
  picked,
  linked,
  onLink,
  onOpen,
}: {
  view: CalendarView
  column: CalendarView['columns'][number]
  date: string
  from: number
  to: number
  timer: Timer
  className: string
  picked: Picked
  linked: string | null
  onLink: (how: Link, code: string | null) => void
  onOpen: (pick: Pick) => void
}) {
  const t = useTranslations('calendar.layers')
  const fmt = useFmt()
  const day = c.days.find((d) => d.date === date)
  const placed = placedIn(view.bookings, c.staffId, date)
  const live = placed.filter((p) => p.booking.status !== 'cancelled')
  const moves = movesIn(view.moves, c.staffId, date)
  // what lies on the grid's hours: a block or time elsewhere outside them isn't drawn as a stub at an edge
  const shown = <T extends { start: number; end: number }>(x: T | null): T[] => (x && onGrid(x, from, to) ? [x] : [])
  const busy = view.elsewhere.flatMap((e) => (e.staffId === c.staffId ? shown(stretchOn(date, e)) : []))
  const blocks = view.blocks.flatMap((k) => (k.staffId === c.staffId ? shown(stretchOn(date, k)) : []))
  const at = (start: number, end: number) => placeOf(start, end, from, to)
  const link = (code: string) => (on: boolean, how: Link) => onLink(how, on ? code : null)
  const lock = <Lock aria-hidden strokeWidth={2} className="size-3.5 flex-none" />
  const layers = [
    ...(day?.breaks ?? []).flatMap(shown).map((b) => ({
      ...b,
      key: `b${b.start}`,
      icon: <Coffee aria-hidden strokeWidth={2} className="size-3.5 flex-none" />,
      label: t('break'),
    })),
    ...blocks.map((k) => ({ ...k, key: k.id, icon: lock, label: k.reason ? t('closedFor', { reason: k.reason }) : t('closed') })),
  ]
  const offLabel = (off: NonNullable<ReturnType<typeof shadesOf>[number]['off']>) =>
    off.kind === 'dayoff'
      ? t('dayOff')
      : off.kind === 'timeoff'
        ? t('timeOff')
        : off.name
          ? t('closedFor', { reason: off.name })
          : t('closed')

  return (
    <div
      role="group"
      aria-label={c.name}
      className={cn(COLUMN, className, 'relative border-b border-l border-n-200')}
      style={{ height: (to - from) * HOUR_PX + 1 }}
    >
      {shadesOf(day, from, to).map((z) => (
        <div
          key={z.start}
          aria-hidden={!z.off || undefined}
          className={cn('absolute inset-x-0 z-0', z.off && z.off.kind !== 'dayoff' ? 'bg-n-100' : 'bg-n-50')}
          style={{ top: pxOf(z.start, from), height: pxOf(z.end, from) - pxOf(z.start, from) }}
        >
          {z.off && (
            <span className="flex items-center justify-center gap-1.5 px-3 py-4 text-center text-[13px] leading-[18px] font-semibold text-n-600">
              {z.off.kind !== 'dayoff' && lock}
              {offLabel(z.off)}
            </span>
          )}
        </div>
      ))}
      {/* a line every quarter, darker on the hour (B-Calendar `.qs`), over the shading */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-1"
        style={{
          backgroundImage: `repeating-linear-gradient(to bottom, var(--color-n-200) 0 1px, transparent 1px ${HOUR_PX}px), repeating-linear-gradient(to bottom, var(--color-n-100) 0 1px, transparent 1px ${QUARTER_PX}px)`,
        }}
      />
      {layers.map((l) => (
        <div
          key={l.key}
          className="absolute right-1 left-1 z-3 flex items-start gap-1.5 overflow-hidden rounded-[6px] bg-n-100 px-2 py-1 text-[12px] leading-4 font-semibold whitespace-nowrap text-n-600"
          style={at(l.start, l.end)}
        >
          {l.icon}
          <span className="truncate">{l.label}</span>
          <span className="sr-only">{t('at', { time: fmt.timeRange(l.start, l.end) })}</span>
        </div>
      ))}
      {buffersOf(placed, day).map((u) => (
        <div
          key={u.code}
          aria-hidden
          title={t('buffer', { length: fmt.duration(u.minutes) })}
          className="absolute right-1 left-1 z-3 rounded-b-[6px] bg-[repeating-linear-gradient(135deg,var(--color-n-100)_0_4px,var(--color-n-0)_4px_8px)]"
          style={{ top: pxOf(u.start, from), height: Math.max(pxOf(u.end, from) - pxOf(u.start, from) - 1, 0) }}
        />
      ))}
      {placed.map((p) => {
        const b = p.booking
        const place = at(p.start, p.end)
        const hold = timer(b.status === 'pending' ? b.holdUntil : (b.move?.holdUntil ?? null))
        const cancelled = b.status === 'cancelled'
        return (
          <BookingBlock
            key={b.code}
            booking={b}
            items={p.items}
            height={place.height}
            style={place}
            half={besideLive(p, placed) ? 'right' : !cancelled && overlaps(p, busy) ? 'left' : undefined}
            // a request, or a booking with a client's move, opens the request; the rest pick the booking
            selected={picked.request ? picked.request === b.code || picked.request === b.move?.code : picked.booking === b.code}
            linked={!!b.move && linked === b.code}
            timer={hold?.node}
            timerText={hold?.text}
            onOpen={() => onOpen(b.status === 'pending' ? { request: b.code } : b.move ? { request: b.move.code } : { booking: b.code })}
            onLink={b.move ? link(b.code) : undefined}
          />
        )
      })}
      {busy.map((e, i) => (
        <div
          key={i}
          className={cn(
            'pointer-events-none absolute right-1 left-1 z-4 flex items-start overflow-hidden rounded-input border border-n-200 bg-n-50 px-2 py-1.25 text-[12px] leading-4 font-medium whitespace-nowrap text-n-600',
            overlaps(e, live) && 'left-[calc(50%+2px)]',
          )}
          style={at(e.start, e.end)}
        >
          <span className="truncate">{t('elsewhere')}</span>
          <span className="sr-only">{t('at', { time: fmt.timeRange(e.start, e.end) })}</span>
        </div>
      ))}
      {moves.map((m) => {
        const place = at(m.start, m.end)
        const hold = timer(m.move.holdUntil)
        const of = m.move.of.code
        return (
          <MoveBlock
            key={m.move.code}
            move={m.move}
            items={m.items}
            height={place.height}
            style={place}
            // at the time of a booking (its own, or another) it takes the right half, as a cancelled one does
            half={overlaps(m, live) ? 'right' : undefined}
            selected={picked.request === m.move.code}
            linked={linked === of}
            timer={hold?.node}
            timerText={hold?.text}
            onOpen={() => onOpen({ request: m.move.code })}
            onLink={link(of)}
          />
        )
      })}
    </div>
  )
}
