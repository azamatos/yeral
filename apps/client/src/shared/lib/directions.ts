/**
 * Where «Directions» goes (book Q-108): the phone's own choice — Apple Maps on an iPhone or iPad, the app chooser on
 * Android (a `geo:` link) — and Google Maps on a computer, to the place's position (named, where the app takes a name).
 */
export function directionsUrl(to: { lat: number; lng: number }, name: string, userAgent: string): string {
  const at = `${to.lat},${to.lng}`
  if (/iPhone|iPad|iPod/.test(userAgent)) return `https://maps.apple.com/?daddr=${at}&q=${encodeURIComponent(name)}`
  if (/Android/.test(userAgent)) return `geo:${at}?q=${at}(${encodeURIComponent(name)})`
  return `https://www.google.com/maps/dir/?api=1&destination=${at}`
}
