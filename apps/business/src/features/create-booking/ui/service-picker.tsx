import type { Menu } from '@yeral/contract/services'
import { localized } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Checkbox } from '@yeral/ui/checkbox'
import { Chip } from '@yeral/ui/chip'
import { Input } from '@yeral/ui/input'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { Search, X } from 'lucide-react'
import { useState } from 'react'
import { useLocale, useTranslations } from 'use-intl'
import { matchIn } from '../model/client-search'
import { totalOf, type MenuService, type Person } from '../model/new-booking'
import { Highlight } from './highlight'

export type ServiceScope = 'own' | 'all'

/**
 * The services (B7-Booking · ServicePicker): «Jeren’s services · All services» as a Segmented that shares the width
 * (the first option waits for a specialist), a search over the open option, the groups with their counts in a list
 * that scrolls under sticky headers, «Jeren doesn’t do this» under a service of All services, the chosen ones as
 * chips with an × and the Total. A specialist booking for themself sees only their own list, no prices.
 */
export function ServicePicker({
  menu,
  picked,
  person,
  scope,
  showPrices,
  onScope,
  onChange,
}: {
  menu: Menu
  /** In the order picked. */
  picked: readonly MenuService[]
  /** The specialist given, whose services the first option lists. */
  person: Person | null
  scope: ServiceScope
  showPrices: boolean
  /** Without it there's no choice (a specialist books for themself): their services alone. */
  onScope?: (scope: ServiceScope) => void
  onChange: (ids: string[]) => void
}) {
  const t = useTranslations('newBooking.services')
  const fmt = useFmt()
  const locale = useLocale()
  const [query, setQuery] = useState('')
  const q = query.trim()
  const ids = picked.map((s) => s.id)
  const own = !!person && (scope === 'own' || !onScope)
  const nameOf = (s: MenuService) => localized(s.name, locale)
  const groupsOf = (onlyOwn: boolean, typed: string) =>
    menu.groups
      .map((g) => ({
        ...g,
        services: g.services.filter(
          (s) =>
            (!onlyOwn || !person || s.staffIds.includes(person.staffId) || ids.includes(s.id)) && (!typed || matchIn(nameOf(s), typed)),
        ),
      }))
      .filter((g) => g.services.length > 0)
  const count = (groups: ReturnType<typeof groupsOf>) => groups.reduce((n, g) => n + g.services.length, 0)
  const groups = groupsOf(own, q)
  const inScope = count(groupsOf(own, ''))
  // the other option has more matches: say so, and offer them without losing the search
  const elsewhere = own && q && onScope ? count(groupsOf(false, q)) - count(groups) : 0
  const total = totalOf(picked)
  const meta = (minutes: number, price: ReturnType<typeof fmt.price>) =>
    showPrices ? t('meta', { length: fmt.duration(minutes), price }) : fmt.duration(minutes)
  const showThem = elsewhere > 0 && (
    <span className="flex flex-wrap items-center gap-x-2 text-dense text-n-600">
      {t('moreInAll', { n: elsewhere })}
      <Button variant="tertiary" size="s" onClick={() => onScope?.('all')}>
        {t('showThem')}
      </Button>
    </span>
  )

  return (
    <section className="flex flex-col gap-2.5">
      <span className="text-small font-medium text-n-900">{t('title')}</span>
      {onScope && (
        <Segmented
          size="m"
          className="w-full"
          aria-label={t('scope')}
          value={person ? scope : 'all'}
          onValueChange={(v) => onScope(v as ServiceScope)}
        >
          <SegmentedItem value="own" className="min-w-0 flex-1" disabled={!person} title={person ? undefined : t('pickSpecialist')}>
            <span className="truncate">{person ? t('onlyOf', { name: person.name }) : t('noneYet')}</span>
          </SegmentedItem>
          <SegmentedItem value="all" className="min-w-0 flex-1">
            <span className="truncate">{t('all')}</span>
          </SegmentedItem>
        </Segmented>
      )}
      <div className="relative">
        <Search aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-2.75 left-3.5 size-4.5 text-n-600" />
        <Input
          type="search"
          size="m"
          autoComplete="off"
          aria-label={t('search', { n: inScope })}
          placeholder={t('search', { n: inScope })}
          className="pl-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <div className="flex max-h-105 flex-col overflow-y-auto rounded-ctl-l border border-n-200">
        {groups.map((g) => (
          <div key={g.id} role="group" aria-label={localized(g.name, locale)} className="flex flex-col">
            <span className="sticky top-0 z-1 flex items-baseline gap-1.5 bg-n-0 px-3 pt-2.5 pb-1 text-label text-n-500 uppercase">
              {localized(g.name, locale)}
              <span className="text-n-400">{g.services.length}</span>
            </span>
            {g.services.map((s) => {
              const on = ids.includes(s.id)
              const name = nameOf(s)
              const theirs = !person || s.staffIds.includes(person.staffId)
              return (
                <Checkbox
                  key={s.id}
                  checked={on}
                  onChange={() => onChange(on ? ids.filter((id) => id !== s.id) : [...ids, s.id])}
                  className="min-h-10 w-full px-3"
                  label={
                    <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-small text-n-900">
                          <Highlight text={name} range={matchIn(name, q)} />
                        </span>
                        {!theirs && person && <span className="text-[12px]/4 text-n-600">{t('notTheirs', { name: person.name })}</span>}
                      </span>
                      <span className="flex-none text-dense text-n-600">
                        {meta(s.durationMin, fmt.price({ type: s.priceType, amount: s.priceAmount }))}
                      </span>
                    </span>
                  }
                />
              )
            })}
          </div>
        ))}
        {groups.length === 0 && (
          <div role="status" className="flex flex-col gap-1 p-3 text-dense text-n-600">
            {t('noMatch', { query: q })}
            {showThem}
          </div>
        )}
      </div>
      {groups.length > 0 && showThem}
      {picked.length > 0 && (
        <div className="flex flex-col gap-2.5 border-t border-n-200 pt-2.5">
          <div className="flex flex-wrap gap-2">
            {picked.map((s) => (
              <Chip
                key={s.id}
                size="s"
                aria-label={t('remove', { name: nameOf(s) })}
                onClick={() => onChange(ids.filter((id) => id !== s.id))}
              >
                {nameOf(s)}
                <X aria-hidden />
              </Chip>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 text-small font-semibold text-n-900">
            <span>{t('total')}</span>
            <span>{meta(total.minutes, fmt.price(total.price))}</span>
          </div>
        </div>
      )}
    </section>
  )
}
