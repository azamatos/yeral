import { Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { TagChip, tagChipVariants } from '../chip'

// locale-independent on purpose: under Turkish casing `VIP`.toLocaleLowerCase() is `vıp`
const same = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase()

export type TagEditorLabels = {
  /** «Add tag» on the dashed chip. */
  add: string
  /** The field's name and placeholder: «Tag name». */
  field: string
  /** The placeholder once a tag went on: «Add another». */
  addAnother: string
  /** The ×: «Remove tag VIP». */
  remove: (tag: string) => string
  /** The last row: «Create “stud”». */
  create: (text: string) => string
  /** «Already added». */
  duplicate: string
  /** «20 characters at most». */
  tooLong: string
  /** The suggestions list's name: «Tags». */
  suggestions: string
}

export type TagEditorProps = {
  /** The team's own tags on the item, in their order. */
  value: readonly string[]
  /** Called once per tag, on Enter or a click on a suggestion — save it at once; there is no form Save. */
  onAdd: (tag: string) => void
  /** Called by the × (or Backspace on it) — remove at once and offer Undo in a toast. */
  onRemove: (tag: string) => void
  /** The business's tags by how often they're used; those on the item are left out. */
  suggestions?: readonly { tag: string; count?: number }[]
  /** What goes before the own tags: the automatic ones (outlined TagChips, never removable). */
  before?: ReactNode
  /** Typing stops here and a line says why. */
  maxLength: number
  /** At this many own tags the «+ Add tag» chip goes. */
  maxTags?: number
  /** Without the right to change tags: chips without × and no «+ Add tag». */
  readOnly?: boolean
  /** The field opened or closed (load the suggestions only when it opens). */
  onOpenChange?: (open: boolean) => void
  labels: TagEditorLabels
  className?: string
  'aria-label'?: string
}

/**
 * TagEditor — DS-Lists A8 «Tags are edited in place» (v0.7, Storybook Inputs/TagEditor). Your tags are TagChips with a
 * ×; «+ Add tag» is a dashed chip that turns into a field of the same height with a list of the business's tags (with
 * counts; the item's own are left out) filtered as you type, the first match highlighted and «Create “…”» last. Enter
 * saves at once and the field stays open for the next tag; the new chip glows for a moment. A duplicate (any case)
 * isn't saved: «Already added» and the existing chip lights up. Backspace in the empty field moves to the last chip's ×;
 * Backspace there removes it. Esc or a click away closes the field. Composed from TagChip (rule 10a: no tag library).
 */
export function TagEditor({
  value,
  onAdd,
  onRemove,
  suggestions = [],
  before,
  maxLength,
  maxTags,
  readOnly,
  onOpenChange,
  labels,
  className,
  'aria-label': ariaLabel,
}: TagEditorProps) {
  const [open, setOpenState] = useState(false)
  const [draft, setDraft] = useState('')
  const [active, setActive] = useState(-1)
  const [glow, setGlow] = useState<string | null>(null)
  const [dup, setDup] = useState<string | null>(null)
  const [added, setAdded] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const addRef = useRef<HTMLButtonElement>(null)
  const wasOpen = useRef(false)
  // Esc gives the focus back to the dashed chip; a click away leaves it where it went
  const refocus = useRef(false)
  const listId = useId()
  const noteId = useId()

  const setOpen = (next: boolean) => {
    setOpenState(next)
    onOpenChange?.(next)
    if (!next) {
      setDraft('')
      setDup(null)
      setAdded(false)
      setActive(-1)
    }
  }

  // the field and the dashed chip take turns in one place: focus follows whichever has just mounted
  useEffect(() => {
    if (open) inputRef.current?.focus()
    else if (wasOpen.current && refocus.current) {
      refocus.current = false
      addRef.current?.focus()
    }
    wasOpen.current = open
  }, [open])

  useEffect(() => {
    if (!glow) return
    const timer = setTimeout(() => setGlow(null), 1500)
    return () => clearTimeout(timer)
  }, [glow])

  const q = draft.trim()
  const options = suggestions.filter((s) => !value.some((v) => same(v, s.tag)) && (!q || s.tag.toLowerCase().includes(q.toLowerCase())))
  const exact = options.some((s) => same(s.tag, q)) || value.some((v) => same(v, q))
  const rows = [
    ...options.map((s) => ({ tag: s.tag, count: s.count, create: false })),
    ...(q && !exact ? [{ tag: q, count: undefined, create: true }] : []),
  ]
  const tooLong = draft.length >= maxLength
  const full = maxTags !== undefined && value.length >= maxTags

  const pick = (tag: string) => {
    const known = value.find((v) => same(v, tag))
    if (known) {
      setDup(known)
      setGlow(known)
      return
    }
    onAdd(tag)
    setGlow(tag)
    setDraft('')
    setDup(null)
    setActive(-1)
    setAdded(true)
    if (maxTags !== undefined && value.length + 1 >= maxTags) setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const row = rows[active]
      if (row) pick(row.tag)
      else if (q) pick(q)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      refocus.current = true
      setOpen(false)
    } else if (e.key === 'ArrowDown' && rows.length) {
      e.preventDefault()
      setActive((i) => (i + 1) % rows.length)
    } else if (e.key === 'ArrowUp' && rows.length) {
      e.preventDefault()
      setActive((i) => (i <= 0 ? rows.length - 1 : i - 1))
    } else if (e.key === 'Backspace' && !draft) {
      const xs = rootRef.current?.querySelectorAll<HTMLButtonElement>('[data-tag] button')
      const last = xs?.[xs.length - 1]
      if (last) {
        e.preventDefault()
        last.focus()
      }
    }
  }

  // Backspace or Delete on a chip's × removes that tag
  const onChipKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Backspace' && e.key !== 'Delete') return
    const tag = (e.target as HTMLElement).closest<HTMLElement>('[data-tag]')?.dataset.tag
    if (!tag || (e.target as HTMLElement).tagName !== 'BUTTON') return
    e.preventDefault()
    onRemove(tag)
  }

  const onBlur = (e: FocusEvent<HTMLSpanElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false)
  }

  return (
    <div
      ref={rootRef}
      role="group"
      aria-label={ariaLabel}
      onKeyDown={onChipKey}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
    >
      {before}
      {value.map((tag) => (
        <TagChip
          key={tag}
          data-tag={tag}
          highlight={glow !== null && same(glow, tag)}
          onRemove={readOnly ? undefined : () => onRemove(tag)}
          removeLabel={labels.remove(tag)}
        >
          {tag}
        </TagChip>
      ))}
      {readOnly ? null : open ? (
        <span className="relative inline-flex flex-col" onBlur={onBlur}>
          <input
            ref={inputRef}
            role="combobox"
            aria-label={labels.field}
            aria-expanded={rows.length > 0}
            aria-controls={rows.length ? listId : undefined}
            aria-autocomplete="list"
            aria-activedescendant={rows[active] ? `${listId}-${active}` : undefined}
            aria-describedby={dup || tooLong ? noteId : undefined}
            placeholder={added ? labels.addAnother : labels.field}
            maxLength={maxLength}
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value)
              setDup(null)
              setActive(e.target.value.trim() ? 0 : -1)
            }}
            onKeyDown={onKeyDown}
            className="h-7 w-44 rounded-pill border border-a-500 bg-n-0 px-2.5 text-[13px] leading-4 text-n-900 shadow-input-focus outline-none placeholder:text-n-500"
          />
          {(dup || tooLong) && (
            <span id={noteId} className="absolute top-full left-2.5 mt-1 text-micro whitespace-nowrap text-n-600">
              {dup ? labels.duplicate : labels.tooLong}
            </span>
          )}
          {rows.length > 0 && (
            <ul
              id={listId}
              role="listbox"
              aria-label={labels.suggestions}
              className={cn(
                'rounded-m absolute top-full left-0 z-30 m-0 max-h-72 w-64 list-none overflow-auto bg-n-0 p-1 shadow-raised',
                dup || tooLong ? 'mt-6' : 'mt-1',
              )}
            >
              {rows.map((row, i) => (
                <li
                  key={`${row.create ? 'new:' : ''}${row.tag}`}
                  id={`${listId}-${i}`}
                  role="option"
                  aria-selected={i === active}
                  // keep the focus in the field: the click picks, the field stays open
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => pick(row.tag)}
                  onMouseMove={() => setActive(i)}
                  className={cn(
                    'flex h-9 cursor-pointer items-center gap-2 rounded-sm px-2.5 text-small text-n-900',
                    i === active && 'bg-n-50',
                    row.create && 'text-a-600',
                  )}
                >
                  {row.create && <Plus aria-hidden className="size-4 shrink-0" strokeWidth={1.75} />}
                  <span className="min-w-0 flex-1 truncate">{row.create ? labels.create(row.tag) : row.tag}</span>
                  {row.count !== undefined && <span className="text-micro text-n-500 tabular-nums">{row.count}</span>}
                </li>
              ))}
            </ul>
          )}
        </span>
      ) : (
        !full && (
          <button
            ref={addRef}
            type="button"
            onClick={() => setOpen(true)}
            className={cn(
              tagChipVariants(),
              'cursor-pointer border-dashed border-n-300 bg-n-0 pl-2 text-n-600 hover:border-n-400 hover:bg-n-50 hover:text-n-900 focus-visible:shadow-focus focus-visible:outline-none [&_svg]:text-current',
            )}
          >
            <Plus aria-hidden strokeWidth={1.75} />
            {labels.add}
          </button>
        )
      )}
    </div>
  )
}
