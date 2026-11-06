import type { CalendarBooking } from '@yeral/contract/calendar'
import { COMPLAINT_UNDO_DAYS } from '@yeral/domain/lifecycle'
import { localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { useTranslations } from 'use-intl'
import { useJoin } from '@/entities/booking'

/**
 * The report on a booking (B-Calendar `.rpb`, `panel=reported`, B-Mobile 4b; book B-28): its kind, the words of an
 * «Other», the day and time it was filed and by whom; «Remove report» while it may be taken back (7 days, book Q-207;
 * the owner and administrators any, a specialist their own), and that the client isn't told.
 */
export function ReportBox({
  booking: b,
  now,
  canRemove,
  removing,
  onRemove,
}: {
  booking: CalendarBooking
  now: number
  canRemove: boolean
  removing: boolean
  onRemove: () => void
}) {
  const t = useTranslations('bookingDrawer.report')
  const fmt = useFmt()
  const join = useJoin()
  const c = b.complaint
  if (!c) return null
  const filed = localOf(c.at)
  // the last moment it may be taken back (`canRemoveComplaint`: 7 days from the filing's instant)
  const last = localOf(c.at + COMPLAINT_UNDO_DAYS * 86_400_000)
  const until = { date: fmt.dayMonth(last.date), time: fmt.time(last.min) }
  const type = t(`types.${c.type}`)
  const line = join(
    [type, ...(c.text ? [c.text] : []), fmt.relativeDay(filed.date, localOf(now).date), fmt.time(filed.min), ...(c.by ? [c.by.name] : [])],
    'dot',
  )
  return (
    <div className="flex flex-col gap-2.5 rounded-ctl-l border border-danger-line bg-n-0 p-3.5">
      <span className="text-small font-medium text-danger-ink">{t('boxTitle')}</span>
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <span className="text-small font-semibold text-n-900">{line}</span>
        {canRemove && (
          <Button variant="secondary" size="s" aria-label={t('removeAria', { type })} loading={removing} onClick={onRemove}>
            {t('remove')}
          </Button>
        )}
      </div>
      <span className="text-dense text-n-600">{canRemove ? t('boxCaption', until) : t('boxCaptionLocked')}</span>
    </div>
  )
}
