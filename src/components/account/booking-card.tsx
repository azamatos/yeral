'use client'

import { ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import type { BookingView } from '@/api'
import { hm } from '@/domain/time'
import { svcSummary } from '@/domain/logic'
import { useFmt } from '@/lib/format'
import { StatusBadge, Tag } from '@/components/ui/bits'

export function needsAttention(b: BookingView) {
  return (b.proposal && b.view === 'confirmed') || (b.needsClientConfirm && !b.clientConfirmed && b.view === 'confirmed')
}

export function BookingRow({ b }: { b: BookingView }) {
  const t = useTranslations()
  const f = useFmt()
  return (
    <Link href={`/account/bookings/${b.id}`} className="group flex gap-4 rounded-card border border-line p-3 transition-colors hover:border-line-2 md:p-4">
      <img src={b.salon.photo} alt="" className="size-20 flex-none rounded-xl object-cover md:size-24" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={b.view} label={t(`status.${b.view}`)} />
          {needsAttention(b) && <Tag tone="amber">{t('account.attention')}</Tag>}
        </div>
        <div className="mt-2 text-[17px] font-semibold">
          {f.relDay(b.date) ?? f.longDay(b.date)}, {hm(b.start)}
        </div>
        <div className="truncate text-[14px] text-ink-2">
          {b.salon.name} · {b.staffName} · {svcSummary(b)}
        </div>
      </div>
      <div className="hidden flex-none flex-col items-end justify-between md:flex">
        <span className="font-semibold">{f.money(b.price)}</span>
        <ChevronRight size={20} className="text-ink-4 group-hover:text-ink-2" />
      </div>
    </Link>
  )
}
