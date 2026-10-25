import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { MyBooking } from '@yeral/contract/bookings'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@yeral/ui/popover'
import { Price } from '@yeral/ui/price'
import { TimeSlot } from '@yeral/ui/time-slots'
import { toast } from '@yeral/ui/toast'
import { Building2, CalendarDays, CircleAlert, Clock, Hourglass, Phone, UserRound } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BookingStatusBadge } from '@/entities/booking'
import { useErrorText } from '@/shared/i18n'
import { calendarAt } from '@/shared/lib'

/** A line under the status (`.bby`): a 14 icon and a 13/18 caption. */
function ByLine({ icon, children }: { icon?: ReactNode; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-dense text-n-600 [&_svg]:size-3.5 [&_svg]:flex-none">
      {icon}
      {children}
    </span>
  )
}

const UNDO_REASONS = ['slot_taken', 'session_full', 'already_started', 'request_expired'] as const

/**
 * A row of My bookings (Account-Bookings `.brow`, book C-23–C-31, C-40): the business's photo, its name, what and when
 * (a phone icon for a booking the business made by phone; the time struck through while offered times stand in for
 * it), the status with what it means now (waiting for the business, who cancelled, a no-show, a waiting move), the
 * reason of a decline or the business's cancel, the price, and what can be done now: Call while it's ahead (and for a
 * client booked by phone only), Undo after the client's own cancel (its failure said in the row), Book again. Times
 * offered after a decline, an expiry or the business's cancel show as chips: a tap asks «book this time?» and Book
 * takes it (`accept-alternative`; after an expiry it's a new request unless the business confirms at once); once
 * they've all passed, the row says so with the way to the business's page.
 */
export function BookingRow({ booking: b }: { booking: MyBooking }) {
  const t = useTranslations('myBookings')
  const words = useTranslations()
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const restore = useMutation(sdk.bookings.restore(lang))
  const accept = useMutation(sdk.bookings.acceptAlternative(lang))
  const [undoFailed, setUndoFailed] = useState<string | null>(null)
  const items = b.what.type === 'appointment' ? b.what.items : []
  const staff = [...new Set(items.map((i) => i.staff).filter((s): s is string => Boolean(s)))]
  const services = items.map((i) => i.service).join(', ')
  const at = (date: string, start: number, end: number) =>
    t('when', { date: fmt.shortWeekdayDate(calendarAt(date, start).date), range: fmt.timeRange(start, end) })
  const when = at(b.date, b.start, b.end)
  const live = b.offers?.times.some((o) => o.state === 'free') ? b.offers : null
  const passed = b.offers && !live ? b.offers : null
  const ahead = b.status === 'pending' || b.status === 'confirmed'
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
    ? { reason: words(`declineReasons.${b.decline.reason}`), text: b.decline.text }
    : b.businessCancel
      ? { reason: words(`businessCancelReasons.${b.businessCancel.reason}`), text: b.businessCancel.text }
      : null
  const took = b.offerTakenBy
    ? b.cancelledBy === 'system'
      ? t('tookRequest', { code: b.offerTakenBy })
      : t('tookOffer', { code: b.offerTakenBy })
    : null

  const undo = () =>
    restore.mutate(
      { code: b.code, body: undefined },
      {
        onSuccess: () => toast(t('undone')),
        onError: (error) => {
          const why = UNDO_REASONS.find((r) => isApiError(error, r))
          // said in the row, Undo gone: the time isn't coming back (Account-Bookings `undoFailed`)
          setUndoFailed(why ? words('undo.failed', { reason: words(`undo.reasons.${why}`) }) : errorText(error))
        },
      },
    )
  const take = (index: number) => {
    if (!live) return
    const offer = live.times[index]
    accept.mutate(
      { code: b.code, body: { source: live.source, index } },
      {
        onSuccess: (made) =>
          toast(made.status === 'pending' ? t('requested') : t('booked', { when: offer ? at(offer.date, offer.start, offer.end) : '' })),
        onError: (error) => {
          // the list as it is now (the time taken shows as taken), and words that fit a chip
          void queryClient.invalidateQueries({ queryKey: sdk.bookings.list('upcoming', lang).queryKey })
          toast(isApiError(error, 'slot_taken') ? t('offerGone') : errorText(error))
        },
      },
    )
  }

  return (
    <div className="grid grid-cols-[96px_minmax(0,1fr)_auto] gap-5 rounded-card px-4 py-5 max-sm:grid-cols-[64px_minmax(0,1fr)] max-sm:gap-x-3.5 max-sm:gap-y-3 max-sm:px-0">
      {b.business.photo ? (
        <img
          src={b.business.photo.url}
          alt=""
          className={cn('block size-24 rounded-m object-cover max-sm:size-16', b.cancelledBy === 'client' && 'opacity-50')}
        />
      ) : (
        <span aria-hidden className="flex size-24 items-center justify-center rounded-m bg-n-100 text-n-500 max-sm:size-16">
          <Building2 className="size-7" strokeWidth={1.75} />
        </span>
      )}
      <div className="flex min-w-0 flex-col gap-1">
        <span className={cn('text-[16px] leading-[22px] font-semibold', b.cancelledBy === 'client' && 'text-n-600')}>
          {b.business.name}
        </span>
        {services && (
          <span className="text-small text-n-600">{staff.length > 0 ? t('what', { services, staff: staff.join(', ') }) : services}</span>
        )}
        <span className={cn('inline-flex items-center gap-1.5 text-small', live ? 'text-n-500 line-through' : 'text-n-900')}>
          <CalendarDays aria-hidden className="size-4 flex-none text-n-600" strokeWidth={1.75} />
          {when}
          {(b.source === 'phone' || b.source === 'walkin') && (
            <Phone role="img" aria-label={t('byPhone')} className="size-3.5 flex-none text-n-600" strokeWidth={1.75} />
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
          <BookingStatusBadge status={b.status} />
          {b.status === 'pending' && !b.reschedule && <ByLine>{t('waiting')}</ByLine>}
          {b.status === 'noshow' && <ByLine>{t('noshow')}</ByLine>}
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
        {took && <span className="text-dense font-semibold text-a-600">{took}</span>}
        {passed && (
          <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-dense text-n-600">
            {t('offersPassed')}
            <Link to="/$lang/b/$slug" params={{ lang, slug: b.business.slug }} className="font-semibold text-a-600 hover:text-a-700">
              {t('otherTime')}
            </Link>
          </span>
        )}
        {undoFailed && (
          <span role="alert" className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-dense text-danger-ink">
            <span className="inline-flex items-start gap-1.5">
              <CircleAlert aria-hidden className="mt-0.5 size-3.5 flex-none" strokeWidth={2} />
              {undoFailed}
            </span>
            <Link to="/$lang/b/$slug" params={{ lang, slug: b.business.slug }} className="font-semibold text-a-600 hover:text-a-700">
              {t('otherTime')}
            </Link>
          </span>
        )}
      </div>
      <div className="flex flex-col items-end justify-between gap-3 max-sm:col-span-2 max-sm:flex-row max-sm:items-center">
        {b.price ? <Price hidden={b.price.type === 'hidden'}>{fmt.price(b.price)}</Price> : <span />}
        <div className="flex flex-wrap items-center justify-end gap-1">
          {(ahead || !b.bookOnline || b.actions.callOnly) && (
            <Button asChild size="s" variant="ghost">
              <a href={`tel:${b.business.phone}`} aria-label={t('callLabel', { business: b.business.name })}>
                <Phone aria-hidden />
                {t('call')}
              </a>
            </Button>
          )}
          {b.actions.restore && !undoFailed && (
            <Button
              size="s"
              variant="ghost"
              loading={restore.isPending}
              aria-label={t('undoLabel', { business: b.business.name, when })}
              onClick={() => !restore.isPending && undo()}
            >
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
      {live && (
        <div className="col-start-2 col-end-[-1] flex min-w-0 flex-col items-start gap-2.5 max-sm:col-start-1">
          {live.source === 'expired' ? (
            <span className="text-small text-n-900">{t('expiredLead', { business: b.business.name })}</span>
          ) : (
            <span className="text-label text-n-500 uppercase">{t('offered')}</span>
          )}
          <div
            role="group"
            aria-label={live.source === 'expired' ? t('freeTimes') : t('offered')}
            className="flex flex-wrap items-start gap-2"
          >
            {live.times.map((o, i) => {
              const time = at(o.date, o.start, o.end)
              if (o.state !== 'free')
                return (
                  <span key={i} className="inline-flex flex-col items-start gap-1">
                    <TimeSlot
                      disabled
                      aria-label={o.state === 'taken' ? t('offerTakenLabel', { when: time }) : t('offerPastLabel', { when: time })}
                    >
                      {fmt.time(o.start)}
                    </TimeSlot>
                    {o.state === 'taken' && <span className="text-micro text-n-500">{t('offerTaken')}</span>}
                  </span>
                )
              return (
                <Popover key={i}>
                  <PopoverTrigger asChild>
                    <TimeSlot aria-label={t('offerPick', { time })}>{fmt.time(o.start)}</TimeSlot>
                  </PopoverTrigger>
                  <PopoverContent aria-labelledby={`${b.code}-ask-${i}`} className="flex w-80 flex-col gap-3 p-4">
                    <p id={`${b.code}-ask-${i}`} className="m-0 text-small">
                      {t('ask', { when: time, what: o.staff ? t('what', { services, staff: o.staff.name }) : services })}
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
          {live.source !== 'expired' && <span className="text-dense text-n-600">{t('offeredCaption')}</span>}
        </div>
      )}
    </div>
  )
}
