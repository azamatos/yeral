import { Clock } from 'lucide-react'
import { useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { FieldMessage, useField } from '../field'
import { useControlProps } from '../input'
import { fieldLabelText, OptionList, SelectLayer, useSheet, type SelectOption, type SelectSize } from '../select'
import { DAY, formatTime, parseTime } from './time'

const sizes: Record<SelectSize, string> = {
  s: 'h-8 rounded-ctl-s px-3 text-ctl-s',
  m: 'h-10 rounded-ctl-m px-3 text-ctl-m',
  l: 'h-12 rounded-ctl-l px-3.5 text-ctl-l',
}
const clockPad: Record<SelectSize, string> = { s: 'pl-8', m: 'pl-9', l: 'pl-10' }

export type TimeFieldProps = Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'size' | 'min' | 'max' | 'step' | 'type' | 'title'> & {
  /** Minutes from midnight; `null` is empty. 1440 reads «24:00» (a closing time, with `max` at 1440). */
  value: number | null
  onValueChange: (minutes: number) => void
  /** The earliest and latest time the list offers and the typing accepts, in minutes (00:00 – 23:59). */
  min?: number
  max?: number
  /** Minutes between the list's rows (15). A value off the step still shows as it is. */
  step?: number
  size?: SelectSize
  invalid?: boolean
  /** Under the field while the typed text isn't a time: «Use HH:MM, for example 09:30». */
  invalidMessage?: ReactNode
  /** A clock before the time (18, n-600); the field is then 104 wide. */
  clock?: boolean
  /** The sheet's title under 768 (the field's label) and its close button's name. */
  title?: string
  closeLabel?: string
  /** On the field (the width); `wrapperClassName` on the box around it and the message. */
  wrapperClassName?: string
}

/**
 * TimeField (DS-Controls → 04 Time field · A2): HH:MM typed or picked. Typing is tidied when the field loses the
 * focus or on Enter («9» → 09:00, «930» → 09:30, «1745» → 17:45); text that isn't a time (9:75, 25:00) stays as
 * typed, the field turns invalid and `invalidMessage` shows until it's fixed. A click or ↓ opens the 15-minute list
 * (a Select list, 128 wide) scrolled to the value; typing while it's open moves the highlight («930» → 09:30), ↑ ↓ move
 * it on, Enter picks. Under 768 a tap opens the list as a bottom sheet. Inside a `<Field>` it takes the label and the
 * error; elsewhere name it with `aria-label`. It is 96 wide (`w-24`) unless `className` says otherwise.
 */
export function TimeField({
  value,
  onValueChange,
  min = 0,
  max = DAY - 1,
  step = 15,
  size = 'm',
  invalid,
  invalidMessage,
  clock,
  title,
  closeLabel,
  className,
  wrapperClassName,
  onBlur,
  onKeyDown,
  onClick,
  onPointerDown,
  id: idProp,
  ...props
}: TimeFieldProps) {
  const field = useField()
  const control = useControlProps({ ...props, id: idProp, invalid })
  const sheet = useSheet()
  const input = useRef<HTMLInputElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [text, setText] = useState(value == null ? '' : formatTime(value))
  const [shown, setShown] = useState(value)
  const [wrong, setWrong] = useState(false)
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState('')
  const [navigated, setNavigated] = useState(false)
  const [active, setActive] = useState<{ list?: string; item?: string }>({})
  const [fieldLabel, setFieldLabel] = useState<string>()
  const listLabel = title ?? props['aria-label'] ?? fieldLabel
  // a new value from outside replaces what's shown
  if (value !== shown) {
    setShown(value)
    setText(value == null ? '' : formatTime(value))
    setWrong(false)
  }
  const times: number[] = []
  for (let m = min; m <= max; m += step) times.push(m)
  if (value != null && value >= min && value <= max && !times.includes(value)) times.push(value)
  times.sort((a, b) => a - b)
  const options: SelectOption[] = times.map((m) => ({ value: String(m), label: formatTime(m) }))
  const bounds = { min, max }

  const show = (next: boolean) => {
    setOpen(next)
    if (next) {
      if (!title && !props['aria-label']) setFieldLabel(fieldLabelText(props['aria-labelledby'] ?? field?.labelId))
      setHighlight(value == null ? '' : String(value))
      setNavigated(false)
    }
  }
  const pick = (minutes: number) => {
    if (minutes !== value) onValueChange(minutes)
    setText(formatTime(minutes))
    setWrong(false)
    setOpen(false)
  }
  const commit = () => {
    const parsed = parseTime(text, bounds)
    if (parsed != null) return pick(parsed)
    if (!text.trim() && value != null) {
      setText(formatTime(value))
      setWrong(false)
    } else if (text.trim()) setWrong(true)
    setOpen(false)
  }
  const move = (by: 1 | -1) => {
    const at = options.findIndex((o) => o.value === highlight)
    const next = options[at < 0 ? (by > 0 ? 0 : options.length - 1) : Math.min(Math.max(at + by, 0), options.length - 1)]
    if (next) setHighlight(next.value)
    setNavigated(true)
  }
  // the highlighted row's id for the screen reader, read from the list once cmdk has drawn it
  useEffect(() => {
    if (!open) return
    const frame = requestAnimationFrame(() => {
      const el = list.current
      setActive({ list: el?.id, item: el?.querySelector<HTMLElement>('[cmdk-item][data-selected="true"]')?.id })
    })
    return () => cancelAnimationFrame(frame)
  }, [open, highlight])

  const invalidNow = wrong || !!control['aria-invalid']
  const messageId = `${control.id ?? 'time'}-format`
  const describedBy = [control['aria-describedby'], wrong && invalidMessage ? messageId : null].filter(Boolean).join(' ') || undefined
  const trigger = (
    <div className={cn('relative', className)}>
      {clock && (
        <Clock
          aria-hidden
          strokeWidth={1.75}
          className={cn(
            'pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-n-600',
            control.disabled && 'text-n-400',
          )}
        />
      )}
      <input
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="HH:MM"
        {...props}
        {...control}
        ref={input}
        aria-invalid={invalidNow ? true : undefined}
        aria-describedby={describedBy}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-autocomplete="none"
        aria-controls={open ? active.list : undefined}
        aria-activedescendant={open ? active.item : undefined}
        value={text}
        onChange={(e) => {
          const next = e.target.value
          setText(next)
          const parsed = parseTime(next, bounds)
          if (parsed != null) setWrong(false)
          if (open && parsed != null && times.includes(parsed)) {
            setHighlight(String(parsed))
            setNavigated(false)
          }
        }}
        onClick={(e) => {
          onClick?.(e)
          if (!e.defaultPrevented && !open && !sheet) show(true)
        }}
        onPointerDown={(e) => {
          onPointerDown?.(e)
          // a phone: the tap opens the sheet and leaves the keypad closed
          if (!e.defaultPrevented && sheet && !control.disabled && !props.readOnly) {
            e.preventDefault()
            show(true)
          }
        }}
        onKeyDown={(e) => {
          onKeyDown?.(e)
          if (e.defaultPrevented || e.nativeEvent.isComposing) return
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            if (!open) return show(true)
            move(e.key === 'ArrowDown' ? 1 : -1)
          } else if (e.key === 'Enter') {
            e.preventDefault()
            if (open && navigated && highlight) pick(Number(highlight))
            else commit()
          }
        }}
        onBlur={(e) => {
          onBlur?.(e)
          commit()
        }}
        className={cn(
          'w-full min-w-0 border border-n-300 bg-n-0 text-n-900 outline-none placeholder:text-n-500',
          'hover:border-n-400 focus:border-a-500 focus:shadow-input-focus',
          'aria-invalid:border-error aria-invalid:shadow-input-error',
          'disabled:cursor-not-allowed disabled:border-n-200 disabled:bg-n-50 disabled:text-n-400',
          sizes[size],
          clock && clockPad[size],
        )}
      />
    </div>
  )
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', wrapperClassName)}>
      <SelectLayer
        open={open}
        onOpenChange={(next) => (next ? show(true) : setOpen(false))}
        trigger={trigger}
        anchor
        width="content"
        label={listLabel}
        closeLabel={closeLabel}
        popoverProps={{
          className: 'w-32',
          // the field keeps the focus: a click in the list doesn't blur it, a click on the field doesn't close it
          onMouseDown: (e) => e.preventDefault(),
          onInteractOutside: (e) => {
            if (input.current && e.target instanceof Node && input.current.contains(e.target)) e.preventDefault()
          },
        }}
      >
        <OptionList
          options={options}
          picked={new Set(value == null ? [] : [String(value)])}
          onPick={(next) => pick(Number(next))}
          size={size}
          sheet={sheet}
          highlight={highlight}
          onHighlightChange={setHighlight}
          label={listLabel}
          listRef={list}
        />
      </SelectLayer>
      {wrong && invalidMessage && <FieldMessage id={messageId}>{invalidMessage}</FieldMessage>}
    </div>
  )
}
