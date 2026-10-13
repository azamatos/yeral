'use client'

import { Heart } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFavorites, useSearch } from '@/api/hooks'
import { SalonCard, SalonCardSkeleton } from '@/components/site/salon-card'
import { Empty } from '@/components/ui/bits'
import { ButtonLink } from '@/components/ui/button'

export default function FavoritesPage() {
  const t = useTranslations('account')
  const { data: ids } = useFavorites()
  const { data } = useSearch({})
  const list = (data?.items ?? []).filter((s) => ids?.includes(s.id))
  return (
    <>
      <h1 className="text-[28px] font-bold tracking-[-0.03em] md:text-[34px]">{t('favorites')}</h1>
      <div className="mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2 xl:grid-cols-3">
        {(!ids || !data) && Array.from({ length: 3 }, (_, i) => <SalonCardSkeleton key={i} />)}
        {list.map((s) => (
          <SalonCard key={s.id} s={s} compact />
        ))}
      </div>
      {ids && data && !list.length && (
        <Empty icon={<Heart size={28} />} title={t('favorites')} text={t('emptyFavorites')}>
          <ButtonLink href="/search">{t('findSalon')}</ButtonLink>
        </Empty>
      )}
    </>
  )
}
