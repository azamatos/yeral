import type { BusinessDetail } from '@yeral/contract/catalog'
import { useFmt } from '@yeral/i18n'
import { Callout } from '@yeral/ui/callout'
import { Checkbox } from '@yeral/ui/checkbox'
import { Clock, MapPin, Phone } from 'lucide-react'
import { useTranslations } from 'use-intl'

export type ChangedSinceLastVisit = NonNullable<BusinessDetail['changedSinceLastVisit']>

/**
 * «Something changed» (C7-Booking D1 `ChangedNotice`, book F-245): a Warning callout at the head of the booking card for
 * a client whose last visit here was before the business moved, changed its week's hours or its phone number. New
 * values first in ink, the old address as «Was: …» in n-500; the icon says what changed (map pin, clock, phone). A new
 * address needs «I've seen the new address» ticked before the booking goes (the page holds Send until then); hours and
 * a phone number only inform. Several changes are one notice with one tick.
 */
export function ChangedNotice({
  name,
  changed,
  address,
  hours,
  phone,
  seen,
  onSeen,
}: {
  name: string
  changed: ChangedSinceLastVisit
  /** The address as the page shows it now. */
  address: string
  /** The booking day's hours now: its weekday (0 = Monday) and its hours (null: closed that weekday). */
  hours: { weekday: number; hours: { open: number; close: number } | null } | null
  /** The phone number now. */
  phone: string
  seen: boolean
  onSeen: (seen: boolean) => void
}) {
  const t = useTranslations('booking.changed')
  const fmt = useFmt()
  const title = changed.address
    ? changed.hours
      ? t('movedAndHours', { name })
      : t('moved', { name })
    : changed.hours
      ? changed.phone
        ? t('hoursAndPhone')
        : t('hours')
      : t('phone')
  const Icon = changed.address ? MapPin : changed.hours ? Clock : Phone
  return (
    <Callout tone="warning" role="note" icon={<Icon />} title={<span className="text-n-900">{title}</span>}>
      <div className="flex flex-col text-n-600">
        {changed.address && (
          <p className="m-0">
            <b className="text-n-900">{t('newAddress')}</b> <span className="text-n-900">{address}</span>
            {changed.address.was && (
              <>
                <br />
                <span className="text-n-500">{t('was', { address: changed.address.was })}</span>
              </>
            )}
          </p>
        )}
        {changed.hours && hours && (
          <p className="m-0">
            <b className="text-n-900">{t('weekday', { day: String(hours.weekday) })}</b>{' '}
            <span className="text-n-900">{hours.hours ? fmt.timeRange(hours.hours.open, hours.hours.close) : t('closed')}</span>
          </p>
        )}
        {changed.phone && (
          <p className="m-0">
            <b className="text-n-900">{t('newPhone')}</b> <span className="text-n-900">{fmt.phone(phone)}</span>
          </p>
        )}
        {changed.address && (
          <Checkbox
            label={t('seen')}
            checked={seen}
            onChange={(e) => onSeen(e.target.checked)}
            className="pt-2.5 text-small font-semibold"
          />
        )}
      </div>
    </Callout>
  )
}
