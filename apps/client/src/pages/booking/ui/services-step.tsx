import type { BusinessDetail } from '@yeral/contract/catalog'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { ServicePicker } from '@/features/pick-services'
import { namedSpecialist, notDoneBy, servicesOf } from '../model/flow'
import { StepTitle } from './step-title'

/**
 * The booking's first step (Booking `step=services`, C-12): the services to pick. Opened from a specialist's «Book» on
 * the business page (`?staff=`), it lists only what they do, with «See all services»; a picked service they don't do
 * says so (any free specialist takes the booking until it's taken off; the address keeps them all along).
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
        {named &&
          (missing.length > 0 ? (
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
          ) : (
            theirs.length > 0 && (
              <Callout
                tone="neutral"
                icon={<UserRound />}
                action={
                  <Button size="s" variant="secondary" onClick={() => setAll(only)}>
                    {only ? t('seeAll') : t('onlyTheirs', { name: named.name })}
                  </Button>
                }
              >
                {only ? t('theirs', { name: named.name }) : t('allShown')}
              </Callout>
            )
          ))}
        <ServicePicker groups={only ? theirs : detail.serviceGroups} picked={ids} onToggle={onToggle} groupHeading="h2" />
      </div>
    </>
  )
}
