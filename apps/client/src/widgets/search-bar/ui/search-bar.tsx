import { useNavigate } from '@tanstack/react-router'
import { today } from '@yeral/domain/time'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { CalendarDays, MapPin, Search, X } from 'lucide-react'
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { LocationHelp } from '@/features/pick-place'
import { draftOf, type SearchDraft } from '../model/draft'
import { useListbox, type Listbox } from '../model/use-listbox'
import { ANY_TIME, isAnyTime, type When } from '../model/when'
import type { Row } from './panel'
import { useWhat, WhatPanel } from './what-panel'
import { WhenPanel, useWhenLabel } from './when-panel'
import { useWhere, WherePanel, type Located } from './where-panel'

type Open = 'what' | 'where' | 'when' | null

/**
 * The × that clears a segment: on the hovered or focused segment only, while it holds a value. Above the When button's
 * overlay (`after:inset-0`), which would take the click otherwise.
 */
function Clear({ label, shown, onClear }: { label: string; shown: boolean; onClear: () => void }) {
  if (!shown) return null
  return (
    <button
      type="button"
      aria-label={label}
      className="relative z-10 -mr-1 flex size-6 flex-none cursor-pointer items-center justify-center rounded-sm border-0 bg-transparent p-0 text-n-600 group-focus-within:visible group-hover:visible hover:bg-n-100 focus-visible:shadow-focus focus-visible:outline-none sm:invisible"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClear}
    >
      <X aria-hidden className="size-4.5" />
    </button>
  )
}

/**
 * One segment of the bar: the icon, the small label over the value (the label is read, not shown, on the compact bar);
 * the focused one lifts into a white pill.
 */
function Segment({
  on,
  compact,
  width,
  icon,
  children,
  className,
  trailing,
  ...props
}: {
  on: boolean
  compact: boolean
  width: string
  icon: ReactNode
  children: ReactNode
  className?: string
  ref?: Ref<HTMLDivElement>
  /** After the column: the × that clears the segment. */
  trailing?: ReactNode
}) {
  return (
    <div
      {...props}
      className={cn(
        'group relative flex min-w-0 items-center text-left',
        compact ? 'h-[38px] gap-2 rounded-pill pr-3 pl-3.5' : 'h-[62px] gap-3 rounded-ctl-l pr-3.5 pl-4',
        width,
        'hover:bg-n-50 [.is-open_&]:hover:bg-n-100',
        on &&
          'z-10 bg-n-0 shadow-[inset_0_0_0_1px_var(--color-a-500),0_0_0_3px_var(--color-a-50),0_4px_12px_rgba(16,16,20,0.10)] hover:bg-n-0 [.is-open_&]:hover:bg-n-0',
        className,
      )}
    >
      <span className={cn('flex-none', compact ? '[&>svg]:size-4.5' : '[&>svg]:size-5', on ? 'text-n-900' : 'text-n-600')}>{icon}</span>
      <span className="flex min-w-0 flex-1 flex-col">{children}</span>
      {trailing}
    </div>
  )
}

const label = 'cursor-text text-micro font-semibold text-n-900'
// the segment shows the focus (the white pill), so the input inside draws no ring of its own
const value = 'w-full min-w-0 truncate border-0 bg-transparent p-0 text-n-900 outline-none placeholder:text-n-500 focus-visible:shadow-none'

/**
 * The home SearchBar (C7-Home C1, design v0.7): What · Where · When as one raised bar with real fields, the
 * suggestions 8 px under it (never over the Search button), When as chips + a month + the time of day. ↑ ↓ move the
 * highlight, Enter picks it (or searches), Esc closes. Searching goes to `/search` with what the results page reads,
 * unless `onSearch` takes the draft (the header's bar refines the results page in place). `compact` is the header's
 * variant (600 × 48, r 999, icon + value per segment, the round ink button): the same fields and panels.
 * The place is the page's (`usePlace`), as its list and banner read it too.
 */
export function SearchBar({
  located,
  whereInput,
  className,
  compact = false,
  what: initialWhat = '',
  when: initialWhen = ANY_TIME,
  onSearch,
}: {
  located: Located
  whereInput?: Ref<HTMLInputElement>
  className?: string
  compact?: boolean
  /** The words it starts with (the address's, on the results page). */
  what?: string
  /** The When it starts with. */
  when?: When
  onSearch?: (draft: SearchDraft) => void
}) {
  const t = useTranslations('searchBar')
  const lang = useLocale()
  const navigate = useNavigate()
  const id = useId()
  const whenLabel = useWhenLabel()
  const form = useRef<HTMLFormElement>(null)
  const whereField = useRef<HTMLInputElement>(null)
  const whereSegment = useRef<HTMLDivElement>(null)
  const whenButton = useRef<HTMLButtonElement>(null)
  const goButton = useRef<HTMLButtonElement>(null)
  useImperativeHandle(whereInput, () => whereField.current!)

  const [what, setWhat] = useState(initialWhat)
  // the Where field while it's edited: its text, and whether the text is the person's (then it asks for places)
  const [whereTyped, setWhereTyped] = useState<string | null>(null)
  const [whereDirty, setWhereDirty] = useState(false)
  // where the Where panel starts: the segment's left edge, kept inside the bar
  const [whereLeft, setWhereLeft] = useState(0)
  const [when, setWhen] = useState<When>(initialWhen)
  const [open, setOpen] = useState<Open>(null)
  const field = cn(value, compact ? 'h-5 text-small' : 'h-6 text-[16px] leading-6')

  const search = (q = what) => {
    const draft = draftOf(q, located.place, when, today())
    if (onSearch) onSearch(draft)
    else void navigate({ to: '/$lang/search', params: { lang }, search: draft })
  }
  const close = () => {
    setOpen(null)
    setWhereTyped(null)
    setWhereDirty(false)
    whatList.reset()
    whereList.reset()
  }

  const whatRows = useWhat(what, {
    onCategory: (category) => void navigate({ to: '/$lang/c/$category', params: { lang, category } }),
    onBusiness: (slug) => void navigate({ to: '/$lang/b/$slug', params: { lang, slug } }),
    onService: (name) => {
      setWhat(name)
      search(name)
    },
    onSearch: () => search(),
  })
  const where = useWhere({ typed: whereDirty ? (whereTyped ?? '') : '', located, onPicked: close })
  const whatList = useListbox(whatRows.rows.map((r) => r.id))
  const whereList = useListbox(where.rows.map((r) => r.id))

  // a click outside the bar closes what's open
  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => !form.current?.contains(e.target as Node) && close()
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  })

  const keys = (which: Exclude<Open, null | 'when'>, list: Listbox, rows: Row[]) => (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      if (open !== which) setOpen(which)
      list.move(e.key === 'ArrowDown' ? 1 : -1)
    } else if (e.key === 'Enter' && open === which && list.active) {
      e.preventDefault()
      rows.find((r) => r.id === list.active)?.pick()
    } else if (e.key === 'Enter' && which === 'where' && open === which && whereDirty && whereTyped?.trim() && rows[0]) {
      // a place typed but none highlighted: the first match, not a search around the old place with the words dropped
      e.preventDefault()
      rows[0].pick()
    }
  }
  const combobox = (which: 'what' | 'where', list: Listbox, rows: Row[]) => ({
    role: 'combobox' as const,
    autoComplete: 'off',
    'aria-expanded': open === which && rows.length > 0,
    'aria-controls': open === which && rows.length > 0 ? `${id}-${which}-list` : undefined,
    'aria-autocomplete': 'list' as const,
    'aria-activedescendant': open === which ? (list.active ?? undefined) : undefined,
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    close()
    search()
  }
  const divider = cn('w-px flex-none bg-n-200', compact ? 'h-5' : 'h-8')

  return (
    <form
      ref={form}
      role="search"
      aria-label={t('label')}
      onSubmit={submit}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && close()}
      onKeyDown={(e) => {
        if (e.key !== 'Escape' || !open) return
        e.preventDefault()
        e.stopPropagation()
        const back = open === 'when' ? whenButton.current : null
        close()
        back?.focus()
      }}
      className={cn(
        'relative flex w-full items-center border border-n-200 bg-n-0 p-1',
        compact
          ? 'h-12 max-w-[600px] rounded-pill shadow-[0_1px_2px_rgba(16,16,20,0.06)]'
          : 'h-18 max-w-[1040px] rounded-card pr-[7px] shadow-bar',
        open && 'is-open bg-n-50',
        className,
      )}
    >
      <Segment
        on={open === 'what'}
        compact={compact}
        width="flex-1"
        icon={<Search aria-hidden />}
        trailing={<Clear label={t('clear')} shown={!!what} onClear={() => setWhat('')} />}
      >
        <label htmlFor={`${id}-what`} className={compact ? 'sr-only' : label}>
          {t('what')}
        </label>
        <input
          id={`${id}-what`}
          {...combobox('what', whatList, whatRows.rows)}
          className={field}
          placeholder={t('whatPlaceholder')}
          value={what}
          onChange={(e) => {
            setWhat(e.target.value)
            whatList.reset()
          }}
          onFocus={() => setOpen('what')}
          onKeyDown={keys('what', whatList, whatRows.rows)}
        />
      </Segment>
      <span aria-hidden className={cn(divider, (open === 'what' || open === 'where') && 'bg-transparent')} />
      <Segment
        on={open === 'where'}
        compact={compact}
        width={compact ? 'w-[29%] max-w-[170px]' : 'w-[26%] max-w-[264px]'}
        icon={<MapPin aria-hidden />}
        ref={whereSegment}
        trailing={
          <Clear
            label={t('clear')}
            shown={!!whereTyped}
            onClear={() => {
              setWhereTyped('')
              setWhereDirty(true)
            }}
          />
        }
      >
        <label htmlFor={`${id}-where`} className={compact ? 'sr-only' : label}>
          {t('where')}
        </label>
        <input
          ref={whereField}
          id={`${id}-where`}
          {...combobox('where', whereList, where.rows)}
          className={field}
          value={whereTyped ?? where.shown}
          onChange={(e) => {
            setWhereTyped(e.target.value)
            setWhereDirty(true)
            whereList.reset()
          }}
          onFocus={(e) => {
            setOpen('where')
            setWhereLeft(Math.max(0, Math.min(whereSegment.current?.offsetLeft ?? 0, (form.current?.clientWidth ?? 1040) - 400)))
            setWhereTyped(where.shown)
            setWhereDirty(false)
            e.target.select()
          }}
          onKeyDown={keys('where', whereList, where.rows)}
        />
      </Segment>
      <span aria-hidden className={cn(divider, (open === 'where' || open === 'when') && 'bg-transparent')} />
      <Segment
        on={open === 'when'}
        compact={compact}
        width={compact ? 'w-[29%] max-w-[170px]' : 'w-[24%] max-w-[248px]'}
        icon={<CalendarDays aria-hidden />}
        className="cursor-pointer"
        trailing={<Clear label={t('clear')} shown={!isAnyTime(when)} onClear={() => setWhen(ANY_TIME)} />}
      >
        <span id={`${id}-when-label`} className={compact ? 'sr-only' : 'text-micro font-semibold text-n-900'}>
          {t('when')}
        </span>
        <button
          ref={whenButton}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={open === 'when'}
          aria-controls={open === 'when' ? `${id}-when` : undefined}
          aria-labelledby={`${id}-when-label ${id}-when-value`}
          className={cn(field, 'cursor-pointer text-left after:absolute after:inset-0', isAnyTime(when) && 'text-n-500')}
          onClick={() => (open === 'when' ? close() : setOpen('when'))}
        >
          <span id={`${id}-when-value`}>{whenLabel(when)}</span>
        </button>
      </Segment>
      {compact ? (
        // the round ink button (design CLAUDE.md: the one place the ink button goes)
        <Button
          ref={goButton}
          type="submit"
          variant="ink"
          size="m"
          iconOnly
          aria-label={t('submit')}
          className="relative z-10 ml-1 rounded-pill"
        >
          <Search aria-hidden />
        </Button>
      ) : (
        <Button ref={goButton} type="submit" variant="primary" size="l" className="relative z-10 ml-2 min-w-[118px]">
          <Search aria-hidden />
          {t('submit')}
        </Button>
      )}

      {open === 'what' && (
        <WhatPanel what={whatRows} listbox={whatList} listId={`${id}-what-list`} className="left-0 w-[600px] max-w-full" />
      )}
      {open === 'where' && (
        <WherePanel
          where={where}
          located={located}
          listbox={whereList}
          listId={`${id}-where-list`}
          className="w-[400px] max-w-full"
          style={{ left: whereLeft }}
        />
      )}
      {/* outside the panel: the panel closes once the sheet takes the focus, and the sheet must outlive it */}
      <LocationHelp open={where.help} onOpenChange={where.setHelp} backTo={whereField} />
      {open === 'when' && (
        <div
          id={`${id}-when`}
          role="dialog"
          aria-labelledby={`${id}-when-label`}
          className="absolute top-[calc(100%+8px)] right-0 z-20 w-[576px] max-w-full rounded-card border border-n-200 bg-n-0 p-2 shadow-raised"
        >
          <WhenPanel
            id={`${id}-when-panel`}
            when={when}
            onChange={setWhen}
            onDone={() => {
              close()
              goButton.current?.focus()
            }}
          />
        </div>
      )}
    </form>
  )
}
