import { directionsUrl } from '@yeral/lib/links'
import { Button } from '@yeral/ui/button'
import { MapDot, MapFrame, MapMarker, MapPin } from '@yeral/ui/map-frame'
import { Navigation } from 'lucide-react'

type Geo = { lat: number; lng: number; approximate: boolean }

/**
 * A place on a still map (Venue «Salgy», Account-Bookings `.dmap`): a picture of the address written beside it, the pin
 * naming the place, or a circle round the area while the exact address is kept for a confirmed booking. A new place
 * makes a new map (`key`), so the zoom follows its kind of address too.
 */
export function PlaceMap({ name, geo, className }: { name: string; geo: Geo; className?: string }) {
  const at = { lat: geo.lat, lng: geo.lng }
  return (
    <MapFrame key={`${geo.lat},${geo.lng}`} center={at} zoom={geo.approximate ? 14 : 16} interactive={false} className={className}>
      <MapMarker at={at}>
        {geo.approximate ? (
          <span className="absolute size-37.5 -translate-1/2 rounded-pill border-[1.5px] border-a-500/45 bg-a-500/14" />
        ) : (
          <>
            <MapPin hot className="-translate-y-2.5">
              {name}
            </MapPin>
            <MapDot />
          </>
        )}
      </MapMarker>
    </MapFrame>
  )
}

/**
 * «Directions» (book Q-108): the server's render (and a computer) links Google Maps; a phone's press opens its own map
 * app instead.
 */
export function DirectionsButton({ name, geo, children }: { name: string; geo: { lat: number; lng: number }; children: string }) {
  const at = { lat: geo.lat, lng: geo.lng }
  const google = directionsUrl(at, name)
  return (
    <Button asChild size="s" variant="secondary">
      <a
        href={google}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => {
          const own = directionsUrl(at, name, navigator)
          if (own === google) return
          e.preventDefault()
          location.href = own
        }}
      >
        <Navigation aria-hidden />
        {children}
      </a>
    </Button>
  )
}
