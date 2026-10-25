import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { OfferedTime, OfferSource } from '@yeral/contract/bookings'
import { useFmt } from '@yeral/i18n'
import { isApiError } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from '@yeral/ui/popover'
import { TimeSlot } from '@yeral/ui/time-slots'
import { toast } from '@yeral/ui/toast'
import { useLocale, useTranslations } from 'use-intl'
import { useErrorText } from '@/shared/i18n'
import { calendarAt } from '@/shared/lib'

/** A booking's times as a row and the drawer write them: «Sat, 25 Oct · 14:30–15:30». */
export function useWhen() {
  const t = useTranslations('myBookings')
  const fmt = useFmt()
  return (date: string, start: number, end: number) =>
    t('when', { date: fmt.shortWeekdayDate(calendarAt(date, start).date), range: fmt.timeRange(start, end) })
}

/**
 * Times offered in place of a booking (Account-Bookings `offerBits`, book C-24, C-25, C-27), in a row and the drawer
 * alike: after a decline or the business's cancel «Offered times» with the caption, after an expiry its lead and «Free
 * times»; a taken one disabled with «Already taken», a passed one disabled. A tap asks «… book this time?» and Book
 * takes it (`accept-alternative`; after an expiry it's a new request unless the business confirms at once); a time
 * taken a moment before says so and the booking and the lists are read again.
 */
export function OfferTimes({
  code,
  business,
  services,
  offers,
}: {
  code: string
  business: string
  /** What was booked, for the question («Women's haircut · Aýna»). */
  services: string
  offers: { source: OfferSource; times: readonly OfferedTime[] }
}) {
  const t = useTranslations('myBookings')
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const queryClient = useQueryClient()
  const errorText = useErrorText()
  const when = useWhen()
  const accept = useMutation(sdk.bookings.acceptAlternative(lang))
  // the booking the times stand in for now names the one made (`offerTakenBy`): the sdk keeps the new one only
  const stale = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: sdk.bookings.detail(code, lang).queryKey }),
      queryClient.invalidateQueries({ queryKey: sdk.bookings.list('upcoming', lang).queryKey }),
    ])
  const take = (index: number) => {
    const offer = offers.times[index]
    accept.mutate(
      { code, body: { source: offers.source, index } },
      {
        onSuccess: (made) => {
          void stale()
          toast(made.status === 'pending' ? t('requested') : t('booked', { when: offer ? when(offer.date, offer.start, offer.end) : '' }))
        },
        onError: (error) => {
          // the times as they are now (the one taken shows as taken), and words that fit a chip
          void stale()
          toast(isApiError(error, 'slot_taken') ? t('offerGone') : errorText(error))
        },
      },
    )
  }
  const expired = offers.source === 'expired'
  return (
    <div className="flex min-w-0 flex-col items-start gap-2.5">
      {expired ? (
        <span className="text-small text-n-900">{t('expiredLead', { business })}</span>
      ) : (
        <span className="text-label text-n-500 uppercase">{t('offered')}</span>
      )}
      <div role="group" aria-label={expired ? t('freeTimes') : t('offered')} className="flex flex-wrap items-start gap-2">
        {offers.times.map((o, i) => {
          const time = when(o.date, o.start, o.end)
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
              <PopoverContent aria-labelledby={`${code}-ask-${i}`} className="flex w-80 flex-col gap-3 p-4">
                <p id={`${code}-ask-${i}`} className="m-0 text-small">
                  {t('ask', { when: time, what: o.staff ? t('what', { services, staff: o.staff.name }) : services })}
                </p>
                <div className="flex justify-end gap-2">
                  <PopoverClose asChild>
                    <Button size="s" variant="secondary">
                      {t('back')}
                    </Button>
                  </PopoverClose>
                  <Button size="s" variant="primary" loading={accept.isPending} onClick={() => !accept.isPending && take(i)}>
                    {t('book')}
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          )
        })}
      </div>
      {!expired && <span className="text-dense text-n-600">{t('offeredCaption')}</span>}
    </div>
  )
}
