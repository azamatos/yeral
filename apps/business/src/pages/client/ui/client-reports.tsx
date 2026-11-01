import { useMutation } from '@tanstack/react-query'
import type { ClientCard } from '@yeral/contract/clients'
import { statusWithoutNoShow } from '@yeral/domain/lifecycle'
import type { ComplaintType } from '@yeral/domain/model'
import type { Level } from '@yeral/domain/permissions'
import { localOf } from '@yeral/domain/time'
import { useFmt } from '@yeral/i18n'
import { Button } from '@yeral/ui/button'
import { cn } from '@yeral/ui/cn'
import { toast } from '@yeral/ui/toast'
import { Clock, Flag, MessageCircleWarning, UserX, type LucideIcon } from 'lucide-react'
import { useTranslations } from 'use-intl'
import { useSdk } from '@/shared/api'
import { useErrorText } from '@/shared/i18n'
import { canRemoveReport } from '@/widgets/booking-drawer'
import { reportUntil } from '../model/card'
import { useWhat } from '../model/use-what'
import { CardSection, Caption } from './card-section'

type Report = ClientCard['reports'][number]

const ICON: Record<ComplaintType, LucideIcon> = { noshow: UserX, late: Clock, rude: MessageCircleWarning, other: Flag }

/**
 * Reports (B-Client `.rprow`, book B-28): the kind and the words, the booking, who reported and when; «Remove report»
 * within 7 days, by the rule the booking drawer uses. The client is never told.
 */
export function ClientReports({
  slug,
  card,
  now,
  viewer,
}: {
  slug: string
  card: ClientCard
  now: number
  viewer: { level: Level; staffId?: string }
}) {
  const t = useTranslations('clientCard.reports')
  const fmt = useFmt()
  const reports = card.reports
  const removable = (r: Report) => canRemoveReport({ complaint: r }, now, viewer)
  const until = (r: Report) => fmt.dayMonth(reportUntil(r.at))
  const only = reports.length === 1 && removable(reports[0]!) ? reports[0] : undefined
  const several = reports.filter(removable).length > 1
  return (
    <CardSection title={t('title')} count={reports.length || undefined} action={<Caption>{t('team')}</Caption>}>
      {reports.length ? (
        <>
          <ul className="m-0 flex list-none flex-col border-t border-n-200 p-0">
            {reports.map((r) => (
              <Row
                key={r.code}
                slug={slug}
                card={card}
                report={r}
                now={now}
                removable={removable(r)}
                until={several ? until(r) : undefined}
              />
            ))}
          </ul>
          <Caption>{only ? t('captionOne', { date: until(only) }) : t('caption')}</Caption>
        </>
      ) : (
        <Caption>{t('none')}</Caption>
      )}
    </CardSection>
  )
}

function Row({
  slug,
  card,
  report: r,
  now,
  removable,
  until,
}: {
  slug: string
  card: ClientCard
  report: Report
  now: number
  removable: boolean
  until?: string
}) {
  const t = useTranslations('clientCard.reports')
  const drawer = useTranslations('bookingDrawer.report')
  const fmt = useFmt()
  const sdk = useSdk()
  const errorText = useErrorText()
  const what = useWhat()
  const takeBack = useMutation(sdk.calendar.takeBackComplaint(slug))
  const Icon = ICON[r.type]
  const kind = drawer(`types.${r.type}`)
  const booking = [...card.history, ...card.upcoming].find((b) => b.code === r.code)
  const day = fmt.shortDate(r.date)
  const at = localOf(r.at)
  const reported = t('reported', { date: fmt.shortDate(at.date), time: fmt.time(at.min) })

  const remove = () =>
    takeBack.mutate(r.code, {
      onSuccess: () => {
        const wasNoShow = r.type === 'noshow' && booking?.status === 'noshow'
        toast(wasNoShow ? drawer('removedNoShow', { status: statusWithoutNoShow(booking, now) }) : drawer('removed'))
      },
      onError: (error) => toast(errorText(error)),
    })

  return (
    <li className="grid grid-cols-[32px_minmax(0,1fr)] items-start gap-3 border-b border-n-200 py-3.5 text-small sm:grid-cols-[32px_minmax(0,1fr)_auto]">
      <span
        aria-hidden
        className={cn(
          'inline-flex size-8 items-center justify-center rounded-full',
          r.type === 'noshow' ? 'bg-error-tint text-danger-ink' : 'bg-group text-n-600',
        )}
      >
        <Icon className="size-4" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 [overflow-wrap:anywhere]">
        <span className="font-semibold text-n-900">
          {kind}
          {r.text && <span className="font-normal">{t('words', { text: r.text })}</span>}
        </span>
        <Caption>{booking ? t('booking', { day, time: fmt.time(booking.start), what: what(booking) }) : day}</Caption>
        <Caption>{r.by ? t('reportedBy', { when: reported, by: r.by.name }) : reported}</Caption>
      </span>
      {removable && (
        <span className="flex flex-col items-end gap-1 max-sm:col-start-2 max-sm:items-start">
          <Button variant="secondary" size="s" loading={takeBack.isPending} aria-label={t('remove', { kind, day })} onClick={remove}>
            {t('removeShort')}
          </Button>
          {until && <Caption>{t('until', { date: until })}</Caption>}
        </span>
      )}
    </li>
  )
}
