import type { LatLng } from '@yeral/domain/geo'
import { useState, useSyncExternalStore } from 'react'

/** Where the client looks (book C-01, Q-107): around them, around a typed place, or in a city. */
export type Place = ({ kind: 'near' } & LatLng) | ({ kind: 'point'; label: string } & LatLng) | { kind: 'city'; id: string }

const KEY = 'yeral.place'
const LOCATE_TIMEOUT_MS = 10_000

type Kept = { kind?: string; id?: unknown; label?: unknown; lat?: unknown; lng?: unknown } | null

const parse = (raw: string | null): Place | null => {
  const value = JSON.parse(raw ?? 'null') as Kept
  if (!value) return null
  const at = typeof value.lat === 'number' && typeof value.lng === 'number' ? { lat: value.lat, lng: value.lng } : null
  if (value.kind === 'near' && at) return { kind: 'near', ...at }
  if (value.kind === 'point' && at && typeof value.label === 'string') return { kind: 'point', label: value.label, ...at }
  if (value.kind === 'city' && typeof value.id === 'string') return { kind: 'city', id: value.id }
  return null
}

/** What this browser kept. Storage may be off, and an old or broken value is no place. */
export function readPlace(): Place | null {
  try {
    return parse(localStorage.getItem(KEY))
  } catch {
    return null
  }
}

// the place every part of the page reads: the same object until it changes, as `useSyncExternalStore` asks
let current: Place | null = null
let raw: string | null = null
const listeners = new Set<() => void>()

function snapshot(): Place | null {
  try {
    const now = localStorage.getItem(KEY)
    if (now !== raw) {
      raw = now
      current = readPlace()
    }
  } catch {
    // no storage here: the place lasts as long as the page
  }
  return current
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function keepPlace(place: Place) {
  current = place
  try {
    raw = JSON.stringify(place)
    localStorage.setItem(KEY, raw)
  } catch {
    // as above
  }
  listeners.forEach((listener) => listener())
}

/** The search's address for a place: `near=lat,lng`, or `city=`. */
export const placeAddress = (place: Place | null): { near?: string; city?: string } => {
  if (!place) return {}
  return place.kind === 'city' ? { city: place.id } : { near: `${place.lat.toFixed(5)},${place.lng.toFixed(5)}` }
}

/** The browser's position; only ever called from a button (book C-01: the site never asks as a page loads). */
function locate(): Promise<LatLng> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('no geolocation'))
      return
    }
    navigator.geolocation.getCurrentPosition(({ coords }) => resolve({ lat: coords.latitude, lng: coords.longitude }), reject, {
      timeout: LOCATE_TIMEOUT_MS,
      maximumAge: 60_000,
    })
  })
}

const noPlace = () => null
const inBrowser = () => true
const onServer = () => false
const nothing = () => () => undefined

/**
 * The client's place, kept in this browser and shared by everything on the page. The server's page and the first render
 * know none, so they agree. `denied`: the browser said no or failed, so the list stays by city and says why.
 */
export function usePlace() {
  const place = useSyncExternalStore(subscribe, snapshot, noPlace)
  const read = useSyncExternalStore(nothing, inBrowser, onServer)
  const [denied, setDenied] = useState(false)
  const [locating, setLocating] = useState(false)

  const pick = (next: Place) => {
    keepPlace(next)
    setDenied(false)
  }
  const askBrowser = () => {
    setLocating(true)
    return locate()
      .then((at) => pick({ kind: 'near', ...at }))
      .catch(() => setDenied(true))
      .finally(() => setLocating(false))
  }
  /** The banner: until a place is known, once this browser has been read. */
  return { place, unknown: read && !place, denied, locating, pick, askBrowser }
}
