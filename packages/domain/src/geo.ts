/**
 * Distances from the user's position (client spec §5): radius filter and nearest-first sort.
 * Display (`1,2 km`, `850 m`) is i18n's job.
 */

export interface LatLng {
  lat: number
  lng: number
}

/** Search radius chips, km; 5 is the default. */
export const RADIUS_OPTIONS_KM = [1, 3, 5, 10, 25] as const
export const DEFAULT_RADIUS_KM = 5

const EARTH_RADIUS_M = 6_371_000
const rad = (deg: number) => (deg * Math.PI) / 180

/** Great-circle distance in metres (haversine). */
export function distanceM(a: LatLng, b: LatLng): number {
  const dLat = rad(b.lat - a.lat)
  const dLng = rad(b.lng - a.lng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2
  return Math.round(2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h))))
}

/** A box around a point that contains the radius; the api uses it to narrow the query before exact distances. */
export function boundingBox(center: LatLng, radiusKm: number): { minLat: number; maxLat: number; minLng: number; maxLng: number } {
  const dLat = (radiusKm * 1000) / 111_320
  const dLng = dLat / Math.max(Math.cos(rad(center.lat)), 1e-6)
  return { minLat: center.lat - dLat, maxLat: center.lat + dLat, minLng: center.lng - dLng, maxLng: center.lng + dLng }
}

/** Without a location, lists sort by rating × review count. */
export const popularity = (rating: number, reviewsCount: number) => rating * reviewsCount

/** A person farther than this from every city's centre is in none of them: the market's main city stands in. */
export const CITY_REACH_KM = 50

/**
 * The city a position preselects (book Q-107): the one whose centre is nearest, if it's within `CITY_REACH_KM`. A
 * visitor abroad, or far from every city, gets null and starts in the market's main city.
 */
export function nearestCity<C extends LatLng>(cities: readonly C[], position: LatLng): C | null {
  let best: C | null = null
  let bestM = CITY_REACH_KM * 1000
  for (const c of cities) {
    const d = distanceM(position, c)
    if (d <= bestM) {
      best = c
      bestM = d
    }
  }
  return best
}
