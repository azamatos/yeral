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
  /** An answer kept from an earlier search, or undefined: it costs the geocoder nothing, so the endpoint doesn't count it. */
  cached(q: string, opts: SearchOptions): Place[] | undefined
  search(q: string, opts: SearchOptions): Promise<Place[]>
}

/** A geocoder that's off: the endpoint answers `address_search_unavailable`. */
export const noGeocoder: GeocoderPort = { on: false, cached: () => undefined, search: () => Promise.resolve([]) }

interface PhotonFeature {
  geometry: { coordinates: [number, number] }
  properties: {
    name?: string
    housenumber?: string
    street?: string
    city?: string
    district?: string
    countrycode?: string
    /** OpenStreetMap's main tag: `highway` for a street, `place` for a city or a district, `shop`, `amenity`… */
    osm_key?: string
  }
}

/**
 * A Photon feature as a place: "247 Bitarap Türkmenistan Avenue", its name first when it's a place of its own. It needs
 * a street: its own, or its name when it is one (`osm_key` `highway`); a city, a district, or a shop with no street isn't
 * an address to pick.
 */
export function placeOf(f: PhotonFeature): Place | null {
  const p = f.properties
  const street = p.street ?? (p.osm_key === 'highway' ? p.name : undefined)
  if (!street) return null
  const line = p.housenumber ? `${p.housenumber} ${street}` : street
  const named = p.name && p.name !== street && p.name !== line ? p.name : null
  const label = [named, line, p.district, p.city].filter((x, i, all): x is string => !!x && all.indexOf(x) === i).join(', ')
  const [lng, lat] = f.geometry.coordinates
  return { label, line, street, lat, lng }
}

const DAY = 86_400_000
/** After a failure (Photon throttling, down or slow), searches answer at once for this long without asking it. */
export const GEOCODER_PAUSE_MS = 60_000
/** Places asked of Photon per search: more than a list shows, as other countries' answers and non-addresses go. */
const ASKED = 20
/** Answers kept: the oldest goes past this many. */
const KEPT = 500

/** Photon names places in English or as written locally. */
const photonLang = (lang: Locale) => (lang === 'en' ? 'en' : 'default')

/**
 * Photon at `baseUrl` (its `api` under that address, so a self-hosted one may sit under a path): the market's country
 * only, near the city, 3 s at most. Fair use: each answer is kept a day in this process (the same letters typed again,
 * in any language Photon answers the same, don't reach it), and after a failure it isn't asked for a minute.
 */
export function photonGeocoder(
  baseUrl: string,
  userAgent: string,
  now: () => number = Date.now,
  fetcher: typeof fetch = fetch,
): GeocoderPort {
  const endpoint = new URL('api', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`)
  const cache = new Map<string, { at: number; places: Place[] }>()
  let pausedUntil = 0
  const keyOf = (q: string, { near, country, lang }: SearchOptions) =>
    [country, photonLang(lang), near.lat.toFixed(2), near.lng.toFixed(2), q.trim().toLowerCase()].join('|')
  const kept = (key: string) => {
    const found = cache.get(key)
    if (found && now() - found.at < DAY) return found.places
    if (found) cache.delete(key)
    return undefined
  }
  return {
    on: true,
    cached: (q, opts) => kept(keyOf(q, opts))?.slice(0, opts.limit),
    async search(q, opts) {
      const key = keyOf(q, opts)
      const known = kept(key)
      if (known) return known.slice(0, opts.limit)
      if (now() < pausedUntil) throw new Error('geocoder paused after a failure')
      const url = new URL(endpoint)
      url.search = new URLSearchParams({
        q: q.trim(),
        lat: String(opts.near.lat),
        lon: String(opts.near.lng),
        limit: String(ASKED),
        lang: photonLang(opts.lang),
      }).toString()
      let places: Place[]
      try {
        const res = await fetcher(url, {
          headers: { 'user-agent': userAgent, accept: 'application/json' },
          signal: AbortSignal.timeout(3000),
        })
        if (!res.ok) throw new Error(`geocoder answered ${res.status}`)
        const body = (await res.json()) as { features?: PhotonFeature[] }
        places = (body.features ?? [])
          .filter((f) => f.properties.countrycode?.toLowerCase() === opts.country)
          .map(placeOf)
          .filter((p): p is Place => !!p)
          .filter((p, i, all) => all.findIndex((o) => o.label === p.label) === i)
      } catch (e) {
        pausedUntil = now() + GEOCODER_PAUSE_MS
        throw e
      }
      if (!cache.has(key) && cache.size >= KEPT) cache.delete(cache.keys().next().value!)
      cache.set(key, { at: now(), places })
      return places.slice(0, opts.limit)
    },
  }
}

/** Tests: the places it knows, matched by the words typed, the market's country only; it keeps nothing. */
export function memoryGeocoder(places: readonly (Place & { country: string })[]): GeocoderPort & { asked: string[] } {
  const asked: string[] = []
  return {
    on: true,
    asked,
    cached: () => undefined,
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
