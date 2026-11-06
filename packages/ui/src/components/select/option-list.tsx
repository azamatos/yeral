import { Command, useCommandState } from 'cmdk'
import { Check, Search as SearchIcon, X } from 'lucide-react'
import { Dialog, Popover } from 'radix-ui'
import { useEffect, useRef, useState, type ComponentProps, type ReactElement, type ReactNode, type RefObject } from 'react'
import { cn } from '../../lib/cn'
import { useMediaQuery } from '../../lib/use-media-query'
import { Button } from '../button'
import { Drawer, DrawerContent } from '../drawer'

export type SelectSize = 's' | 'm' | 'l'

export type SelectOption = {
  value: string
  /** Shown in the trigger and the row, searched: a string. */
  label: string
  /** Right of the label (13/18 n-500): a duration, a count, a disabled option's reason («Off today»). */
  meta?: ReactNode
  disabled?: boolean
  /** More words the search matches («nails» for Manicure). */
  keywords?: readonly string[]
}

/** Options under a header (28 high, 11 caps, sticky); headers aren't options and ↑ ↓ skip them. */
export type SelectGroup = { label: string; options: readonly SelectOption[] }
export type SelectEntry = SelectOption | SelectGroup

export const isGroup = (entry: SelectEntry): entry is SelectGroup => 'options' in entry

/** Every option in order, groups opened. */
export function flatOptions(entries: readonly SelectEntry[]): SelectOption[] {
  return entries.flatMap((entry) => (isGroup(entry) ? entry.options : [entry]))
}

/** Search above this many options (DS-Controls A2). */
export const SEARCH_FROM = 9

const phoneQuery = '(max-width: 767px)'

/** Whether the list opens as a bottom sheet (under 768) instead of a popover. */
export function useSheet() {
  return useMediaQuery(phoneQuery)
}

/** The match in a row while searching, 600. */
function Match({ text, query }: { text: string; query: string }) {
  const q = query.trim()
  if (!q) return text
  const at = text.toLocaleLowerCase().indexOf(q.toLocaleLowerCase())
  if (at < 0) return text
  return (
    <>
      {text.slice(0, at)}
      <span className="font-semibold">{text.slice(at, at + q.length)}</span>
      {text.slice(at + q.length)}
    </>
  )
}

const rowBase = cn(
  'flex cursor-pointer items-center text-n-900 outline-none select-none',
  // one highlight: the pointer and the arrow keys move the same row (cmdk's `data-selected`)
  'data-[selected=true]:bg-n-50',
  'data-[disabled=true]:cursor-default data-[disabled=true]:text-n-400',
)
const rowSize = {
  s: 'h-8 gap-2 rounded-ctl-s px-2.5 text-ctl-s leading-4',
  m: 'h-9 gap-2 rounded-ctl-s px-2.5 text-small',
  l: 'h-9 gap-2 rounded-ctl-s px-2.5 text-small',
  sheet: 'h-12 gap-3 px-4 text-ctl-l leading-6',
}
const headingClass = cn(
  '[&_[cmdk-group-heading]]:sticky [&_[cmdk-group-heading]]:top-0 [&_[cmdk-group-heading]]:z-1 [&_[cmdk-group-heading]]:flex',
  '[&_[cmdk-group-heading]]:h-7 [&_[cmdk-group-heading]]:items-center [&_[cmdk-group-heading]]:bg-n-0 [&_[cmdk-group-heading]]:text-label',
  '[&_[cmdk-group-heading]]:text-n-500 [&_[cmdk-group-heading]]:uppercase',
)

export type OptionListProps = {
  options: readonly SelectEntry[]
  /** The chosen values: one for a select, any number for a multi-select. */
  picked: ReadonlySet<string>
  onPick: (value: string) => void
  /** Checkbox rows that stay open (filters). */
  multi?: boolean
  size?: SelectSize
  /** Rows of 48 with 16 px text (a 390 sheet). */
  sheet?: boolean
  /** The search field above the rows (automatic above 8 options). */
  searchable?: boolean
  searchPlaceholder?: string
  /** In place of the rows when nothing matches: «Nothing matches “xyz”». */
  empty?: (search: string) => ReactNode
  /** The list's name for screen readers (the field's label). */
  label?: string
  /** The highlighted row, controlled (a time field moves it while typing). */
  highlight?: string
  onHighlightChange?: (value: string) => void
  /** Under the rows (a multi-select's Clear, a sheet's Done). */
  footer?: ReactNode
  /** The listbox element, for a field outside the list that points at it (`aria-controls`, `aria-activedescendant`). */
  listRef?: RefObject<HTMLDivElement | null>
  className?: string
}

/**
 * The option list every Select draws (DS-Controls → 03 Select): cmdk's rows, one highlight the pointer and ↑ ↓ share,
 * the chosen row 600 with a check (a checkbox in a multi-select), disabled rows n-400 with their reason, sticky
 * group headers, a search field above 8 options with the match in 600 and an empty line, and the list opened with the
 * chosen row in the middle. It sits in a popover (desktop) or a sheet (phones); the container is `SelectLayer`.
 */
export function OptionList({
  options,
  picked,
  onPick,
  multi,
  size = 'm',
  sheet,
  searchable,
  searchPlaceholder,
  empty,
  label,
  highlight,
  onHighlightChange,
  footer,
  listRef,
  className,
}: OptionListProps) {
  const list = useRef<HTMLDivElement>(null)
  const [search, setSearch] = useState('')
  const first = picked.values().next().value
  const [own, setOwn] = useState(first ?? '')
  const current = highlight ?? own
  const setCurrent = (value: string) => {
    setOwn(value)
    onHighlightChange?.(value)
  }
  // opens with the chosen row in the middle of the list, so ↑ ↓ continue from there (a time list of 96 rows)
  useEffect(() => {
    // a frame later: cmdk marks the highlighted row after its own first pass
    const frame = requestAnimationFrame(() => {
      const el = list.current
      const row = el?.querySelector<HTMLElement>('[cmdk-item][data-selected="true"]')
      if (!el || !row) return
      el.scrollTop = row.offsetTop - (el.clientHeight - row.offsetHeight) / 2
    })
    return () => cancelAnimationFrame(frame)
  }, [])
  const rows = sheet ? rowSize.sheet : rowSize[size]
  const row = (option: SelectOption) => {
    const on = picked.has(option.value)
    return (
      <Command.Item
        key={option.value}
        value={option.value}
        keywords={[option.label, ...(option.keywords ?? [])]}
        disabled={option.disabled}
        onSelect={() => onPick(option.value)}
        aria-checked={multi ? on : undefined}
        className={cn(rowBase, rows)}
      >
        {multi && (
          <span
            aria-hidden
            className={cn(
              'flex size-[18px] flex-none items-center justify-center rounded-xs border',
              on ? 'border-a-500 bg-a-500 text-n-0' : 'border-n-300 bg-n-0',
              option.disabled && 'border-n-200 bg-n-50',
            )}
          >
            {on && <Check strokeWidth={3} className="size-3" />}
          </span>
        )}
        <span className={cn('min-w-0 flex-1 truncate', on && 'font-semibold')}>
          <Match text={option.label} query={search} />
        </span>
        {option.meta != null && option.meta !== '' && (
          <span className={cn('flex-none text-n-500', sheet ? 'text-small' : 'text-dense')}>{option.meta}</span>
        )}
        {/* the check column stays, so metas line up */}
        {!multi && (
          <span aria-hidden className={cn('flex flex-none items-center justify-center text-a-600', sheet ? 'size-5' : 'size-4')}>
            {on && <Check strokeWidth={2} className="size-full" />}
          </span>
        )}
      </Command.Item>
    )
  }
  return (
    <Command
      label={label}
      shouldFilter={!!searchable}
      // a plain match in the label or the keywords, case aside («col» finds Colouring and Collagen), in the rows' order
      filter={(_, query, keywords) => (keywords?.some((k) => k.toLocaleLowerCase().includes(query.toLocaleLowerCase())) ? 1 : 0)}
      value={current}
      onValueChange={setCurrent}
      loop={false}
      vimBindings={false}
      className={cn('flex min-h-0 flex-col outline-none', className)}
    >
      {searchable && (
        <div className={cn('relative flex-none', sheet ? 'mx-4 mb-2' : 'mb-1.5')}>
          <SearchIcon
            aria-hidden
            strokeWidth={1.75}
            className={cn(
              'pointer-events-none absolute top-1/2 -translate-y-1/2 text-n-600',
              sheet ? 'left-3.5 size-5' : 'left-2.5 size-4',
            )}
          />
          <Command.Input
            value={search}
            onValueChange={setSearch}
            placeholder={searchPlaceholder}
            className={cn(
              'w-full min-w-0 border border-n-300 bg-n-0 text-n-900 outline-none placeholder:text-n-500 hover:border-n-400',
              'focus:border-a-500 focus:shadow-input-focus',
              sheet ? 'h-12 rounded-ctl-l pr-11 pl-11 text-ctl-l' : 'h-8 rounded-ctl-s pr-8 pl-8 text-ctl-s',
            )}
          />
          {search && (
            <button
              type="button"
              tabIndex={-1}
              aria-hidden
              onClick={() => setSearch('')}
              className={cn(
                'absolute top-1/2 flex -translate-y-1/2 items-center justify-center text-n-600 hover:text-n-900',
                sheet ? 'right-2 size-8' : 'right-1 size-6',
              )}
            >
              <X strokeWidth={1.75} className={sheet ? 'size-5' : 'size-4'} />
            </button>
          )}
        </div>
      )}
      <List
        ref={(el) => {
          list.current = el
          if (listRef) listRef.current = el
          // cmdk writes -1; a scrolling listbox the keys drive must be in the tab order (axe)
          if (el) el.tabIndex = 0
        }}
        label={label ?? ''}
        aria-multiselectable={multi || undefined}
        className={cn(
          // no focus ring inside the list (the highlight is the focus)
          'min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none focus-visible:shadow-none [&_[cmdk-list-sizer]]:relative',
          !sheet && 'max-h-80',
          headingClass,
          sheet && '[&_[cmdk-group-heading]]:px-4',
          !sheet && '[&_[cmdk-group-heading]]:px-2.5',
        )}
      >
        {options.map((entry) =>
          isGroup(entry) ? (
            <Command.Group key={entry.label} heading={entry.label}>
              {entry.options.map(row)}
            </Command.Group>
          ) : (
            row(entry)
          ),
        )}
      </List>
      {searchable && empty && (
        <Command.Empty className={cn('flex h-16 flex-none items-center justify-center text-n-500', sheet ? 'text-small' : 'text-dense')}>
          {empty(search)}
        </Command.Empty>
      )}
      {footer}
    </Command>
  )
}

/** The listbox, hidden while nothing matches: an empty listbox is an error for the screen reader (axe). */
function List(props: ComponentProps<typeof Command.List>) {
  const empty = useCommandState((state) => state.filtered.count === 0)
  return <Command.List {...props} hidden={empty || undefined} />
}

const popoverClass = cn(
  'z-65 flex max-h-[var(--radix-popover-content-available-height)] max-w-[calc(100vw-32px)] min-w-32 flex-col',
  'rounded-popover border border-n-200 bg-n-0 p-1.5 text-n-900 shadow-raised outline-none data-[state=open]:animate-pop-in',
)

export type SelectLayerProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The field the list belongs to: a button that opens it, or an input that keeps the focus (`anchor`). */
  trigger: ReactElement
  /** The list opens from an input that keeps the focus and the keys (a time field): no focus moves into the list. */
  anchor?: boolean
  /** The popover's width: the trigger's (fields), or the rows' (time lists, 128). */
  width?: 'trigger' | 'content'
  /** The list's name: the popover's for screen readers, the sheet's title. */
  label?: string
  /** The sheet's close button's name. */
  closeLabel?: string
  children: ReactNode
  popoverProps?: Partial<ComponentProps<typeof Popover.Content>>
}

/** The focus goes to the search when there is one, else to the list (its keys and `aria-activedescendant`). */
function focusList(e: Event) {
  const target = (e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>('[cmdk-input], [cmdk-list]')
  if (!target) return
  e.preventDefault()
  target.focus()
}

/** The text of a `<Field>`'s label, for a list named by nothing else. */
export function fieldLabelText(labelId: string | undefined): string | undefined {
  if (!labelId || typeof document === 'undefined') return undefined
  return document.getElementById(labelId)?.textContent?.trim() || undefined
}

/**
 * Where a Select's list opens: a raised popover 4 below the field (desktop) or a bottom sheet with a handle, the
 * field's label and a close button (under 768). Esc closes either and the focus comes back to the field.
 */
export function SelectLayer({
  open,
  onOpenChange,
  trigger,
  anchor,
  width = 'trigger',
  label,
  closeLabel,
  children,
  popoverProps,
}: SelectLayerProps) {
  const sheet = useSheet()
  const Wrap = anchor ? Popover.Anchor : Popover.Trigger
  return (
    <>
      <Popover.Root open={open && !sheet} onOpenChange={onOpenChange}>
        <Wrap asChild>{trigger}</Wrap>
        <Popover.Portal>
          <Popover.Content
            sideOffset={4}
            align="start"
            collisionPadding={16}
            aria-label={label}
            onOpenAutoFocus={anchor ? (e) => e.preventDefault() : focusList}
            onCloseAutoFocus={anchor ? (e) => e.preventDefault() : undefined}
            {...popoverProps}
            className={cn(popoverClass, width === 'trigger' && 'w-[var(--radix-popover-trigger-width)]', popoverProps?.className)}
          >
            {children}
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
      <Drawer open={open && sheet} onOpenChange={onOpenChange}>
        <DrawerContent aria-describedby={undefined} onOpenAutoFocus={focusList} className="max-h-[85%] pb-[env(safe-area-inset-bottom)]">
          <div className="flex h-13 flex-none items-center justify-between pr-1.5 pl-4">
            <Dialog.Title className={cn('m-0 truncate text-ctl-l leading-6 font-semibold text-n-900', !label && 'sr-only')}>
              {label}
            </Dialog.Title>
            {closeLabel && (
              <Dialog.Close asChild>
                <Button variant="plain" iconOnly aria-label={closeLabel} className="size-10 rounded-ctl-m">
                  <X />
                </Button>
              </Dialog.Close>
            )}
          </div>
          {children}
        </DrawerContent>
      </Drawer>
    </>
  )
}
