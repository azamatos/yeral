/** Map link that works without Google services (OpenStreetMap). */
export function directionsUrl(s: { geo: { lat: number; lng: number } }) {
  return `https://www.openstreetmap.org/?mlat=${s.geo.lat}&mlon=${s.geo.lng}#map=17/${s.geo.lat}/${s.geo.lng}`
}

export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, '')}`
