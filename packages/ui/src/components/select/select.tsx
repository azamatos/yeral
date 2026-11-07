import { ChevronDown } from 'lucide-react'
import { useState, type ComponentProps, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'
import { useField } from '../field'
import { useControlProps } from '../input'
import { Spinner } from '../spinner'
import {
  fieldLabelText,
  flatOptions,
  OptionList,
  SEARCH_FROM,
  SelectLayer,
  useSheet,
  type SelectEntry,
  type SelectSize,
} from './option-list'

/** The field-like trigger (DS-Controls `.fld`): S 32 / r 8 · M 40 / r 10 · L 48 / r 12, icons 16 / 18 / 20. */
export const selectTriggerSize: Record<SelectSize, string> = {
  s: 'h-8 gap-1.5 rounded-ctl-s px-3 text-ctl-s leading-4 [&>svg]:size-4',
  m: 'h-10 gap-2 rounded-ctl-m px-3 text-ctl-m leading-5 [&>svg]:size-4.5',
  l: 'h-12 gap-2 rounded-ctl-l pr-3 pl-3.5 text-ctl-l leading-6 [&>svg]:size-5',
}
export const selectTriggerClass = cn(
  'group flex w-full min-w-0 cursor-pointer items-center border border-n-300 bg-n-0 text-left text-n-900 outline-none select-none',
  'hover:border-n-400 focus-visible:shadow-focus',
  'data-[state=open]:border-a-500 data-[state=open]:shadow-input-focus',
  'aria-invalid:border-error aria-invalid:shadow-input-error',
  'disabled:cursor-not-allowed disabled:border-n-200 disabled:bg-n-50 disabled:text-n-400',
  '[&>svg]:flex-none [&>svg]:text-n-600 disabled:[&>svg]:text-n-400',
)

type Shared = {
  options: readonly SelectEntry[]
  size?: SelectSize
  invalid?: boolean
  disabled?: boolean
  /** A spinner in place of the chevron while the options load. */
  loading?: boolean
  /** Before the value (n-600): a pin, a clock. */
  icon?: ReactNode
  /** The search field above the rows; on by itself above 8 options. */
  searchable?: boolean
  searchPlaceholder?: string
  /** In place of the rows when nothing matches: «Nothing matches “xyz”». */
  empty?: (search: string) => ReactNode
  /** The sheet's title under 768 (the field's label) and its close button's name. */
  title?: string
  closeLabel?: string
  onOpenChange?: (open: boolean) => void
  className?: string
}

type TriggerProps = Omit<ComponentProps<'button'>, 'value' | 'onChange' | 'disabled' | 'className' | 'title'>

export type SelectProps = Shared &
  TriggerProps & {
    value: string | null | undefined
    onValueChange: (value: string) => void
    placeholder?: ReactNode
    /** The popover's width: the field's, or the rows' (time lists, 128 wide). */
    listWidth?: 'trigger' | 'content'
  }

/** The trigger's keys while closed: ↓ ↑ open the list (Enter and Space open it as a button). */
function openKeys(open: (next: boolean) => void) {
  return (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.defaultPrevented || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
    e.preventDefault()
    open(true)
  }
}

/**
 * Select (DS-Controls → 03 Select · A2): our own list everywhere, never the native control. A field-like trigger
 * (S / M / L, placeholder, leading icon, loading, error, disabled) opens a raised popover 4 below with the rows, the
 * chosen one 600 with a check; the list opens on the chosen row; ↑ ↓ move one highlight, Enter picks, Esc closes
 * and the focus comes back. Above 8 options a search field sits at the top with the focus. Under 768 the list is a
 * bottom sheet with the field's label (`title`) and a close button (`closeLabel`). Inside a `<Field>` it takes the
 * label, the error and the description; elsewhere name it with `aria-label`. `value` is the option's `value`;
 * callers with numbers convert at the edge.
 */
export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  size = 'm',
  invalid,
  disabled,
  loading,
  icon,
  searchable,
  searchPlaceholder,
  empty,
  title,
  closeLabel,
  listWidth,
  onOpenChange,
  className,
  onKeyDown,
  ...props
}: SelectProps) {
  const [open, setOpenState] = useState(false)
  const field = useField()
  const setOpen = (next: boolean) => {
    if (next && !title && !props['aria-label']) setFieldLabel(fieldLabelText(props['aria-labelledby'] ?? field?.labelId))
    setOpenState(next)
    onOpenChange?.(next)
  }
  const control = useControlProps({ ...props, disabled, invalid })
  const sheet = useSheet()
  const all = flatOptions(options)
  const current = value == null ? undefined : all.find((o) => o.value === value)
  const search = searchable ?? all.length >= SEARCH_FROM
  const [fieldLabel, setFieldLabel] = useState<string>()
  const listLabel = title ?? props['aria-label'] ?? fieldLabel
  const trigger = (
    <button
      type="button"
      {...props}
      {...control}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-labelledby={props['aria-labelledby'] ?? (props['aria-label'] ? undefined : field?.labelId)}
      data-state={open ? 'open' : 'closed'}
      data-placeholder={current ? undefined : ''}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        openKeys(setOpen)(e)
      }}
      className={cn(selectTriggerClass, selectTriggerSize[size], className)}
    >
      {icon}
      <span className={cn('min-w-0 flex-1 truncate', !current && 'text-n-500 group-disabled:text-n-400')}>
        {current?.label ?? placeholder}
      </span>
      {loading ? (
        <Spinner className={cn(size === 's' ? 'size-4' : size === 'm' ? 'size-4.5' : 'size-5')} />
      ) : (
        <ChevronDown aria-hidden strokeWidth={1.75} className="transition-transform group-data-[state=open]:rotate-180" />
      )}
    </button>
  )
  return (
    <SelectLayer open={open} onOpenChange={setOpen} trigger={trigger} width={listWidth} label={listLabel} closeLabel={closeLabel}>
      <OptionList
        options={options}
        picked={new Set(current ? [current.value] : [])}
        onPick={(next) => {
          onValueChange(next)
          setOpen(false)
        }}
        size={size}
        sheet={sheet}
        searchable={search}
        searchPlaceholder={searchPlaceholder}
        empty={empty}
        label={listLabel}
      />
    </SelectLayer>
  )
}

export type MultiSelectProps = Shared &
  TriggerProps & {
    value: readonly string[]
    onValueChange: (value: string[]) => void
    /** The filter's name on the trigger: «Services» reads «Services · 3» with a choice. */
    label: string
    /** The footer's Clear (shown with a choice) and the sheet's Done («Show 24 results»). */
    clearLabel: string
    doneLabel: ReactNode
    /** What the trigger shows in place of «Label · n»: a people picker's «Everyone · 19», «Jeren», «3 people». */
    summary?: ReactNode
    /** The active tint and Clear, when the count doesn't say it (a row that means «everything» is always ticked). */
    active?: boolean
  }

/**
 * Multi-select for filters (DS-Controls → 03 Select «Multi-select · filters»): checkbox rows that apply at once, the
 * trigger reads «Services · 3» in the active filter tint, Clear in the footer while something is chosen; on a phone
 * sheet the footer is Clear + Done («Show 24 results»).
 */
export function MultiSelect({
  value,
  onValueChange,
  options,
  label,
  clearLabel,
  doneLabel,
  size = 'm',
  invalid,
  disabled,
  loading,
  icon,
  searchable,
  searchPlaceholder,
  empty,
  title,
  closeLabel,
  summary,
  active,
  onOpenChange,
  className,
  onKeyDown,
  ...props
}: MultiSelectProps) {
  const [open, setOpenState] = useState(false)
  const setOpen = (next: boolean) => {
    setOpenState(next)
    onOpenChange?.(next)
  }
  const control = useControlProps({ ...props, disabled, invalid })
  const sheet = useSheet()
  const all = flatOptions(options)
  const picked = new Set(value.filter((v) => all.some((o) => o.value === v)))
  const count = picked.size
  const on = active ?? count > 0
  const search = searchable ?? all.length >= SEARCH_FROM
  const name = count ? `${label} · ${count}` : label
  const trigger = (
    <button
      type="button"
      {...props}
      {...control}
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={props['aria-label'] ?? name}
      data-state={open ? 'open' : 'closed'}
      onKeyDown={(e) => {
        onKeyDown?.(e)
        openKeys(setOpen)(e)
      }}
      className={cn(
        selectTriggerClass,
        selectTriggerSize[size],
        'w-auto',
        on && 'border-a-line bg-a-50 text-a-600 hover:border-a-200 [&>svg]:text-a-600',
        className,
      )}
    >
      {icon}
      <span className="flex min-w-0 items-center gap-2 truncate">
        {summary ?? (
          // one text run: the row's gap would split «Services · 3» around the dot
          <span className="truncate">
            {label}
            {count > 0 && (
              <>
                {' · '}
                <span className="font-semibold">{count}</span>
              </>
            )}
          </span>
        )}
      </span>
      {loading ? (
        <Spinner className={cn(size === 's' ? 'size-4' : size === 'm' ? 'size-4.5' : 'size-5')} />
      ) : (
        <ChevronDown aria-hidden strokeWidth={1.75} className="transition-transform group-data-[state=open]:rotate-180" />
      )}
    </button>
  )
  const clear = on && (
    <Button variant="tertiary" size={sheet ? 'l' : 's'} onClick={() => onValueChange([])} className={cn(sheet && 'flex-1')}>
      {clearLabel}
    </Button>
  )
  const footer = sheet ? (
    <div className="flex flex-none gap-2 border-t border-n-200 bg-n-0 px-4 pt-3 pb-5">
      {clear}
      <Button variant="primary" size="l" onClick={() => setOpen(false)} className="flex-1">
        {doneLabel}
      </Button>
    </div>
  ) : (
    clear && <div className="-mx-1.5 mt-1.5 flex flex-none justify-end border-t border-n-200 px-1.5 pt-1.5">{clear}</div>
  )
  return (
    <SelectLayer
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      // the trigger is narrow («Services · 3»): the list takes at least 240
      width="content"
      popoverProps={{ className: 'min-w-60' }}
      label={title ?? label}
      closeLabel={closeLabel}
    >
      <OptionList
        multi
        options={options}
        picked={picked}
        onPick={(next) => onValueChange(picked.has(next) ? value.filter((v) => v !== next) : [...value, next])}
        size={size}
        sheet={sheet}
        searchable={search}
        searchPlaceholder={searchPlaceholder}
        empty={empty}
        label={title ?? label}
        footer={footer}
      />
    </SelectLayer>
  )
}
