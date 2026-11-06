import type { BusinessDetail } from '@yeral/contract/catalog'
import { Callout } from '@yeral/ui/callout'
import { cn } from '@yeral/ui/cn'
import { textLink } from '@yeral/ui/text-link'
import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { ServicePicker } from '@/features/pick-services'
import { namedSpecialist, notDoneBy, servicesOf } from '../model/flow'
import { StepTitle } from './step-title'

/**
 * The services step (Booking `step=services`, C-12): the services to pick. Opened from a specialist's «Book» on the
 * business page (`?staff=`), it lists only what they do, with «See all services» at the list's head (a line, not a
 * band: owner's review, #39); a picked service they don't do says so (any free specialist takes the booking until it's
 * taken off; the address keeps them all along).
 */
export function ServicesStep({
  detail,
  picked,
  staff,
  onToggle,
}: {
  detail: BusinessDetail
  picked: readonly { id: string; name: string }[]
  /** The address's `staff`. */
  staff: string | undefined
  onToggle: (id: string) => void
}) {
  const t = useTranslations('booking.services')
  const named = namedSpecialist(detail, staff)
  const ids = picked.map((s) => s.id)
  const missing = named ? notDoneBy(named, ids) : []
  const theirs = named ? servicesOf(detail.serviceGroups, named) : []
  // a link that came with someone else's service picked opens on all of them
  const [all, setAll] = useState(() => missing.length > 0)
  const only = named !== null && !all && missing.length === 0 && theirs.length > 0
  return (
    <>
      <StepTitle title={t('title')} lead={t('lead')} />
      <div className="mt-5 flex flex-col gap-7">
        {named && missing.length > 0 && (
          <Callout tone="warning" icon={<UserRound />} live>
            {t('notTheirs', {
              name: named.name,
              services: picked
                .filter((s) => missing.includes(s.id))
                .map((s) => s.name)
                .join(', '),
              count: missing.length,
            })}
          </Callout>
        )}
        <div className="flex flex-col gap-3">
          {named && missing.length === 0 && theirs.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-dense text-n-600">
              <span>{only ? t('theirs', { name: named.name }) : t('allShown')}</span>
              <button
                type="button"
                className={cn(textLink, 'cursor-pointer border-0 bg-transparent p-0 font-medium')}
                onClick={() => setAll(only)}
              >
                {only ? t('seeAll') : t('onlyTheirs', { name: named.name })}
              </button>
            </div>
          )}
          <ServicePicker groups={only ? theirs : detail.serviceGroups} picked={ids} onToggle={onToggle} groupHeading="h2" />
        </div>
      </div>
    </>
  )
}
