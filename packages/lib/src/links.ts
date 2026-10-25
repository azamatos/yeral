/** The device a link is for: the browser's `navigator` (only what's read here, so a test or the server can pass one). */
export type Device = { userAgent: string; maxTouchPoints?: number }

/** An iPhone or iPad; an iPad's Safari says «Macintosh» since iPadOS 13, but a Mac has no touch screen. */
const apple = (d: Device) => /iPhone|iPad|iPod/.test(d.userAgent) || (/Macintosh/.test(d.userAgent) && (d.maxTouchPoints ?? 0) > 1)

/**
 * Where «Directions» goes (book Q-108): the phone's own choice — Apple Maps on an iPhone or iPad, the app chooser on
 * Android (a `geo:` link) — and Google Maps on a computer, to the place's position (named, where the app takes a name).
 * Without a device (the server's render), Google Maps.
 */
export function directionsUrl(to: { lat: number; lng: number }, name: string, device: Device = { userAgent: '' }): string {
  const at = `${to.lat},${to.lng}`
  if (apple(device)) return `https://maps.apple.com/?daddr=${at}&q=${encodeURIComponent(name)}`
  if (/Android/.test(device.userAgent)) return `geo:${at}?q=${at}(${encodeURIComponent(name)})`
  return `https://www.google.com/maps/dir/?api=1&destination=${at}`
}

/** A number to call: `tel:+99312456789` (E.164 as the api sends it). */
export const telHref = (phone: string) => `tel:${phone}`
