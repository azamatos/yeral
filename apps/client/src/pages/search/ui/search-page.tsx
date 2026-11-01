import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { Category } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { Button } from '@yeral/ui/button'
import { Chip, ChipRadioGroup } from '@yeral/ui/chip'
import { useClock } from '@yeral/ui/clock'
import { EmptyState } from '@yeral/ui/empty-state'
import { Input } from '@yeral/ui/input'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { Select } from '@yeral/ui/select'
import { Skeleton } from '@yeral/ui/skeleton'
import { SearchX, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BusinessRow } from '@/entities/business'
import { useSdk } from '@yeral/sdk/react'
import { wrap } from '@/shared/ui'
import { apiSearch, DAYS, filterCount, filtered, TOP_RATING, type Day, type SearchAddress, type Sort } from '../model/search'
import { FiltersDrawer } from './filters-drawer'

/**
 * Search (book C-03, board Search) and a category's page (C-05: the same page with its category, its heading and its intro):
 * the box, the category chips, the filters, the day, the sort, the rows and Show more. Only places with a free time on the
 * day are listed (Q-150). The map joins beside the list with slice 5's D3.
 */
export function SearchPage({ category }: { category?: Category }) {
  const t = useTranslations('search')
  const lang = useLocale()
  const sdk = useSdk()
  const now = useClock()
  const navigate = useNavigate()
  const address: SearchAddress = useSearch({ strict: false })
  const go = (patch: Partial<SearchAddress>) =>
    void navigate({ to: '.', search: (prev: SearchAddress) => ({ ...prev, ...patch }), replace: true })
  const [filters, setFilters] = useState(false)

  // the box writes to the address after a pause in the typing
  const [typed, setTyped] = useState(address.what ?? '')
  useEffect(() => {
    const what = typed.trim() || undefined
    if (what === address.what) return
    const timer = setTimeout(() => go({ what }), 250)
    return () => clearTimeout(timer)
  })

  const list = useInfiniteQuery({
    ...sdk.catalog.search(apiSearch({ ...address, cat: category?.id ?? address.cat }, lang, today(now))),
    placeholderData: keepPreviousData,
  })
  const categories = useQuery(sdk.catalog.categories(lang)).data?.items.filter((c) => c.bookingTypes.includes('appointment')) ?? []
  const first = list.data?.pages[0]
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const located = first?.located ?? false
  const day: Day = address.day ?? 'today'
  const count = filterCount(address)
  const name = category?.name
  const title = located ? (name ? t('nearName', { name }) : t('near')) : (name ?? t('popular'))

  const pick = (id: string) => {
    const search = (prev: SearchAddress) => ({ ...prev, cat: undefined })
    if (id === 'all') void navigate({ to: '/$lang/search', params: { lang }, search })
    else void navigate({ to: '/$lang/c/$category', params: { lang, category: id }, search })
  }
  const clear = () => go({ from: undefined, to: undefined, rating: undefined, open: undefined, women: undefined })

  if (list.isError && !list.data) throw list.error

  return (
    <div className={`${wrap} flex flex-col gap-5 pt-6 pb-20 max-sm:pt-4 max-sm:pb-14`}>
      <div className="flex flex-col gap-3">
        <Input
          aria-label={t('box')}
          placeholder={t('box')}
          className="w-full sm:max-w-120"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        <ChipRadioGroup
          aria-label={t('categories')}
          value={category?.id ?? address.cat ?? 'all'}
          onValueChange={pick}
          options={[{ value: 'all', label: t('all') }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />
        <div className="flex flex-wrap gap-2">
          <Chip selected={count > 0} onClick={() => setFilters(true)}>
            <SlidersHorizontal aria-hidden />
            {count > 0 ? t('filtersOn', { n: count }) : t('filtersButton')}
          </Chip>
          <Chip
            selected={address.rating !== undefined}
            onClick={() => go({ rating: address.rating === undefined ? TOP_RATING : undefined })}
          >
            {t('filters.rating')}
          </Chip>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em] text-n-900">{title}</h1>
          {first && <span className="text-dense text-n-600">{t(`count.${day}`, { n: first.total ?? rows.length })}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Segmented
            aria-label={t('day')}
            value={day}
            onValueChange={(next) => next && go({ day: next === 'today' ? undefined : (next as Day) })}
          >
            {DAYS.map((d) => (
              <SegmentedItem key={d} value={d}>
                {t(`days.${d}`)}
              </SegmentedItem>
            ))}
          </Segmented>
          <Select
            size="s"
            aria-label={t('sort')}
            className="w-auto"
            value={address.sort ?? ''}
            onChange={(e) => go({ sort: (e.target.value as Sort) || undefined })}
          >
            <option value="">{located ? t('sorts.distance') : t('sorts.popular')}</option>
            <option value="rating">{t('sorts.rating')}</option>
            <option value="price">{t('sorts.price')}</option>
          </Select>
        </div>
      </div>

      {category?.intro && <p className="m-0 max-w-160 text-body text-n-600">{category.intro}</p>}

      {list.isPending ? (
        <div aria-hidden className="flex flex-col gap-6">
          {[0, 1, 2].map((n) => (
            <div key={n} className="grid grid-cols-[200px_minmax(0,1fr)] gap-5 max-sm:grid-cols-[112px_minmax(0,1fr)]">
              <Skeleton className="h-37.5 max-sm:h-28" />
              <div className="flex flex-col gap-3">
                <Skeleton className="h-5 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-8 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<SearchX aria-hidden />}
          title={t('nothing')}
          description={t('nothingHint')}
          action={
            <span className="flex flex-wrap justify-center gap-2">
              {day !== 'tomorrow' && (
                <Button variant="secondary" size="s" onClick={() => go({ day: 'tomorrow' })}>
                  {t('tryTomorrow')}
                </Button>
              )}
              {filtered(address) && (
                <Button variant="secondary" size="s" onClick={clear}>
                  {t('clearFilters')}
                </Button>
              )}
            </span>
          }
        />
      ) : (
        <>
          <div className="flex max-w-205 flex-col gap-3">
            {rows.map((card) => (
              <BusinessRow key={card.slug} card={card} />
            ))}
          </div>
          {list.hasNextPage && (
            <Button variant="secondary" className="self-start" loading={list.isFetchingNextPage} onClick={() => void list.fetchNextPage()}>
              {t('showMore')}
            </Button>
          )}
        </>
      )}

      {filters && (
        <FiltersDrawer
          address={address}
          onApply={(patch) => {
            go(patch)
            setFilters(false)
          }}
          onClose={() => setFilters(false)}
        />
      )}
    </div>
  )
}
