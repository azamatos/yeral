import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { MyBooking } from '@yeral/contract/bookings'
import { isApiError } from '@yeral/sdk'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@yeral/ui/popover'
import { Price } from '@yeral/ui/price'
import { TimerPill } from '@yeral/ui/timer-pill'
import { TimeSlot } from '@yeral/ui/time-slots'
import { toast } from '@yeral/ui/toast'
import { Building2, CalendarDays, Clock, Hourglass, UserRound } from 'lucide-react'
import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BookingStatusBadge } from '@/entities/booking'
import { useErrorText } from '@/shared/i18n'
import { calendarAt } from '@/shared/lib'

/** A line under the status (`.bby`): a 14 icon and a 13/18 caption. */
function ByLine({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-dense text-n-600 [&_svg]:size-3.5 [&_svg]:flex-none">
      {icon}
      {children}
    </span>
  )
}

/**
 * A row of My bookings (Account-Bookings `.brow`, book C-23–C-31, C-40): the business's photo, its name, what and when
 * (struck through once cancelled), the status with who cancelled, a request's answer time, a waiting move, the
 * reason of a decline or the business's cancel, the price, and what can be done now: Undo after the client's own
 * cancel, Book again. A declined, expired or business-cancelled booking with times offered shows them as chips; one
 * tap asks «book this time?» and books it (`accept-alternative`; after an expiry it's a new request).
 */
export function BookingRow({ booking: b }: { booking: MyBooking }) {
  const t = useTranslations('myBookings')
  const reasons = useTranslations()
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const errorText = useErrorText()
  const restore = useMutation(sdk.bookings.restore(lang))
  const accept = useMutation(sdk.bookings.acceptAlternative(lang))
  const items = b.what.type === 'appointment' ? b.what.items : []
  const staff = [...new Set(items.map((i) => i.staff).filter((s): s is string => Boolean(s)))]
  const services = items.map((i) => i.service).join(', ')
  const at = (date: string, start: number, end: number) =>
    t('when', { date: fmt.shortWeekdayDate(calendarAt(date, start).date), range: fmt.timeRange(start, end) })
  const cancelled = b.status === 'cancelled'
  const offers = b.offers?.times.some((o) => o.state === 'free') ? b.offers : null
  const by =
    b.cancelledBy === 'client'
      ? t('byClient')
      : b.cancelledBy === 'system'
        ? t('bySystem')
        : b.cancelledBy === 'business'
          ? b.decline
            ? t('declined')
            : t('byBusiness')
          : null
  const reason = b.decline
    ? { reason: reasons(`declineReasons.${b.decline.reason}`), text: b.decline.text }
    : b.businessCancel
      ? { reason: reasons(`businessCancelReasons.${b.businessCancel.reason}`), text: b.businessCancel.text }
      : null

  const undo = () =>
    restore.mutate(
      { code: b.code, body: undefined },
      {
        onSuccess: () => toast(t('undone')),
        onError: (error) => {
          const why = isApiError(error) ? error.code : null
          const known = why === 'slot_taken' || why === 'session_full' || why === 'already_started' || why === 'request_expired'
          toast(known ? reasons('undo.failed', { reason: reasons(`undo.reasons.${why}`) }) : errorText(error))
        },
      },
    )
  const take = (index: number) => {
    if (!offers) return
    const offer = offers.times[index]
    accept.mutate(
      { code: b.code, body: { source: offers.source, index } },
      {
        onSuccess: () =>
          toast(offers.source === 'expired' ? t('requested') : t('booked', { when: offer ? at(offer.date, offer.start, offer.end) : '' })),
        onError: (error) => toast(errorText(error)),
      },
    )
  }

  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_auto] gap-5 rounded-card px-4 py-5 max-sm:grid-cols-[64px_minmax(0,1fr)] max-sm:gap-x-3.5 max-sm:gap-y-3 max-sm:px-0">
      {b.business.photo ? (
        <img
          src={b.business.photo.url}
          alt=""
          className={cn('block size-24 rounded-m object-cover max-sm:size-16', cancelled && 'opacity-50')}
        />
      ) : (
        <span aria-hidden className="flex size-24 items-center justify-center rounded-m bg-n-100 text-n-500 max-sm:size-16">
          <Building2 className="size-7" strokeWidth={1.75} />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn('text-[16px] leading-[22px] font-semibold', cancelled && 'text-n-600')}>{b.business.name}</span>
        {services && (
          <span className="text-small text-n-600">{staff.length > 0 ? t('what', { services, staff: staff.join(', ') }) : services}</span>
        )}
        <span className={cn('inline-flex items-center gap-1.5 text-small', cancelled ? 'text-n-500 line-through' : 'text-n-900')}>
          <CalendarDays aria-hidden className="size-4 flex-none text-n-600" strokeWidth={1.75} />
          {at(b.date, b.start, b.end)}
        </span>
        <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
          <BookingStatusBadge status={b.status} />
          {b.status === 'pending' && b.holdUntil && (
            <TimerPill until={b.holdUntil} format={(m) => t('timer', { minutes: m })} label={(m) => t('timerLabel', { minutes: m })} />
          )}
          {by && (
            <ByLine
              icon={
                b.cancelledBy === 'client' ? (
                  <UserRound aria-hidden />
                ) : b.cancelledBy === 'system' ? (
                  <Hourglass aria-hidden />
                ) : (
                  <Building2 aria-hidden />
                )
              }
            >
              {by}
            </ByLine>
          )}
          {b.reschedule && (
            <ByLine icon={<Clock aria-hidden className="text-st-pending-ink" />}>
              {t('moveWaiting', { when: at(b.reschedule.date, b.reschedule.start, b.reschedule.end) })}
            </ByLine>
          )}
        </div>
        {reason && (
          <span className="text-dense text-n-600">
            {reason.text ? t('reasonWith', { reason: reason.reason, text: reason.text }) : t('reason', { reason: reason.reason })}
          </span>
        )}
        {b.offerTakenBy && <span className="text-dense font-semibold text-a-600">{t('tookAnother', { code: b.offerTakenBy })}</span>}
      </div>
      <div className="flex flex-col items-end justify-between gap-3 max-sm:col-span-2 max-sm:flex-row max-sm:items-center">
        {b.price ? (
          <Price hidden={b.price.type === 'hidden'} className={cn(cancelled && 'text-n-500')}>
            {fmt.price(b.price)}
          </Price>
        ) : (
          <span />
        )}
        <div className="flex flex-wrap items-center justify-end gap-1">
          {b.actions.restore && (
            <Button size="s" variant="ghost" onClick={() => !restore.isPending && undo()}>
              {t('undo')}
            </Button>
          )}
          {b.actions.bookAgain && (
            <Button asChild size="s" variant="secondary">
              <Link to="/$lang/b/$slug" params={{ lang, slug: b.business.slug }}>
                {t('bookAgain')}
              </Link>
            </Button>
          )}
        </div>
      </div>
      {offers && (
        <div className="col-start-2 col-end-[-1] flex min-w-0 flex-col items-start gap-2.5 max-sm:col-start-1">
          {offers.source === 'expired' ? (
            <span className="text-small text-n-900">{t('expiredLead', { business: b.business.name })}</span>
          ) : (
            <span className="text-label text-n-500 uppercase">{t('offered')}</span>
          )}
          <div role="group" aria-label={t('offered')} className="flex flex-wrap items-start gap-2">
            {offers.times.map((o, i) => {
              const when = at(o.date, o.start, o.end)
              if (o.state !== 'free')
                return (
                  <span key={i} className="inline-flex flex-col items-start gap-1">
                    <TimeSlot disabled aria-label={t('offerTakenLabel', { when })}>
                      {fmt.time(o.start)}
                    </TimeSlot>
                    {o.state === 'taken' && <span className="text-micro text-n-500">{t('offerTaken')}</span>}
                  </span>
                )
              return (
                <Popover key={i}>
                  <PopoverTrigger asChild>
                    <TimeSlot aria-label={t('offerPick', { time: when })}>{fmt.time(o.start)}</TimeSlot>
                  </PopoverTrigger>
                  <PopoverContent aria-labelledby={`${b.code}-ask-${i}`} className="flex w-80 flex-col gap-3 p-4">
                    <p id={`${b.code}-ask-${i}`} className="m-0 text-small">
                      {t('ask', { when, what: o.staff ? t('what', { services, staff: o.staff.name }) : services })}
                    </p>
                    <div className="flex justify-end gap-2">
                      <PopoverClose asChild>
                        <Button size="s" variant="secondary">
                          {t('back')}
                        </Button>
                      </PopoverClose>
                      <Button size="s" variant="primary" loading={accept.isPending} onClick={() => take(i)}>
                        {t('book')}
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
