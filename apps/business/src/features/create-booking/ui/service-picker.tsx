import type { Menu } from '@yeral/contract/services'
import { localized } from '@yeral/domain/model'
import { useFmt } from '@yeral/i18n'
import { Checkbox } from '@yeral/ui/checkbox'
import { Segmented, SegmentedItem } from '@yeral/ui/segmented'
import { useLocale, useTranslations } from 'use-intl'
import { totalOf, type MenuService } from '../model/new-booking'

/**
 * The services (B-Calendar `panel=new`, book B-23 step 4): checkbox rows by group with their length and price, the Total
 * under them. With a specialist given, only theirs, unless the reader asks for all. A specialist reads no prices.
 */
export function ServicePicker({
  menu,
  picked,
  onlyOf,
  showPrices,
  onToggleAll,
  onChange,
}: {
  menu: Menu
  /** In the order picked. */
  picked: readonly MenuService[]
  /** Show only this person's services. */
  onlyOf: { staffId: string; name: string } | null
  showPrices: boolean
  /** Offered with a specialist given: «Show all services» and back. */
  onToggleAll?: { all: boolean; toggle: () => void; name: string }
  onChange: (ids: string[]) => void
}) {
  const t = useTranslations('newBooking.services')
  const fmt = useFmt()
  const locale = useLocale()
  const ids = picked.map((s) => s.id)
  const groups = menu.groups
    .map((g) => ({ ...g, services: g.services.filter((s) => !onlyOf || s.staffIds.includes(onlyOf.staffId) || ids.includes(s.id)) }))
    .filter((g) => g.services.length > 0)
  const total = totalOf(picked)
  return (
    <section className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-small font-medium text-n-900">{t('title')}</span>
        {onToggleAll && (
          <Segmented
            size="m"
            value={onToggleAll.all ? 'all' : 'only'}
            onValueChange={(v) => {
              if ((v === 'all') !== onToggleAll.all) onToggleAll.toggle()
            }}
            aria-label={t('title')}
          >
            <SegmentedItem value="only">{t('onlyOf', { name: onToggleAll.name })}</SegmentedItem>
            <SegmentedItem value="all">{t('showAll')}</SegmentedItem>
          </Segmented>
        )}
      </div>
      {groups.map((g) => (
        <div key={g.id} role="group" aria-label={localized(g.name, locale)} className="flex flex-col">
          <span className="pb-1 text-label text-n-500 uppercase">{localized(g.name, locale)}</span>
          {g.services.map((s) => {
            const on = ids.includes(s.id)
            const price = fmt.price({ type: s.priceType, amount: s.priceAmount })
            return (
              <Checkbox
                key={s.id}
                checked={on}
                onChange={() => onChange(on ? ids.filter((id) => id !== s.id) : [...ids, s.id])}
                className="min-h-10 w-full"
                label={
                  <span className="flex min-w-0 flex-1 items-center justify-between gap-3">
                    <span className="min-w-0 text-small text-n-900">{localized(s.name, locale)}</span>
                    <span className="flex-none text-dense text-n-600">
                      {showPrices ? t('meta', { length: fmt.duration(s.durationMin), price }) : fmt.duration(s.durationMin)}
                    </span>
                  </span>
                }
              />
            )
          })}
        </div>
      ))}
      {picked.length > 0 && (
        <div className="flex items-center justify-between gap-3 border-t border-n-200 pt-2.5 text-small font-semibold text-n-900">
          <span>{t('total')}</span>
          <span>
            {showPrices ? t('meta', { length: fmt.duration(total.minutes), price: fmt.price(total.price) }) : fmt.duration(total.minutes)}
          </span>
        </div>
      )}
    </section>
  )
}
