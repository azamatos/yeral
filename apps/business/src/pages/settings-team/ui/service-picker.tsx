import type { Menu } from '@yeral/contract/services'
import { localized } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { Checkbox } from '@yeral/ui/checkbox'
import { useId } from 'react'
import { useLocale, useTranslations } from 'use-intl'

/**
 * The services someone does, in the menu's groups (B-Team `.sgrp`, «Add a team member» and the staff drawer): each
 * group with «All» (checked, cleared, or some of them: mixed) and «1 / 3», a row per service with its length and price.
 */
export function ServicePicker({ menu, selected, onChange }: { menu: Menu; selected: string[]; onChange: (ids: string[]) => void }) {
  const t = useTranslations('settings.team.add')
  const fmt = useFmt()
  const locale = useLocale()
  return menu.groups
    .filter((g) => g.services.length > 0)
    .map((g) => (
      <ServiceGroup
        key={g.id}
        name={localized(g.name, locale)}
        items={g.services.map((s) => ({
          id: s.id,
          name: localized(s.name, locale),
          meta: t('meta', { duration: fmt.duration(s.durationMin), price: fmt.price({ type: s.priceType, amount: s.priceAmount }) }),
        }))}
        selected={selected}
        onChange={onChange}
      />
    ))
}

function ServiceGroup({
  name,
  items,
  selected,
  onChange,
}: {
  name: string
  items: { id: string; name: string; meta: string }[]
  selected: string[]
  onChange: (ids: string[]) => void
}) {
  const t = useTranslations('settings.team.add')
  const headingId = useId()
  const ids = items.map((i) => i.id)
  const n = ids.filter((i) => selected.includes(i)).length
  const all = n === ids.length
  return (
    <div role="group" aria-labelledby={headingId} className="flex flex-col border-b border-n-200 pb-2">
      <div className="flex min-h-12 items-center gap-2">
        <span id={headingId} className="text-small font-bold text-n-900">
          {name}
        </span>
        <span className="text-dense text-n-600">{t('groupCount', { n, total: ids.length })}</span>
        <label className="-mr-2.5 ml-auto inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-input px-2.5 text-dense font-semibold text-n-900 hover:bg-group">
          <Checkbox
            aria-label={t('allAria', { group: name })}
            checked={all}
            // some of them: the box shows a dash and is read as mixed
            ref={(el) => {
              if (el) el.indeterminate = n > 0 && !all
            }}
            onChange={() =>
              onChange(all ? selected.filter((i) => !ids.includes(i)) : [...selected, ...ids.filter((i) => !selected.includes(i))])
            }
          />
          {t('all')}
        </label>
      </div>
      {items.map((item) => (
        <label key={item.id} className="-mx-2 flex min-h-12 cursor-pointer items-center gap-3 rounded-s px-2 py-1.5 hover:bg-n-50">
          <Checkbox
            checked={selected.includes(item.id)}
            onChange={() => onChange(selected.includes(item.id) ? selected.filter((i) => i !== item.id) : [...selected, item.id])}
          />
          <span className="flex min-w-0 flex-col">
            <span className="text-body text-n-900">{item.name}</span>
            <span className="text-dense text-n-600">{item.meta}</span>
          </span>
        </label>
      ))}
    </div>
  )
}
