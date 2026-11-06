import { openMinutesBetween, type BusinessHours } from '@yeral/domain/hours'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { useMediaQuery } from '@yeral/ui/media-query'
import { StatusBadge } from '@yeral/ui/status-badge'
import { Table, TableCell, TableColumnHeader, TableHeader, TableRow } from '@yeral/ui/table'
import { TimerPill } from '@yeral/ui/timer-pill'
import { ChevronRight } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { BOOKING_STATUS_ICON } from '@/entities/booking'
import type { ClientBooking } from '../model/card'
import { useWhat } from '../model/use-what'
import { BookingLink } from './booking-link'
import { CardSection, Caption } from './card-section'

const HISTORY_COLUMNS = '136px minmax(0,1fr) 100px 152px'

/** A booking's status with its icon (B-Client `.badge`). */
export function BookingStatus({ status }: { status: ClientBooking['status'] }) {
  const s = useTranslations('status')
  const Icon = BOOKING_STATUS_ICON[status]
  return (
    <StatusBadge status={status} icon={<Icon aria-hidden strokeWidth={2} className="size-3.5" />}>
      {s(status)}
    </StatusBadge>
  )
}

/** A waiting request's answer time, counted in the business's open minutes when the page has its hours. */
export function AnswerTimer({ until, business }: { until: number; business: BusinessHours | null }) {
  const t = useTranslations('clientCard')
  const fmt = useFmt()
  return (
    <TimerPill
      size="s"
      until={until}
      left={business ? (at: number) => openMinutesBetween(business, at, until) : undefined}
      format={(m) => fmt.duration(m)}
      label={(m) => t('timeLeft', { time: fmt.duration(m) })}
    />
  )
}

/** Upcoming (B-Client `.urow`): requests with their timer and visits ahead, the soonest first, each opening where it's handled. */
export function ClientUpcoming({
  slug,
  bookings,
  now,
  business,
}: {
  slug: string
  bookings: readonly ClientBooking[]
  now: number
  business: BusinessHours | null
}) {
  const t = useTranslations('clientCard')
  const fmt = useFmt()
  const what = useWhat()
  return (
    <CardSection title={t('upcoming')} count={bookings.length || undefined}>
      {bookings.length ? (
        <div className="flex flex-col">
          {bookings.map((b) => (
            <BookingLink
              key={b.code}
              slug={slug}
              booking={b}
              className="-mx-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 rounded-m p-3 text-small text-n-900 no-underline hover:bg-n-50 focus-visible:shadow-focus focus-visible:outline-none sm:grid-cols-[120px_minmax(0,1fr)_auto_20px]"
            >
              <span className="flex flex-col max-sm:col-span-2">
                <span className="font-semibold">{fmt.relativeShortDate(b.date, today(now))}</span>
                <Caption>{fmt.timeRange(b.start, b.end)}</Caption>
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate">{what(b)}</span>
                <Caption>
                  {b.price
                    ? t('meta', { length: fmt.duration(b.end - b.start), price: fmt.price(b.price) })
                    : fmt.duration(b.end - b.start)}
                </Caption>
              </span>
              <span className="flex flex-wrap items-center justify-end gap-2">
                <BookingStatus status={b.status} />
                {b.status === 'pending' && b.holdUntil !== null && <AnswerTimer until={b.holdUntil} business={business} />}
              </span>
              <ChevronRight aria-hidden className="size-5 text-n-500 max-sm:hidden" />
              <span className="sr-only">{t(b.status === 'pending' ? 'openRequest' : 'openCalendar')}</span>
            </BookingLink>
          ))}
        </div>
      ) : (
        <Caption>{t('noUpcoming')}</Caption>
      )}
    </CardSection>
  )
}

/** History (B-Client `.hr`): the newest first, «Show more» asking for the next ones; under 768 the price goes, as drawn. */
export function ClientHistory({
  bookings,
  more,
  loading,
  onMore,
}: {
  bookings: readonly ClientBooking[]
  more: boolean
  loading: boolean
  onMore: () => void
}) {
  const t = useTranslations('clientCard')
  const clients = useTranslations('clients')
  const fmt = useFmt()
  const what = useWhat()
  const phone = useMediaQuery('(max-width: 767px)')
  return (
    <CardSection title={t('history.title')}>
      {bookings.length === 0 ? (
        <Caption>{t('history.none')}</Caption>
      ) : phone ? (
        <ul aria-label={t('history.title')} className="m-0 flex list-none flex-col p-0">
          {bookings.map((b) => (
            <li
              key={b.code}
              className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-2.5 border-b border-n-200 py-2 text-small"
            >
              <span>{fmt.shortDate(b.date)}</span>
              <span className="min-w-0">{what(b)}</span>
              <BookingStatus status={b.status} />
            </li>
          ))}
        </ul>
      ) : (
        <Table columns={HISTORY_COLUMNS} aria-label={t('history.title')}>
          <TableHeader>
            <TableColumnHeader>{t('history.date')}</TableColumnHeader>
            <TableColumnHeader>{t('history.what')}</TableColumnHeader>
            <TableColumnHeader numeric>{t('history.price')}</TableColumnHeader>
            <TableColumnHeader>{t('history.status')}</TableColumnHeader>
          </TableHeader>
          {bookings.map((b) => (
            <TableRow key={b.code}>
              <TableCell>{fmt.shortDate(b.date)}</TableCell>
              <TableCell>{what(b)}</TableCell>
              <TableCell numeric>{b.price ? fmt.price(b.price) : ''}</TableCell>
              <TableCell className="items-start">
                <BookingStatus status={b.status} />
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}
      {more && (
        <Button variant="secondary" size="s" className="self-start" loading={loading} onClick={onMore}>
          {clients('showMore')}
        </Button>
      )}
    </CardSection>
  )
}
