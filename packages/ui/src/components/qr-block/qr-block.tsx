import { Download } from 'lucide-react'
import { generate } from 'lean-qr'
import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'

/** The quiet zone around the code, in modules (the board's 2; scanners need some white around the code). */
const QUIET = 2
/** Ink on white: n-900 and n-0 written out, because a downloaded file carries no CSS. */
const INK = '#101014'
const PAPER = '#ffffff'
/** A downloaded PNG is at least this wide, so it prints sharp on a sticker or an A4 sign. */
const PNG_MIN_PX = 1200

export type QrFormat = 'PNG' | 'SVG'

/**
 * The code's modules as one SVG path, a run of dark modules per `h` segment (as the board draws it), with the quiet
 * zone counted in: `size` is the side of the whole square in modules.
 */
export function qrPath(value: string) {
  const code = generate(value)
  const size = code.size + QUIET * 2
  let d = ''
  for (let y = 0; y < code.size; y++) {
    for (let x = 0; x < code.size;) {
      if (!code.get(x, y)) {
        x++
        continue
      }
      let run = 1
      while (x + run < code.size && code.get(x + run, y)) run++
      d += `M${x + QUIET} ${y + QUIET}h${run}v1h-${run}z`
      x += run
    }
  }
  return { size, d }
}

function svgSource(size: number, d: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size * 10}" height="${size * 10}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="${PAPER}"/><path d="${d}" fill="${INK}"/></svg>\n`
}

function pngBlob(size: number, d: string): Promise<Blob | null> {
  const scale = Math.ceil(PNG_MIN_PX / size)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size * scale
  const context = canvas.getContext('2d')
  if (!context) return Promise.resolve(null)
  context.fillStyle = PAPER
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.scale(scale, scale)
  context.fillStyle = INK
  context.fill(new Path2D(d))
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
}

function save(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  // the click has handed the file to the browser; the address can go on the next turn
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** The code alone: a square, crisp at any size, named for screen readers. */
export function QrCode({ value, label, px, className }: { value: string; label: string; px: number; className?: string }) {
  const { size, d } = useMemo(() => qrPath(value), [value])
  return (
    <svg
      role="img"
      aria-label={label}
      width={px}
      height={px}
      viewBox={`0 0 ${size} ${size}`}
      shapeRendering="crispEdges"
      className={cn('block shrink-0', className)}
    >
      <rect width={size} height={size} fill={PAPER} />
      <path d={d} fill={INK} />
    </svg>
  )
}

export type QrBlockProps = {
  /** What the code opens: the full page address. */
  value: string
  /** The code's name for screen readers: «QR code for Glow Studio's page». */
  label: string
  /** The downloaded files' name without the extension: `glow-studio-qr`. */
  fileName: string
  /** `card`: the code at 200 with the name, link and hint (B-Settings Link and QR); `compact`: 120 in a box (a wizard step). */
  variant?: 'card' | 'compact'
  /** Card only: the business name over the link. */
  title?: ReactNode
  /** Card only: the link as people read it, `yeral.app/b/glow-studio`. */
  link?: ReactNode
  /** Card only: the line under them, «Put it by the till — clients open it on their phone». */
  description?: ReactNode
  /** The note under the buttons, «PNG for printing, SVG for designers.». */
  caption?: ReactNode
  copy: {
    downloadPng: string
    downloadSvg: string
    /** The status line after a download: «QR code downloaded (PNG)». */
    downloaded: (format: QrFormat) => string
  }
  /** After a file was handed to the browser. */
  onDownload?: (format: QrFormat) => void
  className?: string
}

/**
 * QrBlock (DS-Patterns → «QR block»; B-Settings Link and QR, B-Onboarding's last step): the page's QR code drawn in
 * the browser from `value` (ink on white, a 2-module quiet zone, crisp edges) with «Download PNG» and «Download SVG».
 * The PNG is at least 1200 px for printing, the SVG scales for designers. A download says so in a status line.
 */
export function QrBlock({
  value,
  label,
  fileName,
  variant = 'card',
  title,
  link,
  description,
  caption,
  copy,
  onDownload,
  className,
}: QrBlockProps) {
  const [downloaded, setDownloaded] = useState<QrFormat | null>(null)
  const { size, d } = useMemo(() => qrPath(value), [value])

  const download = async (format: QrFormat) => {
    const blob = format === 'SVG' ? new Blob([svgSource(size, d)], { type: 'image/svg+xml' }) : await pngBlob(size, d)
    if (!blob) return
    save(blob, `${fileName}.${format.toLowerCase()}`)
    setDownloaded(format)
    onDownload?.(format)
  }

  const actions = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="s" onClick={() => void download('PNG')}>
          <Download aria-hidden />
          {copy.downloadPng}
        </Button>
        <Button size="s" onClick={() => void download('SVG')}>
          <Download aria-hidden />
          {copy.downloadSvg}
        </Button>
      </div>
      {caption ? <span className="text-dense text-n-600">{caption}</span> : null}
      <span role="status" className="text-dense text-n-600 empty:sr-only">
        {downloaded ? copy.downloaded(downloaded) : null}
      </span>
    </>
  )

  if (variant === 'compact')
    return (
      <div className={cn('flex flex-wrap items-center gap-4', className)}>
        <span className="inline-flex shrink-0 rounded-m border border-n-200 bg-n-0 p-3">
          <QrCode value={value} label={label} px={120} />
        </span>
        <div className="flex min-w-0 flex-col gap-2">{actions}</div>
      </div>
    )

  return (
    <div className={cn('flex flex-wrap items-center gap-6 rounded-card border border-n-200 p-5', className)}>
      <QrCode value={value} label={label} px={200} />
      <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-3">
        {title || link ? (
          <div className="flex flex-col gap-0.5">
            {title ? <span className="text-body font-semibold text-n-900">{title}</span> : null}
            {link ? <span className="text-dense break-all text-n-600">{link}</span> : null}
          </div>
        ) : null}
        {description ? <span className="text-small text-n-900">{description}</span> : null}
        {actions}
      </div>
    </div>
  )
}
