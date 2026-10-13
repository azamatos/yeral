'use client'

import { useTranslations } from 'next-intl'
import { useNextFreeMany, useSearch } from '@/api/hooks'
import { addDays, today } from '@/domain/time'
import { SalonCard, SalonCardSkeleton } from '@/components/site/salon-card'
import { Rail, RailItem } from '@/components/ui/rail'

/**
 * Salons with windows in the next hours (or tomorrow, once the evening is fully booked).
 * Availability is live, so this part renders in the browser.
 */
export function FreeToday() {
  const t = useTranslations('home')
  const { data } = useSearch({})
  const ids = (data?.items ?? []).filter((x) => x.online).map((x) => x.id)
  const { data: todayTimes } = useNextFreeMany(ids)
  const noneToday = !!todayTimes && !Object.values(todayTimes).some((x) => x.length)
  const tomorrow = addDays(today(), 1)
  const { data: tomorrowTimes } = useNextFreeMany(ids, tomorrow, noneToday)
  const times = noneToday ? tomorrowTimes : todayTimes
  const list = (data?.items ?? [])
    .filter((x) => times?.[x.id]?.length)
    .sort((a, b) => times![a.id][0] - times![b.id][0] || b.rating.avg - a.rating.avg)
    .slice(0, 10)
  if (times && !list.length) return null
  return (
    <Rail title={noneToday ? t('freeTomorrow') : t('freeToday')} sub={t('freeTodaySub')}>
      {!times
        ? Array.from({ length: 4 }, (_, i) => (
            <RailItem key={i}>
              <SalonCardSkeleton />
            </RailItem>
          ))
        : list.map((s) => (
            <RailItem key={s.id}>
              <SalonCard s={s} compact times={times[s.id]} date={noneToday ? tomorrow : today()} />
            </RailItem>
          ))}
    </Rail>
  )
}
