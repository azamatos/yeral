import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Chip } from '@yeral/ui/chip'
import { cn } from '@yeral/ui/cn'
import { Check } from 'lucide-react'
import { useId, useState } from 'react'
import { useTranslations } from 'use-intl'

/**
 * Venue «Hyzmatlar» (book C-06): the groups' chips filter the list (not scroll; «All» first), each group's services
 * with their duration and price (a price kept for the place in grey), and «Select» / «Selected» on each row while the
 * page can be booked online. A paused or phone-only page lists the services without the toggles (States 05).
 */
export function Services({
  groups,
  picked,
  onToggle,
  canPick,
}: {
  groups: BusinessDetail['serviceGroups']
  picked: readonly string[]
  onToggle: (id: string) => void
  canPick: boolean
}) {
  const t = useTranslations('business.services')
  const fmt = useFmt()
  const titleId = useId()
  const [group, setGroup] = useState<string | null>(null)
  const shown = groups.filter((g) => g.services.length > 0 && (group === null || g.id === group))
  return (
    <section aria-labelledby={titleId} className="flex scroll-mt-15 flex-col gap-5 pt-8 pb-12 max-sm:pt-6 max-sm:pb-10">
      <h2 id={titleId} className="m-0 text-[26px] leading-8 font-bold tracking-[-0.02em] max-sm:text-[22px] max-sm:leading-7">
        {t('title')}
      </h2>
      {shown.length === 0 ? (
        <p className="m-0 text-body text-n-600">{t('none')}</p>
      ) : (
        <>
          {groups.filter((g) => g.services.length > 0).length > 1 && (
            <div role="group" aria-label={t('groups')} className="-m-1 flex [scrollbar-width:none] gap-2 overflow-x-auto p-1">
              <Chip selected={group === null} aria-pressed={group === null} onClick={() => setGroup(null)}>
                {t('all')}
              </Chip>
              {groups
                .filter((g) => g.services.length > 0)
                .map((g) => (
                  <Chip key={g.id} selected={group === g.id} aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>
                    {g.name}
                  </Chip>
                ))}
            </div>
          )}
          <div className="flex flex-col gap-5">
            {shown.map((g) => (
              <div key={g.id} className="flex flex-col">
                <h3 className="text-lg m-0 pt-1 pb-3 leading-6 font-semibold">{g.name}</h3>
                {g.services.map((s) => {
                  const on = picked.includes(s.id)
                  return (
                    <div key={s.id} className="flex items-center gap-4 border-t border-n-200 py-4">
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <span className="text-base leading-[22px] font-semibold">{s.name}</span>
                        {s.description && <span className="text-dense text-n-600">{s.description}</span>}
                        <span className="text-small text-n-600">
                          {fmt.duration(s.durationMin)} ·{' '}
                          <span className={cn(s.price.type === 'hidden' ? 'font-medium text-n-600' : 'font-semibold text-n-900')}>
                            {fmt.price(s.price)}
                          </span>
                        </span>
                      </div>
                      {canPick && (
                        <Button
                          size="s"
                          variant={on ? 'tint' : 'secondary'}
                          aria-pressed={on}
                          // the words seen stay in the name screen readers hear (axe: label-content-name-mismatch)
                          aria-label={on ? t('selectedLabel', { name: s.name }) : t('selectLabel', { name: s.name })}
                          className="min-w-28 flex-none"
                          onClick={() => onToggle(s.id)}
                        >
                          {on && <Check strokeWidth={2} />}
                          {on ? t('selected') : t('select')}
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
