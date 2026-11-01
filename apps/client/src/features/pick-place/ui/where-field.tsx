import { useQuery } from '@tanstack/react-query'
import { useSdk } from '@yeral/sdk/react'
import { Combobox, ComboboxInput, ComboboxList, type ComboboxOption } from '@yeral/ui/combobox'
import { LocateFixed, MapPin } from 'lucide-react'
import { useState, type Ref } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import type { Place } from '../model/place'

const NEAR = 'near'
/** The api answers typed places from this many letters. */
const MIN_LETTERS = 2

/**
 * «Where?» (book C-01, Q-107): near me, a city, or a typed address with up to 6 suggestions. The city shows only here, as data.
 * The list opens over what's below it.
 */
export function WhereField({
  id,
  place,
  inputRef,
  className,
  size,
  onPick,
  onNearMe,
}: {
  id?: string
  place: Place | null
  inputRef?: Ref<HTMLInputElement>
  className?: string
  size?: 'l' | 'm'
  onPick: (place: Place) => void
  onNearMe: () => void
}) {
  const t = useTranslations('location')
  const lang = useLocale()
  const sdk = useSdk()
  const cities = useQuery(sdk.catalog.cities(lang)).data
  const city = place?.kind === 'city' ? place.id : (cities?.main ?? null)
  const [typed, setTyped] = useState<string | null>(null)
  const typing = (typed ?? '').trim().length >= MIN_LETTERS
  const places = useQuery(sdk.catalog.places(typed ?? '', lang, city)).data?.items ?? []

  const shown =
    place?.kind === 'near' ? t('nearMe') : place?.kind === 'point' ? place.label : (cities?.items.find((c) => c.id === city)?.name ?? '')

  const options: ComboboxOption[] = typing
    ? places.map((p, i) => ({ id: `place-${i}`, label: p.label, icon: <MapPin aria-hidden /> }))
    : [
        { id: NEAR, label: t('nearMe'), icon: <LocateFixed aria-hidden /> },
        ...(cities?.items ?? []).map((c) => ({ id: `city-${c.id}`, label: c.name, icon: <MapPin aria-hidden /> })),
      ]

  const choose = (option: ComboboxOption) => {
    setTyped(null)
    if (option.id === NEAR) onNearMe()
    else if (option.id.startsWith('city-')) onPick({ kind: 'city', id: option.id.slice('city-'.length) })
    else {
      const found = places[Number(option.id.slice('place-'.length))]
      if (found) onPick({ kind: 'point', ...found })
    }
  }

  return (
    <div className={`relative min-w-0 ${className ?? ''}`}>
      <Combobox
        value={typed ?? shown}
        onValueChange={setTyped}
        options={options}
        onSelect={choose}
        listLabel={t('list')}
        empty={typing ? t('nothing') : undefined}
      >
        <ComboboxInput
          id={id}
          ref={inputRef}
          size={size}
          aria-label={t('where')}
          onFocus={() => setTyped('')}
          onBlur={() => setTyped(null)}
        />
        <ComboboxList className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto" />
      </Combobox>
    </div>
  )
}
