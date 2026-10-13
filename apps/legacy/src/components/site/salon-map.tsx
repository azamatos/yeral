'use client'

import 'maplibre-gl/dist/maplibre-gl.css'
import * as maplibregl from 'maplibre-gl'
import { useEffect, useRef } from 'react'
import { CITY_CENTER } from '@/domain/places'

export type MapPoint = { id: string; slug: string; name: string; lat: number; lng: number; label: string; photo?: string; sub?: string }

/** OpenFreeMap: free vector tiles, no API key, no Google dependency (matters for Turkmenistan). */
const STYLE = 'https://tiles.openfreemap.org/styles/positron'

/** The worker is copied to /public on install (see package.json postinstall): bundlers can't resolve it. */
if (typeof window !== 'undefined') maplibregl.setWorkerUrl(new URL('/vendor/maplibre/maplibre-gl-worker.mjs', window.location.origin).href)

function pill(p: MapPoint, single: boolean) {
  const el = document.createElement('button')
  el.type = 'button'
  el.setAttribute('aria-label', p.name)
  el.className = 'yeral-pin'
  el.innerHTML = single
    ? `<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43C17 43 33 27.5 33 17A16 16 0 0 0 1 17C1 27.5 17 43 17 43Z" fill="#5a3ff0" stroke="#fff" stroke-width="2"/><circle cx="17" cy="17" r="6" fill="#fff"/></svg>`
    : `<span>★ ${p.label}</span>`
  return el
}

export function SalonMap({
  points,
  activeId,
  onHover,
  single,
  className,
  zoom = 15,
}: {
  points: MapPoint[]
  activeId?: string | null
  onHover?: (id: string | null) => void
  single?: boolean
  className?: string
  zoom?: number
}) {
  const box = useRef<HTMLDivElement>(null)
  const map = useRef<maplibregl.Map | null>(null)
  const markers = useRef(new Map<string, { m: maplibregl.Marker; el: HTMLElement }>())

  useEffect(() => {
    if (!box.current) return
    const m = new maplibregl.Map({
      container: box.current,
      style: STYLE,
      center: points[0] ? [points[0].lng, points[0].lat] : [CITY_CENTER.lng, CITY_CENTER.lat],
      zoom: single ? zoom : 12,
      attributionControl: { compact: true },
      cooperativeGestures: single,
    })
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right')
    map.current = m
    const mk = markers.current
    return () => {
      m.remove()
      map.current = null
      mk.clear()
    }
  }, [single, zoom]) // eslint-disable-line react-hooks/exhaustive-deps

  // sync markers with points
  useEffect(() => {
    const m = map.current
    if (!m) return
    const seen = new Set<string>()
    for (const p of points) {
      seen.add(p.id)
      if (markers.current.has(p.id)) continue
      const el = pill(p, !!single)
      el.addEventListener('mouseenter', () => onHover?.(p.id))
      el.addEventListener('mouseleave', () => onHover?.(null))
      const popup = single
        ? undefined
        : new maplibregl.Popup({ offset: 18, closeButton: false, maxWidth: '260px' }).setHTML(
            `<a href="/${p.slug}" class="yeral-pop">${p.photo ? `<img src="${p.photo}" alt="">` : ''}<b>${p.name}</b><span>★ ${p.label}${p.sub ? ` · ${p.sub}` : ''}</span></a>`,
          )
      const marker = new maplibregl.Marker({ element: el, anchor: single ? 'bottom' : 'center' }).setLngLat([p.lng, p.lat])
      if (popup) marker.setPopup(popup)
      marker.addTo(m)
      markers.current.set(p.id, { m: marker, el })
    }
    for (const [id, { m: mk }] of markers.current) {
      if (!seen.has(id)) {
        mk.remove()
        markers.current.delete(id)
      }
    }
    if (!single && points.length) {
      const b = new maplibregl.LngLatBounds()
      points.forEach((p) => b.extend([p.lng, p.lat]))
      m.fitBounds(b, { padding: 60, maxZoom: 14, duration: 400 })
    }
  }, [points, single]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    for (const [id, { el }] of markers.current) el.classList.toggle('on', id === activeId)
  }, [activeId])

  return <div ref={box} className={className} />
}
