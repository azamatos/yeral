import { BOOKING_STATUSES } from '@yeral/domain/model'
import type { CalendarView } from '@yeral/contract/calendar'
import { Pill } from '@yeral/ui/pill'
import { StatusBadge } from '@yeral/ui/status-badge'
import { LegendTile, StatusLegend, type StatusLegendSection } from '@yeral/ui/status-legend'
import { Clock, Globe, Lock, Phone, TriangleAlert, User, Coffee } from 'lucide-react'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { InternalStatusChip, useInternalStatusName } from '@/entities/booking'

/** Remembered in the browser (decision 2): no account preference exists, and a per-browser convenience is enough. */
const SEEN = 'yeral.calendar.legend-seen'
const seen = () => {
  try {
    return window.localStorage.getItem(SEEN) === '1'
  } catch {
    return true
  }
}
const remember = () => {
  try {
    window.localStorage.setItem(SEEN, '1')
  } catch {
    // storage refused (a private window): it opens again next visit
  }
}

/**
 * «Colours and symbols» (B-Calendar `legend`, book F-134): statuses, sources, what the grid's layers mean, the timers,
 * the internal statuses switched on. It opens by itself on a person's first visit; «Got it» remembers that.
 */
export function CalendarLegend({ statuses }: { statuses: CalendarView['internalStatuses'] }) {
  const t = useTranslations('calendar.legend')
  const s = useTranslations('status')
  const statusName = useInternalStatusName()
  const [first] = useState(() => !seen())
  const icon = { 'aria-hidden': true, strokeWidth: 1.75, className: 'size-4' } as const
  const sections: StatusLegendSection[] = [
    {
      title: t('statuses'),
      variant: 'statuses',
      items: BOOKING_STATUSES.map((status) => ({
        visual: <StatusBadge status={status}>{s(status)}</StatusBadge>,
        text: t(`meaning.${status}`),
      })),
    },
    {
      title: t('source'),
      variant: 'inline',
      items: [
        { visual: <Globe {...icon} />, text: t('online') },
        { visual: <Phone {...icon} />, text: t('phone') },
        { visual: <User {...icon} />, text: t('walkIn') },
      ],
    },
    {
      title: t('inCalendar'),
      items: [
        {
          visual: (
            <LegendTile look="solid">
              <Coffee aria-hidden />
            </LegendTile>
          ),
          text: t('break'),
        },
        {
          visual: (
            <LegendTile look="solid">
              <Lock aria-hidden />
            </LegendTile>
          ),
          text: t('closed'),
        },
        { visual: <LegendTile look="hatch" />, text: t('buffer') },
        { visual: <LegendTile look="outline" />, text: t('outside') },
        {
          visual: (
            <LegendTile look="pending">
              <Clock aria-hidden />
            </LegendTile>
          ),
          text: t('newTime'),
        },
        { visual: <LegendTile look="outline" />, text: t('elsewhere') },
        { visual: <TriangleAlert {...icon} className="size-4 text-danger-ink" />, text: t('alert') },
        {
          visual: (
            <Pill tone="warning" size="s">
              {t('timerSample')}
            </Pill>
          ),
          text: t('timer'),
        },
        {
          visual: (
            <Pill tone="neutral" size="s">
              {t('bySample')}
            </Pill>
          ),
          text: t('by'),
        },
      ],
    },
    ...(statuses.length
      ? [
          {
            title: t('internal'),
            caption: t('internalCaption'),
            items: statuses.map((status) => ({ visual: <InternalStatusChip status={status} />, text: statusName(status) })),
          },
        ]
      : []),
  ]
  return (
    <StatusLegend
      title={t('title')}
      closeLabel={t('close')}
      confirmLabel={t('confirm')}
      sections={sections}
      defaultOpen={first}
      onConfirm={remember}
    />
  )
}
