import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { diffDays, parseYmd, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { useClock } from '@yeral/ui/clock'
import { DateStrip, type StripDay } from '@yeral/ui/date-strip'
import { Skeleton } from '@yeral/ui/skeleton'
import { TimeSlots } from '@yeral/ui/time-slots'
import { CalendarX2 } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { isOwnTime, slotsByPart } from '../model/flow'
import { LoadFailed } from './load-failed'
import { StepTitle } from './step-title'

/**
 * Step 3 (Booking `step=time`, book C-14): the 14 days from today (a week a page from 768; closed days off, full ones
 * struck through), the chosen day's title, its free times by part of day, and for a day without one the way to the
 * next free day. The api works out what fits the whole visit back to back with the specialist (or anyone) and the
 * business's lead time; the address naming no day, it answers for today (full or closed: the next free day's button).
 * While another day's times come, the old ones aren't offered. In move mode (C-30) the booking's own time doesn't count
 * as busy; with its own specialist (or anyone) it stays out of the choice, named «your previous time» (another
 * specialist at the same time is a move too).
 */
export function TimeStep({
  slug,
  serviceIds,
  minutes,
  staff,
  staffName,
  date,
  time,
  onDate,
  onTime,
  move,
}: {
  slug: string
  serviceIds: string[]
  minutes: number
  staff: string
  staffName: string
  date: string | null
  time: number | null
  onDate: (date: string) => void
  onTime: (start: number, date: string) => void
  /** The booking being moved, its own time and who it's with now. */
  move?: { code: string; date: string; start: number; current: string | null }
}) {
  const words = useTranslations('booking.move')
  const t = useTranslations('booking')
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const now = useClock()
  const day0 = today(now)
  const free = useQuery({
    ...sdk.availability.appointment(slug, { lang, services: serviceIds, staff, date: date ?? undefined, move: move?.code }),
    // another day keeps the strip in place while its times come
    placeholderData: keepPreviousData,
  })
  const data = free.data
  const day = date ?? data?.date
  const strip: StripDay[] = (data?.days ?? []).map((d) => ({
    date: d.date,
    weekday: d.date === day0 ? t('time.today') : fmt.weekdayShort(d.date),
    day: String(parseYmd(d.date).getUTCDate()),
    state: d.state === 'open' ? 'available' : d.state,
    srText: t(d.state === 'full' ? 'time.srFull' : d.state === 'closed' ? 'time.srClosed' : 'time.srOpen', {
      month: fmt.monthYear(d.date),
    }),
  }))
  // the strip opens on the week holding the chosen day, also when «Next free day» moves it to another week
  const week = Math.floor(
    Math.max(
      0,
      strip.findIndex((d) => d.date === day),
    ) / 7,
  )
  const dayTitle = (d: string) => {
    const long = fmt.weekdayDate(d)
    const ahead = diffDays(d, day0)
    if (ahead === 0) return t('time.todayTitle', { date: long })
    return ahead === 1 ? t('time.tomorrowTitle', { date: long }) : long
  }
  const groups = slotsByPart(data?.slots ?? []).map((g) => ({
    label: t(`time.${g.part}`),
    slots: g.slots.map((s) =>
      move && isOwnTime(move, staff, day, s.start)
        ? { value: String(s.start), label: fmt.time(s.start), disabled: true, ariaLabel: words('currentTime', { time: fmt.time(s.start) }) }
        : { value: String(s.start), label: fmt.time(s.start) },
    ),
  }))
  const title = (
    <StepTitle
      title={move ? words('timeTitle') : t('time.title')}
      lead={t('time.lead', { duration: fmt.duration(minutes), staff: staffName })}
      level={move ? 2 : 1}
    />
  )
  if (free.isError && !data)
    return (
      <div className="flex flex-col">
        {title}
        <LoadFailed className="mt-7" onRetry={() => void free.refetch()} />
      </div>
    )
  return (
    <div className="flex flex-col">
      {title}
      {!data || !day ? (
        <div className="mt-7 flex flex-col gap-3" aria-hidden>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-19 w-full" />
          <Skeleton className="mt-4 h-10 w-full" />
        </div>
      ) : (
        <>
          <DateStrip
            key={week}
            className="mt-7"
            aria-label={t('time.dateLabel')}
            title={fmt.monthYear(day)}
            days={strip}
            value={day}
            onValueChange={onDate}
            prevLabel={t('time.prevWeek')}
            nextLabel={t('time.nextWeek')}
          />
          <div className="mt-7 text-[17px] leading-6 font-semibold">{dayTitle(day)}</div>
          {free.isPlaceholderData ? (
            <div className="flex flex-col gap-3 pt-5" aria-hidden>
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : groups.length > 0 ? (
            <TimeSlots
              className="pt-5"
              groups={groups}
              value={time !== null ? String(time) : undefined}
              onValueChange={(v) => onTime(Number(v), day)}
            />
          ) : (
            <div className="mt-4 flex flex-col items-center gap-3 rounded-card border border-dashed border-n-300 px-8 py-10 text-center">
              <span aria-hidden className="flex size-14 items-center justify-center rounded-pill bg-a-50 text-a-500">
                <CalendarX2 className="size-[26px]" strokeWidth={1.75} />
              </span>
              <div className="text-[19px] leading-6 font-semibold">{t('time.empty')}</div>
              <div className="max-w-85 text-body text-n-600">{t('time.emptyLead')}</div>
              {data.nextFree && data.nextFree.date !== day && (
                <Button
                  variant="secondary"
                  className="mt-1 h-auto min-h-11 py-2.5 whitespace-normal"
                  onClick={() => data.nextFree && onDate(data.nextFree.date)}
                >
                  {t('time.nextFreeDay', { date: fmt.weekdayDate(data.nextFree.date) })}
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
