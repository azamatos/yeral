import type { BusinessCard } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { MapFrame, MapMarker, MapPin, type MapArea } from '@yeral/ui/map-frame'
import { useState } from 'react'
import { useTranslations } from 'use-intl'

type LatLng = { lat: number; lng: number }

const CITY_ZOOM = 13

/** The middle of the results, where the map opens. */
function middleOf(cards: readonly BusinessCard[]): LatLng | undefined {
  if (!cards.length) return undefined
  const sum = cards.reduce((all, c) => ({ lat: all.lat + c.geo.lat, lng: all.lng + c.geo.lng }), { lat: 0, lng: 0 })
  return { lat: sum.lat / cards.length, lng: sum.lng / cards.length }
}

/** The first free time a pin shows; a card with none shows its name. */
function pinWords(card: BusinessCard, time: (start: number) => string) {
  const a = card.availability
  return a.type !== 'class' && a.starts[0] !== undefined ? time(a.starts[0]) : card.name
}

/**
 * The results on the map (book C-04, board Search `.map`): a pin per place with its next time, the place in hand raised;
 * after the person moves the map, «Search this area». It stays where the person took it while their area is searched.
 */
export function ResultsMap({
  cards,
  fallback,
  hot,
  searchingArea,
  onHot,
  onPick,
  onSearchArea,
  className,
}: {
  cards: readonly BusinessCard[]
  /** Where the map opens with no results: the city's centre. */
  fallback: LatLng
  hot: string | null
  searchingArea: boolean
  onHot: (slug: string | null) => void
  onPick: (slug: string) => void
  onSearchArea: (area: MapArea) => void
  className?: string
}) {
  const t = useTranslations('search.map')
  const fmt = useFmt()
  const [moved, setMoved] = useState<MapArea | null>(null)
  const middle = middleOf(cards)
  const [center, setCenter] = useState(middle ?? fallback)
  if (!searchingArea && middle && (middle.lat !== center.lat || middle.lng !== center.lng)) setCenter(middle)

  return (
    <div className={cn('relative min-h-0', className)}>
      <MapFrame
        center={center}
        zoom={CITY_ZOOM}
        controls={{ zoomIn: t('zoomIn'), zoomOut: t('zoomOut') }}
        onAreaChange={setMoved}
        className="h-full rounded-none"
      >
        {cards.map((card) => {
          const words = pinWords(card, fmt.time)
          return (
            <MapMarker key={card.slug} at={card.geo}>
              <MapPin asChild hot={hot === card.slug}>
                <button
                  type="button"
                  aria-label={words === card.name ? card.name : t('pin', { name: card.name, time: words })}
                  onMouseEnter={() => onHot(card.slug)}
                  onMouseLeave={() => onHot(null)}
                  onClick={() => onPick(card.slug)}
                >
                  {words}
                </button>
              </MapPin>
            </MapMarker>
          )
        })}
      </MapFrame>
      {moved && (
        <Button
          variant="secondary"
          size="s"
          className="absolute top-3 left-1/2 z-3 -translate-x-1/2 shadow-raised"
          onClick={() => {
            onSearchArea(moved)
            setMoved(null)
          }}
        >
          {t('here')}
        </Button>
      )}
    </div>
  )
}
