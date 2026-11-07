import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { SEARCH_FROM, SelectLayer, useSheet } from '@yeral/ui/select'
import { Check, Plus } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'
import { searchServices, type Match } from '@/entities/business'
import { ServiceSearch } from './service-search'

type Groups = BusinessDetail['serviceGroups']

/** The words found, 700 (C7-Booking `.mt`). */
export function Highlight({ text, match }: { text: string; match: Match | null }) {
  if (!match) return text
  return (
    <>
      {text.slice(0, match.start)}
      <b className="font-bold">{text.slice(match.start, match.end)}</b>
      {text.slice(match.end)}
    </>
  )
}

/**
 * «Add a service» in the booking's summary (C7-Booking C4.4 `AddServiceSheet`): the Tertiary S row opens the
 * specialist's services (everything with «Any specialist») as a popover the width of the card from 768, a bottom sheet
 * under it. Search from 9 services (S in the popover, L in the sheet), group headers with counts, one row per service
 * with its duration and price; a service in the booking already reads «Added» with a check and can't be picked
 * again (the × on its summary row takes it off). A pick closes the list and hands the id to the page, which keeps the
 * chosen time when it still fits.
 */
export function AddService({
  groups,
  picked,
  onPick,
  listLabel,
  searchLabel,
}: {
  groups: Groups
  picked: readonly string[]
  onPick: (id: string) => void
  /** The list's name: «Jeren’s services», «All services». */
  listLabel: string
  /** The search's placeholder: «Search Jeren’s 20 services». */
  searchLabel: string
}) {
  const t = useTranslations('booking')
  const fmt = useFmt()
  const sheet = useSheet()
  const id = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const listed = groups.filter((g) => g.services.length > 0)
  const count = listed.reduce((n, g) => n + g.services.length, 0)
  const searchable = count >= SEARCH_FROM
  const result = searchServices(listed, searchable ? query : '')
  const shown = result.groups.filter((g) => g.services.length > 0)
  const change = (next: boolean) => {
    setOpen(next)
    if (!next) setQuery('')
  }
  const pick = (serviceId: string) => {
    change(false)
    onPick(serviceId)
  }
  const search = searchable && (
    <ServiceSearch
      value={query}
      onChange={setQuery}
      label={searchLabel}
      clearLabel={t('services.clearSearch')}
      size={sheet ? 'l' : 's'}
      className={sheet ? 'px-4 pb-3' : 'pb-1.5'}
    />
  )
  const nothing = result.count === 0 && (
    <p className={cn('m-0 text-small text-n-600', sheet ? 'px-4 py-4' : 'px-2.5 py-2')}>{t('services.noMatch', { query: query.trim() })}</p>
  )
  const header = (g: (typeof shown)[number]) =>
    sheet ? (
      <div
        id={`${id}-${g.group.id}`}
        className="flex h-9 flex-none items-center justify-between bg-n-50 px-4 text-[11px] leading-3.5 font-semibold tracking-[.07em] text-n-600 uppercase"
      >
        <span className="truncate">{g.group.name}</span>
        <span className="tabular-nums">{g.services.length}</span>
      </div>
    ) : (
      <div
        id={`${id}-${g.group.id}`}
        className="flex h-7 flex-none items-center gap-2 px-2.5 text-[11px] leading-3.5 font-semibold tracking-[.07em] text-n-600 uppercase"
      >
        <span className="flex-1 truncate">{g.group.name}</span>
        <span className="tabular-nums">{g.services.length}</span>
      </div>
    )

  return (
    <SelectLayer
      open={open}
      onOpenChange={change}
      label={t('summary.add')}
      closeLabel={t('close')}
      width="trigger"
      trigger={
        <Button variant="tertiary" size="s" className="w-full justify-start px-2.5">
          <Plus aria-hidden />
          {t('summary.add')}
        </Button>
      }
    >
      {search}
      <div
        role="listbox"
        aria-label={listLabel}
        className={cn('flex min-h-0 flex-col overflow-y-auto', sheet ? 'pb-[env(safe-area-inset-bottom)]' : 'max-h-80')}
      >
        {shown.map((g) => (
          <div key={g.group.id} role="group" aria-labelledby={`${id}-${g.group.id}`} className="flex flex-col">
            {header(g)}
            {g.services.map(({ service: s, name }) => {
              const on = picked.includes(s.id)
              return sheet ? (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  disabled={on}
                  onClick={() => pick(s.id)}
                  className="flex min-h-14 w-full cursor-pointer items-center gap-3 border-0 border-t border-n-100 bg-n-0 px-4 py-1.5 text-left text-n-900 focus-visible:shadow-focus-inset focus-visible:outline-none disabled:cursor-default"
                >
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn('text-[15px] leading-5', on && 'font-semibold')}>
                      <Highlight text={s.name} match={name} />
                    </span>
                    <span className="text-dense text-n-600">{on ? t('summary.added') : fmt.duration(s.durationMin)}</span>
                  </span>
                  <span
                    className={cn(
                      'text-[15px] leading-5 font-semibold whitespace-nowrap',
                      s.price.type === 'hidden' && 'font-medium text-n-600',
                    )}
                  >
                    {fmt.price(s.price)}
                  </span>
                  {on ? (
                    <Check aria-hidden className="size-5 flex-none text-a-600" strokeWidth={2} />
                  ) : (
                    <Plus aria-hidden className="text-n-700 size-5 flex-none" strokeWidth={1.75} />
                  )}
                </button>
              ) : (
                <button
                  key={s.id}
                  type="button"
                  role="option"
                  aria-selected={on}
                  disabled={on}
                  onClick={() => pick(s.id)}
                  className="flex h-9 w-full flex-none cursor-pointer items-center gap-2 rounded-ctl-s border-0 bg-transparent px-2.5 text-left text-small text-n-900 hover:bg-n-50 focus-visible:bg-n-50 focus-visible:outline-none disabled:cursor-default disabled:hover:bg-transparent"
                >
                  <span className="flex-1 truncate">
                    <Highlight text={s.name} match={name} />
                  </span>
                  <span className="flex-none text-dense text-n-600">
                    {on
                      ? t('summary.added')
                      : t('summary.serviceMeta', { duration: fmt.duration(s.durationMin), price: fmt.price(s.price) })}
                  </span>
                  <span aria-hidden className="flex size-4 flex-none items-center justify-center text-a-600">
                    {on && <Check className="size-4" strokeWidth={2} />}
                  </span>
                </button>
              )
            })}
          </div>
        ))}
        {nothing}
      </div>
    </SelectLayer>
  )
}
