import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Avatar } from '@yeral/ui/avatar'
import { Button } from '@yeral/ui/button'
import { Callout } from '@yeral/ui/callout'
import { Rating } from '@yeral/ui/rating'
import { Check, UserRound } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { ServicePicker } from './service-picker'
import { namedSpecialist, notDoneBy, servicesOf } from '../model/flow'
import { StepTitle } from './step-title'

/**
 * The services step (Booking `step=services`, C-12): a service picked moves on by itself (the page's `onToggle`; one
 * picked already comes off). Opened from a specialist's «Book» on the business page (`?staff=&first=staff`, C7-Booking
 * C4.2), they're a done step at the top («Specialist · Jeren · Change») and the list holds only what they do: changing
 * the specialist is the way to the rest. A link that came with a service they don't do lists them all and says so (any
 * free specialist takes the booking until it's taken off; the address keeps them all along).
 */
export function ServicesStep({
  detail,
  picked,
  staff,
  first,
  onToggle,
  onChangeStaff,
}: {
  detail: BusinessDetail
  picked: readonly { id: string; name: string }[]
  /** The address's `staff`. */
  staff: string | undefined
  /** The flow began with the specialist (`?first=staff`). */
  first: boolean
  onToggle: (id: string) => void
  onChangeStaff: () => void
}) {
  const t = useTranslations('booking.services')
  const fmt = useFmt()
  const named = namedSpecialist(detail, staff)
  const ids = picked.map((s) => s.id)
  const missing = named ? notDoneBy(named, ids) : []
  const theirs = named ? servicesOf(detail.serviceGroups, named) : []
  const only = named !== null && missing.length === 0 && theirs.length > 0
  const count = theirs.reduce((n, g) => n + g.services.length, 0)
  return (
    <>
      {first && named && (
        <div className="mb-6 flex items-center gap-3 rounded-ctl-l border border-n-200 py-3 pr-3 pl-4">
          <span aria-hidden className="flex size-[22px] flex-none items-center justify-center rounded-pill bg-a-50 text-a-600">
            <Check className="size-3.5" strokeWidth={2.5} />
          </span>
          <Avatar name={named.name} src={named.photo?.url} size={40} decorative />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="text-[12px] leading-4 text-n-600">{t('doneLabel')}</span>
            <span className="truncate text-[15px] leading-5 font-semibold">{named.name}</span>
            {(named.role || named.rating !== null) && (
              <span className="inline-flex flex-wrap items-center gap-1.5 text-dense text-n-600">
                {named.role}
                {named.role && named.rating !== null && <span aria-hidden>·</span>}
                {named.rating !== null && <Rating value={fmt.rating(named.rating)} className="text-dense" />}
              </span>
            )}
          </span>
          <Button variant="tertiary" size="s" aria-label={t('changeLabel')} onClick={onChangeStaff}>
            {t('change')}
          </Button>
        </div>
      )}
      <StepTitle title={t('title')} lead={only ? t('theirs', { name: named.name, count }) : t('lead')} />
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
        <ServicePicker groups={only ? theirs : detail.serviceGroups} picked={ids} onToggle={onToggle} groupHeading="h2" />
      </div>
    </>
  )
}
