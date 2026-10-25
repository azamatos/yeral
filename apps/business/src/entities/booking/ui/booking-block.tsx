import type { CalendarView } from '@yeral/contract/calendar'
import { useFmt } from '@yeral/i18n'
import { cn } from '@yeral/ui/cn'
import { Phone, TriangleAlert, User } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useJoin } from './affected-bookings-list'
import { BOOKING_STATUS_ICON } from './status-icons'

export type CalendarBooking = CalendarView['bookings'][number]

/** A block's fill, line and ink by status (B-Calendar `.k-*`): a request dashed on the warning tint, cancelled dashed white. */
const LOOK = {
  pending: 'border-[1.5px] border-dashed border-st-pending-dot bg-st-pending-bg',
  confirmed: 'border border-st-confirmed-line bg-st-confirmed-bg',
  completed: 'border border-st-completed-line bg-st-completed-bg',
  noshow: 'border border-st-noshow-line bg-st-noshow-bg',
  cancelled: 'border border-dashed border-st-cancelled-dot bg-n-0 text-st-cancelled-ink',
} as const
const ICON_INK = {
  pending: 'text-st-pending-ink',
  confirmed: 'text-st-confirmed-ink',
  completed: 'text-st-completed-ink',
  noshow: 'text-st-noshow-ink',
  cancelled: 'text-st-cancelled-ink',
} as const

/** From this height a block adds the services (44) and then the time with its length (62), B-Calendar's lines. */
const SERVICES_FROM = 44
const TIMES_FROM = 62

/**
 * BookingBlock (DS-Business → BookingBlock, B-Calendar `.bk`): a booking in the calendar's column, placed by the grid
 * (`style`'s top and height). Line 1 is the status icon, the start and the client (struck through once cancelled);
 * a taller block adds the services, then «10:15–11:00 · 45 min». On the right: by phone or a walk-in, the client's
 * alert note, and a request's timer (`timer`, which the calendar counts while the business is open). Selected: the ink
 * ring; hover dims it a little. Its name is what it shows, then the time, status, markers and timer in words.
 */
export function BookingBlock({
  booking: b,
  height,
  style,
  half,
  selected,
  timer,
  timerText,
  onOpen,
}: {
  booking: CalendarBooking
  /** Its height in pixels: what fits on it. */
  height: number
  style: CSSProperties
  /** A cancelled block beside a live one at the same time takes the right half (B-Calendar `.half`). */
  half?: boolean
  selected?: boolean
  /** A request's time left to answer (TimerPill S). */
  timer?: ReactNode
  /** The same as words, for the block's name: «18 min left to answer». */
  timerText?: string
  onOpen: () => void
}) {
  const t = useTranslations('calendar.block')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  const Icon = BOOKING_STATUS_ICON[b.status]
  const client = b.client.name ?? t('unnamed')
  const services = b.items.map((i) => i.service).join(' + ')
  const time = fmt.timeRange(b.start, b.end)
  const cancelled = b.status === 'cancelled'
  const phone = b.source === 'phone'
  const walkIn = b.source === 'walkin'
  const icons = (phone || walkIn ? 1 : 0) + (b.alert ? 1 : 0)
  // read after what the block shows (its name holds its text): the whole time, the status, the markers, the timer
  const more = join(
    [time, s(b.status), phone ? t('byPhone') : '', walkIn ? t('walkIn') : '', b.alert ? t('alert') : '', timerText ?? ''],
    'list',
  )
  return (
    <button
      type="button"
      aria-pressed={selected || undefined}
      onClick={onOpen}
      style={{ ...style, paddingRight: 8 + icons * 18 + (timer ? 60 : 0) }}
      className={cn(
        'absolute right-1 left-1 z-4 flex cursor-pointer flex-col items-stretch justify-start gap-px overflow-hidden rounded-input py-1 pl-2 text-left text-n-900',
        'hover:brightness-[.97] focus-visible:shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-a-400)] focus-visible:outline-none',
        LOOK[b.status],
        half && 'left-[52%]',
        selected && 'z-5 shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-n-900)]',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.25 overflow-hidden whitespace-nowrap">
        <Icon aria-hidden strokeWidth={2} className={cn('size-3.5 flex-none', ICON_INK[b.status])} />
        <span className="flex-none text-[12px] leading-4 font-semibold tabular-nums">{fmt.time(b.start)}</span>
        <span className={cn('min-w-0 truncate text-[14px] leading-[18px] font-semibold', cancelled && 'line-through')}>{client}</span>
      </span>
      {height >= SERVICES_FROM && <span className="truncate text-dense text-n-600">{services}</span>}
      {height >= TIMES_FROM && (
        <span className="text-dense whitespace-nowrap text-n-600 tabular-nums">
          {t('timeLength', { time, length: fmt.duration(b.end - b.start) })}
        </span>
      )}
      <span aria-hidden className="absolute top-1 right-1.5 flex items-center gap-1 text-n-900 [&_svg]:size-3.5">
        {phone && <Phone strokeWidth={1.75} />}
        {walkIn && <User strokeWidth={1.75} />}
        {b.alert && <TriangleAlert strokeWidth={1.75} className="text-danger-ink" />}
        {timer}
      </span>
      <span className="sr-only">, {more}</span>
    </button>
  )
}
