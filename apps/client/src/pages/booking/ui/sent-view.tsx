import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { epochOf, localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { buildIcs, ICS_TYPE } from '@yeral/lib/ics'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { KeyValueList } from '@yeral/ui/key-value'
import { Price } from '@yeral/ui/price'
import { Skeleton } from '@yeral/ui/skeleton'
import { StatusBadge } from '@yeral/ui/status-badge'
import { Timeline } from '@yeral/ui/timeline'
import { CalendarPlus, Check, Clock, Send } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { site } from '@/shared/config'
import { calendarAt, downloadFile } from '@/shared/lib'

/**
 * The sent page (Booking `step=sent`, book C-20, C-21): «Booking sent» and Pending for a business that confirms by hand,
 * «Booking confirmed» for an instant one; the booking's card (the business, the services with their minutes, the
 * specialist, the time, the address, the total, the code); what happens next; My bookings, Add to calendar (an `.ics`
 * file) and Home. No SMS is promised (the first launch sends none, book Q-036): the answer shows in My bookings.
 */
export function SentView({ code, detail }: { code: string; detail: BusinessDetail }) {
  const t = useTranslations('booking.sent')
  const status = useTranslations('status')
  const tb = useTranslations('booking')
  const lang = useLocale()
  const sdk = useSdk()
  const fmt = useFmt()
  const booking = useQuery(sdk.bookings.detail(code, lang))
  const [ics, setIcs] = useState(false)
  const b = booking.data
  if (!b)
    return (
      <div className="flex flex-col gap-6" aria-hidden>
        <Skeleton className="mx-auto size-16 rounded-pill" />
        <Skeleton className="mx-auto h-9 w-64" />
        <Skeleton className="h-72 w-full rounded-card" />
      </div>
    )
  const confirmed = b.status === 'confirmed'
  const items = b.what.type === 'appointment' ? b.what.items : []
  const staffNames = [...new Set(items.map((i) => i.staff).filter((s): s is string => Boolean(s)))]
  const visit = calendarAt(b.date, b.start)
  const when = tb('summary.when', { date: fmt.weekdayDate(visit.date), range: fmt.timeRange(b.start, b.end) })
  const address = [b.address, b.floor].filter(Boolean).join(', ')
  const answerBy = b.holdUntil ? localOf(b.holdUntil) : null
  const addToCalendar = () => {
    const file = buildIcs({
      uid: `${b.code}@${new URL(site.urls.client).host}`,
      start: epochOf(b.date, b.start),
      end: epochOf(b.date, b.end),
      title: t('icsTitle', { services: items.map((i) => i.service).join(', '), business: b.business.name }),
      location: address,
    })
    downloadFile(`booking-${b.code}.ics`, file, ICS_TYPE)
    setIcs(true)
  }
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col items-center gap-4 text-center">
        <span aria-hidden className="flex size-16 items-center justify-center rounded-pill bg-a-50 text-a-500">
          {confirmed ? <Check className="size-7" strokeWidth={2} /> : <Send className="size-7" strokeWidth={1.75} />}
        </span>
        <h1 className="m-0 text-[32px] leading-[38px] font-bold tracking-[-0.025em]">{confirmed ? t('titleConfirmed') : t('titleSent')}</h1>
        <StatusBadge
          status={confirmed ? 'confirmed' : 'pending'}
          icon={
            confirmed ? (
              <Check aria-hidden className="size-3.5" strokeWidth={2} />
            ) : (
              <Clock aria-hidden className="size-3.5" strokeWidth={2} />
            )
          }
        >
          {confirmed ? status('confirmed') : status('pending')}
        </StatusBadge>
        {!confirmed && (
          <p className="m-0 max-w-125 text-body text-n-600">
            {detail.typicalConfirmMinutes
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
                    <span key={n}>
                      {i.service} · {fmt.duration(i.end - i.start)}
                    </span>
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
      <section className="flex flex-col gap-5">
        <h2 className="m-0 text-[20px] leading-[26px] font-semibold tracking-[-0.015em]">{t('next')}</h2>
        <Timeline
          variant="numbered"
          items={[
            { title: confirmed ? t('stepConfirmed') : t('stepSent'), done: true, state: t('done') },
            ...(confirmed
              ? []
              : [
                  {
                    title: t('stepAnswer'),
                    caption: answerBy
                      ? t('stepAnswerBy', { time: fmt.time(answerBy.min) })
                      : detail.typicalConfirmMinutes
                        ? t('stepAnswerWithin', { time: fmt.duration(detail.typicalConfirmMinutes) })
                        : undefined,
                  },
                ]),
            { title: t('stepVisit'), caption: when },
          ]}
        />
      </section>
      <div className="flex flex-col items-center gap-3.5">
        <div className="flex flex-wrap justify-center gap-3">
          <Button asChild size="l" variant="primary">
            <Link to="/$lang/account" params={{ lang }}>
              {t('myBookings')}
            </Link>
          </Button>
          <Button size="l" variant="secondary" onClick={addToCalendar}>
            <CalendarPlus aria-hidden />
            {t('addToCalendar')}
          </Button>
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
        <span className="text-center text-dense text-n-600">
          {!confirmed
            ? t('freeCancelPending')
            : detail.rules.cancelWindowMinutes
              ? t('freeCancelUpTo', { time: fmt.duration(detail.rules.cancelWindowMinutes) })
              : t('freeCancelAnyTime')}
        </span>
      </div>
    </div>
  )
}
