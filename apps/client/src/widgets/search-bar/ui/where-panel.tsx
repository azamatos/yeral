import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { Spinner } from '@yeral/ui/spinner'
import { Check, LocateFixed, MapPin, MapPinOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import type { usePlace } from '@/features/pick-place'
import { SUGGEST_DELAY_MS, useDebounced } from '../model/use-debounced'
import type { Listbox } from '../model/use-listbox'
import { Mark, Panel, Rows, Tile, type Row, type Section } from './panel'

export type Located = ReturnType<typeof usePlace>
/** The api answers typed places from this many letters. */
const MIN_LETTERS = 2

/**
 * «Where» (C7-Home, book C-01, Q-107): Near me first (the default), then the cities; typing matches cities and the api's
 * places. The field shows the city only as data: the guessed one once the browser said no, ticked in the list too.
 * `help` is the «How to allow» sheet: its owner renders it outside the panel, which closes when the sheet takes the focus.
 */
export function useWhere({ typed, located, onPicked, touch }: { typed: string; located: Located; onPicked: () => void; touch?: boolean }) {
  const t = useTranslations('searchBar')
  const lang = useLocale()
  const sdk = useSdk()
  const { place } = located
  const [help, setHelp] = useState(false)
  const cities = useQuery(sdk.catalog.cities(lang)).data
  const city = place?.kind === 'city' ? place.id : (cities?.main ?? null)
  const term = typed.trim()
  const typing = term.length >= MIN_LETTERS
  const asked = useDebounced(typing ? term : '', SUGGEST_DELAY_MS)
  const places = useQuery({ ...sdk.catalog.places(asked, lang, city), placeholderData: keepPreviousData })
  const settled = asked === term && !places.isPlaceholderData
  const cityName = (id: string | null) => cities?.items.find((c) => c.id === id)?.name ?? ''
  /** The city the list ticks: the picked one, or the guessed one once the browser said no. */
  const ticked = place?.kind === 'city' ? place.id : !place && located.denied ? city : null

  /** What the field shows: the place, or «Near me» until one is known (the guessed city once the browser said no). */
  const shown =
    place?.kind === 'near'
      ? t('nearMe')
      : place?.kind === 'point'
        ? place.label
        : place?.kind === 'city'
          ? cityName(place.id)
          : located.denied
            ? cityName(city)
            : t('nearMe')

  const check = (on: boolean) => on && <Check aria-hidden className="ml-auto text-a-600" />
  const near: Row = {
    id: 'where-near',
    tall: true,
    selected: place?.kind === 'near',
    pick: () => void located.askBrowser().then((found) => found && onPicked()),
    node: (
      <>
        <Tile touch={touch}>
          <LocateFixed aria-hidden />
        </Tile>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="font-semibold">{t('nearMe')}</span>
          <span className="text-dense font-normal text-n-500">{located.locating ? t('finding') : t('useMyLocation')}</span>
        </span>
        {located.locating ? <Spinner className="ml-auto size-4.5 text-n-600" label={t('finding')} /> : check(place?.kind === 'near')}
      </>
    ),
  }
  const cityRows = (cities?.items ?? [])
    .filter((c) => !typing || c.name.toLocaleLowerCase().includes(term.toLocaleLowerCase()))
    .map((c): Row => ({
      id: `where-city-${c.id}`,
      selected: ticked === c.id,
      pick: () => {
        located.pick({ kind: 'city', id: c.id })
        onPicked()
      },
      node: (
        <>
          <MapPin aria-hidden />
          <span className="min-w-0 truncate">
            <Mark text={c.name} q={term} />
          </span>
          {check(ticked === c.id)}
        </>
      ),
    }))
  const placeRows = (typing ? (places.data?.items ?? []) : []).map((p, i): Row => ({
    id: `where-place-${i}`,
    pick: () => {
      located.pick({ kind: 'point', ...p })
      onPicked()
    },
    node: (
      <>
        <MapPin aria-hidden />
        <span className="min-w-0 truncate">
          <Mark text={p.label} q={term} />
        </span>
      </>
    ),
  }))
  const sections: Section[] = typing
    ? [
        { title: t('places'), rows: placeRows },
        { title: t('cities'), rows: cityRows },
      ]
    : [{ rows: [near] }, { title: t('cities'), divider: true, rows: cityRows }]
  return {
    shown,
    sections,
    rows: sections.flatMap((s) => s.rows),
    nothing: typing && settled && !!places.data && placeRows.length + cityRows.length === 0,
    help,
    setHelp,
  }
}

export function WherePanel({
  where,
  located,
  listbox,
  listId,
  touch,
  className,
  ...props
}: ComponentProps<'div'> & { where: ReturnType<typeof useWhere>; located: Located; listbox: Listbox; listId: string; touch?: boolean }) {
  const t = useTranslations('searchBar')
  return (
    <Panel {...props} touch={touch} className={className}>
      {located.denied && (
        <Callout
          tone="accent"
          icon={<MapPinOff aria-hidden />}
          title={t('locationOff')}
          className={cn('flex-none', touch ? 'mx-4 mt-3 mb-1' : 'm-0.5 mb-1.5')}
          actions={
            <Button variant="secondary" size="s" onMouseDown={(e) => e.preventDefault()} onClick={() => where.setHelp(true)}>
              {t('howToAllow')}
            </Button>
          }
        >
          {t('locationOffText')}
        </Callout>
      )}
      {where.nothing && (
        <div role="status" className="flex h-16 flex-none items-center justify-center text-dense text-n-500">
          {t('noPlace')}
        </div>
      )}
      <Rows id={listId} label={t('placesList')} sections={where.sections} listbox={listbox} touch={touch} />
    </Panel>
  )
}
