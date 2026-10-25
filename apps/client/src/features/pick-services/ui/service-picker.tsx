import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { Chip } from '@yeral/ui/chip'
import { cn } from '@yeral/ui/cn'
import { Check } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'

/**
 * The services to pick from, on the business page (Venue «Hyzmatlar», book C-06) and the booking's first step
 * (Booking `step=services`, C-12): the groups' chips filter the list (not scroll; «All» first), each group's services
 * with their duration and price (a price kept for the place in grey), and «Select» / «Selected» on each row while
 * picking is open. A paused or phone-only page lists the services without the toggles (States 05). The page gives the
 * heading above it; `groupHeading` is the level its groups' names take under that heading.
 */
export function ServicePicker({
  groups,
  picked,
  onToggle,
  canPick = true,
  groupHeading,
}: {
  groups: BusinessDetail['serviceGroups']
  picked: readonly string[]
  onToggle: (id: string) => void
  canPick?: boolean
  groupHeading: 'h2' | 'h3'
}) {
  const t = useTranslations('services')
  const fmt = useFmt()
  const [chosen, setGroup] = useState<string | null>(null)
  const listed = groups.filter((g) => g.services.length > 0)
  // a chip whose group went (its services removed meanwhile) lets go: «All» again
  const group = listed.some((g) => g.id === chosen) ? chosen : null
  const shown = listed.filter((g) => group === null || g.id === group)
  const Heading = groupHeading
  if (shown.length === 0) return <p className="m-0 text-body text-n-600">{t('none')}</p>
  return (
    <>
      {listed.length > 1 && (
        <div role="group" aria-label={t('groups')} className="-m-1 flex [scrollbar-width:none] gap-2 overflow-x-auto p-1">
          <Chip selected={group === null} aria-pressed={group === null} onClick={() => setGroup(null)}>
            {t('all')}
          </Chip>
          {listed.map((g) => (
            <Chip key={g.id} selected={group === g.id} aria-pressed={group === g.id} onClick={() => setGroup(g.id)}>
              {g.name}
            </Chip>
          ))}
        </div>
      )}
      <div className="flex flex-col gap-5">
        {shown.map((g) => (
          <section key={g.id} className="flex flex-col">
            <Heading className="m-0 pt-1 pb-3 text-[18px] leading-6 font-semibold">{g.name}</Heading>
            {g.services.map((s) => {
              const on = picked.includes(s.id)
              return (
                <div key={s.id} className="flex items-center gap-4 border-t border-n-200 py-4">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-[16px] leading-[22px] font-semibold">{s.name}</span>
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
          </section>
        ))}
      </div>
    </>
  )
}
