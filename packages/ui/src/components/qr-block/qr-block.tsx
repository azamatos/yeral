import { Download } from 'lucide-react'
import { generate } from 'lean-qr'
import { toSvgPath, toSvgSource } from 'lean-qr/extras/svg'
import { useMemo, useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'

/** The quiet zone on screen, in modules (the board's 2: the card's white padding goes on around it). */
const QUIET_SCREEN = 2
/** The quiet zone in a downloaded file (ISO 18004's 4): it may be placed edge to edge on a coloured poster. */
const QUIET_FILE = 4
/** Ink on white: n-900 and n-0 written out, because a downloaded file carries no CSS. */
const INK = '#101014'
const PAPER = '#ffffff'
/** A downloaded PNG is at least this wide, so it prints sharp on a sticker or an A4 sign. */
const PNG_MIN_PX = 1200

export type QrFormat = 'PNG' | 'SVG'

function hand(href: string, fileName: string) {
  const link = document.createElement('a')
  link.href = href
  link.download = fileName
  link.click()
}

function download(value: string, format: QrFormat, fileName: string) {
  const code = generate(value)
  const side = code.size + QUIET_FILE * 2
  if (format === 'PNG') {
    const scale = Math.ceil(PNG_MIN_PX / side)
    hand(code.toDataURL({ type: 'image/png', scale, pad: QUIET_FILE, on: [16, 16, 20, 255], off: [255, 255, 255, 255] }), `${fileName}.png`)
    return
  }
  const source = toSvgSource(code, { on: INK, off: PAPER, pad: QUIET_FILE, scale: 10, xmlDeclaration: true })
  const url = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }))
  hand(url, `${fileName}.svg`)
  // the click has handed the file to the browser; the address can go on the next turn
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/** The code alone: a square with the 2-module quiet zone, crisp at any size, named for screen readers. */
export function QrCode({ value, label, px, className }: { value: string; label: string; px: number; className?: string }) {
  const { side, d } = useMemo(() => {
    const code = generate(value)
    return { side: code.size + QUIET_SCREEN * 2, d: toSvgPath(code) }
  }, [value])
  return (
    <svg
      role="img"
      aria-label={label}
      width={px}
      height={px}
      viewBox={`${-QUIET_SCREEN} ${-QUIET_SCREEN} ${side} ${side}`}
      shapeRendering="crispEdges"
      className={cn('block shrink-0', className)}
    >
      <rect x={-QUIET_SCREEN} y={-QUIET_SCREEN} width={side} height={side} fill={PAPER} />
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
 * the browser from `value` (lean-qr; ink on white, crisp edges) with «Download PNG» and «Download SVG». On screen the
 * code keeps the board's 2-module quiet zone; the files get 4 and the PNG is at least 1200 px, for printing. Each
 * download is said in a status line, which clears when the code changes.
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
  // tied to the code it was for: a new `value` clears the line
  const [downloaded, setDownloaded] = useState<{ format: QrFormat; value: string } | null>(null)

  const save = (format: QrFormat) => {
    download(value, format, fileName)
    // cleared first, so a second download of the same file is said again
    setDownloaded(null)
    requestAnimationFrame(() => setDownloaded({ format, value }))
    onDownload?.(format)
  }

  const actions = (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="s" onClick={() => save('PNG')}>
          <Download aria-hidden />
          {copy.downloadPng}
        </Button>
        <Button size="s" onClick={() => save('SVG')}>
          <Download aria-hidden />
          {copy.downloadSvg}
        </Button>
      </div>
      {caption ? <span className="text-dense text-n-600">{caption}</span> : null}
      {/* in the accessibility tree while empty (sr-only, not hidden), so the first download is said too */}
      <span role="status" className="text-dense text-n-600 empty:sr-only">
        {downloaded?.value === value ? copy.downloaded(downloaded.format) : null}
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
