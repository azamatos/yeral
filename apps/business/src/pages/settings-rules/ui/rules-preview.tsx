import { useQuery } from '@tanstack/react-query'
import { localized } from '@yeral/domain/model'
import { today as todayIn, addDays } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { StatusBadge } from '@yeral/ui/status-badge'
import { CalendarClock, Check, CircleCheck, Clock, Phone, Send } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import type { RulesForm } from '@/features/edit-booking-rules'
import { useSdk } from '@/shared/api'
import { EXAMPLE_SENT, EXAMPLE_VISIT, exampleAnswerBy } from '../model/preview'

/** Every weekday closed: the hold counts plain time until the hours load. */
const NO_HOURS = { hours: [null, null, null, null, null, null, null], exceptions: [] }

/**
 * «What the client sees» (B-Settings `.pv`), beside the rules from 1408 and under them below it: the card a client gets
 * after booking, as the rules on screen make it. Manual: «Booking sent», Pending, «The business answers by 15:10» (the
 * hold counted only while open, never past the visit); instant: «Booking confirmed»; online booking paused: the Call
 * card the page shows instead of free times. Under it the example booking (tomorrow 14:30, the first service and
 * specialist) with the free-cancel rule.
 */
export function RulesPreview({ slug, name, form, paused }: { slug: string; name: string; form: RulesForm; paused: boolean }) {
  const t = useTranslations('settings.rules')
  const ts = useTranslations('status')
  const fmt = useFmt()
  const locale = useLocale()
  const sdk = useSdk()
  const titleId = useId()
  const hours = useQuery(sdk.settings.hours(slug))
  const menu = useQuery(sdk.settings.menu(slug))
  const team = useQuery(sdk.team.list(slug))
  const profile = useQuery({ ...sdk.settings.profile(slug), enabled: paused })

  const today = todayIn()
  const tomorrow = addDays(today, 1)
  const manual = form.confirmMode === 'manual'
  const business = hours.data ? { hours: hours.data.hours, exceptions: hours.data.specialDays } : NO_HOURS
  const answer = exampleAnswerBy(today, form.holdMinutes, business)
  const service = menu.data?.groups.flatMap((g) => g.services)[0]
  const specialist = team.data?.items.find((m) => m.bookable && m.status !== 'removed')
  const booking = [name, service && localized(service.name, locale), specialist?.name].filter(Boolean).join(' · ')

  let card: ReactNode
  if (paused)
    card = (
      <Head icon={<Phone aria-hidden />} tone="bg-n-100 text-n-900" title={t('offTitle')}>
        <span className="text-dense text-n-600">{t('offNote', { name })}</span>
        {profile.data && (
          // a picture of the client's button, not one to press here
          <span aria-hidden className="inline-flex h-9 items-center rounded-s border border-n-300 px-3.5 text-small font-semibold">
            {t('call', { phone: fmt.phone(profile.data.phone) })}
          </span>
        )}
      </Head>
    )
  else if (manual)
    card = (
      <Head icon={<Send aria-hidden />} tone="bg-a-50 text-a-500" title={t('sentTitle')}>
        <StatusBadge status="pending" icon={<Clock aria-hidden strokeWidth={2} />}>
          {ts('pending')}
        </StatusBadge>
        <span className="text-small font-semibold">
          {t(answer.tomorrow ? 'answerByTomorrow' : 'answerBy', { time: fmt.time(answer.min) })}
        </span>
        <span className="-mt-1.5 text-dense text-n-600">{t('sentNote')}</span>
      </Head>
    )
  else
    card = (
      <Head icon={<CircleCheck aria-hidden />} tone="bg-st-completed-bg text-st-completed-ink" title={t('confirmedTitle')}>
        <StatusBadge status="confirmed" icon={<Check aria-hidden strokeWidth={2} />}>
          {ts('confirmed')}
        </StatusBadge>
        <span className="text-dense text-n-600">{t('confirmedNote')}</span>
      </Head>
    )

  return (
    <aside
      aria-labelledby={titleId}
      className="sticky top-6 flex min-w-0 flex-[1_1_264px] flex-col gap-3 max-[1407px]:static max-[1407px]:max-w-text max-[1407px]:basis-full min-[1408px]:max-w-80"
    >
      <span id={titleId} className="text-label text-n-500 uppercase">
        {t('preview')}
      </span>
      <div className="flex flex-col gap-4 rounded-card border border-n-200 bg-n-0 p-5">
        {card}
        {!paused && (
          <>
            <div aria-hidden className="h-px bg-n-200" />
            <div className="flex flex-col gap-0.5 text-small">
              <span className="font-semibold">{booking}</span>
              <span className="text-n-600">
                {t('when', { day: fmt.relativeDay(tomorrow, today), date: fmt.weekdayDate(tomorrow), time: fmt.time(EXAMPLE_VISIT) })}
              </span>
            </div>
            <div className="flex items-start gap-2.5 text-dense text-n-600">
              <CalendarClock aria-hidden strokeWidth={1.75} className="size-4 flex-none" />
              <span>
                {form.cancelWindowMinutes === null ? t('cancelAny') : t('cancelBefore', { hours: form.cancelWindowMinutes / 60 })}
              </span>
            </div>
          </>
        )}
      </div>
      <span className="text-dense text-n-600">
        {paused ? t('captionOff') : manual ? t('captionManual', { time: fmt.time(EXAMPLE_SENT) }) : t('captionInstant')}
      </span>
    </aside>
  )
}

/** The card's top: a 44 round icon, the 17/24 title, then what goes under it. */
function Head({ icon, tone, title, children }: { icon: ReactNode; tone: string; title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-2.5">
      <span className={`flex size-11 flex-none items-center justify-center rounded-pill [&_svg]:size-5 ${tone}`}>{icon}</span>
      <span className="text-[17px] leading-6 font-semibold tracking-[-0.01em]">{title}</span>
      {children}
    </div>
  )
}
