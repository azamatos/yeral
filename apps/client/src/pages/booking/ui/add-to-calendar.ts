import { epochOf } from '@yeral/domain/time'
import { buildIcs, ICS_TYPE } from '@yeral/lib/ics'
import { useState } from 'react'
import { useTranslations } from 'use-intl'
import { site } from '@/shared/config'
import { downloadFile } from '@/shared/lib'

/** A booking as the calendar file names it: its code, the visit on its business day, the services, where. */
export interface CalendarEvent {
  code: string
  date: string
  start: number
  end: number
  /** The services' names, joined («Women’s haircut, Hair styling»). */
  services: string
  business: string
  address: string
}

/**
 * «Add to calendar» on a sent page (Booking `addIcs`, `icsDone`): saves the booking as an `.ics` file
 * (`@yeral/lib/ics`), then says so under the buttons. The sent booking and an instant move share it.
 */
export function useAddToCalendar() {
  const t = useTranslations('booking.sent')
  const brand = useTranslations('common')('brand')
  const [done, setDone] = useState(false)
  const add = (event: CalendarEvent) => {
    const file = buildIcs({
      uid: `${event.code}@${new URL(site.urls.client).host}`,
      product: brand,
      start: epochOf(event.date, event.start),
      end: epochOf(event.date, event.end),
      title: t('icsTitle', { services: event.services, business: event.business }),
      location: event.address,
    })
    downloadFile(t('icsFile', { code: event.code }), file, ICS_TYPE)
    setDone(true)
  }
  return { add, done, label: t('addToCalendar'), doneText: t('icsDone') }
}
