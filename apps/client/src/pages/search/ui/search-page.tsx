import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate, useSearch } from '@tanstack/react-router'
import type { Category } from '@yeral/contract/catalog'
import { DEFAULT_RADIUS_KM } from '@yeral/domain/geo'
import { addDays, today } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { ChipRadioGroup } from '@yeral/ui/chip'
import { useClock } from '@yeral/ui/clock'
import { cn } from '@yeral/ui/cn'
import { EmptyState } from '@yeral/ui/empty-state'
import type { MapArea } from '@yeral/ui/map-frame'
import { useMediaQuery } from '@yeral/ui/media-query'
import { Skeleton } from '@yeral/ui/skeleton'
import { List, Map as MapIcon, MapPin, SearchX } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { BusinessRow } from '@/entities/business'
import { askToEditPlace, LocationBanner, placeAddress, usePlace } from '@/features/pick-place'
import { useSdk } from '@yeral/sdk/react'
import { wrap } from '@/shared/ui'
import { apiSearch, canWiden, CLEARED, dayOf, filtered, WIDEST_RADIUS_KM, type SearchAddress } from '../model/search'
import { ResultsMap } from './results-map'
import { ResultsToolbar } from './results-toolbar'

/**
 * Search (book C-03, board Search; the toolbar from C7-Home C4) and a category's page (C-05: the same page with its
 * category, its heading and its intro): the category chips, then the heading and the results toolbar (Distance ·
 * Rating · Price · Open now · Women only · Sort, the active chips, the count), the rows and Show more. The words, the
 * place and the day live in the site header's compact SearchBar (C7-Home C1), which refines the address in place.
 * Only places with a free time on the day are listed (Q-150). From 1024 the map sits beside the list (C-04), a row
 * and its pin lighting each other; under it a floating Map opens it over the page, with the places as cards under it.
 */
export function SearchPage({ category }: { category?: Category }) {
  const t = useTranslations('search')
  const fmt = useFmt()
  const lang = useLocale()
  const sdk = useSdk()
  const now = useClock()
  const navigate = useNavigate()
  const address: SearchAddress = useSearch({ strict: false })
  const go = (patch: Partial<SearchAddress>) =>
    void navigate({ to: '.', search: (prev: SearchAddress) => ({ ...prev, ...patch }), replace: true })
  const wide = useMediaQuery('(min-width: 1024px)')
  const [hot, setHot] = useState<string | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  const located = usePlace()
  // the address says where when it can (a shared link); otherwise what this browser kept
  const addressed = !!(address.near || address.city || address.area)
  const searched = addressed ? address : { ...address, ...placeAddress(located.place) }

  const list = useInfiniteQuery({
    ...sdk.catalog.search(apiSearch({ ...searched, cat: category?.id ?? address.cat }, lang, today(now))),
    placeholderData: keepPreviousData,
  })
  const categories = useQuery(sdk.catalog.categories(lang)).data?.items.filter((c) => c.bookingTypes.includes('appointment')) ?? []
  const cities = useQuery(sdk.catalog.cities(lang)).data
  const base = cities?.items.find((c) => c.id === (address.city ?? cities.main))
  const first = list.data?.pages[0]
  const rows = list.data?.pages.flatMap((p) => p.items) ?? []
  const nearby = first?.located ?? false
  const day = dayOf(address, today(now))
  const total = first?.total ?? rows.length
  const name = category?.name
  const title = nearby ? (name ? t('nearName', { name }) : t('near')) : (name ?? t('popular'))
  const radius = address.r ?? DEFAULT_RADIUS_KM
  // «Search further away» (C7-Home nothing found): around a position, straight to the widest radius
  const further = nearby && canWiden(radius)
  // the day the rows show times for; over a week a row's later day is named on its first time
  const from = day === 'tomorrow' ? addDays(today(now), 1) : day === 'date' ? (address.date ?? today(now)) : today(now)
  const empty = !list.isPending && rows.length === 0
  // the words found nothing (C7-Home `SearchNoResults`): the toolbar goes, the spelling and a wider search are offered
  const noMatch = empty && !!address.what

  const pick = (id: string) => {
    const search = (prev: SearchAddress) => ({ ...prev, cat: undefined })
    if (id === 'all') void navigate({ to: '/$lang/search', params: { lang }, search })
    else void navigate({ to: '/$lang/c/$category', params: { lang, category: id }, search })
  }
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
        <ChipRadioGroup
          aria-label={t('categories')}
          value={category?.id ?? address.cat ?? 'all'}
          onValueChange={pick}
          options={[{ value: 'all', label: t('all') }, ...categories.map((c) => ({ value: c.id, label: c.name }))]}
        />

        <h1 className="m-0 text-[28px] leading-[34px] font-bold tracking-[-0.02em] text-n-900">{title}</h1>
        {!noMatch && (
          <ResultsToolbar
            address={address}
            located={nearby}
            total={total}
            count={first && t(`count.${day}`, { n: total, date: address.date ? fmt.shortWeekdayDate(address.date) : '' })}
            onChange={go}
          />
        )}

        <LocationBanner
          unknown={located.unknown && !addressed}
          denied={located.denied}
          locating={located.locating}
          onAllow={() => void located.askBrowser()}
          // the Where field is the header's
          onType={askToEditPlace}
        />

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
        ) : empty ? (
          <EmptyState
            bordered={false}
            icon={<SearchX aria-hidden />}
            title={noMatch ? t(nearby ? 'noPlacesForNear' : 'noPlacesFor', { what: address.what ?? '' }) : t('nothing')}
            description={noMatch ? t('checkSpelling') : t('nothingHint')}
            action={
              <span className="flex flex-wrap justify-center gap-3">
                {further && (
                  <Button variant="secondary" onClick={() => go({ r: WIDEST_RADIUS_KM })}>
                    <MapPin aria-hidden />
                    {t('furtherAway')}
                  </Button>
                )}
                {!noMatch && day !== 'tomorrow' && (
                  <Button variant="secondary" onClick={() => go({ day: 'tomorrow' })}>
                    {t('tryTomorrow')}
                  </Button>
                )}
                {noMatch && (
                  // the header's bar takes the address again (`HeaderSearch` remounts on a new one)
                  <Button variant="tertiary" onClick={() => go({ what: undefined })}>
                    {t('clearSearch')}
                  </Button>
                )}
                {filtered(address) && (
                  <Button variant="tertiary" onClick={() => go(CLEARED)}>
                    {t('clearFilters')}
                  </Button>
                )}
              </span>
            }
          />
        ) : (
          <>
            <div className="flex flex-col">
              {rows.map((card) => (
                <div
                  key={card.slug}
                  id={`row-${card.slug}`}
                  onMouseEnter={() => setHot(card.slug)}
                  onMouseLeave={() => setHot(null)}
                  // the row and its pin light each other (C7-Home: hover n-50, the pin ink)
                  className={cn('-mx-3 rounded-card px-3', hot === card.slug && 'bg-n-50')}
                >
                  <BusinessRow card={card} from={from} className="border-t border-n-200" />
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
                <BusinessRow card={card} from={from} />
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
