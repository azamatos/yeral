import { CircleAlert, GripVertical, ImagePlus, X } from 'lucide-react'
import { useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from '../spinner'

export interface PhotoGridPhoto {
  id: string
  src: string
  /** What the photo shows, for its controls' names: «Remove photo: Salon hall». */
  name: string
}

/** A file on its way (uploading) or refused before it was sent (bad: too big, not a photo). */
export type PhotoGridPending =
  | { id: string; name: string; state: 'uploading' }
  | { id: string; name: string; state: 'bad'; /** On the tile: «Too big · 14 MB». */ tile: string }

export interface PhotoGridWords {
  /** The first photo's chip: «Cover photo». */
  cover: string
  /** The other photos' button, «Make cover», and its name for screen readers: «Make cover: Salon hall». */
  makeCover: string
  makeCoverOf: (name: string) => string
  remove: (name: string) => string
  /** The drag handle: «Move: Salon hall» (Space picks it up, ←/→ move it, Space puts it down, Esc cancels). */
  move: (name: string) => string
  /** Said while moving: «Salon hall, 2 of 5». */
  position: (name: string, at: number, total: number) => string
  /** Said when put down or cancelled. */
  dropped: (name: string, at: number, total: number) => string
  cancelled: (name: string) => string
  uploading: string
  /** The uploading tile's name: «Uploading salon-hall.jpg». */
  uploadingLabel: (name: string) => string
  dismiss: (name: string) => string
  add: string
}

export interface PhotoGridProps {
  photos: readonly PhotoGridPhoto[]
  pending?: readonly PhotoGridPending[]
  /** Room for more (fewer than 20): the add tile shows. */
  canAdd: boolean
  /** The file types the add tile offers: `image/jpeg,image/png,image/webp`. */
  accept: string
  /** A change is on its way: the controls wait. */
  disabled?: boolean
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  /** Every photo once, in the new order; the first is the cover («Make cover», a drag, the keyboard). */
  onReorder: (ids: string[]) => void
  onDismiss: (id: string) => void
  words: PhotoGridWords
  className?: string
}

const CONTROL =
  'absolute inline-flex size-7 items-center justify-center rounded-input border-0 bg-n-0 p-0 text-n-900 shadow-control focus-visible:shadow-focus focus-visible:outline-none disabled:cursor-default'

/**
 * PhotoManager (DS-Business «PhotoManager», B-Settings `.phg`): squares r12 in a grid (104 at least, 12 apart). The
 * first photo is the cover (an ink chip); the others have «Make cover». Each has remove (top right) and a handle (top
 * left) that drags it, or with the keyboard: Space picks it up, ←/→ move it, Space puts it down, Esc puts it back,
 * each step said. Files on their way show a spinner; refused ones a dashed danger tile with dismiss; the add tile takes
 * one file or several. Every word comes from `words`.
 */
export function PhotoGrid({
  photos,
  pending = [],
  canAdd,
  accept,
  disabled = false,
  onAdd,
  onRemove,
  onReorder,
  onDismiss,
  words,
  className,
}: PhotoGridProps) {
  const inputId = useId()
  const [lifted, setLifted] = useState<{ id: string; order: string[] } | null>(null)
  const [dragged, setDragged] = useState<string | null>(null)
  const [said, setSaid] = useState('')
  const handles = useRef(new Map<string, HTMLButtonElement>())
  const ids = photos.map((p) => p.id)
  const order = lifted?.order ?? ids
  const byId = new Map(photos.map((p) => [p.id, p]))
  const shown = order.flatMap((id) => byId.get(id) ?? [])

  const move = (from: string[], id: string, to: number) => {
    const rest = from.filter((x) => x !== id)
    return [...rest.slice(0, to), id, ...rest.slice(to)]
  }
  const nameOf = (id: string) => byId.get(id)?.name ?? ''

  const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const at = order.indexOf(id)
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (!lifted) {
        setLifted({ id, order: ids })
        setSaid(words.position(nameOf(id), at + 1, ids.length))
      } else {
        setLifted(null)
        setSaid(words.dropped(nameOf(id), at + 1, order.length))
        if (order.join() !== ids.join()) onReorder(order)
      }
    } else if (lifted && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault()
      const to = Math.min(order.length - 1, Math.max(0, at + (event.key === 'ArrowLeft' ? -1 : 1)))
      if (to === at) return
      setLifted({ id, order: move(order, id, to) })
      setSaid(words.position(nameOf(id), to + 1, order.length))
      // the handle moved with its tile: it keeps the focus
      requestAnimationFrame(() => handles.current.get(id)?.focus())
    } else if (lifted && event.key === 'Escape') {
      event.preventDefault()
      setLifted(null)
      setSaid(words.cancelled(nameOf(id)))
      requestAnimationFrame(() => handles.current.get(id)?.focus())
    }
  }

  const onDrop = (event: DragEvent, target: string) => {
    event.preventDefault()
    const id = dragged
    setDragged(null)
    if (!id || id === target) return
    onReorder(move(ids, id, ids.indexOf(target)))
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <ul role="list" className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(104px,100%),1fr))] gap-3 p-0">
        {shown.map((photo, index) => {
          const isLifted = lifted?.id === photo.id || dragged === photo.id
          return (
            <li
              key={photo.id}
              draggable={!disabled && !lifted}
              onDragStart={(e) => {
                setDragged(photo.id)
                e.dataTransfer.effectAllowed = 'move'
              }}
              onDragEnd={() => setDragged(null)}
              onDragOver={(e) => dragged && e.preventDefault()}
              onDrop={(e) => onDrop(e, photo.id)}
              className={cn(
                'relative m-0 aspect-square overflow-hidden rounded-m bg-n-100',
                isLifted && 'shadow-raised outline-2 outline-a-500',
              )}
            >
              <img src={photo.src} alt="" className="block size-full object-cover" draggable={false} />
              <button
                ref={(el) => {
                  if (el) handles.current.set(photo.id, el)
                  else handles.current.delete(photo.id)
                }}
                type="button"
                aria-label={words.move(photo.name)}
                aria-pressed={lifted?.id === photo.id}
                disabled={disabled}
                onKeyDown={(e) => onHandleKey(e, photo.id)}
                onBlur={() => lifted?.id === photo.id && setLifted(null)}
                className={cn(CONTROL, 'top-1.5 left-1.5 cursor-grab')}
              >
                <GripVertical aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label={words.remove(photo.name)}
                disabled={disabled || !!lifted}
                onClick={() => onRemove(photo.id)}
                className={cn(CONTROL, 'top-1.5 right-1.5 cursor-pointer')}
              >
                <X aria-hidden className="size-4" />
              </button>
              {index === 0 ? (
                <span className="absolute bottom-1.5 left-1.5 inline-flex h-6 items-center rounded-pill bg-ink-btn px-2 text-micro font-semibold whitespace-nowrap text-white">
                  {words.cover}
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={words.makeCoverOf(photo.name)}
                  disabled={disabled || !!lifted}
                  onClick={() => onReorder(move(ids, photo.id, 0))}
                  className="absolute bottom-1.5 left-1.5 h-7 cursor-pointer rounded-pill border-0 bg-n-0 px-2.5 text-micro font-semibold whitespace-nowrap text-n-900 shadow-control focus-visible:shadow-focus focus-visible:outline-none"
                >
                  {words.makeCover}
                </button>
              )}
            </li>
          )
        })}
        {pending.map((file) =>
          file.state === 'uploading' ? (
            <li
              key={file.id}
              aria-label={words.uploadingLabel(file.name)}
              className="relative m-0 flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-m border border-n-200 bg-n-50 p-3 text-center text-micro font-semibold text-n-900"
            >
              <Spinner aria-hidden className="size-5" />
              <span>{words.uploading}</span>
            </li>
          ) : (
            <li
              key={file.id}
              className="relative m-0 flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-m border-[1.5px] border-dashed border-danger-line bg-n-0 p-3 text-center text-micro font-semibold [overflow-wrap:anywhere] text-danger-ink"
            >
              <CircleAlert aria-hidden className="size-5" />
              <span>{file.tile}</span>
              <button
                type="button"
                aria-label={words.dismiss(file.name)}
                onClick={() => onDismiss(file.id)}
                className={cn(CONTROL, 'top-1.5 right-1.5 cursor-pointer')}
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ),
        )}
        {canAdd && (
          <li className="m-0 aspect-square">
            <label
              htmlFor={inputId}
              className={cn(
                'flex size-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-m border-[1.5px] border-dashed border-n-300 bg-n-0 p-2 text-center text-dense font-semibold text-a-600',
                'hover:bg-n-50 has-focus-visible:shadow-focus',
                disabled && 'cursor-default text-n-500',
              )}
            >
              <ImagePlus aria-hidden className="size-5" />
              <span>{words.add}</span>
              <input
                id={inputId}
                type="file"
                accept={accept}
                multiple
                disabled={disabled}
                className="sr-only"
                onChange={(e) => {
                  const files = [...(e.target.files ?? [])]
                  e.target.value = ''
                  if (files.length) onAdd(files)
                }}
              />
            </label>
          </li>
        )}
      </ul>
      <span role="status" className="sr-only">
        {said}
      </span>
    </div>
  )
}
