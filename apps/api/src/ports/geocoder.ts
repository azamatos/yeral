/**
 * The address search behind a business's map pin (book F-099, B-04; ADR 0027): a geocoder port. Photon over
 * OpenStreetMap does type-ahead (the public Nominatim forbids it), public by default (`GEOCODER_URL`: fair use, no
 * guarantee) and self-hosted later without a change here; a memory one for tests. The api asks it, never the browser,
 * so the market's country, a cache and a rate limit sit in one place.
 */
import type { Locale } from '@yeral/domain/model'

/** One address to pick: what the list shows, the line kept as the business's address, the street, the pin. */
export interface Place {
  label: string
  line: string
  street: string
  lat: number
  lng: number
}

export interface SearchOptions {
  /** The city's centre: results near it come first. */
  near: { lat: number; lng: number }
  /** ISO 3166-1 alpha-2, lower case (`MARKET.code`): nothing outside the market. */
  country: string
  lang: Locale
  limit: number
}

export interface GeocoderPort {
  /** Off (`GEOCODER_URL=off`): the endpoint says so, and the app lets the pin be placed by hand. */
  readonly on: boolean
  search(q: string, opts: SearchOptions): Promise<Place[]>
}

/** A geocoder that's off: the endpoint answers `address_search_unavailable`. */
export const noGeocoder: GeocoderPort = { on: false, search: () => Promise.resolve([]) }

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    housenumber?: string
    street?: string
    city?: string
    district?: string
    countrycode?: string
  }
}

/** A Photon feature as a place: "247 Bitarap Türkmenistan Avenue", its name first when it's a place of its own. */
export function placeOf(f: PhotonFeature): Place | null {
  const p = f.properties
  const street = p.street ?? (p.housenumber ? undefined : p.name)
  if (!street) return null
  const line = p.housenumber ? `${p.housenumber} ${street}` : street
  const named = p.name && p.name !== street && p.name !== line ? p.name : null
  const label = [named, line, p.district, p.city].filter((x, i, all): x is string => !!x && all.indexOf(x) === i).join(', ')
  const [lng, lat] = f.geometry.coordinates
  return { label, line, street, lat, lng }
}

const DAY = 86_400_000

/**
 * Photon at `baseUrl` (`/api?q=…`): the market's country only, near the city, 3 s at most, each answer kept a day in
 * this process (fair use: the same letters typed again don't reach it).
 */
export function photonGeocoder(
  baseUrl: string,
  userAgent: string,
  now: () => number = Date.now,
  fetcher: typeof fetch = fetch,
): GeocoderPort {
  const cache = new Map<string, { at: number; places: Place[] }>()
  return {
    on: true,
    async search(q, { near, country, lang, limit }) {
      const key = [country, lang, near.lat.toFixed(2), near.lng.toFixed(2), limit, q.trim().toLowerCase()].join('|')
      const kept = cache.get(key)
      if (kept && now() - kept.at < DAY) return kept.places
      const url = new URL('/api', baseUrl)
      url.search = new URLSearchParams({
        q: q.trim(),
        lat: String(near.lat),
        lon: String(near.lng),
        // more than asked: other countries' answers go
        limit: String(limit * 3),
        // Photon names places in English or as written locally
        lang: lang === 'en' ? 'en' : 'default',
      }).toString()
      const res = await fetcher(url, {
        headers: { 'user-agent': userAgent, accept: 'application/json' },
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) throw new Error(`geocoder answered ${res.status}`)
      const body = (await res.json()) as { features?: PhotonFeature[] }
      const places = (body.features ?? [])
        .filter((f) => f.properties.countrycode?.toLowerCase() === country)
        .map(placeOf)
        .filter((p): p is Place => !!p)
        .filter((p, i, all) => all.findIndex((o) => o.label === p.label) === i)
        .slice(0, limit)
      // a small cache: the oldest goes past 500 answers
      if (cache.size >= 500) cache.delete(cache.keys().next().value!)
      cache.set(key, { at: now(), places })
      return places
    },
  }
}

/** Tests: the places it knows, matched by the words typed, the market's country only. */
export function memoryGeocoder(places: readonly (Place & { country: string })[]): GeocoderPort & { asked: string[] } {
  const asked: string[] = []
  return {
    on: true,
    asked,
    search(q, { country, limit }) {
      asked.push(q)
      const words = q.toLowerCase().split(/\s+/).filter(Boolean)
      return Promise.resolve(
        places
          .filter((p) => p.country === country && words.every((w) => p.label.toLowerCase().includes(w)))
          .slice(0, limit)
          .map(({ country: _, ...p }) => p),
      )
    },
  }
}
