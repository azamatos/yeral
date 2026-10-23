import type { Map as MapLibreMap } from 'maplibre-gl'
import { Minus, Plus } from 'lucide-react'
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import { cn } from '../../lib/cn'
import { fromScreen, toScreen, type LatLng, type MapView } from './projection'

/** OpenFreeMap's light style (techContext: MapLibre with OpenFreeMap tiles; self-hosted tiles on the own server later). */
export const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/positron'

const TilesContext = createContext<string | null>(OPENFREEMAP_STYLE)

/**
 * Where every MapFrame inside takes its tiles from: a MapLibre style's address, or `null` for the drawn ground only
 * (Storybook and its tests stay offline and the same on every run).
 */
export function MapTiles({ style, children }: { style: string | null; children: ReactNode }) {
  return <TilesContext value={style}>{children}</TilesContext>
}

type Frame = { view: MapView; frame: RefObject<HTMLDivElement | null> }
const FrameContext = createContext<Frame | null>(null)

function useFrame(): Frame {
  const frame = useContext(FrameContext)
  if (!frame) throw new Error('A map pin or marker goes inside <MapFrame>')
  return frame
}

const ZOOM_MIN = 3
const ZOOM_MAX = 19

function hasWebGL() {
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}

const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

export type MapFrameProps = Omit<ComponentProps<'div'>, 'children' | 'onClick'> & {
  /** Where the map looks; a new centre moves it there (a picked address). */
  center: LatLng
  zoom?: number
  /** Pins and markers: MapPinHandle, MapMarker. */
  children?: ReactNode
  /** A tap on the map, not a drag: the address step moves its pin there. */
  onMapClick?: (at: LatLng) => void
  /** Zoom buttons with their labels; none for a still preview. */
  controls?: { zoomIn: string; zoomOut: string }
  /** The veil and its prompt over a map that waits for something («Pick the address first»): no pins, no taps. */
  overlay?: ReactNode
  /** Pans and zooms with the pointer; false for a preview. */
  interactive?: boolean
}

/**
 * MapFrame (DS-Patterns → «Map block»; B-Onboarding's address step, B-Settings' address, previews): MapLibre tiles in a
 * rounded frame, the drawn ground (n-100, n-200 blocks, white roads) until they load or where WebGL or tiles aren't
 * there, pins placed over it by their position, the 40 zoom buttons in a raised group and a veil with a prompt while
 * the map waits. MapLibre loads only when a frame shows. The map itself is decorative: the pins carry the labels.
 */
export function MapFrame({
  center,
  zoom = 16,
  children,
  onMapClick,
  controls,
  overlay,
  interactive = true,
  className,
  ...props
}: MapFrameProps) {
  const style = useContext(TilesContext)
  const frame = useRef<HTMLDivElement>(null)
  const host = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [camera, setCamera] = useState({ center, zoom })
  // where MapLibre opens (again, for a new style): the last place it showed
  const start = useRef(camera)
  const [loaded, setLoaded] = useState(false)
  // a new centre from outside (a picked address) moves the map, without waiting for an effect
  const [shown, setShown] = useState(center)
  if (shown.lat !== center.lat || shown.lng !== center.lng) {
    setShown(center)
    setCamera((c) => ({ ...c, center }))
  }
  const clickRef = useRef(onMapClick)
  useEffect(() => {
    clickRef.current = overlay ? undefined : onMapClick
  })

  useEffect(() => {
    const el = frame.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setSize({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // the tiles: MapLibre, loaded on first use; the drawn ground stays where it can't run
  useEffect(() => {
    if (!style || !host.current || !hasWebGL()) return
    let gone = false
    const container = host.current
    void Promise.all([import('maplibre-gl'), import('maplibre-gl/dist/maplibre-gl.css')]).then(([{ Map }]) => {
      if (gone) return
      const m = new Map({
        container,
        style,
        center: [start.current.center.lng, start.current.center.lat],
        zoom: start.current.zoom,
        minZoom: ZOOM_MIN,
        maxZoom: ZOOM_MAX,
        interactive,
        dragRotate: false,
        pitchWithRotate: false,
        touchPitch: false,
        keyboard: false,
        attributionControl: { compact: true },
      })
      m.touchZoomRotate.disableRotation()
      // decorative: the pins carry the labels, and the canvas isn't a tab stop
      m.getCanvas().setAttribute('aria-hidden', 'true')
      m.getCanvas().tabIndex = -1
      m.on('move', () => {
        const c = m.getCenter()
        start.current = { center: { lat: c.lat, lng: c.lng }, zoom: m.getZoom() }
        setCamera(start.current)
      })
      m.on('click', (e) => clickRef.current?.({ lat: e.lngLat.lat, lng: e.lngLat.lng }))
      m.once('load', () => setLoaded(true))
      map.current = m
    })
    return () => {
      gone = true
      map.current?.remove()
      map.current = null
      setLoaded(false)
    }
  }, [style, interactive])

  useEffect(() => {
    map.current?.easeTo({ center: [shown.lng, shown.lat], duration: reducedMotion() ? 0 : 300 })
  }, [shown])

  const zoomBy = (delta: number) => {
    if (map.current) map.current.easeTo({ zoom: map.current.getZoom() + delta, duration: reducedMotion() ? 0 : 200 })
    else setCamera((c) => ({ ...c, zoom: Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, c.zoom + delta)) }))
  }

  // without tiles a tap on the drawn ground places the pin
  const tapGround = (e: MouseEvent<HTMLDivElement>) => {
    const tap = clickRef.current
    if (!tap || map.current || !frame.current) return
    const r = frame.current.getBoundingClientRect()
    tap(fromScreen({ x: e.clientX - r.left, y: e.clientY - r.top }, { ...camera, width: r.width, height: r.height }))
  }

  return (
    <div
      {...props}
      ref={frame}
      className={cn(
        'relative isolate h-45 overflow-hidden rounded-m bg-n-100 select-none',
        onMapClick && !overlay && 'cursor-crosshair',
        className,
      )}
    >
      <div ref={host} className="absolute inset-0" />
      <div
        aria-hidden
        onClick={tapGround}
        className={cn('absolute inset-0 transition-opacity duration-300', loaded && 'pointer-events-none opacity-0')}
      >
        <Ground />
      </div>
      {!overlay && size.width > 0 && <FrameContext value={{ view: { ...camera, ...size }, frame }}>{children}</FrameContext>}
      {controls && (
        <div className="absolute top-3 right-3 z-1 flex flex-col overflow-hidden rounded-m border border-n-200 bg-n-0 shadow-raised">
          <ControlButton label={controls.zoomIn} onClick={() => zoomBy(1)}>
            <Plus aria-hidden strokeWidth={2} />
          </ControlButton>
          <span aria-hidden className="h-px bg-n-200" />
          <ControlButton label={controls.zoomOut} onClick={() => zoomBy(-1)}>
            <Minus aria-hidden strokeWidth={2} />
          </ControlButton>
        </div>
      )}
      {overlay && (
        <div className="absolute inset-0 z-2 flex items-center justify-center bg-n-0/50 p-4">
          <span className="inline-flex min-h-9 items-center rounded-pill border border-n-300 bg-n-0 px-3.5 text-center text-small font-semibold text-n-900">
            {overlay}
          </span>
        </div>
      )}
    </div>
  )
}

function ControlButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-10 cursor-pointer items-center justify-center border-0 bg-n-0 p-0 text-n-900 outline-none hover:bg-group focus-visible:shadow-focus-inset [&>svg]:size-4.5"
    >
      {children}
    </button>
  )
}

/** The drawn ground with design tokens (DS-Patterns: n-100 ground, n-200 blocks, white roads), cut to the frame. */
function Ground() {
  return (
    <svg viewBox="0 0 640 320" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 block size-full">
      <rect width="640" height="320" className="fill-n-100" />
      <rect x="36" y="160" width="150" height="90" rx="16" className="fill-n-200" />
      <rect x="476" y="18" width="134" height="80" rx="16" className="fill-n-200" />
      <g className="fill-none stroke-n-0">
        <path d="M-20 118 L 660 146" strokeWidth="16" />
        <path d="M262 -20 L 236 340" strokeWidth="14" />
        <path d="M452 -20 L 474 340" strokeWidth="10" />
        <path d="M-20 42 L 660 58" strokeWidth="6" />
        <path d="M-20 222 L 660 206" strokeWidth="6" />
        <path d="M-20 286 L 660 272" strokeWidth="6" />
        <path d="M104 -20 L 88 340" strokeWidth="6" />
        <path d="M360 -20 L 352 340" strokeWidth="6" />
        <path d="M578 -20 L 598 340" strokeWidth="6" />
      </g>
    </svg>
  )
}

const STEP = 8

/**
 * The pin a person moves (B-Onboarding, B-Settings: the 36 × 46 a-500 drop with a white ring and its shadow dot), or
 * with `area` the approximate circle a home-based business shows (150, a-500 at 14 % inside a 45 % line). Drag it, or
 * focus it and move it with the arrow keys (Shift for bigger steps); `onMove` gets the place under its tip.
 */
export function MapPinHandle({
  at,
  onMove,
  label,
  area = false,
}: {
  at: LatLng
  onMove: (at: LatLng) => void
  /** «Pin on the map. Move it with the arrow keys». */
  label: string
  area?: boolean
}) {
  const { view, frame } = useFrame()
  const drag = useRef<{ dx: number; dy: number } | null>(null)
  const p = toScreen(at, view)

  const moveTo = (x: number, y: number) =>
    onMove(fromScreen({ x: Math.min(view.width, Math.max(0, x)), y: Math.min(view.height, Math.max(0, y)) }, view))

  return (
    <>
      {!area && (
        <span
          aria-hidden
          className="pointer-events-none absolute z-1 h-1.5 w-3.5 -translate-1/2 rounded-pill bg-n-900/22"
          style={{ left: p.x, top: p.y }}
        />
      )}
      <button
        type="button"
        aria-label={label}
        className={cn(
          'absolute z-1 cursor-grab touch-none border-0 p-0 outline-none active:cursor-grabbing',
          area
            ? 'size-37.5 -translate-1/2 rounded-pill border-[1.5px] border-solid border-a-500/45 bg-a-500/14 focus-visible:shadow-focus'
            : 'flex h-11.5 w-10 -translate-x-1/2 -translate-y-full items-start justify-center rounded-m bg-transparent drop-shadow-[0_4px_6px_rgba(16,16,20,0.28)] focus-visible:shadow-focus',
        )}
        style={{ left: p.x, top: p.y }}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          const r = frame.current?.getBoundingClientRect()
          if (!r) return
          e.preventDefault()
          e.currentTarget.focus()
          e.currentTarget.setPointerCapture(e.pointerId)
          drag.current = { dx: e.clientX - r.left - p.x, dy: e.clientY - r.top - p.y }
        }}
        onPointerMove={(e) => {
          const r = frame.current?.getBoundingClientRect()
          if (!drag.current || !r) return
          moveTo(e.clientX - r.left - drag.current.dx, e.clientY - r.top - drag.current.dy)
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
          if (!d) return
          e.preventDefault()
          const step = e.shiftKey ? STEP * 4 : STEP
          moveTo(p.x + d[0]! * step, p.y + d[1]! * step)
        }}
      >
        {!area && (
          <svg width="36" height="46" viewBox="0 0 36 46" aria-hidden>
            <path
              d="M18 44.5S3 30.6 3 18.5C3 9.94 9.72 3 18 3s15 6.94 15 15.5C33 30.6 18 44.5 18 44.5z"
              className="fill-a-500 stroke-n-0"
              strokeWidth="2.5"
            />
            <circle cx="18" cy="18" r="6" className="fill-n-0" />
          </svg>
        )}
      </button>
    </>
  )
}

/** Puts its children at a place on the map: a MapPin, a MapDot. */
export function MapMarker({ at, children }: { at: LatLng; children: ReactNode }) {
  const { view } = useFrame()
  const p = toScreen(at, view)
  return (
    <span className="absolute z-1 size-0" style={{ left: p.x, top: p.y }}>
      {children}
    </span>
  )
}

/**
 * A pill pin above its place (DS-Patterns `.y-mpin`): 30 high, white with an n-300 line and the control shadow; `hot`
 * is ink and raised (the business on a preview, the chosen time on results).
 */
export function MapPin({ hot = false, className, ...props }: ComponentProps<'span'> & { hot?: boolean }) {
  return (
    <span
      {...props}
      className={cn(
        'absolute bottom-0 left-0 inline-flex h-7.5 -translate-x-1/2 items-center rounded-pill border px-2.5 text-dense font-bold whitespace-nowrap',
        hot ? 'z-2 border-n-900 bg-n-900 text-n-0 shadow-raised' : 'border-n-300 bg-n-0 text-n-900 shadow-control',
        className,
      )}
    />
  )
}

/** The ink dot on the exact place, under a raised pin (DS-Patterns `.y-mdot`: 12, a 2 px white ring). */
export function MapDot({ className, ...props }: ComponentProps<'span'>) {
  return (
    <span
      aria-hidden
      {...props}
      className={cn('absolute -top-1.5 -left-1.5 size-3 rounded-pill border-2 border-n-0 bg-n-900', className)}
    />
  )
}
