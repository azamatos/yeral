import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { Category } from '@yeral/contract/catalog'
import { today } from '@yeral/domain/time'
import { Button } from '@yeral/ui/button'
import { Chip, ChipRadioGroup } from '@yeral/ui/chip'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { EmptyState } from '@yeral/ui/empty-state'
import { Input } from '@yeral/ui/input'
import type { MapArea } from '@yeral/ui/map-frame'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { Select } from '@yeral/ui/select'
import { Skeleton } from '@yeral/ui/skeleton'
import { List, Map as MapIcon, SearchX, SlidersHorizontal } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BusinessRow } from '@/entities/business'
import { useSdk } from '@yeral/sdk/react'
import { wrap } from '@/shared/ui'
import { apiSearch, DAYS, filterCount, filtered, TOP_RATING, type Day, type SearchAddress, type Sort } from '../model/search'
import { FiltersDrawer } from './filters-drawer'
import { ResultsMap } from './results-map'

/**
 * Search (book C-03, board Search) and a category's page (C-05: the same page with its category, its heading and its intro):
 * the box, the category chips, the filters, the day, the sort, the rows and Show more. Only places with a free time on the
 * day are listed (Q-150). From 1024 the map sits beside the list (C-04), a row and its pin lighting each other; under it a
 * floating Map opens it over the page, with the places as cards under it.
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
  const wide = useMediaQuery('(min-width: 1024px)')
  const [hot, setHot] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)

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
  const cities = useQuery(sdk.catalog.cities(lang)).data
  const base = cities?.items.find((c) => c.id === (address.city ?? cities.main))
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
  const clear = () => go({ from: undefined, to: undefined, rating: undefined, open: undefined, women: undefined, area: undefined })
  const searchArea = (area: MapArea) => go({ area: area.map((n) => n.toFixed(5)).join(','), city: undefined })
  // a pin shows its place: the row beside the map, or the card under it on a phone
  const showPlace = (slug: string) => {
    setHot(slug)
    document.getElementById(`${mapOpen ? 'card' : 'row'}-${slug}`)?.scrollIntoView({ block: 'center', inline: 'center' })
  }
  const map = (className: string) =>
    base && (
      <ResultsMap
        cards={rows}
        fallback={base}
        hot={hot}
        searchingArea={!!address.area}
        onHot={setHot}
        onPick={showPlace}
        onSearchArea={searchArea}
        className={className}
      />
    )

  if (list.isError && !list.data) throw list.error

  return (
    <div className="flex items-start">
      <div className={`${wrap} flex flex-col gap-5 pt-6 pb-20 max-sm:pt-4 max-sm:pb-14 md:mx-0 md:max-w-205 md:flex-[1_1_0] md:px-8`}>
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
            <div className="flex flex-col gap-3">
              {rows.map((card) => (
                <div
                  key={card.slug}
                  id={`row-${card.slug}`}
                  onMouseEnter={() => setHot(card.slug)}
                  onMouseLeave={() => setHot(null)}
                  className={cn('-mx-3 rounded-l px-3', hot === card.slug && 'bg-a-50')}
                >
                  <BusinessRow card={card} />
                </div>
              ))}
            </div>
            {list.hasNextPage && (
              <Button
                variant="secondary"
                className="self-start"
                loading={list.isFetchingNextPage}
                onClick={() => void list.fetchNextPage()}
              >
                {t('showMore')}
              </Button>
            )}
          </>
        )}

        {!wide && rows.length > 0 && (
          <Button variant="ink" className="sticky bottom-5 z-2 self-center" onClick={() => setMapOpen(true)}>
            <MapIcon aria-hidden />
            {t('map.title')}
          </Button>
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
      {wide && <aside className="sticky top-0 h-dvh min-w-0 flex-[1_1_0]">{map('h-full')}</aside>}
      {!wide && mapOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t('map.title')}
          className="fixed inset-0 z-40 flex flex-col bg-n-0"
          onKeyDown={(e) => e.key === 'Escape' && setMapOpen(false)}
        >
          {map('flex-1')}
          <div className="flex flex-none snap-x gap-3 overflow-x-auto border-t border-n-200 bg-n-0 px-4 py-3">
            {rows.map((card) => (
              <div key={card.slug} id={`card-${card.slug}`} className="w-[88%] flex-none snap-center">
                <BusinessRow card={card} />
              </div>
            ))}
          </div>
          <Button
            autoFocus
            variant="secondary"
            size="s"
            className="absolute top-3 left-3 z-4 shadow-raised"
            onClick={() => setMapOpen(false)}
          >
            <List aria-hidden />
            {t('map.list')}
          </Button>
        </div>
      )}
    </div>
  )
}
