import { useQuery } from '@tanstack/react-query'
import type { BusinessDetail } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { useSdk } from '@yeral/sdk/react'
import { Avatar } from '@yeral/ui/avatar'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { OptionCard, OptionCardGroup } from '@yeral/ui/option-card'
import { Rating } from '@yeral/ui/rating'
import { Users } from 'lucide-react'
import { useLocale, useTranslations } from 'use-intl'
import { calendarAt } from '@/shared/lib'
import { doesAll } from '../model/flow'
import { LoadFailed } from './load-failed'
import { StepTitle } from './step-title'

type NextFree = { date: string; start: number } | null

/**
 * Step 2 (Booking `step=staff`, book C-13): «Any specialist» with the earliest free time, then everyone who does the
 * picked services with their next free time (`OptionCard`s, arrow keys between them); someone who doesn't do them all
 * stays listed, disabled, saying so. When nobody does them all, the note says a free specialist is chosen for each.
 */
export function StaffStep({
  detail,
  serviceIds,
  staff,
  onPick,
}: {
  detail: BusinessDetail
  serviceIds: string[]
  staff: string
  onPick: (staff: string) => void
}) {
  const t = useTranslations('booking.staff')
  const at = useTranslations('booking')
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const now = useClock()
  const free = useQuery(sdk.availability.specialists(detail.slug, { lang, services: serviceIds }))
  // a start past midnight reads on the next calendar day
  const when = (next: NextFree) => {
    if (!next) return null
    const c = calendarAt(next.date, next.start)
    return at('at', { day: fmt.relativeShortDate(c.date, today(now)), time: fmt.time(c.start) })
  }
  const line = (next: NextFree, words: 'earliest' | 'next') => {
    if (!free.data) return ' '
    const w = when(next)
    return w ? t(words, { when: w }) : t('noneSoon')
  }
  const anyOne = detail.specialists.some((s) => doesAll(s, serviceIds))
  return (
    <div className="flex flex-col gap-6">
      <StepTitle title={t('title')} lead={t('lead')} />
      {!anyOne && <p className="m-0 rounded-m bg-group px-3.5 py-3 text-small text-n-600">{t('noOneDoesAll')}</p>}
      {free.isError && !free.data && <LoadFailed onRetry={() => void free.refetch()} />}
      <OptionCardGroup aria-label={t('label')} value={staff} onValueChange={onPick}>
        <OptionCard
          value="any"
          title={t('any')}
          caption={line(free.data?.any ?? null, 'earliest')}
          leading={
            <span
              aria-hidden
              className="flex size-12 flex-none items-center justify-center rounded-pill bg-n-100 text-n-900 group-data-[state=checked]:bg-n-0 group-data-[state=checked]:text-a-600"
            >
              <Users className="size-[22px]" strokeWidth={1.75} />
            </span>
          }
        />
        {detail.specialists.map((s) => {
          const ok = doesAll(s, serviceIds)
          return (
            <OptionCard
              key={s.id}
              value={s.id}
              disabled={!ok}
              title={s.name}
              leading={
                <Avatar
                  name={s.name}
                  src={s.photo?.url}
                  size={48}
                  tone="neutral"
                  decorative
                  className={cn(
                    'text-n-900 group-disabled:bg-n-50 group-disabled:text-n-500',
                    'group-data-[state=checked]:bg-n-0 group-data-[state=checked]:text-a-600',
                  )}
                />
              }
              caption={
                <span className="flex flex-col gap-0.5">
                  {(s.role || s.rating !== null) && (
                    <span className="inline-flex flex-wrap items-center gap-1.5">
                      {s.role}
                      {s.role && s.rating !== null && <span aria-hidden>·</span>}
                      {s.rating !== null && <Rating value={fmt.rating(s.rating)} className="text-dense group-disabled:text-n-500" />}
                    </span>
                  )}
                  <span>
                    {!ok
                      ? serviceIds.length > 1
                        ? t('cantAll')
                        : t('cantOne')
                      : line(free.data?.items.find((i) => i.staffId === s.id)?.next ?? null, 'next')}
                  </span>
                </span>
              }
            />
          )
        })}
      </OptionCardGroup>
    </div>
  )
}
