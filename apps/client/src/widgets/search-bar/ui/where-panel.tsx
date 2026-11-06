import { useQuery } from '@tanstack/react-query'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { Spinner } from '@yeral/ui/spinner'
import { Check, LocateFixed, MapPin, MapPinOff } from 'lucide-react'
import { useState, type ComponentProps } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { LocationHelp, type usePlace } from '@/features/pick-place'
import type { Listbox } from '../model/use-listbox'
import { Mark, Panel, Rows, Tile, type Row, type Section } from './panel'

export type Located = ReturnType<typeof usePlace>
/** The api answers typed places from this many letters. */
const MIN_LETTERS = 2

/**
 * «Where» (C7-Home, book C-01, Q-107): Near me first (the default), then the cities; typing matches cities and the api's
 * places. The field shows the city only as data: the guessed one once the browser said no.
 */
export function useWhere({ typed, located, onPicked, touch }: { typed: string; located: Located; onPicked: () => void; touch?: boolean }) {
  const t = useTranslations('searchBar')
  const lang = useLocale()
  const sdk = useSdk()
  const { place } = located
  const cities = useQuery(sdk.catalog.cities(lang)).data
  const city = place?.kind === 'city' ? place.id : (cities?.main ?? null)
  const term = typed.trim()
  const typing = term.length >= MIN_LETTERS
  const places = useQuery(sdk.catalog.places(typing ? term : '', lang, city))
  const cityName = (id: string | null) => cities?.items.find((c) => c.id === id)?.name ?? ''

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
      selected: place?.kind === 'city' && place.id === c.id,
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
          {check(place?.kind === 'city' && place.id === c.id)}
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
    nothing: typing && !!places.data && placeRows.length + cityRows.length === 0,
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
  const [help, setHelp] = useState(false)
  return (
    <Panel {...props} touch={touch} className={className}>
      {located.denied && (
        <Callout
          tone="accent"
          size="s"
          icon={<MapPinOff aria-hidden />}
          title={t('locationOff')}
          className={cn('flex-none', touch ? 'mx-4 mt-3 mb-1' : 'm-0.5 mb-1.5')}
          actions={
            <Button variant="secondary" size="s" onMouseDown={(e) => e.preventDefault()} onClick={() => setHelp(true)}>
              {t('howToAllow')}
            </Button>
          }
        >
          {t('locationOffText')}
        </Callout>
      )}
      <LocationHelp open={help} onOpenChange={setHelp} />
      {where.nothing && (
        <div role="status" className="flex h-16 flex-none items-center justify-center text-dense text-n-500">
          {t('noPlace')}
        </div>
      )}
      <Rows id={listId} label={t('placesList')} sections={where.sections} listbox={listbox} touch={touch} />
    </Panel>
  )
}
