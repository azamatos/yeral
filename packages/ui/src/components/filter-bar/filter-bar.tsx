import { ArrowUpDown, ChevronDown, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from 'lucide-react'
import { Dialog } from 'radix-ui'
import { useState, type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { Button } from '../button'
import { CountBadge } from '../count-badge'
import { Drawer, DrawerContent } from '../drawer'
import { Input } from '../input'
import { Tooltip } from '../tooltip'
import {
  flatOptions,
  MultiSelect,
  OptionList,
  SEARCH_FROM,
  SelectLayer,
  selectTriggerClass,
  selectTriggerSize,
  useSheet,
  type SelectEntry,
  type SelectOption,
} from '../select'

/** «Anyone»: a single filter's row that clears it. */
const ANY = '\u0000any'

/** The words the bar shows; `@yeral/ui` has no strings of its own. */
export type FilterBarLabels = {
  /** The Filters button under 768 and the sheet's title. */
  filters: string
  clearAll: string
  /** A multi menu's footer Clear. */
  clear: string
  close: string
  back: string
  /** The sheet's done button: «Show 24 results». */
  showResults: string
  searchIn: string
  /** «Remove Tag: Regular» for a chip's × button. */
  remove: (chip: string) => string
  nothingMatches: (search: string) => ReactNode
}

type FilterCommon = {
  id: string
  /** The filter's name: «Specialist», «Services». */
  label: string
  options: readonly SelectEntry[]
  disabled?: boolean
  /**
   * Why a single filter is off («Turn on location to filter by distance»): a tooltip on the button, which stays
   * focusable, and a line in the sheet instead of its options.
   */
  disabledHint?: string
  /** A chip's words for a chosen option; «Specialist: Jeren» without it. */
  chip?: (option: SelectOption) => string
  /** A single filter's trigger words for the chosen option («Upcoming booking · Yes»); its label without it. */
  short?: (option: SelectOption) => string
}

type SingleDef = FilterCommon & { multiple?: false; value: string | null; onValueChange: (value: string | null) => void } & (
    | { /** «Anyone»: the row that clears the filter. */ anyLabel: string; plain?: undefined }
    | {
        /**
         * The option that means nothing is filtered (Distance · Within 5 km): checked while the value is null, the
         * trigger stays plain, no chip, no «Anyone» row; picking it gives null.
         */
        plain: string
        anyLabel?: undefined
      }
  )

export type FilterDef = SingleDef | (FilterCommon & { multiple: true; value: readonly string[]; onValueChange: (value: string[]) => void })

export type SortDef = {
  /** «Sort»: the trigger reads «Sort: Time, soonest first». */
  label: string
  value: string
  options: readonly SelectOption[]
  onValueChange: (value: string) => void
}

export type FilterBarProps = {
  search?: { value: string; onChange: (value: string) => void; placeholder: string }
  filters: readonly FilterDef[]
  sort?: SortDef
  /** The list's main action at the row's end (New booking, Add a client). */
  action?: ReactNode
  /** «24 of 100 clients»: row 2 while something is filtered or searched, and beside Filters under 768. */
  count?: ReactNode
  /** The list is searched by a field outside the bar (a header query bar): row 2 shows the count as with the bar's own search. */
  searched?: boolean
  labels: FilterBarLabels
  /** Clear all in one go (one address change); without it each filter and the search clear one by one. */
  onClearAll?: () => void
  className?: string
}

/** The filter-button look (DS-Lists A5 `.fb`): the Select trigger, 500, tinted while active. */
const buttonClass = cn(selectTriggerClass, selectTriggerSize.m, 'w-auto flex-none font-medium whitespace-nowrap')
const activeClass = 'border-a-line bg-a-50 text-a-600 hover:border-a-200 [&>svg]:text-a-600'
/** Off but focusable (it carries a tooltip): the disabled look by `aria-disabled`. */
const offClass =
  'aria-disabled:cursor-not-allowed aria-disabled:border-n-200 aria-disabled:bg-n-50 aria-disabled:text-n-400 aria-disabled:hover:border-n-200 aria-disabled:[&>svg]:text-n-400'

/** A single filter's chosen value; its plain option counts as none. */
const singleValue = (f: SingleDef) => (f.value && f.value !== f.plain ? f.value : null)
const chosen = (f: FilterDef) => (f.multiple ? f.value.length : singleValue(f) ? 1 : 0)
const optionsOf = (f: FilterDef) => (f.multiple || f.plain !== undefined ? f.options : [{ value: ANY, label: f.anyLabel }, ...f.options])
/** The rows checked in a menu: the values, or the plain / «Anyone» row while nothing is chosen. */
const pickedOf = (f: FilterDef) => new Set(f.multiple ? f.value : [singleValue(f) ?? f.plain ?? ANY])

/** The active chips: one per chosen value, in the filters' order. */
function chipsOf(filters: readonly FilterDef[]) {
  return filters.flatMap((f) => {
    const all = flatOptions(f.options)
    const values = f.multiple ? f.value : singleValue(f) ? [f.value!] : []
    return values.flatMap((v) => {
      const option = all.find((o) => o.value === v)
      if (!option) return []
      const remove = () => (f.multiple ? f.onValueChange(f.value.filter((x) => x !== v)) : f.onValueChange(null))
      return [{ key: `${f.id}:${v}`, text: f.chip?.(option) ?? `${f.label}: ${option.label}`, remove }]
    })
  })
}

function pickIn(f: FilterDef, next: string) {
  if (f.multiple) f.onValueChange(f.value.includes(next) ? f.value.filter((v) => v !== next) : [...f.value, next])
  else f.onValueChange(next === ANY || next === f.plain ? null : next)
}

/** One filter's single menu (DS-Lists A5 FilterButton · single): «Specialist», «Specialist · Jeren» while active. */
function SingleFilter({ filter, labels }: { filter: SingleDef; labels: FilterBarLabels }) {
  const [open, setOpen] = useState(false)
  const sheet = useSheet()
  const value = singleValue(filter)
  const current = value ? flatOptions(filter.options).find((o) => o.value === value) : undefined
  const currentLabel = current && (filter.short?.(current) ?? current.label)
  const options = optionsOf(filter)
  // off with a reason: the button keeps hover and focus for its tooltip and opens nothing
  const hinted = !!filter.disabled && !!filter.disabledHint
  const trigger = (
    <button
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={current ? `${filter.label} · ${currentLabel}` : filter.label}
      disabled={filter.disabled && !hinted}
      aria-disabled={hinted || undefined}
      data-state={open ? 'open' : 'closed'}
      className={cn(buttonClass, current && activeClass, hinted && offClass)}
    >
      <span className="truncate">
        {filter.label}
        {current && (
          <>
            {' · '}
            <span className="font-semibold">{currentLabel}</span>
          </>
        )}
      </span>
      <ChevronDown aria-hidden strokeWidth={1.75} className="transition-transform group-data-[state=open]:rotate-180" />
    </button>
  )
  if (hinted)
    return (
      <Tooltip content={filter.disabledHint} side="bottom">
        {trigger}
      </Tooltip>
    )
  return (
    <SelectLayer
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      width="content"
      popoverProps={{ className: 'min-w-60' }}
      label={filter.label}
      closeLabel={labels.close}
    >
      <OptionList
        options={options}
        picked={pickedOf(filter)}
        onPick={(next) => {
          pickIn(filter, next)
          setOpen(false)
        }}
        sheet={sheet}
        searchable={flatOptions(options).length >= SEARCH_FROM}
        searchPlaceholder={labels.searchIn}
        empty={labels.nothingMatches}
        label={filter.label}
      />
    </SelectLayer>
  )
}

/** A filter on the bar: single or multi (the multi is `MultiSelect`, «Services · 3»). */
export function FilterButton({ filter, labels }: { filter: FilterDef; labels: FilterBarLabels }) {
  if (!filter.multiple) return <SingleFilter filter={filter} labels={labels} />
  return (
    <MultiSelect
      value={filter.value}
      onValueChange={filter.onValueChange}
      options={filter.options}
      label={filter.label}
      clearLabel={labels.clear}
      doneLabel={labels.showResults}
      closeLabel={labels.close}
      searchPlaceholder={labels.searchIn}
      empty={labels.nothingMatches}
      disabled={filter.disabled}
      className="flex-none font-medium whitespace-nowrap"
    />
  )
}

/**
 * SortMenu (DS-Lists A5): «Sort: Time, soonest first», the options carry the direction, a check on the current one.
 * `iconOnly` is the 390 outline icon button that opens the same options in a sheet.
 */
export function SortMenu({ sort, labels, iconOnly }: { sort: SortDef; labels: FilterBarLabels; iconOnly?: boolean }) {
  const [open, setOpen] = useState(false)
  const sheet = useSheet()
  const current = sort.options.find((o) => o.value === sort.value)
  const name = `${sort.label}: ${current?.label ?? ''}`
  const trigger = (
    <button
      type="button"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-label={name}
      data-state={open ? 'open' : 'closed'}
      className={cn(buttonClass, iconOnly && 'w-10 justify-center px-0')}
    >
      <ArrowUpDown aria-hidden strokeWidth={1.75} />
      {!iconOnly && (
        <>
          <span>{name}</span>
          <ChevronDown aria-hidden strokeWidth={1.75} className="transition-transform group-data-[state=open]:rotate-180" />
        </>
      )}
    </button>
  )
  return (
    <SelectLayer
      open={open}
      onOpenChange={setOpen}
      trigger={trigger}
      width="content"
      popoverProps={{ className: 'min-w-60' }}
      label={sort.label}
      closeLabel={labels.close}
    >
      <OptionList
        options={sort.options}
        picked={new Set([sort.value])}
        onPick={(next) => {
          sort.onValueChange(next)
          setOpen(false)
        }}
        sheet={sheet}
        searchable={false}
        label={sort.label}
      />
    </SelectLayer>
  )
}

/** The removable chip of an active filter (DS-Lists A5 `.fc`): S 32, tint, × inside. */
export function FilterChip({ children, removeLabel, onRemove }: { children: ReactNode; removeLabel: string; onRemove: () => void }) {
  return (
    <span className="inline-flex h-8 flex-none items-center gap-0.5 rounded-pill border border-a-line bg-a-50 pr-1 pl-3 text-ctl-s leading-4 font-medium whitespace-nowrap text-a-600">
      {children}
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="inline-flex size-6 cursor-pointer items-center justify-center rounded-pill text-a-600 outline-none hover:bg-a-100 focus-visible:shadow-focus"
      >
        <X aria-hidden className="size-3.5" strokeWidth={2} />
      </button>
    </span>
  )
}

/** Under 768: the Filters sheet — a section per filter, a long one opens its own list with search, Back returns. */
function FiltersSheet({
  filters,
  labels,
  open,
  onOpenChange,
  clearAll,
}: {
  filters: readonly FilterDef[]
  labels: FilterBarLabels
  open: boolean
  onOpenChange: (open: boolean) => void
  clearAll: () => void
}) {
  const [drill, setDrill] = useState<string | null>(null)
  const inner = filters.find((f) => f.id === drill)
  const any = filters.some((f) => chosen(f) > 0)
  const summary = (f: FilterDef) => {
    const all = flatOptions(f.options)
    if (f.multiple)
      return f.value.length === 1 ? all.find((o) => o.value === f.value[0])?.label : f.value.length ? String(f.value.length) : ''
    if (f.disabled && f.disabledHint) return f.disabledHint
    const value = singleValue(f)
    return value ? all.find((o) => o.value === value)?.label : (f.anyLabel ?? all.find((o) => o.value === f.plain)?.label)
  }
  return (
    <Drawer
      open={open}
      onOpenChange={(next) => {
        if (!next) setDrill(null)
        onOpenChange(next)
      }}
    >
      <DrawerContent aria-describedby={undefined} className="max-h-[85%] pb-[env(safe-area-inset-bottom)]">
        <div className="flex h-13 flex-none items-center gap-1 pr-1.5 pl-4">
          {inner && (
            <Button
              variant="plain"
              iconOnly
              aria-label={labels.back}
              className="-ml-2.5 size-10 rounded-ctl-m"
              onClick={() => setDrill(null)}
            >
              <ChevronLeft />
            </Button>
          )}
          <Dialog.Title className="m-0 flex-1 truncate text-ctl-l leading-6 font-semibold text-n-900">
            {inner?.label ?? labels.filters}
          </Dialog.Title>
          <Dialog.Close asChild>
            <Button variant="plain" iconOnly aria-label={labels.close} className="size-10 rounded-ctl-m">
              <X />
            </Button>
          </Dialog.Close>
        </div>
        {inner ? (
          <OptionList
            multi={!!inner.multiple}
            options={optionsOf(inner)}
            picked={pickedOf(inner)}
            onPick={(next) => {
              pickIn(inner, next)
              if (!inner.multiple) setDrill(null)
            }}
            sheet
            searchable
            searchPlaceholder={labels.searchIn}
            empty={labels.nothingMatches}
            label={inner.label}
          />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto pb-2">
            {filters.map((f) => {
              const long = flatOptions(optionsOf(f)).length >= SEARCH_FROM
              return (
                <section key={f.id} aria-label={f.label} className="border-b border-n-100 last:border-0">
                  {long ? (
                    <button
                      type="button"
                      disabled={f.disabled}
                      onClick={() => setDrill(f.id)}
                      className="flex h-14 w-full cursor-pointer items-center gap-3 px-4 text-left text-ctl-l leading-6 text-n-900 outline-none focus-visible:bg-n-50"
                    >
                      <span className="flex-1 font-semibold">{f.label}</span>
                      <span className="truncate text-small text-n-500">{summary(f)}</span>
                      <ChevronRight aria-hidden className="size-5 text-n-500" />
                    </button>
                  ) : (
                    <>
                      <h3 className="m-0 px-4 pt-3 text-label text-n-500 uppercase">{f.label}</h3>
                      {f.disabled ? (
                        <p className="m-0 px-4 pt-1 pb-3 text-small text-n-500">{f.disabledHint}</p>
                      ) : (
                        <OptionList
                          multi={!!f.multiple}
                          options={optionsOf(f)}
                          picked={pickedOf(f)}
                          onPick={(next) => pickIn(f, next)}
                          sheet
                          searchable={false}
                          label={f.label}
                        />
                      )}
                    </>
                  )}
                </section>
              )
            })}
          </div>
        )}
        <div className="flex flex-none gap-2 border-t border-n-200 bg-n-0 px-4 pt-3 pb-5">
          {any && (
            <Button variant="tertiary" size="l" onClick={clearAll}>
              {labels.clearAll}
            </Button>
          )}
          <Button variant="primary" size="l" className="flex-1" onClick={() => onOpenChange(false)}>
            {labels.showResults}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

/**
 * FilterBar (DS-Lists A5): one bar for every list. Row 1 (M 40): Search · the filter menus · Sort · the list's main
 * action. Row 2 while anything is filtered or searched: the active filters as removable chips, Clear all, the result
 * count. Under 768: the search on its own row, then «Filters · N», the count and Sort as an icon button; the chips
 * under them; the Filters sheet holds the same menus; the main action is the page's own there (A5 draws none in the
 * row). Fully controlled: the page keeps the values (its URL).
 */
export function FilterBar({
  search,
  filters,
  sort,
  action,
  count,
  searched: searchedElsewhere,
  labels,
  onClearAll,
  className,
}: FilterBarProps) {
  const phone = useSheet()
  const [sheetOpen, setSheetOpen] = useState(false)
  const chips = chipsOf(filters)
  const active = filters.reduce((n, f) => n + chosen(f), 0)
  const clearAll =
    onClearAll ??
    (() => {
      filters.forEach((f) => (f.multiple ? f.onValueChange([]) : f.onValueChange(null)))
      search?.onChange('')
    })
  const searched = !!search?.value.trim() || !!searchedElsewhere
  const searchField = search && (
    <div className={cn('relative min-w-0', phone ? 'w-full' : 'w-72 flex-none')}>
      <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-n-500" strokeWidth={1.75} />
      <Input
        size={phone ? 'l' : 'm'}
        aria-label={search.placeholder}
        placeholder={search.placeholder}
        value={search.value}
        onChange={(e) => search.onChange(e.target.value)}
        className="pl-9"
      />
    </div>
  )
  const chipRow = chips.map((c) => (
    <FilterChip key={c.key} removeLabel={labels.remove(c.text)} onRemove={c.remove}>
      {c.text}
    </FilterChip>
  ))
  const countText = count != null && <span className="text-small whitespace-nowrap text-n-500">{count}</span>

  if (phone)
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        {searchField}
        <div className="flex items-center gap-2">
          {filters.length > 0 && (
            <Button variant="secondary" size="m" onClick={() => setSheetOpen(true)}>
              <SlidersHorizontal aria-hidden />
              {labels.filters}
              {active > 0 && <CountBadge tone="accent">{active}</CountBadge>}
            </Button>
          )}
          {countText}
          <span className="flex-1" />
          {sort && <SortMenu sort={sort} labels={labels} iconOnly />}
        </div>
        {chips.length > 0 && <div className="flex flex-wrap items-center gap-2">{chipRow}</div>}
        <FiltersSheet filters={filters} labels={labels} open={sheetOpen} onOpenChange={setSheetOpen} clearAll={clearAll} />
      </div>
    )

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex min-w-0 flex-wrap items-center gap-3">
        {searchField}
        {filters.map((f) => (
          <FilterButton key={f.id} filter={f} labels={labels} />
        ))}
        <span className="flex-1" />
        {sort && <SortMenu sort={sort} labels={labels} />}
        {action}
      </div>
      {(chips.length > 0 || (searched && count != null)) && (
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {chipRow}
          {chips.length > 0 && (
            <Button variant="tertiary" size="s" className="ml-1" onClick={clearAll}>
              {labels.clearAll}
            </Button>
          )}
          <span className="flex-1" />
          {countText}
        </div>
      )}
    </div>
  )
}
