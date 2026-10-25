import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { epochOf, localOf, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { buildIcs, ICS_TYPE } from '@yeral/lib/ics'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { useClock } from '@yeral/ui/clock'
import { KeyValueList } from '@yeral/ui/key-value'
import { Price } from '@yeral/ui/price'
import { Skeleton } from '@yeral/ui/skeleton'
import { Timeline } from '@yeral/ui/timeline'
import { CalendarPlus, Check, CircleAlert, Send } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BookingStatusBadge, whatParts } from '@/entities/booking'
import { site } from '@/shared/config'
import { addressLine, calendarAt, downloadFile } from '@/shared/lib'

/**
 * The sent page (Booking `step=sent`, book C-20, C-21): «Booking sent» and Pending for a business that confirms by hand,
 * «Booking confirmed» for an instant one; the booking's card (the business, the services with their minutes, the
 * specialist, the time, the address, the total, the code); what happens next; My bookings, Add to calendar (an `.ics`
 * file) and Home. No SMS is promised (the first launch sends none, book Q-036): the answer shows in My bookings. Opened
 * again later (a reload, the address kept), a booking no longer waiting or confirmed says only what it is now; one that
 * can't be read (signed out, another person's) points to My bookings.
 */
export function SentView({ code, detail }: { code: string; detail: BusinessDetail }) {
  const t = useTranslations('booking.sent')

  const tb = useTranslations('booking')
  const brand = useTranslations('common')('brand')
  const now = useClock()
  const lang = useLocale()
  const sdk = useSdk()
  const fmt = useFmt()
  const booking = useQuery(sdk.bookings.detail(code, lang))
  const [ics, setIcs] = useState(false)
  const b = booking.data
  const myBookings = (
    <Button asChild size="l" variant="primary">
      <Link to="/$lang/account/bookings" params={{ lang }}>
        {t('myBookings')}
      </Link>
    </Button>
  )
  if (!b && booking.isError)
    return (
      <div className="flex flex-col items-center gap-6">
        <Callout tone="danger" icon={<CircleAlert />} className="w-full">
          {t('failed')}
        </Callout>
        {myBookings}
      </div>
    )
  if (!b)
    return (
      <div className="flex flex-col gap-6" aria-hidden>
        <Skeleton className="mx-auto size-16 rounded-pill" />
        <Skeleton className="mx-auto h-9 w-64" />
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    )
  const state = b.status === 'pending' || b.status === 'confirmed' ? b.status : 'other'
  // this page's business speaks for the booking's only when they're the same (a code from another page's link)
  const own = b.business.slug === detail.slug
  const items = b.what.type === 'appointment' ? b.what.items : []
  const [services = '', ...staffNames] = whatParts(b.what)
  const visit = calendarAt(b.date, b.start)
  const when = tb('summary.when', { date: fmt.weekdayDate(visit.date), range: fmt.timeRange(b.start, b.end) })
  const address = addressLine(b, fmt)
  const answerBy = b.holdUntil ? localOf(b.holdUntil) : null
  const addToCalendar = () => {
    const file = buildIcs({
      uid: `${b.code}@${new URL(site.urls.client).host}`,
      product: brand,
      start: epochOf(b.date, b.start),
      end: epochOf(b.date, b.end),
      title: t('icsTitle', { services, business: b.business.name }),
      location: address,
    })
    downloadFile(t('icsFile', { code: b.code }), file, ICS_TYPE)
    setIcs(true)
  }
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-pill bg-a-50 text-a-500">
          {state === 'confirmed' ? <Check className="size-7" strokeWidth={2} /> : <Send className="size-7" strokeWidth={1.75} />}
        </span>
        <h1 className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.025em]">
          {state === 'confirmed' ? t('titleConfirmed') : state === 'pending' ? t('titleSent') : t('titleOther')}
        </h1>
        <BookingStatusBadge status={b.status} />
        {state === 'pending' && (
          <p className="m-0 max-w-125 text-body text-n-600">
            {own && detail.typicalConfirmMinutes
              ? t('leadWithin', { business: b.business.name, time: fmt.duration(detail.typicalConfirmMinutes) })
              : t('leadByHand', { business: b.business.name })}{' '}
            {t('leadOffers')}
          </p>
        )}
      </div>
      <div className="overflow-hidden rounded-card border border-n-200 bg-n-0">
        <div className="flex items-center gap-3.5 border-b border-n-200 px-6 py-5">
          {b.business.photo && <img src={b.business.photo.url} alt="" className="block size-12 flex-none rounded-s object-cover" />}
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-[16px] leading-[22px] font-semibold">{b.business.name}</span>
            <span className="text-dense text-n-600">{b.business.category}</span>
          </div>
        </div>
        <KeyValueList
          className="px-6 py-5"
          items={[
            {
              key: t('services', { count: items.length }),
              value: (
                <span className="flex flex-col">
                  {items.map((i, n) => (
                    <span key={n}>{t('serviceLine', { service: i.service, duration: fmt.duration(i.end - i.start) })}</span>
                  ))}
                </span>
              ),
            },
            ...(staffNames.length > 0 ? [{ key: t('specialist'), value: staffNames.join(', ') }] : []),
            { key: t('when'), value: when },
            { key: t('address'), value: address },
          ]}
        />
        <div className="flex items-center justify-between gap-4 border-t border-n-200 px-6 py-4">
          <span className="flex flex-col gap-0.5">
            <span className="text-body font-semibold">{t('total')}</span>
            <span className="text-dense text-n-600">{t('payAtPlace')}</span>
          </span>
          {b.price && (
            <Price size="total" hidden={b.price.type === 'hidden'}>
              {fmt.price(b.price)}
            </Price>
          )}
        </div>
        <div className="border-t border-n-200 bg-n-50 px-6 py-3.5 text-dense text-n-600 [&_b]:font-semibold [&_b]:text-n-900">
          {t.rich('code', { code: b.code, b: (chunks) => <b>{chunks}</b> })}
        </div>
      </div>
      {state !== 'other' && (
        <section className="flex flex-col gap-5">
          <h2 className="m-0 text-[20px] leading-[26px] font-semibold tracking-[-0.015em]">{t('next')}</h2>
          <Timeline
            variant="numbered"
            items={[
              { title: state === 'confirmed' ? t('stepConfirmed') : t('stepSent'), done: true, state: t('done') },
              ...(state === 'confirmed'
                ? []
                : [
                    {
                      title: t('stepAnswer'),
                      caption: answerBy
                        ? t('stepAnswerBy', {
                            // «09:30» today, «Tomorrow 09:30» after a request sent while closed
                            time:
                              answerBy.date === today(now)
                                ? fmt.time(answerBy.min)
                                : tb('at', { day: fmt.relativeShortDate(answerBy.date, today(now)), time: fmt.time(answerBy.min) }),
                          })
                        : own && detail.typicalConfirmMinutes
                          ? t('stepAnswerWithin', { time: fmt.duration(detail.typicalConfirmMinutes) })
                          : undefined,
                    },
                  ]),
              { title: t('stepVisit'), caption: when },
            ]}
          />
        </section>
      )}
      <div className="flex flex-col items-center gap-3.5">
        <div className="flex flex-wrap justify-center gap-3">
          {myBookings}
          {state !== 'other' && (
            <Button size="l" variant="secondary" onClick={addToCalendar}>
              <CalendarPlus aria-hidden />
              {t('addToCalendar')}
            </Button>
          )}
          <Button asChild size="l" variant="ghost">
            <Link to="/$lang" params={{ lang }}>
              {t('home')}
            </Link>
          </Button>
        </div>
        {ics && (
          <span role="status" className="text-dense text-n-600">
            {t('icsDone')}
          </span>
        )}
        {state !== 'other' && (
          <span className="text-center text-dense text-n-600">
            {state === 'pending'
              ? t('freeCancelPending')
              : own && detail.rules.cancelWindowMinutes
                ? t('freeCancelUpTo', { time: fmt.duration(detail.rules.cancelWindowMinutes) })
                : t('freeCancelAnyTime')}
          </span>
        )}
      </div>
    </div>
  )
}
