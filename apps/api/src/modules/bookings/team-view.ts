/** A booking as the team reads it (the requests list, the calendar): the same items and price everywhere. */
import type { Locale } from '@yeral/domain/model'
import { text } from '../catalog/map'
import type { BookingRow, ItemRow } from './repo'

/** An item: its service in the reader's language, who does it, when. */
export const teamItemOf = (i: ItemRow, lang: Locale) => ({
  serviceId: i.serviceId,
  service: text(i.serviceName, lang),
  staffId: i.staffId,
  staff: i.staffName,
  start: i.start,
  end: i.end,
})

/** What the team charges for it, a hidden price included. */
export const teamPriceOf = (b: Pick<BookingRow, 'priceType' | 'priceAmount'>) =>
  b.priceType ? { type: b.priceType, amount: b.priceAmount ?? 0 } : null
