import { useInfiniteQuery } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { addDays, today as todayOf } from '@yeral/domain/time'
import type { SearchParams } from '@yeral/sdk'
import { useSdk } from '@yeral/sdk/react'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { Modal, ModalContent, ModalHeader } from '@yeral/ui/modal'
import { CalendarDays, MapPin, Search } from 'lucide-react'
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { LocationHelp } from '@/features/pick-place'
import { draftOf, type SearchDraft } from '../model/draft'
import { useListbox } from '../model/use-listbox'
import { ANY_TIME, isAnyTime, type When } from '../model/when'
import { useWhat, WhatPanel } from './what-panel'
import { useWhenLabel, WhenPanel } from './when-panel'
import { useWhere, WherePanel, type Located } from './where-panel'

export type Field = 'what' | 'where' | 'when'
/** The live count waits this long after the last letter. */
const COUNT_DELAY_MS = 300

/** One of the three L fields on top of the sheet; the active one shows the input focus. */
function Fld({ active, icon, onClick, children }: { active: boolean; icon: ReactNode; onClick?: () => void; children: ReactNode }) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'flex h-12 flex-none items-center gap-2.5 rounded-ctl-l border border-n-300 bg-n-0 px-3.5 text-[16px] leading-6 text-n-900 [&>svg]:size-5 [&>svg]:flex-none [&>svg]:text-n-600',
        active && 'border-a-500 shadow-input-focus',
      )}
    >
      {icon}
      {children}
    </div>
  )
}

// the field's box shows the focus, so the input inside draws no ring of its own
const field =
  'h-6 w-full min-w-0 truncate border-0 bg-transparent p-0 text-left text-[16px] leading-6 text-n-900 outline-none placeholder:text-n-500 focus-visible:shadow-none'

/**
 * The phone's full-screen search (C7-Home 390): the three fields stay on top, the active one's suggestions fill the
 * rest, «Show N places» counts live and runs the search (to `/search`, or through `onSearch`: the results page's
 * summary field refines the page in place); Back keeps the values. A suggestion picked fills its field and moves to
 * the next one.
 */
export function SearchSheet({
  field: active,
  onField,
  what,
  onWhat,
  when,
  onWhen,
  located,
  onClose,
  onSearch,
}: {
  field: Field
  onField: (field: Field) => void
  what: string
  onWhat: (what: string) => void
  when: When
  onWhen: (when: When) => void
  located: Located
  onClose: () => void
  onSearch?: (draft: SearchDraft) => void
}) {
  const t = useTranslations('searchBar')
  const lang = useLocale()
  const sdk = useSdk()
  const navigate = useNavigate()
  const id = useId()
  const whenLabel = useWhenLabel()
  const whatInput = useRef<HTMLInputElement>(null)
  const whereInput = useRef<HTMLInputElement>(null)
  const [whereTyped, setWhereTyped] = useState<string | null>(null)
  const [whereDirty, setWhereDirty] = useState(false)

  const today = todayOf()
  const address = () => draftOf(what, located.place, when, today)
  const go = (q = what) => {
    onClose()
    const draft = draftOf(q, located.place, when, today)
    if (onSearch) onSearch(draft)
    else void navigate({ to: '/$lang/search', params: { lang }, search: draft })
  }
  const whatRows = useWhat(
    what,
    {
      onCategory: (category) => {
        onClose()
        void navigate({ to: '/$lang/c/$category', params: { lang, category } })
      },
      onBusiness: (slug) => {
        onClose()
        void navigate({ to: '/$lang/b/$slug', params: { lang, slug } })
      },
      onService: (name) => {
        onWhat(name)
        onField('where')
      },
      onSearch: () => go(),
    },
    true,
  )
  const where = useWhere({
    typed: whereDirty ? (whereTyped ?? '') : '',
    located,
    onPicked: () => {
      setWhereTyped(null)
      setWhereDirty(false)
      onField('when')
    },
    touch: true,
  })
  const whatList = useListbox(whatRows.rows.map((r) => r.id))
  const whereList = useListbox(where.rows.map((r) => r.id))

  // the keyboard opens for What and Where, not for When
  useEffect(() => {
    if (active === 'what') whatInput.current?.focus()
    if (active === 'where') {
      whereInput.current?.focus()
      whereInput.current?.select()
    }
  }, [active])

  // «Show 24 places»: the draft as the api searches it, a moment after the last change (keyed on its value: a new
  // object on every render would set a timer per render and render every 300 ms for as long as the sheet is open)
  const [draft, setDraft] = useState(address)
  const nextKey = JSON.stringify(address())
  useEffect(() => {
    const timer = setTimeout(() => setDraft(JSON.parse(nextKey) as ReturnType<typeof address>), COUNT_DELAY_MS)
    return () => clearTimeout(timer)
  }, [nextKey])
  const params: SearchParams = {
    lang,
    q: draft.what,
    city: draft.city,
    ...(draft.near ? { lat: Number(draft.near.split(',')[0]), lng: Number(draft.near.split(',')[1]) } : {}),
    ...(draft.day === 'tomorrow'
      ? { date: addDays(today, 1) }
      : draft.day === 'week'
        ? { week: true }
        : draft.date
          ? { date: draft.date }
          : {}),
  }
  const first = useInfiniteQuery(sdk.catalog.search(params)).data?.pages[0]
  const count = first?.total ?? first?.items.length

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent
        className="h-full max-h-full gap-0 overflow-y-hidden rounded-none p-0 shadow-none [&>span:first-child]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="flex h-14 flex-none items-center px-4 [&_h2]:text-[17px] [&_h2]:leading-6 [&_h2]:tracking-normal">
          <ModalHeader title={t('sheetTitle')} closeLabel={t('back')} />
        </div>
        <div className="flex flex-none flex-col gap-2 border-b border-n-200 px-4 pt-1 pb-4">
          <Fld active={active === 'what'} icon={<Search aria-hidden />} onClick={() => onField('what')}>
            <input
              ref={whatInput}
              role="combobox"
              aria-label={t('what')}
              aria-expanded={active === 'what' && whatRows.rows.length > 0}
              aria-controls={active === 'what' && whatRows.rows.length > 0 ? `${id}-what-list` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              className={field}
              placeholder={t('whatPlaceholder')}
              value={what}
              onChange={(e) => onWhat(e.target.value)}
              onFocus={() => onField('what')}
              onKeyDown={(e) => e.key === 'Enter' && go()}
            />
          </Fld>
          <Fld active={active === 'where'} icon={<MapPin aria-hidden />} onClick={() => onField('where')}>
            <input
              ref={whereInput}
              role="combobox"
              aria-label={t('where')}
              aria-expanded={active === 'where' && where.rows.length > 0}
              aria-controls={active === 'where' && where.rows.length > 0 ? `${id}-where-list` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              className={field}
              value={whereTyped ?? where.shown}
              onChange={(e) => {
                setWhereTyped(e.target.value)
                setWhereDirty(true)
              }}
              onFocus={() => {
                onField('where')
                setWhereTyped(where.shown)
                setWhereDirty(false)
              }}
            />
          </Fld>
          <Fld active={active === 'when'} icon={<CalendarDays aria-hidden />}>
            <button
              type="button"
              aria-haspopup="dialog"
              aria-expanded={active === 'when'}
              aria-labelledby={`${id}-when-label ${id}-when-value`}
              className={cn(field, 'cursor-pointer', isAnyTime(when) && 'text-n-500')}
              onClick={() => onField('when')}
            >
              <span id={`${id}-when-label`} className="sr-only">
                {t('when')}
              </span>
              <span id={`${id}-when-value`}>{whenLabel(when)}</span>
            </button>
          </Fld>
        </div>
        {active === 'what' && <WhatPanel touch what={whatRows} listbox={whatList} listId={`${id}-what-list`} />}
        {active === 'where' && <WherePanel touch where={where} located={located} listbox={whereList} listId={`${id}-where-list`} />}
        <LocationHelp open={where.help} onOpenChange={where.setHelp} backTo={whereInput} />
        {active === 'when' && (
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
            <WhenPanel touch id={`${id}-when-panel`} when={when} onChange={onWhen} />
          </div>
        )}
        <div className="flex flex-none gap-2 border-t border-n-200 bg-n-0 px-4 pt-3 pb-[30px]">
          {active === 'when' && (
            <Button variant="tertiary" size="l" onClick={() => onWhen(ANY_TIME)}>
              {t('clear')}
            </Button>
          )}
          <Button variant="primary" size="l" className="flex-1" onClick={() => go()}>
            {count === undefined ? t('showAllPlaces') : t('showPlaces', { n: count })}
          </Button>
        </div>
      </ModalContent>
    </Modal>
  )
}
