import type { BookingStatus } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Pill } from '@yeral/ui/pill'
import { Popover, PopoverAnchor, PopoverContent } from '@yeral/ui/popover'
import { StatusBadge } from '@yeral/ui/status-badge'
import { Phone, TriangleAlert, User } from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { blockFit, TIMER_ROOM } from '../model/block-fit'
import { useJoin } from './affected-bookings-list'
import { BLOCK_LOOK, type CalendarBooking } from './booking-block'
import { BOOKING_STATUS_ICON } from './status-icons'

const ICON_INK = {
  pending: 'text-st-pending-ink',
  confirmed: 'text-st-confirmed-ink',
  completed: 'text-st-completed-ink',
  noshow: 'text-st-noshow-ink',
  cancelled: 'text-st-cancelled-ink',
} as const
const DOT = {
  pending: 'bg-st-pending-dot',
  confirmed: 'bg-st-confirmed-dot',
  completed: 'bg-st-completed-dot',
  noshow: 'bg-st-noshow-dot',
  cancelled: 'bg-st-cancelled-dot',
} as const

/** «Jahan Berdiýewa» → «Jahan B.»: what a 15-minute block has room for. */
export const shortName = (name: string) => {
  const [first, ...rest] = name.trim().split(/\s+/)
  const last = rest.at(-1)
  return last ? `${first} ${last[0]}.` : (first ?? '')
}

/**
 * Hover or keyboard focus for 300 ms opens `card` beside `children` and keeps it while the pointer is on either
 * (B7-Calendar: the BookingHoverCard, the team week's day card). The card takes no focus; Esc closes it.
 */
export function HoverCard({
  card,
  label,
  side = 'right',
  align = 'start',
  width = 'w-80',
  children,
}: {
  card: ReactNode
  /** The card's name for a screen reader (a dialog needs one): «Gözel A. · 10:00–10:45». */
  label: string
  side?: 'right' | 'left' | 'top' | 'bottom'
  align?: 'start' | 'center' | 'end'
  width?: string
  children: ReactNode
}) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const clear = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }
  const after = (next: boolean, ms: number) => {
    clear()
    timer.current = setTimeout(() => setOpen(next), ms)
  }
  useEffect(() => clear, [])
  const on = {
    onPointerEnter: () => after(true, 300),
    onPointerLeave: () => after(false, 150),
    onFocus: () => after(true, 300),
    onBlur: () => after(false, 0),
  }
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild {...on}>
        {children}
      </PopoverAnchor>
      <PopoverContent
        aria-label={label}
        side={side}
        align={align}
        sideOffset={6}
        className={cn('p-4', width)}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={clear}
        onPointerLeave={() => after(false, 150)}
      >
        {card}
      </PopoverContent>
    </Popover>
  )
}

/**
 * BookingHoverCard (B7-Calendar `.hcard`): the status and source as equal badges, the day and time, the client with
 * the number, the service with its length and price, Open.
 */
export function BookingHoverCard({
  booking: b,
  date,
  start,
  end,
  onOpen,
}: {
  booking: CalendarBooking
  date: string
  start: number
  end: number
  onOpen: () => void
}) {
  const t = useTranslations('calendar.hoverCard')
  const block = useTranslations('calendar.block')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  const source = b.source === 'phone' ? t('phone') : b.source === 'walkin' ? t('walkIn') : t('online')
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <StatusBadge status={b.status}>{s(b.status)}</StatusBadge>
        <Pill
          tone="neutral"
          size="s"
          icon={b.source === 'phone' ? <Phone aria-hidden /> : b.source === 'walkin' ? <User aria-hidden /> : undefined}
        >
          {source}
        </Pill>
      </div>
      <p className="m-0 text-ctl-m leading-5 font-semibold text-n-900 tabular-nums">
        {block('when', { date: fmt.shortWeekdayDate(date), time: fmt.timeRange(start, end) })}
      </p>
      <div className="flex flex-col">
        <span className="flex items-center gap-1.5 text-[15px] leading-5 font-semibold text-n-900">
          {b.client.name ?? block('unnamed')}
          {b.alert && <TriangleAlert aria-label={block('alert')} strokeWidth={1.75} className="size-4 text-danger-ink" />}
        </span>
        {b.client.phone && <span className="text-dense text-n-600 tabular-nums">{fmt.phone(b.client.phone)}</span>}
      </div>
      <div className="flex flex-col">
        <span className="text-ctl-m leading-5 text-n-900">
          {join(
            b.items.map((i) => i.service),
            'plus',
          )}
        </span>
        <span className="text-dense text-n-600">
          {b.price ? t('length', { length: fmt.duration(end - start), price: fmt.price(b.price) }) : fmt.duration(end - start)}
        </span>
      </div>
      <Button variant="secondary" size="s" className="self-start" onClick={onOpen}>
        {t('open')}
      </Button>
    </div>
  )
}

/**
 * WeekBlock (B7-Calendar `.bk.w`): a booking in one person's week, three sizes by its length — 45 min and longer: the
 * time range, the client, the service; 30 min: the start and the client on one line; 15 min: a status dot, the start
 * and «Jahan B.». Then its width and height trim it (`blockFit`): the time left moves to its own line or drops, the
 * markers drop, the range becomes the start, and the narrowest show the name only, so no time is cut mid-way. Hover or
 * focus opens `card`; click opens the booking (`onOpen`) and rings it (`selected`). Its name is always the whole
 * booking: the time range, client, service, status and markers.
 */
export function WeekBlock({
  status,
  start,
  end,
  name,
  service,
  style,
  phone,
  walkIn,
  alert,
  timer,
  timerText,
  selected,
  card,
  onOpen,
}: {
  status: BookingStatus
  start: number
  end: number
  name: string
  service: string
  style: CSSProperties
  phone?: boolean
  walkIn?: boolean
  alert?: boolean
  /** A request's time left (TimerPill S), and the same in words. */
  timer?: ReactNode
  timerText?: string
  selected?: boolean
  card?: ReactNode
  onOpen: () => void
}) {
  const t = useTranslations('calendar.block')
  const s = useTranslations('status')
  const fmt = useFmt()
  const join = useJoin()
  const minutes = end - start
  const size = minutes >= 45 ? 'long' : minutes >= 30 ? 'medium' : 'short'
  const Icon = BOOKING_STATUS_ICON[status]
  const box = useRef<HTMLButtonElement>(null)
  const [room, setRoom] = useState<{ width: number; height: number } | null>(null)
  // what fits is read from the block's own box, before it paints and again whenever it resizes
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    const read = () =>
      setRoom((was) =>
        was?.width === el.offsetWidth && was.height === el.offsetHeight ? was : { width: el.offsetWidth, height: el.offsetHeight },
      )
    read()
    const watch = new ResizeObserver(read)
    watch.observe(el)
    return () => watch.disconnect()
  }, [])
  const count = (phone || walkIn ? 1 : 0) + (alert ? 1 : 0)
  const fit = blockFit({ width: room?.width ?? 999, height: room?.height ?? 999, size, markers: count, timer: !!timer })
  // its name is always the whole booking, whatever the block has room to show
  const label = t('label', {
    time: fmt.timeRange(start, end),
    name,
    service,
    more: t('more', {
      more: join([s(status), phone ? t('byPhone') : '', walkIn ? t('walkIn') : '', alert ? t('alert') : '', timerText ?? ''], 'list'),
    }),
  })
  const struck = status === 'cancelled' && 'line-through'
  const markers = fit.markers && count > 0 && (
    <>
      {phone && <Phone strokeWidth={1.75} />}
      {walkIn && <User strokeWidth={1.75} />}
      {alert && <TriangleAlert strokeWidth={1.75} className="text-danger-ink" />}
    </>
  )
  const top = (markers || fit.timer === 'top') && (
    <span aria-hidden className="absolute top-0.5 right-1 flex items-center gap-1 text-n-900 [&_svg]:size-3">
      {markers}
      {fit.timer === 'top' && timer}
    </span>
  )
  const reserve = (fit.markers ? count * 16 : 0) + (fit.timer === 'top' ? TIMER_ROOM : 0)
  const button = (
    <button
      ref={box}
      type="button"
      data-testid="week-block"
      aria-pressed={selected || undefined}
      onClick={onOpen}
      style={style}
      className={cn(
        'absolute z-4 flex cursor-pointer flex-col items-stretch overflow-hidden text-left text-n-900',
        'hover:brightness-[.97] focus-visible:shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-a-400)] focus-visible:outline-none',
        size === 'short' ? 'flex-row items-center gap-1 rounded-[4px] px-1.5' : 'gap-px rounded-ctl-s py-0.5 pr-1.5 pl-1.5',
        size === 'medium' && 'justify-center',
        BLOCK_LOOK[status],
        selected && 'z-5 shadow-[0_0_0_2px_var(--color-n-0),0_0_0_4px_var(--color-n-900)]',
      )}
    >
      <span className="sr-only">{label}</span>
      {size === 'short' ? (
        <span aria-hidden className="flex min-w-0 items-center gap-1" style={{ paddingRight: reserve }}>
          {fit.time !== 'none' && (
            <>
              <span className={cn('size-1.5 flex-none rounded-pill', DOT[status])} />
              <span className="flex-none text-[12px] leading-[13px] font-semibold tabular-nums">{fmt.time(start)}</span>
            </>
          )}
          {fit.name && <span className={cn('min-w-0 truncate text-[12px] leading-[13px] font-semibold', struck)}>{shortName(name)}</span>}
        </span>
      ) : (
        <span aria-hidden className="contents">
          {(fit.time !== 'none' || size === 'medium') && (
            <span className="flex min-w-0 items-center gap-1 whitespace-nowrap" style={{ paddingRight: reserve }}>
              {fit.time !== 'none' && (
                <>
                  <Icon strokeWidth={2} className={cn('size-3 flex-none', ICON_INK[status])} />
                  <span className="flex-none text-[12px] leading-[14px] font-semibold tabular-nums">
                    {fit.time === 'range' ? fmt.timeRange(start, end) : fmt.time(start)}
                  </span>
                </>
              )}
              {size === 'medium' && fit.name && (
                <span className={cn('min-w-0 truncate text-[13px] leading-[14px] font-semibold', struck)}>{name}</span>
              )}
            </span>
          )}
          {size === 'long' && (
            <>
              <span
                className={cn('truncate text-[13px] leading-[15px] font-semibold', struck)}
                style={fit.time === 'none' ? { paddingRight: reserve } : undefined}
              >
                {name}
              </span>
              <span className="truncate text-[12px] leading-[14px] text-n-600">{service}</span>
            </>
          )}
          {fit.timer === 'line' && <span className="flex">{timer}</span>}
        </span>
      )}
      {top}
    </button>
  )
  return card ? (
    <HoverCard card={card} label={join([name, fmt.timeRange(start, end)], 'dot')}>
      {button}
    </HoverCard>
  ) : (
    button
  )
}
