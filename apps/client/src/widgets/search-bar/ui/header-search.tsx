import { useNavigate, useRouter, useSearch } from '@tanstack/react-router'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { useMediaQuery } from '@yeral/ui/media-query'
import { ChevronLeft, Search } from 'lucide-react'
import { useRef, useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { useEditPlaceRequest, usePlace } from '@/features/pick-place'
import type { SearchDraft } from '../model/draft'
import { ANY_TIME, whenOf, type When } from '../model/when'
import { SearchBar } from './search-bar'
import { SearchSheet, type Field } from './search-sheet'
import { useWhenLabel } from './when-panel'
import { useWhere, type Located } from './where-panel'

/**
 * Where the header's search goes: `results` = the page lists what the address says (Search, a category's page), so a
 * search refines it in place and keeps its filters; `new` = a search starts from here (the business page).
 */
export type SearchHeaderMode = 'results' | 'new'

const nothing = () => undefined

/** The address's What and When on the results page; a bar on another page starts empty. */
function useStart(mode: SearchHeaderMode): { what: string; when: When } {
  const address = useSearch({ strict: false })
  if (mode !== 'results') return { what: '', when: ANY_TIME }
  return { what: address.what ?? '', when: whenOf(address) }
}

/**
 * A search from the results page's header: the words, the place and the When replace the address's, the rest (the
 * category, the filters, the sort) stays; a new place drops the radius and the map area, which were the old one's.
 */
function useRefine() {
  const navigate = useNavigate()
  return (draft: SearchDraft) =>
    void navigate({
      to: '.',
      search: (prev: Record<string, unknown>) => ({
        ...prev,
        ...draft,
        what: draft.what,
        near: draft.near,
        city: draft.city,
        day: draft.day,
        date: draft.date,
        tod: draft.tod,
        ...(draft.near !== prev.near || draft.city !== prev.city ? { r: undefined, area: undefined } : {}),
      }),
    })
}

/**
 * The compact SearchBar in the site header (C7-Home C1: 600 × 48, r 999, the round ink button) on Search, a category's
 * page and the business page, at 768 and wider: Home's fields and panels with the address's words and When; a new
 * address resets it. «I'll type an address» on the page's banner opens its Where.
 */
export function HeaderSearch({ mode }: { mode: SearchHeaderMode }) {
  const located = usePlace()
  const start = useStart(mode)
  const refine = useRefine()
  const whereInput = useRef<HTMLInputElement>(null)
  useEditPlaceRequest(() => whereInput.current?.focus())
  return (
    <SearchBar
      key={`${start.what}|${JSON.stringify(start.when)}`}
      compact
      located={located}
      whereInput={whereInput}
      what={start.what}
      when={start.when}
      onSearch={mode === 'results' ? refine : undefined}
      className="max-sm:hidden"
    />
  )
}

/**
 * The results page's bar on the phone (C7-Home 390 · Search results, in the site header's place): Back (the page
 * before, or Home when this page was the first one opened), and the summary field — the words over «Near me ·
 * Tomorrow» — that opens the SearchSheet with the address's values; «Show N places» refines the page in place.
 */
export function HeaderSearchPhone() {
  const located = usePlace()
  const start = useStart('results')
  return <PhoneSummary key={`${start.what}|${JSON.stringify(start.when)}`} located={located} {...start} />
}

function PhoneSummary({ located, what: startWhat, when: startWhen }: { located: Located; what: string; when: When }) {
  const t = useTranslations('searchBar')
  const lang = useLocale()
  const router = useRouter()
  const navigate = useNavigate()
  const refine = useRefine()
  const whenLabel = useWhenLabel()
  const [what, setWhat] = useState(startWhat)
  const [when, setWhen] = useState(startWhen)
  const [field, setField] = useState<Field | null>(null)
  const where = useWhere({ typed: '', located, onPicked: nothing })
  // the bar is mounted at every width (hidden from 768): only the phone's answers the banner with the sheet
  const phone = !useMediaQuery('(min-width: 768px)')
  useEditPlaceRequest(() => phone && setField('where'))
  const words = what || t('whatPlaceholder')
  const line = `${where.shown} · ${whenLabel(when)}`
  return (
    <div className="flex h-14 items-center gap-1 pr-4 pl-1">
      <Button
        variant="plain"
        size="l"
        iconOnly
        aria-label={t('back')}
        className="[&>svg]:size-6"
        onClick={() => (router.history.canGoBack() ? router.history.back() : void navigate({ to: '/$lang', params: { lang } }))}
      >
        <ChevronLeft aria-hidden />
      </Button>
      <button
        type="button"
        className="flex h-12 min-w-0 flex-1 cursor-pointer items-center gap-2.5 rounded-ctl-l border border-n-300 bg-n-0 px-3.5 text-left text-n-900 focus-visible:shadow-focus focus-visible:outline-none"
        onClick={() => setField('what')}
      >
        <Search aria-hidden className="size-5 flex-none text-n-600" />
        {/* the name reads «Edit search: Haircut Near me · Tomorrow» */}
        <span className="sr-only">{t('editSearch')} </span>
        <span className="flex min-w-0 flex-col">
          <span className={cn('truncate text-[15px] leading-5 font-semibold', !what && 'font-normal text-n-500')}>{words}</span>
          <span className="truncate text-dense text-n-600">{line}</span>
        </span>
      </button>
      {field && (
        <SearchSheet
          field={field}
          onField={setField}
          what={what}
          onWhat={setWhat}
          when={when}
          onWhen={setWhen}
          located={located}
          onClose={() => setField(null)}
          onSearch={refine}
        />
      )}
    </div>
  )
}
