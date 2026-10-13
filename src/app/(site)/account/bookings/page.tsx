'use client'

import { CalendarDays } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { useMyBookings } from '@/api/hooks'
import { cls, epochOf } from '@/domain/time'
import { BookingRow } from '@/components/account/booking-card'
import { Empty, Skeleton } from '@/components/ui/bits'
import { ButtonLink } from '@/components/ui/button'

export default function MyBookingsPage() {
  const t = useTranslations('account')
  const { data } = useMyBookings()
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming')
  const isUpcoming = (v: string) => v === 'pending' || v === 'confirmed'
  const at = (b: { date: string; start: number }) => epochOf(b.date, b.start)
  const upcoming = (data ?? []).filter((b) => isUpcoming(b.view)).sort((a, b) => at(a) - at(b))
  const past = (data ?? []).filter((b) => !isUpcoming(b.view)).sort((a, b) => at(b) - at(a))
  const list = tab === 'upcoming' ? upcoming : past
  return (
    <>
      <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">{t('bookings')}</h1>
      <div className="mt-5 flex gap-6 border-b border-line">
        {(['upcoming', 'past'] as const).map((k) => (
          <button key={k} type="button" onClick={() => setTab(k)} className={cls('relative h-11 text-[15px]', tab === k ? 'font-semibold after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:rounded after:bg-ink' : 'font-medium text-ink-2 hover:text-ink')}>
            {t(k)}
            <span className="ml-1.5 text-ink-3">{k === 'upcoming' ? upcoming.length : past.length}</span>
          </button>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3">
        {!data && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28 rounded-card" />)}
        {list.map((b) => (
          <BookingRow key={b.id} b={b} />
        ))}
        {data && !list.length && (
          <Empty icon={<CalendarDays size={28} />} title={tab === 'upcoming' ? t('emptyUpcoming') : t('emptyPast')} text={tab === 'upcoming' ? t('emptyUpcomingText') : undefined}>
            {tab === 'upcoming' && <ButtonLink href="/search">{t('findSalon')}</ButtonLink>}
          </Empty>
        )}
      </div>
    </>
  )
}
