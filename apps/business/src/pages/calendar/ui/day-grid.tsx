import type { CalendarView } from '@yeral/contract/calendar'
import { openMinutesBetween, type BusinessHours } from '@yeral/domain/hours'
import { localOf, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { TimerPill } from '@yeral/ui/timer-pill'
import { useTranslations } from 'use-intl'
import { BookingBlock, type CalendarBooking } from '@/entities/booking'
import { besideLive, gridHours, HOUR_PX, inColumn, placeOf, pxOf, QUARTER_PX } from '../model/grid'

/** The gutter with the hours (B-Calendar `.ggut`, 64) and a column's least width (`.gcol`, 200). */
const GUTTER = 'w-16 flex-none'
const COLUMN = 'min-w-50 flex-1 basis-0'

/**
 * The day's grid (B-Calendar `.gwrap`, DS-Business CalendarGrid «DayAllStaff»): a column per person the reader sees,
 * their name and the day's count on top («6 bookings · 1 request»); the hours down the gutter, quarter lines, the
 * bookings placed by their minutes; today, the now line with its time. Wider than the screen it scrolls sideways, the
 * gutter and the names staying in place.
 */
export function DayGrid({
  view,
  date,
  now,
  business,
  selected,
  onOpen,
}: {
  view: CalendarView
  date: string
  now: number
  /** The business's hours: a request's timer counts only while it's open. Null: the clock's minutes. */
  business: BusinessHours | null
  selected: string | null
  onOpen: (code: string) => void
}) {
  const t = useTranslations('calendar')
  const fmt = useFmt()
  const { from, to } = gridHours(view, date)
  const height = (to - from) * HOUR_PX
  const bookings = view.bookings.filter((b) => b.date === date)
  const nowAt = localOf(now)
  // the now line on today (and on the night after it, for a day open past midnight)
  const nowMinute = today(now) === date ? nowAt.min : null
  const nowTop = nowMinute !== null && nowMinute >= from * 60 && nowMinute <= to * 60 ? pxOf(nowMinute, from) : null
  // closed now: a request that came in waits for the opening, its timer says by when (B-Calendar «by 09:30»)
  const closed = business ? openMinutesBetween(business, now, now + 60_000) === 0 : false

  const timer = (b: CalendarBooking) => {
    if (b.status !== 'pending' || b.holdUntil === null) return null
    const until = b.holdUntil
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
    <div role="region" aria-label={t('grid', { date: fmt.weekdayDate(date) })} className="relative overflow-x-auto">
      <div className="min-w-max">
        {/* the names stay on top while the day scrolls */}
        <div className="sticky top-0 z-12 flex border-b border-n-200 bg-n-0">
          <div className={`${GUTTER} sticky left-0 z-8 bg-n-0`} />
          {view.columns.map((c) => {
            const mine = bookings.filter((b) => inColumn(b, c.staffId) && b.status !== 'cancelled')
            const waiting = mine.filter((b) => b.status === 'pending').length
            return (
              <div key={c.staffId} className={`${COLUMN} flex items-center gap-2.5 border-l border-n-200 p-3`}>
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
                    {t('columnBookings', { n: mine.length - waiting })}
                    {waiting > 0 && <span className="font-semibold text-st-pending-ink"> · {t('requests', { n: waiting })}</span>}
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
                className="text-xs absolute right-2.5 leading-[18px] text-n-500 tabular-nums"
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
          {view.columns.map((c) => {
            const column = bookings.filter((b) => inColumn(b, c.staffId))
            return (
              <div
                key={c.staffId}
                role="group"
                aria-label={c.name}
                className={`${COLUMN} relative border-b border-l border-n-200`}
                // a line every quarter (B-Calendar `.qs`)
                style={{
                  height: height + 1,
                  backgroundImage: `repeating-linear-gradient(to bottom, var(--color-n-100) 0 1px, transparent 1px ${QUARTER_PX}px)`,
                }}
              >
                {column.map((b) => {
                  // a booking shared with a colleague: this person's part of it
                  const own = b.items.filter((i) => i.staffId === c.staffId)
                  const place = placeOf(Math.min(...own.map((i) => i.start)), Math.max(...own.map((i) => i.end)), from)
                  const hold = timer(b)
                  return (
                    <BookingBlock
                      key={b.code}
                      booking={b}
                      height={place.height}
                      style={{ top: place.top, height: place.height }}
                      half={besideLive(b, column)}
                      selected={selected === b.code}
                      timer={hold?.node}
                      timerText={hold?.text}
                      onOpen={() => onOpen(b.code)}
                    />
                  )
                })}
              </div>
            )
          })}
          {nowTop !== null && (
            <div aria-hidden className="pointer-events-none absolute right-0 left-16 z-7 h-0.5 bg-a-500" style={{ top: nowTop }} />
          )}
        </div>
      </div>
    </div>
  )
}
