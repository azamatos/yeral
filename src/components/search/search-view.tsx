'use client'

import { Check, ChevronDown, List, Map as MapIcon, SearchX, X } from 'lucide-react'
import dynamic from 'next/dynamic'
import { Popover } from 'radix-ui'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useMemo, useState, type ReactNode } from 'react'
import type { CategoryId, SearchParams, SortKey } from '@/api'
import { useNextFreeMany, useSearch } from '@/api/hooks'
import { DISTRICTS } from '@/domain/places'
import { addDays, cls, today } from '@/domain/time'
import { useFmt } from '@/lib/format'
import { CATEGORY_ORDER, CategoryIcon } from '@/components/site/category-icon'
import { SalonCard, SalonCardSkeleton } from '@/components/site/salon-card'
import { Chip, Empty } from '@/components/ui/bits'
import { Button } from '@/components/ui/button'
import { CatalogMarker } from '@/components/salon/parts'

const SalonMap = dynamic(() => import('@/components/site/salon-map').then((m) => m.SalonMap), {
  ssr: false,
  loading: () => <div className="size-full animate-skel bg-group" />,
})

function readParams(sp: URLSearchParams): SearchParams {
  return {
    q: sp.get('q') || undefined,
    category: (sp.get('category') as CategoryId) || undefined,
    district: sp.get('district') || undefined,
    date: sp.get('date') || undefined,
    sort: (sp.get('sort') as SortKey) || undefined,
    openNow: sp.get('open') === '1' || undefined,
    instant: sp.get('instant') === '1' || undefined,
  }
}

function writeParams(p: SearchParams) {
  const sp = new URLSearchParams()
  if (p.q) sp.set('q', p.q)
  if (p.category) sp.set('category', p.category)
  if (p.district) sp.set('district', p.district)
  if (p.date) sp.set('date', p.date)
  if (p.sort && p.sort !== 'recommended') sp.set('sort', p.sort)
  if (p.openNow) sp.set('open', '1')
  if (p.instant) sp.set('instant', '1')
  const qs = sp.toString()
  // client-only URL update: Next keeps useSearchParams in sync with history.replaceState
  window.history.replaceState(null, '', `/search${qs ? `?${qs}` : ''}`)
}

function Dropdown({ label, active, children }: { label: ReactNode; active?: boolean; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <Chip on={active}>
          {label}
          <ChevronDown size={15} strokeWidth={2} />
        </Chip>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={8} className="z-40 max-h-[60dvh] w-64 animate-pop-in overflow-y-auto rounded-[16px] border border-line bg-white p-1.5 shadow-pop">
          {children(() => setOpen(false))}
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function Opt({ on, onPick, children }: { on: boolean; onPick: () => void; children: ReactNode }) {
  return (
    <button type="button" onClick={onPick} className={cls('flex h-10 w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[14.5px] hover:bg-group', on && 'font-semibold')}>
      <span className="flex-1">{children}</span>
      {on && <Check size={17} strokeWidth={2.25} className="text-acc" />}
    </button>
  )
}

export function SearchView() {
  const t = useTranslations()
  const f = useFmt()
  const sp = useSearchParams()
  const p = useMemo(() => readParams(new URLSearchParams(sp.toString())), [sp])
  const set = (patch: Partial<SearchParams>) => writeParams({ ...p, ...patch })
  const [showMap, setShowMap] = useState(true)
  const [mobileMap, setMobileMap] = useState(false)
  const [hover, setHover] = useState<string | null>(null)

  const { data, isFetching } = useSearch(p)
  const items = data?.items ?? []
  const ids = items.filter((x) => x.online).map((x) => x.id)
  const { data: times } = useNextFreeMany(ids, p.date, !!p.date)
  const points = useMemo(
    () => items.map((s) => ({ id: s.id, slug: s.slug, name: s.name, lat: s.geo.lat, lng: s.geo.lng, label: f.rating(s.rating.avg), photo: s.photos[0], sub: s.district })),
    [items], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const title = p.q ? t('search.titleQuery', { q: p.q }) : p.category ? t(`categories.${p.category}`) : t('search.titleAll')
  const days = Array.from({ length: 10 }, (_, i) => addDays(today(), i))
  const filtered = !!(p.category || p.district || p.date || p.openNow || p.instant || p.q)
  const sortLabel = { recommended: t('search.sortRecommended'), rating: t('search.sortRating'), price: t('search.sortPrice'), distance: t('search.sortRecommended') }[p.sort ?? 'recommended']

  return (
    <div className="flex">
      <CatalogMarker />
      <div className={cls('min-w-0 flex-1 px-4 pb-10 pt-6 md:px-6 lg:px-8', showMap && 'lg:max-w-[calc(100%-min(42vw,640px))]')}>
        <h1 className="text-[26px] font-bold tracking-[-0.03em] md:text-[32px]">{title}</h1>
        <div className="mt-1 text-[14px] text-ink-2">
          {data ? t('search.found', { count: data.total }) : t('common.loading')}
          {p.district && ` · ${DISTRICTS.find((d) => d.id === p.district)?.name}`}
        </div>

        {/* filters */}
        <div className="no-scrollbar -mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0">
          <Dropdown label={p.category ? t(`categories.short.${p.category}`) : t('search.category')} active={!!p.category}>
            {(close) => (
              <>
                <Opt on={!p.category} onPick={() => { set({ category: undefined }); close() }}>{t('search.allCategories')}</Opt>
                {CATEGORY_ORDER.map((c) => (
                  <Opt key={c} on={p.category === c} onPick={() => { set({ category: c, q: undefined }); close() }}>
                    <span className="flex items-center gap-2.5"><CategoryIcon id={c} size={17} className="text-ink-2" />{t(`categories.${c}`)}</span>
                  </Opt>
                ))}
              </>
            )}
          </Dropdown>
          <Dropdown label={p.district ? DISTRICTS.find((d) => d.id === p.district)?.name : t('search.district')} active={!!p.district}>
            {(close) => (
              <>
                <Opt on={!p.district} onPick={() => { set({ district: undefined }); close() }}>{t('search.allDistricts')}</Opt>
                {DISTRICTS.map((d) => (
                  <Opt key={d.id} on={p.district === d.id} onPick={() => { set({ district: d.id }); close() }}>{d.name}</Opt>
                ))}
              </>
            )}
          </Dropdown>
          <Dropdown label={sortLabel}>
            {(close) =>
              (['recommended', 'rating', 'price'] as SortKey[]).map((k) => (
                <Opt key={k} on={(p.sort ?? 'recommended') === k} onPick={() => { set({ sort: k }); close() }}>
                  {{ recommended: t('search.sortRecommended'), rating: t('search.sortRating'), price: t('search.sortPrice'), distance: '' }[k]}
                </Opt>
              ))
            }
          </Dropdown>
          <Chip on={!!p.openNow} onClick={() => set({ openNow: !p.openNow || undefined })}>{t('search.openNow')}</Chip>
          <Chip on={!!p.instant} onClick={() => set({ instant: !p.instant || undefined })}>{t('search.instant')}</Chip>
          {filtered && (
            <button type="button" className="flex h-9 flex-none items-center gap-1 px-2 text-[13.5px] font-medium text-ink-2 hover:text-ink" onClick={() => writeParams({ sort: p.sort })}>
              <X size={15} />
              {t('search.reset')}
            </button>
          )}
          <div className="ml-auto hidden lg:block">
            <Chip onClick={() => setShowMap(!showMap)}>
              {showMap ? <List size={16} strokeWidth={1.75} /> : <MapIcon size={16} strokeWidth={1.75} />}
              {showMap ? t('search.hideMap') : t('search.showMap')}
            </Chip>
          </div>
        </div>

        {/* day rail: picking a day turns cards into quick-booking cards */}
        <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:px-0">
          <button type="button" onClick={() => set({ date: undefined })} className={cls('flex h-[58px] flex-none items-center rounded-xl border px-4 text-[14px] font-medium', !p.date ? 'border-ink bg-ink text-white' : 'border-line hover:bg-group-2')}>
            {t('common.anyDay')}
          </button>
          {days.map((d, i) => (
            <button
              key={d}
              type="button"
              onClick={() => set({ date: d })}
              className={cls('flex h-[58px] w-[64px] flex-none flex-col items-center justify-center rounded-xl border leading-tight', p.date === d ? 'border-acc bg-acc text-white' : 'border-line hover:bg-group-2')}
            >
              <span className={cls('text-[11.5px]', p.date === d ? 'text-white/80' : 'text-ink-3')}>{i === 0 ? t('common.today') : i === 1 ? t('common.tomorrow') : f.weekdayShort(d)}</span>
              <span className="text-[15px] font-semibold tabular">{f.dayMonthShort(d).split(' ')[0]}</span>
              <span className={cls('text-[11px]', p.date === d ? 'text-white/80' : 'text-ink-3')}>{f.dayMonthShort(d).split(' ')[1]}</span>
            </button>
          ))}
        </div>

        <div className={cls('mt-6 grid gap-x-5 gap-y-9 sm:grid-cols-2', showMap ? 'xl:grid-cols-2 2xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4', isFetching && 'opacity-60 transition-opacity')}>
          {!data && Array.from({ length: 6 }, (_, i) => <SalonCardSkeleton key={i} />)}
          {items.map((s) => (
            <SalonCard key={s.id} s={s} date={p.date} times={p.date ? (times?.[s.id] ?? []) : undefined} highlight={hover === s.id} onHover={setHover} />
          ))}
        </div>
        {data && !items.length && (
          <Empty icon={<SearchX size={28} />} title={t('search.emptyTitle')} text={t('search.emptyText')}>
            <Button variant="outline" onClick={() => writeParams({})}>{t('search.reset')}</Button>
          </Empty>
        )}
      </div>

      {/* desktop map */}
      {showMap && (
        <aside className="sticky top-[72px] hidden h-[calc(100dvh-72px)] w-[min(42vw,640px)] flex-none border-l border-line lg:block">
          <SalonMap points={points} activeId={hover} onHover={setHover} className="size-full" />
        </aside>
      )}

      {/* phone map */}
      <button
        type="button"
        onClick={() => setMobileMap(!mobileMap)}
        className="fixed bottom-[calc(env(safe-area-inset-bottom)+70px)] left-1/2 z-30 flex h-11 -translate-x-1/2 items-center gap-2 rounded-full bg-ink px-5 text-[14.5px] font-semibold text-white shadow-pop lg:hidden"
      >
        {mobileMap ? <List size={17} /> : <MapIcon size={17} />}
        {mobileMap ? t('search.list') : t('search.map')}
      </button>
      {mobileMap && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-20 bg-white lg:hidden">
          <SalonMap points={points} activeId={hover} onHover={setHover} className="size-full" />
        </div>
      )}
    </div>
  )
}
