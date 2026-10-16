/**
 * Prices and money (whole manats). Display is i18n's job (`40 TMT`, `250 TMT-den`, `Mugt`); these are the sums.
 */
import type { BookingStatus, Price } from './model'

/**
 * A booking's total from its services; it's a "from" total when any service is priced "from". A hidden price is never
 * added in (that would show it): with other prices the total is "from" their sum, without them the total stays hidden.
 */
export function priceTotal(prices: readonly Price[]): Price {
  const amount = prices.reduce((sum, p) => sum + (p.type === 'fixed' || p.type === 'from' ? p.amount : 0), 0)
  const hidden = prices.some((p) => p.type === 'hidden')
  if (prices.length > 0 && prices.every((p) => p.type === 'free')) return { type: 'free', amount: 0 }
  if (hidden && amount === 0) return { type: 'hidden', amount: 0 }
  return { type: hidden || prices.some((p) => p.type === 'from') ? 'from' : 'fixed', amount }
}

/**
 * What the business earns from these services: every amount it set, hidden ones included (the client never sees this
 * figure; bookings keep `priceTotal` for the client and each item's own price for this).
 */
export function businessTotal(prices: readonly Price[]): number {
  return prices.reduce((sum, p) => sum + (p.type === 'free' ? 0 : p.amount), 0)
}

/** A day in the calendar header: "16 ýazylyş · 3 haýyş · Girdeji (meýilleşdirilen): 1 410 TMT" (business spec §4). */
export interface DaySummary {
  /** Every booking except cancelled ones: requests and no-shows count. */
  count: number
  requests: number
  /** Confirmed + pending + completed prices (`businessTotal` of each booking's items); only with the revenue permission. */
  plannedRevenue: number
}

export function daySummary(bookings: readonly { status: BookingStatus; price: number }[]): DaySummary {
  const live = bookings.filter((b) => b.status !== 'cancelled')
  return {
    count: live.length,
    requests: live.filter((b) => b.status === 'pending').length,
    plannedRevenue: live.filter((b) => b.status !== 'noshow').reduce((sum, b) => sum + b.price, 0),
  }
}
