import { DEFAULT_RADIUS_KM, RADIUS_OPTIONS_KM } from '@yeral/domain/geo'
import { useFmt } from '@yeral/i18n'
import { FilterBar, type FilterBarLabels, type FilterDef } from '@yeral/ui/filter-bar'
import type { ReactNode } from 'react'
import { useTranslations } from 'use-intl'
import { CLEARED, PRICE_BANDS, priceBandAddress, priceBandOf, RATINGS, type SearchAddress, type Sort } from '../model/search'

/** The Sort menu's value for the api's own order (nearest with a position, rating × reviews without), no `sort` param. */
const RECOMMENDED = 'recommended'
/** A toggle filter's one option (Open now, Women only): on, or the «any» row; the api takes only on. */
const ON = 'yes'

/**
 * The results toolbar (C7-Home C4, on the DS-Lists A5 FilterBar): row 1 Distance · Rating · Price · Open now · Women
 * only · Sort, all M 40 (the two toggles are book C-03's, not drawn: a single menu with its «any» row, «Open now · Yes»
 * while on, as the clients list's Upcoming booking); row 2 the active chips, Clear all and the count, always shown (the
 * query lives in the search fields above). Under 768 «Filters · N», the count and Sort as an icon, with the Filters
 * sheet. Distance is off without a position. Every value lives in the address (ADR 0011); a choice applies at once.
 * The menus carry no counts: the api gives none.
 */
export function ResultsToolbar({
  address,
  located,
  count,
  total,
  onChange,
}: {
  address: SearchAddress
  /** The list is around a position: Distance and Nearest make sense. */
  located: boolean
  /** Row 2's count: «24 places · free time today». */
  count: ReactNode
  /** How many places, for the sheet's «Show N places». */
  total: number
  onChange: (patch: Partial<SearchAddress>) => void
}) {
  const t = useTranslations('search')
  const fmt = useFmt()
  const labels: FilterBarLabels = {
    filters: t('filters.filters'),
    clearAll: t('filters.clearAll'),
    clear: t('filters.clear'),
    close: t('filters.close'),
    back: t('filters.back'),
    showResults: t('filters.showResults', { n: total }),
    searchIn: t('filters.searchIn'),
    remove: (chip) => t('filters.remove', { chip }),
    nothingMatches: (q) => t('filters.nothingMatches', { q }),
  }

  const radius = address.r ?? DEFAULT_RADIUS_KM
  const km = (n: number) => t('filters.km', { km: n })
  // a rating or a range from an older link stays in its menu, read as it is
  const rating = address.rating
  const ratings: readonly number[] =
    rating !== undefined && !(RATINGS as readonly number[]).includes(rating) ? [...RATINGS, rating] : RATINGS
  const ratingLabel = (r: number) => t('filters.ratingFrom', { r: fmt.rating(r) })
  const band = priceBandOf(address)
  const priceLabel = (from: number | undefined, to: number | undefined) =>
    from !== undefined && to !== undefined
      ? t('filters.between', { from: fmt.number(from), to: fmt.money(to) })
      : from !== undefined
        ? t('filters.andUp', { price: fmt.money(from) })
        : t('filters.upTo', { price: fmt.money(to ?? 0) })

  const filters: FilterDef[] = [
    {
      id: 'distance',
      label: t('filters.distance'),
      plain: String(DEFAULT_RADIUS_KM),
      options: RADIUS_OPTIONS_KM.map((n) => ({ value: String(n), label: t('filters.within', { km: n }) })),
      value: located ? String(radius) : null,
      onValueChange: (v) => onChange({ r: v ? Number(v) : undefined }),
      short: (o) => km(Number(o.value)),
      chip: (o) => t('filters.chip', { filter: t('filters.distance'), value: km(Number(o.value)) }),
      disabled: !located,
      disabledHint: t('filters.needsLocation'),
    },
    {
      id: 'rating',
      label: t('filters.rating'),
      anyLabel: t('filters.anyRating'),
      options: ratings.map((r) => ({ value: String(r), label: ratingLabel(r) })),
      value: rating !== undefined ? String(rating) : null,
      onValueChange: (v) => onChange({ rating: v ? Number(v) : undefined }),
      chip: (o) => t('filters.chip', { filter: t('filters.rating'), value: o.label }),
    },
    {
      id: 'price',
      label: t('filters.price'),
      anyLabel: t('filters.anyPrice'),
      options: [
        ...PRICE_BANDS.map((b) => ({ value: b.id, label: priceLabel(b.from, b.to) })),
        ...(band === 'custom' ? [{ value: band, label: priceLabel(address.from, address.to) }] : []),
      ],
      value: band ?? null,
      onValueChange: (v) => v !== 'custom' && onChange(priceBandAddress(v)),
      chip: (o) => t('filters.chip', { filter: t('filters.price'), value: o.label }),
    },
    {
      id: 'open',
      label: t('filters.openNow'),
      anyLabel: t('filters.anyOpen'),
      options: [{ value: ON, label: t('filters.openNow') }],
      value: address.open ? ON : null,
      onValueChange: (v) => onChange({ open: v ? true : undefined }),
      chip: (o) => o.label,
      short: () => t('filters.yes'),
    },
    {
      id: 'women',
      label: t('filters.women'),
      anyLabel: t('filters.everyone'),
      options: [{ value: ON, label: t('filters.women') }],
      value: address.women ? ON : null,
      onValueChange: (v) => onChange({ women: v ? true : undefined }),
      chip: (o) => o.label,
      short: () => t('filters.yes'),
    },
  ]

  // Nearest only with a position; a sort from an older link stays until it's changed
  const sorts = [
    { value: RECOMMENDED, label: t('sorts.recommended') },
    ...(located || address.sort === 'distance' ? [{ value: 'distance', label: t('sorts.distance') }] : []),
    { value: 'price', label: t('sorts.price') },
    ...(address.sort === 'rating' ? [{ value: 'rating', label: t('sorts.rating') }] : []),
  ]

  return (
    <FilterBar
      labels={labels}
      filters={filters}
      sort={{
        label: t('sort'),
        value: address.sort ?? RECOMMENDED,
        options: sorts,
        onValueChange: (v) => onChange({ sort: v === RECOMMENDED ? undefined : (v as Sort) }),
      }}
      count={count}
      searched
      onClearAll={() => onChange(CLEARED)}
    />
  )
}
