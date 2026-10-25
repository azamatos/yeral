import { GripVertical, ImageOff, Plus, X } from 'lucide-react'
import { useEffect, useId, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { cn } from '../../lib/cn'
import { Spinner } from '../spinner'

export interface PhotoGridPhoto {
  id: string
  src: string
  /** What tells the photo apart, for its controls' names: «Remove photo: Photo 2». */
  name: string
}

/** A file on its way (uploading) or refused before it was sent (bad: too big, not a photo). */
export type PhotoGridPending =
  | { id: string; name: string; state: 'uploading' }
  | { id: string; name: string; state: 'bad'; /** On the tile: «Too big · 14 MB». */ tile: string }

export interface PhotoGridWords {
  /** The first photo's chip: «Cover photo». */
  cover: string
  /** The other photos' button, «Make cover», and its name for screen readers: «Make cover: Photo 2». */
  makeCover: string
  makeCoverOf: (name: string) => string
  remove: (name: string) => string
  /** The drag handle: «Move: Photo 2» (Space picks it up, ←/→ move it, Space puts it down, Esc cancels). */
  move: (name: string) => string
  /** Said while moving: «Photo 2, 3 of 5». */
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
  /** A change is on its way: the photos' controls wait (they keep the focus, they just do nothing). */
  busy?: boolean
  /** The order can't change now (files on their way): no moving, no «Make cover». */
  locked?: boolean
  onAdd: (files: File[]) => void
  onRemove: (id: string) => void
  /** Every photo once, in the new order; the first is the cover («Make cover», a drag, the keyboard). */
  onReorder: (ids: string[]) => void
  onDismiss: (id: string) => void
  words: PhotoGridWords
  className?: string
}

const CONTROL =
  'absolute inline-flex size-7 items-center justify-center rounded-input border-0 bg-n-0 p-0 text-n-900 shadow-control focus-visible:shadow-focus focus-visible:outline-none aria-disabled:cursor-default aria-disabled:text-n-500'

const moveTo = (from: readonly string[], id: string, to: number) => {
  const rest = from.filter((x) => x !== id)
  return [...rest.slice(0, to), id, ...rest.slice(to)]
}

/**
 * PhotoManager (DS-Business «PhotoManager», B-Settings `.phg`): squares r12 in a grid (104 at least, 12 apart). The
 * first photo is the cover (an ink chip); the others have «Make cover». Each has remove (top right) and a handle (top
 * left) that drags it, or with the keyboard: Space picks it up, ←/→ move it, Space puts it down, Esc puts it back,
 * each step said. After «Make cover» the focus stays on that photo; after a removal it goes to the next one (else the
 * add tile). Files on their way show a spinner; refused ones a dashed danger tile with dismiss; the add tile takes one
 * file or several. Every word comes from `words`.
 */
export function PhotoGrid({
  photos,
  pending = [],
  canAdd,
  accept,
  busy = false,
  locked = false,
  onAdd,
  onRemove,
  onReorder,
  onDismiss,
  words,
  className,
}: PhotoGridProps) {
  const inputId = useId()
  // the lifted photo and where it is now; the others keep their order as the photos change meanwhile
  const [lifted, setLifted] = useState<{ id: string; at: number } | null>(null)
  const [dragged, setDragged] = useState<string | null>(null)
  const [said, setSaid] = useState('')
  const handles = useRef(new Map<string, HTMLButtonElement>())
  const addInput = useRef<HTMLInputElement>(null)
  const ids = photos.map((p) => p.id)
  // where the focus goes once the photos have changed (the api's answer): a photo's handle, or the add tile
  const focusNext = useRef<{ to: { photo: string } | 'add'; while: string } | null>(null)
  const focusAfterChange = (to: { photo: string } | 'add') => (focusNext.current = { to, while: ids.join() })
  const focusHandle = (id: string) => requestAnimationFrame(() => handles.current.get(id)?.focus())
  const liftedHere = lifted && ids.includes(lifted.id) ? lifted : null
  const order = liftedHere ? moveTo(ids, liftedHere.id, Math.min(liftedHere.at, ids.length - 1)) : ids
  const byId = new Map(photos.map((p) => [p.id, p]))
  const shown = order.flatMap((id) => byId.get(id) ?? [])
  const nameOf = (id: string) => byId.get(id)?.name ?? ''
  const canMove = !busy && !locked

  useEffect(() => {
    const want = focusNext.current
    if (!want || ids.join() === want.while) return
    focusNext.current = null
    if (want.to === 'add') addInput.current?.focus()
    else handles.current.get(want.to.photo)?.focus()
  })

  const onHandleKey = (event: KeyboardEvent<HTMLButtonElement>, id: string) => {
    const at = order.indexOf(id)
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      if (!liftedHere) {
        if (!canMove) return
        setLifted({ id, at })
        setSaid(words.position(nameOf(id), at + 1, ids.length))
      } else {
        setLifted(null)
        setSaid(words.dropped(nameOf(id), at + 1, order.length))
        if (order.join() !== ids.join()) onReorder(order)
      }
    } else if (liftedHere && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
      event.preventDefault()
      const to = Math.min(order.length - 1, Math.max(0, at + (event.key === 'ArrowLeft' ? -1 : 1)))
      if (to === at) return
      setLifted({ id, at: to })
      setSaid(words.position(nameOf(id), to + 1, order.length))
      // the handle moved with its tile: it keeps the focus
      focusHandle(id)
    } else if (liftedHere && event.key === 'Escape') {
      event.preventDefault()
      setLifted(null)
      setSaid(words.cancelled(nameOf(id)))
      focusHandle(id)
    }
  }

  const onDrop = (event: DragEvent, target: string) => {
    event.preventDefault()
    const id = dragged
    setDragged(null)
    if (!id || id === target || !canMove) return
    onReorder(moveTo(ids, id, ids.indexOf(target)))
  }

  const removeAt = (id: string) => {
    if (busy) return
    const at = ids.indexOf(id)
    const next = ids[at + 1] ?? ids[at - 1]
    focusAfterChange(next ? { photo: next } : 'add')
    onRemove(id)
  }

  return (
    <div className={cn('flex flex-col', className)}>
      <ul role="list" className="m-0 grid list-none grid-cols-[repeat(auto-fill,minmax(min(104px,100%),1fr))] gap-3 p-0">
        {shown.map((photo, index) => {
          const isLifted = liftedHere?.id === photo.id || dragged === photo.id
          return (
            <li
              key={photo.id}
              draggable={canMove && !liftedHere}
              onDragStart={(e) => {
                setDragged(photo.id)
                e.dataTransfer.effectAllowed = 'move'
                // Firefox starts a drag only with something to carry
                e.dataTransfer.setData('text/plain', photo.id)
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
                aria-pressed={liftedHere?.id === photo.id}
                aria-disabled={!canMove && liftedHere?.id !== photo.id ? true : undefined}
                onKeyDown={(e) => onHandleKey(e, photo.id)}
                onBlur={() => liftedHere?.id === photo.id && setLifted(null)}
                className={cn(CONTROL, 'top-1.5 left-1.5 cursor-grab')}
              >
                <GripVertical aria-hidden className="size-4" />
              </button>
              <button
                type="button"
                aria-label={words.remove(photo.name)}
                aria-disabled={busy || !!liftedHere ? true : undefined}
                onClick={() => !liftedHere && removeAt(photo.id)}
                className={cn(CONTROL, 'top-1.5 right-1.5 cursor-pointer')}
              >
                <X aria-hidden className="size-4" />
              </button>
              {index === 0 ? (
                // a longer language's words wrap inside the tile rather than past it
                <span className="absolute bottom-1.5 left-1.5 inline-flex min-h-6 max-w-[calc(100%-0.75rem)] items-center rounded-pill bg-ink-btn px-2 py-0.5 text-micro font-semibold [overflow-wrap:anywhere] text-white">
                  {words.cover}
                </span>
              ) : (
                <button
                  type="button"
                  aria-label={words.makeCoverOf(photo.name)}
                  aria-disabled={!canMove || !!liftedHere ? true : undefined}
                  onClick={() => {
                    if (!canMove || liftedHere) return
                    // the button becomes the cover chip: the focus stays on the photo, on its handle
                    focusAfterChange({ photo: photo.id })
                    onReorder(moveTo(ids, photo.id, 0))
                  }}
                  className="absolute bottom-1.5 left-1.5 min-h-7 max-w-[calc(100%-0.75rem)] cursor-pointer rounded-pill border-0 bg-n-0 px-2.5 py-1 text-left text-micro font-semibold [overflow-wrap:anywhere] text-n-900 shadow-control focus-visible:shadow-focus focus-visible:outline-none aria-disabled:cursor-default aria-disabled:text-n-500"
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
              className="relative m-0 flex aspect-square flex-col items-center justify-center gap-2 overflow-hidden rounded-m border-[1.5px] border-dashed border-error bg-n-0 p-3 text-center text-micro font-semibold [overflow-wrap:anywhere] text-danger-ink"
            >
              <ImageOff aria-hidden className="size-5.5" />
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
              className="flex size-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-m border-[1.5px] border-dashed border-n-300 bg-n-0 p-2 text-center text-dense font-semibold text-a-600 hover:bg-n-50 has-focus-visible:shadow-focus"
            >
              <Plus aria-hidden className="size-5.5" />
              <span>{words.add}</span>
              <input
                ref={addInput}
                id={inputId}
                type="file"
                accept={accept}
                multiple
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
