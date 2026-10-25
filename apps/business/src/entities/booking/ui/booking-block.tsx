import type { CalendarView } from '@yeral/contract/calendar'
import { useFmt } from '@yeral/i18n'
import { cn } from '@yeral/ui/cn'
import { Phone, TriangleAlert, User, type LucideIcon } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { useJoin } from './affected-bookings-list'
import { BOOKING_STATUS_ICON } from './status-icons'

export type CalendarBooking = CalendarView['bookings'][number]
export type CalendarMove = CalendarView['moves'][number]

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

/** Where a block sits beside another layer at its time: the left half (by time busy elsewhere) or the right. */
type Half = 'left' | 'right'

type Shared = {
  /** Its height in pixels: what fits on it. */
  height: number
  style: CSSProperties
  /** A cancelled block beside a live one takes the right half (`.half`); a live one beside busy elsewhere the left (`.lhalf`). */
  half?: Half
  selected?: boolean
  /** A move's two blocks, the booking and its asked time, ringed together while either is pointed at (`.lk`). */
  linked?: boolean
  /** A request's time left to answer (TimerPill S). */
  timer?: ReactNode
  /** The same as words, for the block's name: «18 min left to answer». */
  timerText?: string
  onOpen: () => void
  /** Pointed at or focused (true), or left (false), and which: a move's blocks ring together. */
  onLink?: (on: boolean, how: 'hover' | 'focus') => void
}

/**
 * The frame both blocks draw (B-Calendar `.bk`): line 1 the status icon, the start and a name; the lines a taller block
 * adds; the markers and the timer on the right; what the screen reader hears after the visible text.
 */
function Frame({
  look,
  Icon,
  iconInk,
  start,
  name,
  strike,
  lines,
  icons,
  more,
  style,
  half,
  selected,
  linked,
  timer,
  onOpen,
  onLink,
}: Omit<Shared, 'height' | 'timerText'> & {
  look: string
  Icon: LucideIcon
  iconInk: string
  start: string
  name: string
  strike?: boolean
  lines: ReactNode
  /** The markers' icons, as many as `count` (each 18 px kept clear on the right). */
  icons: { nodes: ReactNode; count: number }
  more: string
}) {
  const t = useTranslations('calendar.block')
  const link = onLink && {
    onMouseEnter: () => onLink(true, 'hover'),
    onMouseLeave: () => onLink(false, 'hover'),
    onFocus: () => onLink(true, 'focus'),
    onBlur: () => onLink(false, 'focus'),
  }
  return (
    <button
      type="button"
      aria-pressed={selected || undefined}
      onClick={onOpen}
      {...link}
      style={{ ...style, paddingRight: 8 + icons.count * 18 + (timer ? 60 : 0) }}
      className={cn(
        'absolute right-1 left-1 z-4 flex cursor-pointer flex-col items-stretch justify-start gap-px overflow-hidden rounded-input py-1 pl-2 text-left text-n-900',
        'hover:brightness-[.97] focus-visible:shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-a-400)] focus-visible:outline-none',
        look,
        half === 'right' && 'left-[52%]',
        half === 'left' && 'right-[calc(50%+2px)]',
        linked && 'z-5 shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-n-500)]',
        selected && 'z-5 shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-n-900)]',
      )}
    >
      <span className="flex min-w-0 items-center gap-1.25 overflow-hidden whitespace-nowrap">
        <Icon aria-hidden strokeWidth={2} className={cn('size-3.5 flex-none', iconInk)} />
        <span className="flex-none text-[12px] leading-4 font-semibold tabular-nums">{start}</span>
        <span className={cn('min-w-0 truncate text-[14px] leading-[18px] font-semibold', strike && 'line-through')}>{name}</span>
      </span>
      {lines}
      <span aria-hidden className="absolute top-1 right-1.5 flex items-center gap-1 text-n-900 [&_svg]:size-3.5">
        {icons.nodes}
        {timer}
      </span>
      <span className="sr-only">{t('more', { more })}</span>
    </button>
  )
}

const line = 'truncate text-dense text-n-600'

/**
 * BookingBlock (DS-Business → BookingBlock, B-Calendar `.bk`): a booking in the calendar's column, placed by the grid
 * (`style`'s top and height); `items` the column's person's part of it (all of it by default). Line 1 is the status
 * icon, the start and the client (struck through once cancelled); a taller block adds the services, then «10:15–11:00 ·
 * 45 min», or the time a client asked to move to («→ Sat, 17 Oct · 11:30?»). On the right: by phone or a walk-in, the
 * client's alert note, and the timer of a request or a move (`timer`, which the calendar counts while the business is
 * open). Selected: the ink ring; hover dims it a little. Its name is what it shows, then the time, status, markers and
 * timer in words.
 */
export function BookingBlock({
  booking: b,
  items = b.items,
  height,
  timerText,
  ...shared
}: Shared & {
  booking: CalendarBooking
  /** The part of it in this column: a booking shared with a colleague shows each one's part in their column. */
  items?: CalendarBooking['items']
}) {
  const t = useTranslations('calendar.block')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  const services = items.map((i) => i.service).join(' + ')
  const start = Math.min(...items.map((i) => i.start))
  const end = Math.max(...items.map((i) => i.end))
  const time = fmt.timeRange(start, end)
  const phone = b.source === 'phone'
  const walkIn = b.source === 'walkin'
  const asked = b.move && t('when', { date: fmt.shortWeekdayDate(b.move.date), time: fmt.time(b.move.start) })
  // read after what the block shows (its name holds its text): the whole time, the status, the markers, the timer
  const more = join(
    [
      time,
      s(b.status),
      phone ? t('byPhone') : '',
      walkIn ? t('walkIn') : '',
      b.alert ? t('alert') : '',
      // the asked time, unless its line shows it
      asked && height < TIMES_FROM ? t('moveAsked', { when: asked }) : '',
      timerText ?? '',
    ],
    'list',
  )
  return (
    <Frame
      {...shared}
      look={LOOK[b.status]}
      Icon={BOOKING_STATUS_ICON[b.status]}
      iconInk={ICON_INK[b.status]}
      start={fmt.time(start)}
      name={b.client.name ?? t('unnamed')}
      strike={b.status === 'cancelled'}
      lines={
        <>
          {height >= SERVICES_FROM && <span className={line}>{services}</span>}
          {height >= TIMES_FROM && (
            <span className={cn(line, 'tabular-nums')}>
              {asked ? t('moveTo', { when: asked }) : t('timeLength', { time, length: fmt.duration(end - start) })}
            </span>
          )}
        </>
      }
      icons={{
        count: (phone || walkIn ? 1 : 0) + (b.alert ? 1 : 0),
        nodes: (
          <>
            {phone && <Phone strokeWidth={1.75} />}
            {walkIn && <User strokeWidth={1.75} />}
            {b.alert && <TriangleAlert strokeWidth={1.75} className="text-danger-ink" />}
          </>
        ),
      }}
      more={more}
    />
  )
}

/**
 * A client's move waiting for its answer (B-21, B-Calendar's ghost `.bk.k-p`): a request's look at the asked time, «New
 * time?» for the name, the client and, taller, the time it moves from («from Fri, 16 Oct · 10:00»); its timer on the
 * right. It and its booking ring together while either is pointed at.
 */
export function MoveBlock({
  move: m,
  items = m.items,
  height,
  timerText,
  ...shared
}: Shared & {
  move: CalendarMove
  /** The part of it in this column. */
  items?: CalendarMove['items']
}) {
  const t = useTranslations('calendar.block')
  const fmt = useFmt()
  const join = useJoin()
  const start = Math.min(...items.map((i) => i.start))
  const end = Math.max(...items.map((i) => i.end))
  const was = t('when', { date: fmt.shortWeekdayDate(m.of.date), time: fmt.time(m.of.start) })
  const client = m.client.name ?? t('unnamed')
  const more = join(
    [
      fmt.timeRange(start, end),
      items.map((i) => i.service).join(' + '),
      // the time it moves from, unless its line shows it
      height < TIMES_FROM ? t('previous', { when: was }) : '',
      timerText ?? '',
    ],
    'list',
  )
  return (
    <Frame
      {...shared}
      look={LOOK.pending}
      Icon={BOOKING_STATUS_ICON.pending}
      iconInk={ICON_INK.pending}
      start={fmt.time(start)}
      name={t('newTime')}
      lines={
        <>
          {height >= SERVICES_FROM && <span className={line}>{client}</span>}
          {height >= TIMES_FROM && <span className={cn(line, 'tabular-nums')}>{t('moveFrom', { when: was })}</span>}
        </>
      }
      icons={{ count: 0, nodes: null }}
      more={height >= SERVICES_FROM ? more : join([client, more], 'list')}
    />
  )
}
