import { Plus } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'
import { Chip } from '../chip'
import { useField } from '../field'
import { inputClass } from '../input'
import { Pill, type PillProps } from '../pill'

const same = (a: string, b: string) => a.trim().toLocaleLowerCase() === b.trim().toLocaleLowerCase()

export type TagInputProps = Omit<ComponentProps<'div'>, 'onChange'> & {
  /** The tags to offer as toggle chips (the team's tags: VIP, Child, Student), in their order. */
  options: readonly string[]
  /** The tags that are on; one not in `options` (just added) shows as a chip too. */
  value: readonly string[]
  onChange: (value: string[]) => void
  /** Tags set by the system, shown as Pill L, not buttons («Regular», «New»). */
  automatic?: readonly { label: ReactNode; tone?: PillProps['tone'] }[]
  /** 13/18 line after the automatic tags: «“Regular” and “New” are added automatically.» */
  caption?: ReactNode
  /** Words: the «+ tag» chip, the add field's name and placeholder, the «Add» button. */
  addLabel: ReactNode
  newTagLabel: string
  addButtonLabel: ReactNode
  placeholder?: string
  disabled?: boolean
}

/**
 * TagInput — DS-Patterns → «Tag input · toggle tags + create» (Storybook Inputs/TagInput), from B-Clients' new-client
 * modal and B-Client's edit modal. Toggle chips (`aria-pressed`) for the known tags, a «+ tag» chip that opens a
 * 36-high pill field with «Add»: Enter adds, Esc cancels, the focus goes back to the chip; a tag that exists already
 * (any case) is switched on instead of added twice; automatic tags are Pill L with a caption, never buttons. Inside
 * a `Field` the group takes the field's label and `disabled`; elsewhere name it with `aria-label` or
 * `aria-labelledby`. Composed from Chip, Input, Button and Pill (rule 10a: no tag library for this).
 */
export function TagInput({
  options,
  value,
  onChange,
  automatic,
  caption,
  addLabel,
  newTagLabel,
  addButtonLabel,
  placeholder,
  disabled,
  className,
  ...props
}: TagInputProps) {
  const [adding, setAdding] = useState(false)
  const [draft, setDraft] = useState('')
  const addRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const wasAdding = useRef(false)
  const captionId = useId()
  const field = useField()
  const off = disabled ?? field?.disabled
  const chips = [...options, ...value.filter((v) => !options.some((o) => same(o, v)))]

  // the field and the «+ tag» chip take turns in the same place: focus follows whichever has just mounted
  useEffect(() => {
    if (adding) inputRef.current?.focus()
    else if (wasAdding.current) addRef.current?.focus()
    wasAdding.current = adding
  }, [adding])

  const toggle = (tag: string) => onChange(value.includes(tag) ? value.filter((v) => v !== tag) : [...value, tag])

  const close = () => {
    setAdding(false)
    setDraft('')
  }

  const add = () => {
    const tag = draft.trim()
    if (!tag) return
    const known = chips.find((c) => same(c, tag))
    if (known) {
      if (!value.includes(known)) onChange([...value, known])
    } else onChange([...value, tag])
    close()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  }

  return (
    <div
      role="group"
      aria-labelledby={field?.labelId}
      aria-describedby={caption ? captionId : undefined}
      {...props}
      className={cn('flex flex-wrap items-center gap-2', className)}
    >
      {chips.map((tag) => (
        <Chip key={tag} selected={value.includes(tag)} disabled={off} onClick={() => toggle(tag)}>
          {tag}
        </Chip>
      ))}
      {adding ? (
        <span className="inline-flex items-center gap-1.5">
          <input
            ref={inputRef}
            aria-label={newTagLabel}
            placeholder={placeholder}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKeyDown}
            className={cn(inputClass, 'h-9 w-45 rounded-pill text-small')}
          />
          <Button size="s" onClick={add}>
            {addButtonLabel}
          </Button>
        </span>
      ) : (
        <Chip ref={addRef} disabled={off} onClick={() => setAdding(true)}>
          <Plus aria-hidden />
          {addLabel}
        </Chip>
      )}
      {automatic?.map((tag, i) => (
        <Pill key={i} size="l" tone={tag.tone}>
          {tag.label}
        </Pill>
      ))}
      {caption && (
        <span id={captionId} className="text-dense text-n-600">
          {caption}
        </span>
      )}
    </div>
  )
}
