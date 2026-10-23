/**
 * Web Mercator as MapLibre draws it (512 px tiles): where a point sits in the frame for the map's centre and zoom, and
 * back. MapFrame places its pins with it over the tiles, and over the drawn ground when there are none.
 */
export type LatLng = { lat: number; lng: number }
export type MapView = { center: LatLng; zoom: number; width: number; height: number }

const TILE = 512
const MAX_LAT = 85.051129

const clamp = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n))

function toWorld({ lat, lng }: LatLng, zoom: number) {
  const size = TILE * 2 ** zoom
  const sin = Math.sin((clamp(lat, -MAX_LAT, MAX_LAT) * Math.PI) / 180)
  return { x: ((lng + 180) / 360) * size, y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * size }
}

function fromWorld({ x, y }: { x: number; y: number }, zoom: number): LatLng {
  const size = TILE * 2 ** zoom
  const n = Math.PI - (2 * Math.PI * y) / size
  return { lat: (180 / Math.PI) * Math.atan(Math.sinh(n)), lng: (x / size) * 360 - 180 }
}

/** The point's place in the frame, in pixels from its top left corner. */
export function toScreen(point: LatLng, view: MapView): { x: number; y: number } {
  const c = toWorld(view.center, view.zoom)
  const p = toWorld(point, view.zoom)
  return { x: p.x - c.x + view.width / 2, y: p.y - c.y + view.height / 2 }
}

/** The place under a pixel of the frame, to 6 decimals (about 10 cm). */
export function fromScreen(pixel: { x: number; y: number }, view: MapView): LatLng {
  const c = toWorld(view.center, view.zoom)
  const p = fromWorld({ x: c.x + pixel.x - view.width / 2, y: c.y + pixel.y - view.height / 2 }, view.zoom)
  const round = (n: number) => Math.round(n * 1e6) / 1e6
  return { lat: round(p.lat), lng: round(p.lng) }
}
