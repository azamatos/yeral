import { Search } from 'lucide-react'
import { createContext, useContext, useId, useState, type ComponentProps, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Input } from '../input'

export type ComboboxOption = {
  id: string
  label: ReactNode
  /** The caption under the label: «Building · next to the shopping centre · Ashgabat». */
  description?: ReactNode
  /** At the start of the row: the address's pin, a client's avatar. */
  icon?: ReactNode
}

type State = {
  listId: string
  value: string
  type: (value: string) => void
  rows: number
  active: number
  setActive: (i: number) => void
  shown: boolean
  focus: (on: boolean) => void
  dismiss: () => void
  choose: (i: number) => void
  props: ComboboxProps
}
const ComboboxContext = createContext<State | null>(null)

function useCombobox(): State {
  const state = useContext(ComboboxContext)
  if (!state) throw new Error('ComboboxInput and ComboboxList go inside <Combobox>')
  return state
}

export type ComboboxProps = {
  /** What's typed. */
  value: string
  onValueChange: (value: string) => void
  options: readonly ComboboxOption[]
  onSelect: (option: ComboboxOption) => void
  /** False keeps the list closed while there's nothing to ask yet (fewer letters than a search needs). */
  open?: boolean
  /** The list's name for screen readers: «Address suggestions». */
  listLabel: string
  /** Above the options (11 caps): «Frequent clients». */
  section?: ReactNode
  /** In place of the options when none match: «No client found for “65 99 00”». */
  empty?: ReactNode
  /** The last row, always there while the list is open: «Create a new client». */
  create?: { label: ReactNode; icon?: ReactNode; onSelect: () => void }
  /** `address`: the padded list of B-Onboarding (rows 56, r8); `list`: rows 52 with lines between (B-Calendar). */
  variant?: 'list' | 'address'
  children: ReactNode
}

/**
 * Combobox (DS-Patterns → Inputs «Combobox»; B-Onboarding's address, B-Calendar's new booking, B-Classes): a search
 * field with a list of options under it, picked with a tap or ↑ / ↓ and Enter; Esc closes the list. The input keeps the
 * focus (`aria-activedescendant`); the create row is always last. The screens draw the list in the flow under the field,
 * so it isn't a popover: `<ComboboxInput>` goes where the field is (inside a `<Field>`, with its counter), and
 * `<ComboboxList>` where the list shows.
 */
export function Combobox(props: ComboboxProps) {
  const { value, onValueChange, options, onSelect, open = true, create, empty, children } = props
  const listId = useId()
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [active, setActive] = useState(-1)
  const rows = options.length + (create ? 1 : 0)
  const shown = open && focused && !dismissed && (rows > 0 || !!empty)
  const state: State = {
    listId,
    value,
    type: (next) => {
      onValueChange(next)
      setDismissed(false)
      setActive(-1)
    },
    rows,
    active: shown && active < rows ? active : -1,
    setActive,
    shown,
    focus: (on) => {
      setFocused(on)
      if (on) setDismissed(false)
      else setActive(-1)
    },
    dismiss: () => {
      setDismissed(true)
      setActive(-1)
    },
    choose: (i) => {
      const option = options[i]
      if (option) onSelect(option)
      else create?.onSelect()
      setDismissed(true)
      setActive(-1)
    },
    props,
  }
  return <ComboboxContext value={state}>{children}</ComboboxContext>
}

/** The search field (48, or 44 with `size="m"`) with its search icon; it picks up a surrounding `<Field>`. */
export function ComboboxInput({
  size = 'l',
  className,
  onKeyDown,
  onFocus,
  onBlur,
  ...props
}: Omit<ComponentProps<'input'>, 'value' | 'onChange' | 'size' | 'role'> & { size?: 'l' | 'm'; invalid?: boolean }) {
  const s = useCombobox()
  const optionId = (i: number) => `${s.listId}-${i}`
  const keys = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e)
    if (e.defaultPrevented) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (!s.shown) return s.focus(true)
      if (!s.rows) return
      const step = e.key === 'ArrowDown' ? 1 : -1
      s.setActive(s.active < 0 ? (step > 0 ? 0 : s.rows - 1) : (s.active + step + s.rows) % s.rows)
    } else if (e.key === 'Enter' && s.shown && s.active >= 0) {
      e.preventDefault()
      s.choose(s.active)
    } else if (e.key === 'Escape' && s.shown) {
      e.preventDefault()
      s.dismiss()
    }
  }
  return (
    <div className="relative">
      <Search
        aria-hidden
        strokeWidth={1.75}
        className={cn('pointer-events-none absolute left-3.5 size-4.5 text-n-600', size === 'm' ? 'top-3.25' : 'top-3.75')}
      />
      <Input
        type="search"
        autoComplete="off"
        {...props}
        role="combobox"
        // the list exists only with rows: the empty line alone isn't a list to point at
        aria-expanded={s.shown && s.rows > 0}
        aria-controls={s.shown && s.rows > 0 ? s.listId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={s.active >= 0 ? optionId(s.active) : undefined}
        value={s.value}
        onChange={(e) => s.type(e.target.value)}
        onKeyDown={keys}
        onFocus={(e) => {
          onFocus?.(e)
          s.focus(true)
        }}
        onBlur={(e) => {
          onBlur?.(e)
          s.focus(false)
        }}
        className={cn(size === 'm' ? 'h-11 pl-10 text-small' : 'pl-10.5', className)}
      />
    </div>
  )
}

/** The options under the field while it's open: the section label, the options or the empty line, the create row. */
export function ComboboxList({ className }: { className?: string }) {
  const s = useCombobox()
  const { options, listLabel, section, empty, create, variant = 'list' } = s.props
  if (!s.shown) return null
  const address = variant === 'address'
  const row = (i: number, on: boolean) =>
    cn(
      'flex w-full cursor-pointer items-center gap-3 px-3 py-2 text-left text-n-900 [&>svg]:flex-none [&>svg]:text-n-600',
      address ? 'min-h-14 rounded-input [&>svg]:size-5' : 'min-h-13 text-small not-first:border-t not-first:border-n-200',
      on && (address ? 'bg-group shadow-focus-inset' : 'bg-n-50 shadow-focus-inset'),
      !on && (address ? 'hover:bg-group' : 'hover:bg-n-50'),
    )
  return (
    <div className={cn('flex flex-col border border-n-200 bg-n-0', address ? 'rounded-m p-1.5' : 'overflow-hidden rounded-m', className)}>
      {section && <div className="px-3 pt-2.5 pb-1 text-label text-n-600 uppercase">{section}</div>}
      {options.length === 0 && empty && (
        <div role="status" className={cn('p-3 text-dense text-n-600', section && 'border-t border-n-200')}>
          {empty}
        </div>
      )}
      {s.rows > 0 && (
        <div
          role="listbox"
          id={s.listId}
          aria-label={listLabel}
          className={cn('flex flex-col', !address && (section || (options.length === 0 && empty)) && 'border-t border-n-200')}
        >
          {options.map((o, i) => (
            <div
              key={o.id}
              id={`${s.listId}-${i}`}
              role="option"
              aria-selected={i === s.active}
              className={row(i, i === s.active)}
              // the input keeps the focus, so the list stays open until the tap lands
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => i !== s.active && s.setActive(i)}
              onClick={() => s.choose(i)}
            >
              {o.icon}
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className={cn(address ? 'text-button font-medium' : 'font-semibold')}>{o.label}</span>
                {o.description && <span className="text-dense text-n-600">{o.description}</span>}
              </span>
            </div>
          ))}
          {create && (
            <div
              id={`${s.listId}-${options.length}`}
              role="option"
              aria-selected={s.active === options.length}
              className={cn(row(options.length, s.active === options.length), 'font-semibold text-a-600')}
              onMouseDown={(e) => e.preventDefault()}
              onMouseMove={() => s.active !== options.length && s.setActive(options.length)}
              onClick={() => s.choose(options.length)}
            >
              {create.icon}
              {create.label}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
