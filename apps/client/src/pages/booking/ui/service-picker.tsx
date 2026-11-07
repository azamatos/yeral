import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { SEARCH_FROM } from '@yeral/ui/select'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { searchServices } from '@/entities/business'
import { Highlight } from './add-service'
import { PickList, PickRow } from './pick-row'
import { ServiceSearch } from './service-search'

/**
 * The services to pick from on the booking's services step (Booking `step=services`, C-12; C7-Booking C4.2): the
 * groups one after another with their counts, each service a row (name, duration, an optional one-line description,
 * the price at the right, a chevron); a tap tints the row for 150 ms and the page moves on (`onToggle`; one in the
 * booking already shows the check and comes off). Search from 9 services (M; L on a phone) in names and descriptions,
 * case and accents aside; nothing found says so with «Clear search». The page gives the heading above it;
 * `groupHeading` is the level its groups' names take under that heading.
 */
export function ServicePicker({
  groups,
  picked,
  onToggle,
  groupHeading,
  searchLabel,
}: {
  groups: BusinessDetail['serviceGroups']
  picked: readonly string[]
  onToggle: (id: string) => void
  groupHeading: 'h2' | 'h3'
  /** The search's placeholder: «Search 20 services», «Search Jeren’s 20 services». */
  searchLabel: string
}) {
  const t = useTranslations('booking.services')
  const words = useTranslations('services')
  const fmt = useFmt()
  const [query, setQuery] = useState('')
  const listed = groups.filter((g) => g.services.length > 0)
  const count = listed.reduce((n, g) => n + g.services.length, 0)
  const searchable = count >= SEARCH_FROM
  const result = searchServices(listed, searchable ? query : '')
  const shown = result.groups.filter((g) => g.services.length > 0)
  const Heading = groupHeading
  if (listed.length === 0) return <p className="m-0 text-body text-n-600">{words('none')}</p>
  return (
    <>
      {searchable && (
        <ServiceSearch
          value={query}
          onChange={setQuery}
          label={searchLabel}
          clearLabel={t('clearSearch')}
          className="w-90 max-sm:w-full"
          size="m"
        />
      )}
      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="m-0 text-body text-n-600">{t('noMatch', { query: query.trim() })}</p>
          <Button variant="tertiary" size="s" className="-ml-2.5" onClick={() => setQuery('')}>
            {t('clearSearch')}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {shown.map((g) => (
            <section key={g.group.id} className="flex flex-col gap-3">
              <Heading className="m-0 flex items-baseline gap-2 text-[17px] leading-6 font-semibold">
                {g.group.name}
                <span className="text-small font-normal text-n-600">{g.services.length}</span>
              </Heading>
              <PickList>
                {g.services.map(({ service: s, name, description }) => {
                  const on = picked.includes(s.id)
                  return (
                    <PickRow key={s.id} compact pressed={on} onPick={() => onToggle(s.id)}>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="truncate text-[15px] leading-5 font-medium">
                          <Highlight text={s.name} match={name} />
                        </span>
                        <span className="text-n-700 text-dense">{fmt.duration(s.durationMin)}</span>
                        {s.description && (
                          <span className="truncate text-dense text-n-600">
                            <Highlight text={s.description} match={description} />
                          </span>
                        )}
                      </span>
                      <span
                        className={cn(
                          'text-[15px] leading-5 font-semibold whitespace-nowrap',
                          s.price.type === 'hidden' && 'font-medium text-n-600',
                        )}
                      >
                        {fmt.price(s.price)}
                      </span>
                    </PickRow>
                  )
                })}
              </PickList>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
